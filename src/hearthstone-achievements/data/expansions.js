/**
 * 炉石传说扩展包/版本数据索引
 * 新增版本时在此处注册即可
 */
import emeraldDream from './achievements/emerald-dream.json'
import violetHold from './achievements/violet-hold.json'
import cataclysm from './achievements/cataclysm.json'
import ungoro from './achievements/ungoro.json'
import cavernsOfTime from './achievements/caverns-of-time.json'

// 版本列表（按展示顺序排列，新的放前面）
export const expansions = [violetHold, cataclysm, cavernsOfTime, ungoro, emeraldDream]

/**
 * 按ID获取版本数据
 */
export const getExpansionById = (id) => expansions.find((exp) => exp.id === id)
