// 我自己做的个人项目索引：新增页面只需在这里追加一项
const PERSONAL_APP_ORDER = ['/hearthstone', '/todo', '/notes', '/willpower', '/history', '/biography', '/dream', '/subway']
const personalAppRank = new Map(PERSONAL_APP_ORDER.map((path, index) => [path, index]))

export const vueApps = [
  {
    to: '/hearthstone',
    title: '炉石传说成就档案',
    kicker: '游戏 · 数据浏览',
    summary: '按扩展包/职业浏览炉石传说成就，支持筛选、查看关联卡牌图片、一键复制推荐卡组代码。',
    tags: ['炉石传说', '成就', '卡牌']
  },
  {
    to: '/todo',
    title: '日程管理',
    kicker: '自律 · 效率',
    summary: '按「今日待办 / 今日已完成」管理任务，支持自定义分组、月周日历、全量表格与 AI 日程分析，数据独立存储。',
    tags: ['待办', '分组', '日历', 'AI']
  },
  {
    to: '/notes',
    title: '灵感收集',
    kicker: '记录 · 灵感档案',
    summary: '按月收集想法和 Vibe Coding 灵感；想法不设状态，项目灵感可标记完成、不可能或不确定，并支持 AI 梳理与 JSON 导出。',
    tags: ['想法', 'Vibe Coding', 'AI', '导出']
  },
  {
    to: '/willpower',
    title: '抵御心魔',
    kicker: '自律 · 记录',
    summary: '记录每一次抵御诱惑的瞬间，含计时挑战、成就系统与正能量记录，专属独立账号。',
    tags: ['自律', '成就', '记录']
  },
  {
    to: '/history',
    title: '历史时间线',
    kicker: '历史 · 时间轴',
    summary: '以时间轴梳理中国历朝历代皇帝与大臣，并支持切换世界各地区历史；可关键词搜索、可添加自定义人物。纯本地数据，无需联网。',
    tags: ['历史', '时间轴', '中国', '世界']
  },
  {
    to: '/dream',
    title: '黄粱一梦',
    kicker: 'AI · 人生模拟',
    summary: '写下当前年龄、期望寿命与人生野心，由 DeepSeek 为你烹一锅按时间线铺陈的人间大梦。',
    tags: ['AI', 'DeepSeek', '模拟']
  },
  {
    to: '/hearthstone/deck',
    title: '炉石卡组代码解析',
    kicker: '游戏 · 工具',
    summary: '粘贴游戏内复制的卡组代码，立即查看卡组构成、法力曲线、合成造价，并支持导出卡组图片。',
    tags: ['炉石传说', '卡组', '工具']
  },
  {
    to: '/hearthstone/lookup',
    title: '炉石卡牌查询',
    kicker: '游戏 · 工具',
    summary: '输入卡牌名称或 dbfId，查看卡图、效果与背景描述，并自检卡牌库登记、卡图 manifest 与 OSS 图片是否就绪。',
    tags: ['炉石传说', '卡牌', '查询', '自检']
  },
  {
    to: '/crazy-people',
    title: '疯狂的人',
    kicker: '互动 · 小游戏',
    summary: '密闭空间发疯小人全自动演示，可化身「上帝之手」点角色、拖物体、制造混乱。',
    tags: ['Canvas', '互动', '小游戏']
  },
  {
    to: '/subway',
    title: '北京地铁 · 站站距离',
    kicker: '工具 · 交通',
    summary: '覆盖北京全部运营线路与车站，支持站站最短距离规划、手动指定换乘线路，以及按线路浏览逐站距离。纯本地计算，无需联网。',
    tags: ['地铁', '北京', '路线', '距离']
  },
  {
    to: '/aiops',
    title: 'AIOps 智能运维控制台',
    kicker: '运维 · 控制台',
    summary: '告警筛选、根因分析、MCP 证据与 AI 助手的智能运维演示界面。',
    tags: ['AIOps', 'MCP', 'DeepSeek']
  },
  {
    to: '/age-calculator',
    title: '年龄计算器',
    kicker: '工具 · 计算器',
    summary: '输入出生年份与特定年份，支持公元前、跨纪元与停止输入后自动计算。',
    tags: ['年龄', '计算器']
  },
  {
    to: '/biography',
    title: '人物生平 · 纪年查询',
    kicker: 'AI · 历史',
    summary: '输入历史人物姓名，由 DeepSeek 输出可直接复制的纯文本年谱：生卒年、主要事迹及当时年纪、死因与终年。',
    tags: ['AI', 'DeepSeek', '历史', '年谱']
  }
].sort((a, b) => (personalAppRank.get(a.to) ?? 100) - (personalAppRank.get(b.to) ?? 100))
