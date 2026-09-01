import express from 'express'
import crypto from 'node:crypto'
import { requireAuth, trackModuleAccessMiddleware } from '../auth.js'
import { callDeepSeek } from '../ai-advisor.js'
import { appLog } from '../logger.js'
import {
  countNotes,
  createNote,
  createNoteImage,
  deleteNote,
  deleteNoteImage,
  getNote,
  getNoteImage,
  listNoteImages,
  listNotes,
  updateNote
} from './db.js'

const router = express.Router()
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const CATEGORIES = new Set(['idea', 'vibe_coding', 'memo', 'dream'])
const STATUSES = new Set(['done', 'impossible', 'uncertain'])
const MAX_NOTE_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_NOTE_IMAGES = 12
const imageTypes = {
  jpeg: { contentType: 'image/jpeg', extension: 'jpg' },
  png: { contentType: 'image/png', extension: 'png' },
  gif: { contentType: 'image/gif', extension: 'gif' },
  webp: { contentType: 'image/webp', extension: 'webp' }
}
let ossClientPromise = null

router.use(requireAuth)
router.use(trackModuleAccessMiddleware('notes'))

function serializeImage(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
    createdAt: row.created_at,
    url: `/api/notes/${row.note_id}/images/${row.id}`
  }
}

function serialize(row, images = []) {
  let tags = []
  try { tags = JSON.parse(row.tags || '[]') } catch { tags = [] }
  return { id: row.id, monthKey: row.month_key, category: row.category, status: row.status, tags, title: row.title, content: row.content, createdAt: row.created_at, updatedAt: row.updated_at, images: images.map(serializeImage) }
}

async function serializeNotes(userId, rows) {
  const images = await listNoteImages(userId, rows.map((row) => row.id))
  const imagesByNote = new Map()
  for (const image of images) {
    const items = imagesByNote.get(image.note_id) || []
    items.push(image)
    imagesByNote.set(image.note_id, items)
  }
  return rows.map((row) => serialize(row, imagesByNote.get(row.id) || []))
}

function parseInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return imageTypes.jpeg
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return imageTypes.png
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a')) return imageTypes.gif
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return imageTypes.webp
  return null
}

function getUploadFileName(req) {
  try { return decodeURIComponent(String(req.get('x-file-name') || '图片')).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || '图片' } catch { return '图片' }
}

async function getOssClient() {
  if (!ossClientPromise) {
    const bucket = process.env.NOTES_OSS_BUCKET || process.env.OSS_BUCKET
    const region = process.env.NOTES_OSS_REGION || process.env.OSS_REGION || 'cn-beijing'
    const accessKeyId = process.env.NOTES_OSS_ACCESS_KEY_ID || process.env.OSS_ACCESS_KEY_ID
    const accessKeySecret = process.env.NOTES_OSS_ACCESS_KEY_SECRET || process.env.OSS_ACCESS_KEY_SECRET
    if (!bucket || !accessKeyId || !accessKeySecret) {
      const error = new Error('图片存储尚未配置，请联系管理员补充 NOTES_OSS_* 配置')
      error.status = 503
      throw error
    }
    ossClientPromise = import('ali-oss').then(({ default: OssClient }) => new OssClient({
      region: region.startsWith('oss-') ? region : `oss-${region}`,
      bucket,
      accessKeyId,
      accessKeySecret
    }))
  }
  return ossClientPromise
}

async function removeObject(objectKey) {
  try { await (await getOssClient()).delete(objectKey) } catch (error) { appLog('ERROR', `灵感备忘图片清理失败: ${objectKey}, error=${error.message}`) }
}

function validate(payload) {
  const { monthKey, category, status, tags, title, content } = payload || {}
  if (!MONTH_RE.test(monthKey || '')) return '月份格式应为 YYYY-MM'
  if (!CATEGORIES.has(category)) return '分类不正确'
  if (category !== 'vibe_coding' && status !== null && status !== undefined && status !== '') return '该分类无需状态'
  if (category === 'vibe_coding' && status !== null && status !== undefined && status !== '' && !STATUSES.has(status)) return '状态不正确'
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) return '标题需为 1-200 个字符'
  if (typeof content !== 'string' || content.length > 10000) return '正文最多 10000 个字符'
  if (!Array.isArray(tags) || tags.length > 12 || tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 24)) return '标签最多 12 个，每个 1-24 个字符'
  return null
}

function clean(payload) {
  return { monthKey: payload.monthKey, category: payload.category, status: payload.category === 'vibe_coding' && payload.status ? payload.status : null, tags: [...new Set(payload.tags.map((tag) => tag.trim()))], title: payload.title.trim(), content: payload.content.trim() }
}

router.get('/', async (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : ''
  if (month && !MONTH_RE.test(month)) return res.status(400).json({ error: '月份格式应为 YYYY-MM' })
  try { res.json({ notes: await serializeNotes(req.userId, await listNotes(req.userId, month)) }) } catch (error) { res.status(500).json({ error: '读取备忘失败，请稍后重试' }) }
})

router.post('/', async (req, res) => {
  const error = validate(req.body)
  if (error) return res.status(400).json({ error })
  try { res.json({ note: serialize(await createNote(req.userId, clean(req.body))) }) } catch (err) { res.status(500).json({ error: '保存备忘失败，请稍后重试' }) }
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const error = validate(req.body)
  if (!Number.isInteger(id) || error) return res.status(400).json({ error: error || '备忘不存在' })
  try {
    const note = await updateNote(req.userId, id, clean(req.body))
    if (!note) return res.status(404).json({ error: '备忘不存在' })
    res.json({ note: serialize(note) })
  } catch { res.status(500).json({ error: '保存备忘失败，请稍后重试' }) }
})

router.delete('/:id', async (req, res) => {
  const id = parseInteger(req.params.id)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '备忘不存在' })
  try {
    const images = await listNoteImages(req.userId, [id])
    await Promise.all(images.map((image) => removeObject(image.object_key)))
    res.json({ ok: Boolean(await deleteNote(req.userId, id)) })
  } catch { res.status(500).json({ error: '删除备忘失败，请稍后重试' }) }
})

router.post('/:id/images', express.raw({ type: () => true, limit: MAX_NOTE_IMAGE_BYTES }), async (req, res) => {
  const noteId = parseInteger(req.params.id)
  if (!noteId) return res.status(400).json({ error: '备忘不存在' })
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: '请选择要上传的图片' })
  if (req.body.length > MAX_NOTE_IMAGE_BYTES) return res.status(413).json({ error: '单张图片不能超过 8 MB' })
  const imageType = detectImageType(req.body)
  if (!imageType) return res.status(415).json({ error: '仅支持 JPG、PNG、GIF、WebP 图片' })
  try {
    const [note, images] = await Promise.all([getNote(req.userId, noteId), listNoteImages(req.userId, [noteId])])
    if (!note) return res.status(404).json({ error: '备忘不存在' })
    if (images.length >= MAX_NOTE_IMAGES) return res.status(400).json({ error: `每条记录最多保存 ${MAX_NOTE_IMAGES} 张图片` })
    const year = note.month_key.slice(0, 4)
    const objectKey = `notes-images/${year}/${note.month_key}/${req.userId}/${crypto.randomUUID()}.${imageType.extension}`
    // 即使同一 OSS Bucket 中的其他资源是公开读，笔记附件也必须覆盖为私有对象。
    // 浏览器只能经下方已鉴权的 API 读取，不能凭 OSS 对象地址绕过记录归属校验。
    await (await getOssClient()).put(objectKey, req.body, {
      headers: {
        'Content-Type': imageType.contentType,
        'x-oss-object-acl': 'private'
      }
    })
    try {
      const image = await createNoteImage(req.userId, noteId, {
        objectKey,
        fileName: getUploadFileName(req),
        contentType: imageType.contentType,
        byteSize: req.body.length
      })
      res.status(201).json({ image: serializeImage(image) })
    } catch (error) {
      await removeObject(objectKey)
      throw error
    }
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status === 503 ? error.message : '图片上传失败，请稍后重试' })
  }
})

router.get('/:id/images/:imageId', async (req, res) => {
  const noteId = parseInteger(req.params.id)
  const imageId = parseInteger(req.params.imageId)
  if (!noteId || !imageId) return res.status(404).end()
  try {
    const image = await getNoteImage(req.userId, noteId, imageId)
    if (!image) return res.status(404).end()
    const result = await (await getOssClient()).get(image.object_key)
    res.setHeader('Content-Type', image.content_type)
    res.setHeader('Content-Disposition', 'inline')
    res.setHeader('Cache-Control', 'private, max-age=86400')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(result.content)
  } catch (error) {
    appLog('ERROR', `灵感备忘图片读取失败: note=${noteId}, image=${imageId}, error=${error.message}`)
    res.status(error.status === 404 ? 404 : 502).end()
  }
})

router.delete('/:id/images/:imageId', async (req, res) => {
  const noteId = parseInteger(req.params.id)
  const imageId = parseInteger(req.params.imageId)
  if (!noteId || !imageId) return res.status(400).json({ error: '图片不存在' })
  try {
    const image = await getNoteImage(req.userId, noteId, imageId)
    if (!image) return res.status(404).json({ error: '图片不存在' })
    await removeObject(image.object_key)
    await deleteNoteImage(req.userId, noteId, imageId)
    res.json({ ok: true })
  } catch { res.status(500).json({ error: '删除图片失败，请稍后重试' }) }
})

router.post('/ai-analysis', async (req, res) => {
  const monthKey = req.body?.monthKey
  if (!MONTH_RE.test(monthKey || '')) return res.status(400).json({ error: '请选择要分析的月份' })
  try {
    const notes = await listNotes(req.userId, monthKey)
    if (!notes.length) return res.json({ report: '这个月份还没有记录。先写下一条灵感，再让 AI 帮你梳理。' })
    const context = notes.map(({ category, status, tags, title, content }) => ({ category, status: status || '无状态', tags: JSON.parse(tags || '[]'), title, content }))
    const prompt = '你是个人灵感档案分析助手。基于用户当月的想法、Vibe Coding、备忘和梦境记录，输出简洁中文 Markdown：先归纳 2-4 个主题，再挑出最值得继续探索的方向，最后指出可能重复、过于宽泛或需要补充的信息。不要把想法写成待办，不要替用户做价值判断。控制在 500 字内。'
    res.json({ report: await callDeepSeek(prompt, JSON.stringify(context)) })
  } catch (error) {
    appLog('ERROR', `灵感备忘 AI 分析失败: uid=${req.userId}, error=${error.message}`)
    res.status(500).json({ error: 'AI 分析失败，请稍后重试' })
  }
})

router.post('/seed-august-2026', async (req, res) => {
  try {
    if (await countNotes(req.userId)) return res.status(409).json({ error: '已有备忘，示例仅可用于空白档案' })
    const samples = [
      ['idea', null, '外包与正式员工的边界', '什么时候可以不做外包？什么时候国家根基动摇到外包也可以轻易转为正式员工？'],
      ['idea', null, '近二百年政权彻底推翻史', '二战后发生过一个政权被彻底推翻的情况吗？从亚洲开始了解、学习各国近二百年的历史。'],
      ['idea', null, '什么都可以买的思想', '孙宇晨。'],
      ['idea', null, '通古今之变', '成一家之言，知晓古今的区别和联系：通讯、交通、作战、生活方式和生活观念。'],
      ['idea', null, '当代历史：每个人都可以编史', ''],
      ['idea', null, '个人开法院', '最后都是想要一个公正的判决，自己手搓一个。'],
      ['idea', null, '集体翻墙思考', ''],
      ['idea', null, '人工智能打电话回访', '有人接吗？'],
      ['idea', null, '成语接龙破解器', ''],
      ['idea', null, '小时候的翻纸牌游戏', ''],
      ['idea', null, '俄罗斯方块式的人才拼接', '需要不同技能的人士拼接填充缝隙。'],
      ['idea', null, '不断出现更强的 Boss', '跟沙鲁一样。'],
      ['idea', null, '古代画变照片', ''],
      ['idea', null, '路易十六第一视角', ''],
      ['idea', null, '每个人的 IT 系统', '把核心、决策、生活系统拆成 IT 系统运维。'],
      ['idea', null, '钱的来源与上下游', '仔细分析。'],
      ['idea', null, '五十岁人员专门选拔制', '专门选老人任职，类似东汉太学。'],
      ['idea', null, '地方有名割据列入', '例如新朝。'],
      ['idea', null, '各国当官标准与党选举制', ''],
      ['idea', null, '现代招募死士', '发房子、编制俯拾即得、工资高福利好；人气肯定非常高。'],
      ['idea', null, '古代朝代问题库', '宦官当政、外戚干政、朋党之争、藩镇割据、农民起义、外族入侵、官商勾结。'],
      ['idea', null, '古代就是现代，现代就是未来', ''],
      ['idea', null, '历任皇帝开疆拓土排行榜', ''],
      ['idea', null, '古代职业与现代职业对战关系', '做成视频，SVG 生图。'],
      ['idea', null, '提示词工程', ''],
      ['idea', null, '当代冲突换成古文播报', '比如美伊冲突，配音抄现成的。'],
      ['idea', null, '快速添加人物信息的 Skill', '网页录入姓名、生卒年月、寿命、主要事迹及当时年纪、死亡原因，并补充典故。'],
      ['idea', null, '人类需要奇迹', '明知不可为而为之。'],
      ['idea', null, '现代代表机构中的平民', '人民代表大会、政协会议中有多少真正平民？革命成功是否被掠夺？'],
      ['idea', null, '把“平平的”做成敏感词', ''],
      ['idea', null, '铸币权很重要', '什么时候功劳大到国家把铸币权都给个人？'],
      ['idea', null, '不可言说的红色家族', '现代通讯设备对世家大族的影响；后代关系、托亲戚找关系。'],
      ['idea', null, '千年公共工程', '古代人修的长城现在人还在用；现代人交的税希望千年后还能使用。'],
      ['idea', null, '著作版权很重要', '看看能不能搞一个。'],
      ['idea', null, '战时信息隐瞒与前后方', '战败真相被隐瞒可能造成前线吃紧、后方紧吃。'],
      ['idea', null, '个人工作室的定制项目', '帮人搭建、定制项目、N 年维保，数据本地或云端保存。'],
      ['idea', null, '本地加密，云端保存密文', '本地存密钥，输入后才解密。'],
      ['idea', null, '当代版生活大爆炸', '人工智能时代，放在谢尔顿尚未结婚的时间线。'],
      ['idea', null, '故意穷地方', '防止势力过大。'],
      ['idea', null, '食堂剩余菜量准入', '免费放入人数等于剩余菜量除以每人平均菜量。'],
      ['idea', null, '今日 Token 额度', '用完就不知道说啥好了。'],
      ['idea', null, '古代正月发生过什么大事', '例如武皇退位。'],
      ['idea', null, '财富翻倍计划', '把一块钱翻一亿倍做很多次，顶尖富豪可能已经做到。'],
      ['idea', null, '外包不愿吃甲方食堂', '为什么？'],
      ['idea', null, '历史的修订周期', '历史只有在新朝代开始才有吗？美国史什么时候有？应 50 年或 100 年一修吗？'],
      ['idea', null, '颠倒黑白时期', '例如来俊臣、两张时期。'],
      ['idea', null, '领导人年龄追踪', '习、特、普京今年年龄分别是多少：73、80、73。'],
      ['idea', null, '罗织经', '唐代酷吏来俊臣所著，很多赤裸裸揭露本性的话。'],
      ['idea', null, '体重计划与意志力', '150 斤说明意志力强，160 多非常差，170 及以上需要强烈反思。'],
      ['memo', null, '老房子与 CAD 的记忆', '汽车站马路的屋子、叫卖、外面的风、扔皮球；大学学过一个月 CAD。'],
      ['vibe_coding', 'done', '两表合并：用户 ID 怎么查业务表', ''],
      ['vibe_coding', 'uncertain', '所有人都可以被添加为老婆老公', '按 B 站、抖音、真实周边分类，加图片或视频。'],
      ['vibe_coding', 'uncertain', 'B 站妹子导出', '女性。'],
      ['vibe_coding', 'uncertain', '小时候的纸牌游戏', ''],
      ['vibe_coding', 'uncertain', '简笔画生成器', '比生图更简陋、更快验证创意、更低成本，使用 SVG。'],
      ['vibe_coding', 'uncertain', '语音提问与 AI 语音回答', ''],
      ['vibe_coding', 'uncertain', '征税模拟器', ''],
      ['vibe_coding', 'uncertain', '教学模拟器', '演示物理现象。'],
      ['vibe_coding', 'uncertain', '叽叽喳喳模拟器', '游戏插件模拟弹幕效果。'],
      ['vibe_coding', 'uncertain', '解放战争模拟器', ''],
      ['vibe_coding', 'uncertain', '图片上 CDN', '加快图片、JS 等显示速度；以后规模大了做。'],
      ['vibe_coding', 'done', '自己的博物馆', '跟现在的完全不同。'],
      ['vibe_coding', 'done', '小时候挖洞的游戏', ''],
      ['vibe_coding', 'done', '增加国外时间轴', '支持自助添加人物。'],
      ['vibe_coding', 'done', '当代人物追踪', ''],
      ['vibe_coding', 'done', '更好的加密手段', '公共库、云端只保存密文；私钥本人保存，确保数据安全。'],
      ['vibe_coding', 'done', '地铁每站距离计算', ''],
      ['vibe_coding', 'uncertain', '火柴人或沧海一声笑游戏', ''],
      ['vibe_coding', 'done', '历史轴上的明星人物', '时间轴改为纵轴，用来记录事件和人物。'],
      ['vibe_coding', 'uncertain', '皇帝模拟器、丞相模拟器', '有点想做。'],
      ['vibe_coding', 'uncertain', '模拟驾驶小游戏', '转弯、掉头、变道，含综合和单项练习；有点想做。'],
      ['vibe_coding', 'uncertain', '夜袭日军、大刀进行曲', '有点想做。'],
      ['vibe_coding', 'uncertain', '宠物模拟器', '例如哈基米、大狗，蹭蹭热点。'],
      ['vibe_coding', 'done', '小人打架投注与期望计算器', '快速投注模式、彩票模拟器、世界杯模拟器、攒钱时间计算。'],
      ['vibe_coding', 'done', '蛙生功能', '法力值、攻击力、生命值、稀有度、名称、效果、随从类型、版本类型、硬核模式与全部狂野卡牌。'],
      ['vibe_coding', 'done', '黄粱一梦模拟器', '给定模板，写出未来发展方向。'],
      ['vibe_coding', 'done', '抵御域外心魔', '记录、自定义心魔与正向行为、成就、数据看板与 AI 每周分析。'],
      ['vibe_coding', 'uncertain', 'APM 研究', '链路报错怎么回事，APM 对 CCE 集群的监控。'],
      ['vibe_coding', 'done', '架构系统 fastjson 漏洞修复', ''],
      ['vibe_coding', 'done', '进程和端口监控研究', '初步完成。'],
      ['vibe_coding', 'done', '自动填报巡检工单', ''],
      ['vibe_coding', 'done', '自动获取用户信息插件', ''],
      ['vibe_coding', 'done', '炉石平衡调整', '邪恶的虚鳞纳迦，卡牌图片调整。'],
      ['vibe_coding', 'done', '炉石新增卡牌', '蛙生、灵魂献祭、绝境贿赂。']
    ]
    const notes = await Promise.all(samples.map(([category, status, title, content], index) => {
      const day = String((index % 31) + 1).padStart(2, '0')
      const hour = String(8 + (index % 14)).padStart(2, '0')
      const createdAt = `2026-08-${day}T${hour}:33:23.000+08:00`
      return createNote(req.userId, { monthKey: '2026-08', category, status, tags: [], title, content, createdAt })
    }))
    res.json({ notes: notes.map(serialize) })
  } catch { res.status(500).json({ error: '导入示例失败，请稍后重试' }) }
})

export default router
