// 人物生平接口调用：输入人名，返回纯文本年谱
// 请求经由本站 /api/biography 代理转发到 DeepSeek，鉴权头在服务端注入，前端不接触密钥

const MODEL = 'deepseek-chat'

const SYSTEM_PROMPT = `你是一位严谨的中国史人物年谱整理助手。用户输入一个人名，你按下面固定的纯文本格式整理其生平。只输出这几行纯文本，不要输出 markdown、代码块、标题或任何额外说明。

格式模板：
姓名（出生年—死亡年），朝代身份
时间，XX岁，事件简述。
时间，XX岁，事件简述。
卒年死因，终年XX岁

示例（苏武，出使、被扣、牧羊是一件事的连续经过，合并成一行）：
苏武（前140年—前60年），西汉外交家
前100年，40岁，以中郎将持节出使匈奴，副使张胜卷入匈奴内乱受牵连被扣，拒降卫律威逼，被迁至北海牧羊，留居十九年持汉节不屈。
前81年，59岁，汉匈和亲，汉使寻得苏武下落，获释归汉，拜典属国。
前80年，60岁，因子苏元卷入上官桀谋反案受牵连被免官。
前60年病逝，终年80岁

示例（上官桀，注意每行都打包了相邻年份的相关事件，全文只有三行事迹，饱满不零散。就按这个密度来写）：
上官桀（不详—前80年），西汉外戚大臣
前87年，受汉武帝遗诏辅政少帝刘弗陵，与霍光、金日磾同领尚书事。前86年，封安阳侯。
前85年，其子上官安娶霍光女为妻，家族与霍氏结为姻亲。前84年，上官安之女上官氏被立为皇后，上官桀以上官安封桑乐侯、进拜车骑将军。
前81年，联合桑弘羊、燕王刘旦谋诛霍光、废昭帝，事泄被霍光先发举奏。前80年，被族诛。
前80年被诛，终年不详

示例（王莽，注意全部用数字年份，正文里绝不出现"始建国""天凤"等年号字样；年代改元只写"称帝建国，国号新"）：
王莽（前45年—23年），新朝开国皇帝
前22年，23岁，入朝为黄门侍郎，迁射声校尉。前16年，29岁，封新都侯，迁光禄大夫、骑都尉。
前8年，37岁，代王根为大司马辅政。前1年，44岁，哀帝崩，复任大司马，迎立平帝。
6年，50岁，鸩杀平帝，立孺子婴，自称"假皇帝"摄政。9年，53岁，废孺子婴称帝，国号新，推行王田、私属、五均六筦及币制改革。
17年，61岁，改制失败，绿林、赤眉相继起义。23年，67岁，绿林军攻入长安，王莽被杀于渐台。
23年被杀，终年67岁

规则：
1. 第一行：姓名（出生年—死亡年），朝代+身份（如"西汉外交家""北宋文学家"）。生卒年用破折号"—"连接。
2. **纪年一律用数字年份，全文严禁出现年号字样**：所有时间必须写成"前XXX年"（公元前）或"XXX年"（公元后），已知月日的补在年后（如 1037年1月8日、23年10月6日、1368年正月）。**绝对禁止以年号纪年或在正文提及年号**，例如"始建国元年""天凤四年""建安十三年""年号洪武""建元洪武""改元居摄"等一律不允许——把年号换算成对应公元年份后直接写事，正文里也绝不留年号二字（如称帝就写"称帝，国号大明"，不要写"年号洪武"）。提到皇帝时用姓名或庙号，**不要用年号代指**（不要写"洪武借此废丞相"，写"朱元璋借此废丞相"）。公元前的"前"字不能漏也不能多：公元3年写"3年"，公元前3年写"前3年"。不可考写"不详"，绝不用问号"?"或波浪号"~"。不要用"——"连接两个年份表示时间范围，跨多年的事件只写起始年份，跨度在正文里用文字说明（如"留居匈奴十九年"）。同一行内的多个事件也必须按年份由早到晚排列，不要把早年的事写到晚年后面。
   年号换算示例：王莽"始建国元年"=9年，"天凤四年"=17年，"地皇四年"=23年；汉武帝"元狩四年"=前119年；"洪武元年"=1368年。
3. 中间每行写事迹，按时间由早到晚。每个子事件的格式为"时间，XX岁，事件简述。"年纪按周岁，用年份数字直接相减：公元前用大数减小数（例：生于前140年，前100年时为 140-100=40 岁，前81年时为 140-81=59 岁），公元后年份直接相减；跨公元前后的，年纪=公元后年份+公元前年份-1（例：生于前45年，3年时为 45+3-1=47 岁）。**若生年不可考导致年纪算不出，则整段"XX岁，"必须省略，直接写"时间，事件简述。"，绝不能写"不详"占位**。文字简洁，每件事一句话即可。**事件行年份必须写确定的数字年份，行首不能加“约”字**；“约”仅可用于首行不确定的生年。
   **行数限制（最高优先级，违反即为失败）**：首行与末行之间的事迹行**严格不超过 5 行，3-5 行最佳**。从整个人生中只挑选最关键的 3-5 个转折点（如出仕/登基、最重大功业、人生转折、失势/被废），其余次要的升迁、封赏、琐事、细碎年份全部舍去或并入相邻行。对于在世或近现代人物，最后一条事迹必须写到最近可考的状态，不能停在多年前。像示例那样把同一阶段、相邻年份的几件事打包进同一行，行间用句号衔接。同一年的事件必须在同一行。跨多年的事件用起始年份，跨度在正文写明（如"留居匈奴十九年"），不要写"前100年—前81年"这种范围。
4. 最后一行单独写死亡，以卒年开头、句末写"终年XX岁"，中间不加句号，格式如"前60年病逝，终年80岁"。终年必须是整数周岁（由生卒年推算），实在无法确定才写"终年不详"。
   **死因详略规则**：
   - 自然病逝、年老善终：死因简写为"病逝"或"病卒"即可，如"前60年病逝，终年80岁"。
   - 非正常死亡（被杀、赐死、毒死、自杀、战死、饿死、腰斩、凌迟等）：要写一句稍详细的经过，交代**是谁、以何种方式、在何种情形下**致死，但不超过两小句、三四十字。例如"23年，绿林军攻入长安，王莽被商人杜吴杀于渐台，终年67岁""198年，因反对曹操进位魏王，被曹操赐毒酒鸩杀，终年58岁""前208年，与赵高争权失败，被腰斩于咸阳闹市，夷三族，终年72岁""978年七夕，被宋太宗以牵机药毒杀，终年42岁"。
   - 死因用一个准确的说法，不要堆砌近义词（如不要写"战死被杀"）。
   - **死亡经过只写在最后这一行**，前面的事迹行里不要描述死亡情形（不要出现"X年被杀""X年病逝"等），以免和末行重复。
   **若死亡发生在最后一个事迹行的同一年，把该事迹并进上一行，不要让事迹行和死亡行年份相同。**
5. 生卒年有争议时取通行说法，正文里不写争议或注释，也不要编造没有史料依据的细节。**不要把庙号、谥号、陵号、追赠等身后名单独列为事迹行**（这些不是生平事迹，一概不写）。
6. 不空行、不加序号、不加 markdown 符号，每行就是一个自然段落。第一行末尾不加句号；中间事迹行末尾加句号（一行内多个事件各自以句号结尾）；最后一行不加句号。`

export async function fetchBiography(name) {
  const res = await fetch('/api/biography', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: name }
      ],
      temperature: 0.1,
      // 硬上限：5 行密集事迹约 600-800 tokens，留足余量；防止模型失控写十几行
      max_tokens: 1500
    })
  })

  // 响应体只能读一次：先统一读成文本，再尝试按 JSON 解析
  const raw = await res.text()
  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    // 不是 JSON（可能是代理返回的 HTML 错误页），保留原始文本
  }

  if (!res.ok) {
    const detail = data?.error?.message || data?.message || raw || '无响应内容'
    throw new Error(`接口请求失败（HTTP ${res.status}）：${detail}`)
  }

  if (!data) {
    throw new Error(`接口返回了非 JSON 内容：${raw.slice(0, 200)}`)
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('接口未返回有效内容')
  }
  return normalize(content.trim())
}

// 对模型输出做轻量规范化，纠正它偶尔不遵守格式的小问题
function normalize(text) {
  let lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // 第一行生卒年里出现的问号（半角/全角）统一改成"不详"
      if (line.includes('（') && line.includes('—')) {
        line = line.replace(/[?？]/g, '不详')
      }
      // 事件年份不能使用“约”，避免被后续行格式过滤掉。
      line = line.replace(/^约(?=前?\d{1,4}年)/, '')
      // 删掉正文中残留的年号字样（如"年号洪武""改元居摄""神龙元年"）
      line = line
        .replace(/[，、；。]?\s*(?:年号|建元|改元)\s*[\u4e00-\u9fa5]{1,6}/g, '')
        .replace(/[，、；。]?\s*[\u4e00-\u9fa5]{2,4}元年(?:正月|闰?[一二三四五六七八九十冬腊]{1,2}月)?/g, '')
        // 把"前XXX年，YY岁—ZZZ年"或"XXX年，YY岁—ZZZ年"的年份范围截断为起始年
        .replace(/(前?\d{1,4}年，\s*\d{1,3}岁)\s*[—–-]\s*前?\d{1,4}年/g, '$1')
        // 把行首"前XXX年—前YYY年"或"XXX年—YYY年"的范围截断为起始年
        .replace(/^(前?\d{1,4})年\s*[—–-]\s*前?\d{1,4}年/, '$1年')
        // 把"27岁至30岁"这种年龄范围改为起始年龄
        .replace(/(\d{1,3})岁\s*[至到—–-]\s*\d{1,3}岁/g, '$1岁')
        // 去掉末行可能重复的年份前缀（如"1101年，1101年7月28日，" → "1101年7月28日，"）
        .replace(/^((?:前)?\d{1,4}年)[，,]\s*((?:前)?\d{1,4}年)/, '$2')
        .replace(/，{2,}/g, '，')
        .replace(/^[，、；。]/, '')
        .replace(/[，、；。]+$/g, (m) => (m.includes('。') ? '。' : ''))
      return line
    })

  // 过滤掉首行与末行之间不以年份开头的行（模型偶发输出的庙号谥号等非事迹行）
  if (lines.length >= 3) {
    const header = lines[0]
    const death = lines[lines.length - 1]
    const events = lines.slice(1, -1).filter((l) => /^前?\d+年/.test(l))
    // 事件行按首个年份由早到晚排序（公元前记为负数），纠正模型偶发的乱序
    events.sort((a, b) => yearSortKey(a) - yearSortKey(b))
    lines = [header, ...events, death]
  }

  // 末个事迹行若混入了死亡年份的死亡描述，把详情提升到死亡行，再从事迹行删掉那一句
  if (lines.length >= 3) {
    const deathLine = lines[lines.length - 1]
    const lastEventLine = lines[lines.length - 2]
    const deathYear = extractYear(deathLine)
    if (deathYear && lastEventLine.includes(deathYear)) {
      const sentences = lastEventLine
        .split('。')
        .map((s) => s.trim())
        .filter(Boolean)
      const idx = sentences.findIndex((s) => s.includes(deathYear) && hasDeathKeyword(s))
      if (idx !== -1) {
        // 把事迹行里更详细的死亡描述提升为末行
        const detail = sentences[idx]
          .replace(/^前?\d+年(?:[闰正二三四五六七八九十冬腊]{1,2}月)?[，,]\s*(?:\d{1,3}岁[，,]\s*)?/, '')
        const ageMatch = deathLine.match(/终年.+$/)
        lines[lines.length - 1] = `${deathYear}，${detail}，${ageMatch ? ageMatch[0] : '终年不详'}`
        sentences.splice(idx, 1)
      }
      const kept = sentences.join('。')
      if (kept) {
        lines[lines.length - 2] = kept + '。'
      } else {
        lines.splice(lines.length - 2, 1)
      }
    }
  }

  // 事迹行最多保留 5 行：保留早期起点与最近状态，避免截断后只剩年轻经历。
  const MAX_EVENTS = 5
  if (lines.length - 2 > MAX_EVENTS) {
    const header = lines[0]
    const death = lines[lines.length - 1]
    const allEvents = lines.slice(1, -1)
    const indexes = new Set([0, allEvents.length - 1])
    for (let index = 1; index <= MAX_EVENTS - 2; index += 1) {
      indexes.add(Math.round((index * (allEvents.length - 1)) / (MAX_EVENTS - 1)))
    }
    const events = [...indexes].sort((a, b) => a - b).map((index) => allEvents[index])
    lines = [header, ...events, death]
  }

  // 模型遗漏终年时，根据首行中可计算的生卒年补齐；避免“终年不详”覆盖已知数字。
  if (lines.length >= 2) {
    const lifeMatch = lines[0].match(/（\s*(约?前?\d+年)\s*[—–-]\s*(约?前?\d+年|不详|[？?]+)\s*）/)
    if (lifeMatch) {
      const age = calcLifeAge(lifeMatch[1], lifeMatch[2])
      const lastIndex = lines.length - 1
      if (!lines[lastIndex].includes('终年')) {
        lines[lastIndex] = `${lines[lastIndex].replace(/[。.]+$/, '')}，${age === null ? '终年不详' : `终年${age}岁`}`
      } else if (age !== null && /终年不详/.test(lines[lastIndex])) {
        lines[lastIndex] = lines[lastIndex].replace(/终年不详/, `终年${age}岁`)
      }
    }
  }

  // 末行（死亡行）末尾不加句号
  if (lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[。.]+$/, '')
  }

  return lines.join('\n')
}

// 取一行开头年份用于排序：公元前返回负数，公元后返回正数
function yearSortKey(line) {
  const bc = line.match(/^前(\d+)年/)
  if (bc) return -Number(bc[1])
  const ad = line.match(/^(\d+)年/)
  if (ad) return Number(ad[1])
  return 0
}

// 提取一行开头的年份（公元前/公元后，含年月日时取年），无则返回 null
function extractYear(line) {
  const bc = line.match(/^前(\d+)年/)
  if (bc) return '前' + bc[1] + '年'
  const ad = line.match(/^(\d+)年/)
  if (ad) return ad[1] + '年'
  return null
}

function calcLifeAge(birthStr, deathStr) {
  if (!birthStr || !deathStr || /不详|？|\?/.test(birthStr) || /不详|？|\?/.test(deathStr)) return null
  const birthIsBc = birthStr.includes('前')
  const deathIsBc = deathStr.includes('前')
  const birth = Number.parseInt(birthStr.replace(/^约?前?/, ''), 10)
  const death = Number.parseInt(deathStr.replace(/^约?前?/, ''), 10)
  if (Number.isNaN(birth) || Number.isNaN(death)) return null
  if (!birthIsBc && !deathIsBc) return death - birth
  if (birthIsBc && deathIsBc) return birth - death
  if (birthIsBc && !deathIsBc) return birth + death - 1
  return null
}

// 判断一行是否描述了死亡（用于过滤与死亡行重复的事迹行）
function hasDeathKeyword(line) {
  return /病逝|病卒|病亡|卒于|去世|过[逝世]|死亡|薨|崩|被诛|族诛|伏诛|诛杀|被杀|杀害|所杀|杀于|遇害|见杀|杀身|身死|斩杀|擒杀|击杀|射杀|缢杀|绞杀|坑杀|扼杀|赐死|自杀|自缢|自裁|自尽|自焚|战死|阵亡|遇弑|弑杀|毒死|鸩杀|药杀|处斩|斩首|腰斩|弃市|凌迟|饿死|溺死|吓死|忧死/.test(line)
}
