// 核心（有经验值）版本 ID 列表 —— 单一事实来源。
// 服务端（AI 建议上下文过滤）与前端（originalExpansions）共用，避免两处列表漂移。
const CORE_EXPANSION_IDS = [
  'violet-hold',
  'cataclysm',
  'caverns-of-time',
  'ungoro',
  'emerald-dream',
  'deepdark',
  'perils-in-paradise',
  'whizbang',
  'badlands'
]

export default CORE_EXPANSION_IDS
