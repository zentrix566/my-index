/**
 * 炉石版本名称统一映射（基于官方 /cards/constructed/set 接口 + cards-db.json）
 * ------------------------------------------------------------------
 * 五套标识对齐：
 *   - cardSetId       官方数字版本 id（API / cards-db.cardSetId，最稳定唯一键）
 *   - setName         卡牌官网完整中文版本名（= cards-db.setName = OSS 卡图文件夹名）
 *   - nameEn          官方英文 slug（API name_en，真正的「英文版本名称」）
 *   - achievementId   成就系统英文 id（路由/JSON 文件名/排序 key，手选，≠官方 slug）
 *   - achievementName 成就系统内中文展示名（= 游戏内成就版本名）
 * 纯卡牌版本后两列为 null。
 * 共 45 个（44 来自官方接口 + 经典 id=3 兜底）。
 * 注意：achievementId 与官方 nameEn 多数不同；caverns-of-time 在官方指『时光之穴』，
 *       而成就 id caverns-of-time 指『穿越时间流』（官方 slug 为 across-the-timeways），勿混淆。
 */

export const VERSION_SETS = [
  {
    "cardSetId": 1988,
    "setName": "逃离紫罗兰监狱",
    "nameEn": "escape-from-violet-hold",
    "achievementId": "violet-hold",
    "achievementName": "紫罗兰监狱"
  },
  {
    "cardSetId": 1980,
    "setName": "大地的裂变",
    "nameEn": "cataclysm",
    "achievementId": "cataclysm",
    "achievementName": "大地的裂变"
  },
  {
    "cardSetId": 1957,
    "setName": "穿越时间流",
    "nameEn": "across-the-timeways",
    "achievementId": "caverns-of-time",
    "achievementName": "穿越时间流"
  },
  {
    "cardSetId": 1952,
    "setName": "安戈洛龟途",
    "nameEn": "the-lost-city-of-ungoro",
    "achievementId": "ungoro",
    "achievementName": "安戈洛龟途"
  },
  {
    "cardSetId": 1946,
    "setName": "漫游翡翠梦境",
    "nameEn": "into-the-emerald-dream",
    "achievementId": "emerald-dream",
    "achievementName": "翡翠梦境"
  },
  {
    "cardSetId": 1941,
    "setName": "活动",
    "nameEn": "event",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1935,
    "setName": "深暗领域",
    "nameEn": "the-great-dark-beyond",
    "achievementId": "deepdark",
    "achievementName": "深暗领域"
  },
  {
    "cardSetId": 1905,
    "setName": "胜地历险记",
    "nameEn": "perils-in-paradise",
    "achievementId": "perils-in-paradise",
    "achievementName": "胜地历险记"
  },
  {
    "cardSetId": 1898,
    "setName": "时光之穴",
    "nameEn": "caverns-of-time",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1897,
    "setName": "威兹班的工坊",
    "nameEn": "whizbangs-workshop",
    "achievementId": "whizbang",
    "achievementName": "威兹班"
  },
  {
    "cardSetId": 1892,
    "setName": "决战荒芜之地",
    "nameEn": "showdown-in-the-badlands",
    "achievementId": "badlands",
    "achievementName": "荒芜之地"
  },
  {
    "cardSetId": 1869,
    "setName": "阿尔萨斯之路",
    "nameEn": "path-of-arthas",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1858,
    "setName": "泰坦诸神",
    "nameEn": "titans",
    "achievementId": "titan",
    "achievementName": "泰坦诸神"
  },
  {
    "cardSetId": 1809,
    "setName": "传奇音乐节",
    "nameEn": "festival-of-legends",
    "achievementId": "legend-festival",
    "achievementName": "传奇音乐节"
  },
  {
    "cardSetId": 1776,
    "setName": "巫妖王的进军",
    "nameEn": "march-of-the-lich-king",
    "achievementId": "lich-king",
    "achievementName": "巫妖王"
  },
  {
    "cardSetId": 1691,
    "setName": "纳斯利亚堡的悬案",
    "nameEn": "murder-at-castle-nathria",
    "achievementId": "nathria",
    "achievementName": "纳斯利亚堡"
  },
  {
    "cardSetId": 1658,
    "setName": "探寻沉没之城",
    "nameEn": "voyage-to-the-sunken-city",
    "achievementId": "sunken-city",
    "achievementName": "沉没之城"
  },
  {
    "cardSetId": 1637,
    "setName": "核心",
    "nameEn": "core",
    "achievementId": [
      "core-2021",
      "core-2022",
      "core-2023"
    ],
    "achievementName": [
      "核心（独狼年）",
      "核心（多头蛇年）",
      "核心（狮鹫年）"
    ]
  },
  {
    "cardSetId": 1635,
    "setName": "怀旧",
    "nameEn": "legacy",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1626,
    "setName": "奥特兰克的决裂",
    "nameEn": "fractured-in-alterac-valley",
    "achievementId": "alterac",
    "achievementName": "奥特兰克"
  },
  {
    "cardSetId": 1578,
    "setName": "暴风城下的集结",
    "nameEn": "united-in-stormwind",
    "achievementId": "stormwind",
    "achievementName": "暴风城"
  },
  {
    "cardSetId": 1525,
    "setName": "贫瘠之地的锤炼",
    "nameEn": "forged-in-the-barrens",
    "achievementId": "barrens",
    "achievementName": "贫瘠之地"
  },
  {
    "cardSetId": 1466,
    "setName": "疯狂的暗月马戏团",
    "nameEn": "madness-at-the-darkmoon-faire",
    "achievementId": "darkmoon",
    "achievementName": "暗月马戏团"
  },
  {
    "cardSetId": 1463,
    "setName": "恶魔猎手新兵",
    "nameEn": "demonhunter-initiate",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1443,
    "setName": "通灵学园",
    "nameEn": "scholomance-academy",
    "achievementId": "scholomance",
    "achievementName": "通灵学园"
  },
  {
    "cardSetId": 1414,
    "setName": "外域的灰烬",
    "nameEn": "ashes-of-outland",
    "achievementId": "outland",
    "achievementName": "外域的灰烬"
  },
  {
    "cardSetId": 1403,
    "setName": "迦拉克隆的觉醒",
    "nameEn": "galakronds-awakening",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1347,
    "setName": "巨龙降临",
    "nameEn": "descent-of-dragons",
    "achievementId": "dragons",
    "achievementName": "巨龙降临"
  },
  {
    "cardSetId": 1158,
    "setName": "奥丹姆奇兵",
    "nameEn": "saviors-of-uldum",
    "achievementId": "uldum",
    "achievementName": "奥丹姆奇兵"
  },
  {
    "cardSetId": 1130,
    "setName": "暗影崛起",
    "nameEn": "rise-of-shadows",
    "achievementId": "rise-of-shadows",
    "achievementName": "暗影崛起"
  },
  {
    "cardSetId": 1129,
    "setName": "拉斯塔哈的大乱斗",
    "nameEn": "rastakhans-rumble",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1127,
    "setName": "砰砰计划",
    "nameEn": "the-boomsday-project",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1125,
    "setName": "女巫森林",
    "nameEn": "the-witchwood",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1004,
    "setName": "狗头人与地下城",
    "nameEn": "kobolds-and-catacombs",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 1001,
    "setName": "冰封王座的骑士",
    "nameEn": "knights-of-the-frozen-throne",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 27,
    "setName": "勇闯安戈洛",
    "nameEn": "journey-to-ungoro",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 25,
    "setName": "龙争虎斗加基森",
    "nameEn": "mean-streets-of-gadgetzan",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 23,
    "setName": "卡拉赞之夜",
    "nameEn": "one-night-in-karazhan",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 21,
    "setName": "上古之神的低语",
    "nameEn": "whispers-of-the-old-gods",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 20,
    "setName": "探险者协会",
    "nameEn": "league-of-explorers",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 15,
    "setName": "冠军的试炼",
    "nameEn": "the-grand-tournament",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 14,
    "setName": "黑石山的火焰",
    "nameEn": "blackrock-mountain",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 13,
    "setName": "地精大战侏儒",
    "nameEn": "goblins-vs-gnomes",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 12,
    "setName": "纳克萨玛斯的诅咒",
    "nameEn": "naxxramas",
    "achievementId": null,
    "achievementName": null
  },
  {
    "cardSetId": 3,
    "setName": "经典",
    "nameEn": "classic",
    "achievementId": null,
    "achievementName": null
  }
]

export const SET_BY_CARDSETID = {
  "3": {
    "cardSetId": 3,
    "setName": "经典",
    "nameEn": "classic",
    "achievementId": null,
    "achievementName": null
  },
  "12": {
    "cardSetId": 12,
    "setName": "纳克萨玛斯的诅咒",
    "nameEn": "naxxramas",
    "achievementId": null,
    "achievementName": null
  },
  "13": {
    "cardSetId": 13,
    "setName": "地精大战侏儒",
    "nameEn": "goblins-vs-gnomes",
    "achievementId": null,
    "achievementName": null
  },
  "14": {
    "cardSetId": 14,
    "setName": "黑石山的火焰",
    "nameEn": "blackrock-mountain",
    "achievementId": null,
    "achievementName": null
  },
  "15": {
    "cardSetId": 15,
    "setName": "冠军的试炼",
    "nameEn": "the-grand-tournament",
    "achievementId": null,
    "achievementName": null
  },
  "20": {
    "cardSetId": 20,
    "setName": "探险者协会",
    "nameEn": "league-of-explorers",
    "achievementId": null,
    "achievementName": null
  },
  "21": {
    "cardSetId": 21,
    "setName": "上古之神的低语",
    "nameEn": "whispers-of-the-old-gods",
    "achievementId": null,
    "achievementName": null
  },
  "23": {
    "cardSetId": 23,
    "setName": "卡拉赞之夜",
    "nameEn": "one-night-in-karazhan",
    "achievementId": null,
    "achievementName": null
  },
  "25": {
    "cardSetId": 25,
    "setName": "龙争虎斗加基森",
    "nameEn": "mean-streets-of-gadgetzan",
    "achievementId": null,
    "achievementName": null
  },
  "27": {
    "cardSetId": 27,
    "setName": "勇闯安戈洛",
    "nameEn": "journey-to-ungoro",
    "achievementId": null,
    "achievementName": null
  },
  "1001": {
    "cardSetId": 1001,
    "setName": "冰封王座的骑士",
    "nameEn": "knights-of-the-frozen-throne",
    "achievementId": null,
    "achievementName": null
  },
  "1004": {
    "cardSetId": 1004,
    "setName": "狗头人与地下城",
    "nameEn": "kobolds-and-catacombs",
    "achievementId": null,
    "achievementName": null
  },
  "1125": {
    "cardSetId": 1125,
    "setName": "女巫森林",
    "nameEn": "the-witchwood",
    "achievementId": null,
    "achievementName": null
  },
  "1127": {
    "cardSetId": 1127,
    "setName": "砰砰计划",
    "nameEn": "the-boomsday-project",
    "achievementId": null,
    "achievementName": null
  },
  "1129": {
    "cardSetId": 1129,
    "setName": "拉斯塔哈的大乱斗",
    "nameEn": "rastakhans-rumble",
    "achievementId": null,
    "achievementName": null
  },
  "1130": {
    "cardSetId": 1130,
    "setName": "暗影崛起",
    "nameEn": "rise-of-shadows",
    "achievementId": "rise-of-shadows",
    "achievementName": "暗影崛起"
  },
  "1158": {
    "cardSetId": 1158,
    "setName": "奥丹姆奇兵",
    "nameEn": "saviors-of-uldum",
    "achievementId": "uldum",
    "achievementName": "奥丹姆奇兵"
  },
  "1347": {
    "cardSetId": 1347,
    "setName": "巨龙降临",
    "nameEn": "descent-of-dragons",
    "achievementId": "dragons",
    "achievementName": "巨龙降临"
  },
  "1403": {
    "cardSetId": 1403,
    "setName": "迦拉克隆的觉醒",
    "nameEn": "galakronds-awakening",
    "achievementId": null,
    "achievementName": null
  },
  "1414": {
    "cardSetId": 1414,
    "setName": "外域的灰烬",
    "nameEn": "ashes-of-outland",
    "achievementId": "outland",
    "achievementName": "外域的灰烬"
  },
  "1443": {
    "cardSetId": 1443,
    "setName": "通灵学园",
    "nameEn": "scholomance-academy",
    "achievementId": "scholomance",
    "achievementName": "通灵学园"
  },
  "1463": {
    "cardSetId": 1463,
    "setName": "恶魔猎手新兵",
    "nameEn": "demonhunter-initiate",
    "achievementId": null,
    "achievementName": null
  },
  "1466": {
    "cardSetId": 1466,
    "setName": "疯狂的暗月马戏团",
    "nameEn": "madness-at-the-darkmoon-faire",
    "achievementId": "darkmoon",
    "achievementName": "暗月马戏团"
  },
  "1525": {
    "cardSetId": 1525,
    "setName": "贫瘠之地的锤炼",
    "nameEn": "forged-in-the-barrens",
    "achievementId": "barrens",
    "achievementName": "贫瘠之地"
  },
  "1578": {
    "cardSetId": 1578,
    "setName": "暴风城下的集结",
    "nameEn": "united-in-stormwind",
    "achievementId": "stormwind",
    "achievementName": "暴风城"
  },
  "1626": {
    "cardSetId": 1626,
    "setName": "奥特兰克的决裂",
    "nameEn": "fractured-in-alterac-valley",
    "achievementId": "alterac",
    "achievementName": "奥特兰克"
  },
  "1635": {
    "cardSetId": 1635,
    "setName": "怀旧",
    "nameEn": "legacy",
    "achievementId": null,
    "achievementName": null
  },
  "1637": {
    "cardSetId": 1637,
    "setName": "核心",
    "nameEn": "core",
    "achievementId": [
      "core-2021",
      "core-2022",
      "core-2023"
    ],
    "achievementName": [
      "核心（独狼年）",
      "核心（多头蛇年）",
      "核心（狮鹫年）"
    ]
  },
  "1658": {
    "cardSetId": 1658,
    "setName": "探寻沉没之城",
    "nameEn": "voyage-to-the-sunken-city",
    "achievementId": "sunken-city",
    "achievementName": "沉没之城"
  },
  "1691": {
    "cardSetId": 1691,
    "setName": "纳斯利亚堡的悬案",
    "nameEn": "murder-at-castle-nathria",
    "achievementId": "nathria",
    "achievementName": "纳斯利亚堡"
  },
  "1776": {
    "cardSetId": 1776,
    "setName": "巫妖王的进军",
    "nameEn": "march-of-the-lich-king",
    "achievementId": "lich-king",
    "achievementName": "巫妖王"
  },
  "1809": {
    "cardSetId": 1809,
    "setName": "传奇音乐节",
    "nameEn": "festival-of-legends",
    "achievementId": "legend-festival",
    "achievementName": "传奇音乐节"
  },
  "1858": {
    "cardSetId": 1858,
    "setName": "泰坦诸神",
    "nameEn": "titans",
    "achievementId": "titan",
    "achievementName": "泰坦诸神"
  },
  "1869": {
    "cardSetId": 1869,
    "setName": "阿尔萨斯之路",
    "nameEn": "path-of-arthas",
    "achievementId": null,
    "achievementName": null
  },
  "1892": {
    "cardSetId": 1892,
    "setName": "决战荒芜之地",
    "nameEn": "showdown-in-the-badlands",
    "achievementId": "badlands",
    "achievementName": "荒芜之地"
  },
  "1897": {
    "cardSetId": 1897,
    "setName": "威兹班的工坊",
    "nameEn": "whizbangs-workshop",
    "achievementId": "whizbang",
    "achievementName": "威兹班"
  },
  "1898": {
    "cardSetId": 1898,
    "setName": "时光之穴",
    "nameEn": "caverns-of-time",
    "achievementId": null,
    "achievementName": null
  },
  "1905": {
    "cardSetId": 1905,
    "setName": "胜地历险记",
    "nameEn": "perils-in-paradise",
    "achievementId": "perils-in-paradise",
    "achievementName": "胜地历险记"
  },
  "1935": {
    "cardSetId": 1935,
    "setName": "深暗领域",
    "nameEn": "the-great-dark-beyond",
    "achievementId": "deepdark",
    "achievementName": "深暗领域"
  },
  "1941": {
    "cardSetId": 1941,
    "setName": "活动",
    "nameEn": "event",
    "achievementId": null,
    "achievementName": null
  },
  "1946": {
    "cardSetId": 1946,
    "setName": "漫游翡翠梦境",
    "nameEn": "into-the-emerald-dream",
    "achievementId": "emerald-dream",
    "achievementName": "翡翠梦境"
  },
  "1952": {
    "cardSetId": 1952,
    "setName": "安戈洛龟途",
    "nameEn": "the-lost-city-of-ungoro",
    "achievementId": "ungoro",
    "achievementName": "安戈洛龟途"
  },
  "1957": {
    "cardSetId": 1957,
    "setName": "穿越时间流",
    "nameEn": "across-the-timeways",
    "achievementId": "caverns-of-time",
    "achievementName": "穿越时间流"
  },
  "1980": {
    "cardSetId": 1980,
    "setName": "大地的裂变",
    "nameEn": "cataclysm",
    "achievementId": "cataclysm",
    "achievementName": "大地的裂变"
  },
  "1988": {
    "cardSetId": 1988,
    "setName": "逃离紫罗兰监狱",
    "nameEn": "escape-from-violet-hold",
    "achievementId": "violet-hold",
    "achievementName": "紫罗兰监狱"
  }
}

export const SET_BY_SETNAME = {
  "逃离紫罗兰监狱": {
    "cardSetId": 1988,
    "setName": "逃离紫罗兰监狱",
    "nameEn": "escape-from-violet-hold",
    "achievementId": "violet-hold",
    "achievementName": "紫罗兰监狱"
  },
  "大地的裂变": {
    "cardSetId": 1980,
    "setName": "大地的裂变",
    "nameEn": "cataclysm",
    "achievementId": "cataclysm",
    "achievementName": "大地的裂变"
  },
  "穿越时间流": {
    "cardSetId": 1957,
    "setName": "穿越时间流",
    "nameEn": "across-the-timeways",
    "achievementId": "caverns-of-time",
    "achievementName": "穿越时间流"
  },
  "安戈洛龟途": {
    "cardSetId": 1952,
    "setName": "安戈洛龟途",
    "nameEn": "the-lost-city-of-ungoro",
    "achievementId": "ungoro",
    "achievementName": "安戈洛龟途"
  },
  "漫游翡翠梦境": {
    "cardSetId": 1946,
    "setName": "漫游翡翠梦境",
    "nameEn": "into-the-emerald-dream",
    "achievementId": "emerald-dream",
    "achievementName": "翡翠梦境"
  },
  "活动": {
    "cardSetId": 1941,
    "setName": "活动",
    "nameEn": "event",
    "achievementId": null,
    "achievementName": null
  },
  "深暗领域": {
    "cardSetId": 1935,
    "setName": "深暗领域",
    "nameEn": "the-great-dark-beyond",
    "achievementId": "deepdark",
    "achievementName": "深暗领域"
  },
  "胜地历险记": {
    "cardSetId": 1905,
    "setName": "胜地历险记",
    "nameEn": "perils-in-paradise",
    "achievementId": "perils-in-paradise",
    "achievementName": "胜地历险记"
  },
  "时光之穴": {
    "cardSetId": 1898,
    "setName": "时光之穴",
    "nameEn": "caverns-of-time",
    "achievementId": null,
    "achievementName": null
  },
  "威兹班的工坊": {
    "cardSetId": 1897,
    "setName": "威兹班的工坊",
    "nameEn": "whizbangs-workshop",
    "achievementId": "whizbang",
    "achievementName": "威兹班"
  },
  "决战荒芜之地": {
    "cardSetId": 1892,
    "setName": "决战荒芜之地",
    "nameEn": "showdown-in-the-badlands",
    "achievementId": "badlands",
    "achievementName": "荒芜之地"
  },
  "阿尔萨斯之路": {
    "cardSetId": 1869,
    "setName": "阿尔萨斯之路",
    "nameEn": "path-of-arthas",
    "achievementId": null,
    "achievementName": null
  },
  "泰坦诸神": {
    "cardSetId": 1858,
    "setName": "泰坦诸神",
    "nameEn": "titans",
    "achievementId": "titan",
    "achievementName": "泰坦诸神"
  },
  "传奇音乐节": {
    "cardSetId": 1809,
    "setName": "传奇音乐节",
    "nameEn": "festival-of-legends",
    "achievementId": "legend-festival",
    "achievementName": "传奇音乐节"
  },
  "巫妖王的进军": {
    "cardSetId": 1776,
    "setName": "巫妖王的进军",
    "nameEn": "march-of-the-lich-king",
    "achievementId": "lich-king",
    "achievementName": "巫妖王"
  },
  "纳斯利亚堡的悬案": {
    "cardSetId": 1691,
    "setName": "纳斯利亚堡的悬案",
    "nameEn": "murder-at-castle-nathria",
    "achievementId": "nathria",
    "achievementName": "纳斯利亚堡"
  },
  "探寻沉没之城": {
    "cardSetId": 1658,
    "setName": "探寻沉没之城",
    "nameEn": "voyage-to-the-sunken-city",
    "achievementId": "sunken-city",
    "achievementName": "沉没之城"
  },
  "核心": {
    "cardSetId": 1637,
    "setName": "核心",
    "nameEn": "core",
    "achievementId": [
      "core-2021",
      "core-2022",
      "core-2023"
    ],
    "achievementName": [
      "核心（独狼年）",
      "核心（多头蛇年）",
      "核心（狮鹫年）"
    ]
  },
  "怀旧": {
    "cardSetId": 1635,
    "setName": "怀旧",
    "nameEn": "legacy",
    "achievementId": null,
    "achievementName": null
  },
  "奥特兰克的决裂": {
    "cardSetId": 1626,
    "setName": "奥特兰克的决裂",
    "nameEn": "fractured-in-alterac-valley",
    "achievementId": "alterac",
    "achievementName": "奥特兰克"
  },
  "暴风城下的集结": {
    "cardSetId": 1578,
    "setName": "暴风城下的集结",
    "nameEn": "united-in-stormwind",
    "achievementId": "stormwind",
    "achievementName": "暴风城"
  },
  "贫瘠之地的锤炼": {
    "cardSetId": 1525,
    "setName": "贫瘠之地的锤炼",
    "nameEn": "forged-in-the-barrens",
    "achievementId": "barrens",
    "achievementName": "贫瘠之地"
  },
  "疯狂的暗月马戏团": {
    "cardSetId": 1466,
    "setName": "疯狂的暗月马戏团",
    "nameEn": "madness-at-the-darkmoon-faire",
    "achievementId": "darkmoon",
    "achievementName": "暗月马戏团"
  },
  "恶魔猎手新兵": {
    "cardSetId": 1463,
    "setName": "恶魔猎手新兵",
    "nameEn": "demonhunter-initiate",
    "achievementId": null,
    "achievementName": null
  },
  "通灵学园": {
    "cardSetId": 1443,
    "setName": "通灵学园",
    "nameEn": "scholomance-academy",
    "achievementId": "scholomance",
    "achievementName": "通灵学园"
  },
  "外域的灰烬": {
    "cardSetId": 1414,
    "setName": "外域的灰烬",
    "nameEn": "ashes-of-outland",
    "achievementId": "outland",
    "achievementName": "外域的灰烬"
  },
  "迦拉克隆的觉醒": {
    "cardSetId": 1403,
    "setName": "迦拉克隆的觉醒",
    "nameEn": "galakronds-awakening",
    "achievementId": null,
    "achievementName": null
  },
  "巨龙降临": {
    "cardSetId": 1347,
    "setName": "巨龙降临",
    "nameEn": "descent-of-dragons",
    "achievementId": "dragons",
    "achievementName": "巨龙降临"
  },
  "奥丹姆奇兵": {
    "cardSetId": 1158,
    "setName": "奥丹姆奇兵",
    "nameEn": "saviors-of-uldum",
    "achievementId": "uldum",
    "achievementName": "奥丹姆奇兵"
  },
  "暗影崛起": {
    "cardSetId": 1130,
    "setName": "暗影崛起",
    "nameEn": "rise-of-shadows",
    "achievementId": "rise-of-shadows",
    "achievementName": "暗影崛起"
  },
  "拉斯塔哈的大乱斗": {
    "cardSetId": 1129,
    "setName": "拉斯塔哈的大乱斗",
    "nameEn": "rastakhans-rumble",
    "achievementId": null,
    "achievementName": null
  },
  "砰砰计划": {
    "cardSetId": 1127,
    "setName": "砰砰计划",
    "nameEn": "the-boomsday-project",
    "achievementId": null,
    "achievementName": null
  },
  "女巫森林": {
    "cardSetId": 1125,
    "setName": "女巫森林",
    "nameEn": "the-witchwood",
    "achievementId": null,
    "achievementName": null
  },
  "狗头人与地下城": {
    "cardSetId": 1004,
    "setName": "狗头人与地下城",
    "nameEn": "kobolds-and-catacombs",
    "achievementId": null,
    "achievementName": null
  },
  "冰封王座的骑士": {
    "cardSetId": 1001,
    "setName": "冰封王座的骑士",
    "nameEn": "knights-of-the-frozen-throne",
    "achievementId": null,
    "achievementName": null
  },
  "勇闯安戈洛": {
    "cardSetId": 27,
    "setName": "勇闯安戈洛",
    "nameEn": "journey-to-ungoro",
    "achievementId": null,
    "achievementName": null
  },
  "龙争虎斗加基森": {
    "cardSetId": 25,
    "setName": "龙争虎斗加基森",
    "nameEn": "mean-streets-of-gadgetzan",
    "achievementId": null,
    "achievementName": null
  },
  "卡拉赞之夜": {
    "cardSetId": 23,
    "setName": "卡拉赞之夜",
    "nameEn": "one-night-in-karazhan",
    "achievementId": null,
    "achievementName": null
  },
  "上古之神的低语": {
    "cardSetId": 21,
    "setName": "上古之神的低语",
    "nameEn": "whispers-of-the-old-gods",
    "achievementId": null,
    "achievementName": null
  },
  "探险者协会": {
    "cardSetId": 20,
    "setName": "探险者协会",
    "nameEn": "league-of-explorers",
    "achievementId": null,
    "achievementName": null
  },
  "冠军的试炼": {
    "cardSetId": 15,
    "setName": "冠军的试炼",
    "nameEn": "the-grand-tournament",
    "achievementId": null,
    "achievementName": null
  },
  "黑石山的火焰": {
    "cardSetId": 14,
    "setName": "黑石山的火焰",
    "nameEn": "blackrock-mountain",
    "achievementId": null,
    "achievementName": null
  },
  "地精大战侏儒": {
    "cardSetId": 13,
    "setName": "地精大战侏儒",
    "nameEn": "goblins-vs-gnomes",
    "achievementId": null,
    "achievementName": null
  },
  "纳克萨玛斯的诅咒": {
    "cardSetId": 12,
    "setName": "纳克萨玛斯的诅咒",
    "nameEn": "naxxramas",
    "achievementId": null,
    "achievementName": null
  },
  "经典": {
    "cardSetId": 3,
    "setName": "经典",
    "nameEn": "classic",
    "achievementId": null,
    "achievementName": null
  }
}

export const SET_BY_NAME_EN = {
  "escape-from-violet-hold": {
    "cardSetId": 1988,
    "setName": "逃离紫罗兰监狱",
    "nameEn": "escape-from-violet-hold",
    "achievementId": "violet-hold",
    "achievementName": "紫罗兰监狱"
  },
  "cataclysm": {
    "cardSetId": 1980,
    "setName": "大地的裂变",
    "nameEn": "cataclysm",
    "achievementId": "cataclysm",
    "achievementName": "大地的裂变"
  },
  "across-the-timeways": {
    "cardSetId": 1957,
    "setName": "穿越时间流",
    "nameEn": "across-the-timeways",
    "achievementId": "caverns-of-time",
    "achievementName": "穿越时间流"
  },
  "the-lost-city-of-ungoro": {
    "cardSetId": 1952,
    "setName": "安戈洛龟途",
    "nameEn": "the-lost-city-of-ungoro",
    "achievementId": "ungoro",
    "achievementName": "安戈洛龟途"
  },
  "into-the-emerald-dream": {
    "cardSetId": 1946,
    "setName": "漫游翡翠梦境",
    "nameEn": "into-the-emerald-dream",
    "achievementId": "emerald-dream",
    "achievementName": "翡翠梦境"
  },
  "event": {
    "cardSetId": 1941,
    "setName": "活动",
    "nameEn": "event",
    "achievementId": null,
    "achievementName": null
  },
  "the-great-dark-beyond": {
    "cardSetId": 1935,
    "setName": "深暗领域",
    "nameEn": "the-great-dark-beyond",
    "achievementId": "deepdark",
    "achievementName": "深暗领域"
  },
  "perils-in-paradise": {
    "cardSetId": 1905,
    "setName": "胜地历险记",
    "nameEn": "perils-in-paradise",
    "achievementId": "perils-in-paradise",
    "achievementName": "胜地历险记"
  },
  "caverns-of-time": {
    "cardSetId": 1898,
    "setName": "时光之穴",
    "nameEn": "caverns-of-time",
    "achievementId": null,
    "achievementName": null
  },
  "whizbangs-workshop": {
    "cardSetId": 1897,
    "setName": "威兹班的工坊",
    "nameEn": "whizbangs-workshop",
    "achievementId": "whizbang",
    "achievementName": "威兹班"
  },
  "showdown-in-the-badlands": {
    "cardSetId": 1892,
    "setName": "决战荒芜之地",
    "nameEn": "showdown-in-the-badlands",
    "achievementId": "badlands",
    "achievementName": "荒芜之地"
  },
  "path-of-arthas": {
    "cardSetId": 1869,
    "setName": "阿尔萨斯之路",
    "nameEn": "path-of-arthas",
    "achievementId": null,
    "achievementName": null
  },
  "titans": {
    "cardSetId": 1858,
    "setName": "泰坦诸神",
    "nameEn": "titans",
    "achievementId": "titan",
    "achievementName": "泰坦诸神"
  },
  "festival-of-legends": {
    "cardSetId": 1809,
    "setName": "传奇音乐节",
    "nameEn": "festival-of-legends",
    "achievementId": "legend-festival",
    "achievementName": "传奇音乐节"
  },
  "march-of-the-lich-king": {
    "cardSetId": 1776,
    "setName": "巫妖王的进军",
    "nameEn": "march-of-the-lich-king",
    "achievementId": "lich-king",
    "achievementName": "巫妖王"
  },
  "murder-at-castle-nathria": {
    "cardSetId": 1691,
    "setName": "纳斯利亚堡的悬案",
    "nameEn": "murder-at-castle-nathria",
    "achievementId": "nathria",
    "achievementName": "纳斯利亚堡"
  },
  "voyage-to-the-sunken-city": {
    "cardSetId": 1658,
    "setName": "探寻沉没之城",
    "nameEn": "voyage-to-the-sunken-city",
    "achievementId": "sunken-city",
    "achievementName": "沉没之城"
  },
  "core": {
    "cardSetId": 1637,
    "setName": "核心",
    "nameEn": "core",
    "achievementId": [
      "core-2021",
      "core-2022",
      "core-2023"
    ],
    "achievementName": [
      "核心（独狼年）",
      "核心（多头蛇年）",
      "核心（狮鹫年）"
    ]
  },
  "legacy": {
    "cardSetId": 1635,
    "setName": "怀旧",
    "nameEn": "legacy",
    "achievementId": null,
    "achievementName": null
  },
  "fractured-in-alterac-valley": {
    "cardSetId": 1626,
    "setName": "奥特兰克的决裂",
    "nameEn": "fractured-in-alterac-valley",
    "achievementId": "alterac",
    "achievementName": "奥特兰克"
  },
  "united-in-stormwind": {
    "cardSetId": 1578,
    "setName": "暴风城下的集结",
    "nameEn": "united-in-stormwind",
    "achievementId": "stormwind",
    "achievementName": "暴风城"
  },
  "forged-in-the-barrens": {
    "cardSetId": 1525,
    "setName": "贫瘠之地的锤炼",
    "nameEn": "forged-in-the-barrens",
    "achievementId": "barrens",
    "achievementName": "贫瘠之地"
  },
  "madness-at-the-darkmoon-faire": {
    "cardSetId": 1466,
    "setName": "疯狂的暗月马戏团",
    "nameEn": "madness-at-the-darkmoon-faire",
    "achievementId": "darkmoon",
    "achievementName": "暗月马戏团"
  },
  "demonhunter-initiate": {
    "cardSetId": 1463,
    "setName": "恶魔猎手新兵",
    "nameEn": "demonhunter-initiate",
    "achievementId": null,
    "achievementName": null
  },
  "scholomance-academy": {
    "cardSetId": 1443,
    "setName": "通灵学园",
    "nameEn": "scholomance-academy",
    "achievementId": "scholomance",
    "achievementName": "通灵学园"
  },
  "ashes-of-outland": {
    "cardSetId": 1414,
    "setName": "外域的灰烬",
    "nameEn": "ashes-of-outland",
    "achievementId": "outland",
    "achievementName": "外域的灰烬"
  },
  "galakronds-awakening": {
    "cardSetId": 1403,
    "setName": "迦拉克隆的觉醒",
    "nameEn": "galakronds-awakening",
    "achievementId": null,
    "achievementName": null
  },
  "descent-of-dragons": {
    "cardSetId": 1347,
    "setName": "巨龙降临",
    "nameEn": "descent-of-dragons",
    "achievementId": "dragons",
    "achievementName": "巨龙降临"
  },
  "saviors-of-uldum": {
    "cardSetId": 1158,
    "setName": "奥丹姆奇兵",
    "nameEn": "saviors-of-uldum",
    "achievementId": "uldum",
    "achievementName": "奥丹姆奇兵"
  },
  "rise-of-shadows": {
    "cardSetId": 1130,
    "setName": "暗影崛起",
    "nameEn": "rise-of-shadows",
    "achievementId": "rise-of-shadows",
    "achievementName": "暗影崛起"
  },
  "rastakhans-rumble": {
    "cardSetId": 1129,
    "setName": "拉斯塔哈的大乱斗",
    "nameEn": "rastakhans-rumble",
    "achievementId": null,
    "achievementName": null
  },
  "the-boomsday-project": {
    "cardSetId": 1127,
    "setName": "砰砰计划",
    "nameEn": "the-boomsday-project",
    "achievementId": null,
    "achievementName": null
  },
  "the-witchwood": {
    "cardSetId": 1125,
    "setName": "女巫森林",
    "nameEn": "the-witchwood",
    "achievementId": null,
    "achievementName": null
  },
  "kobolds-and-catacombs": {
    "cardSetId": 1004,
    "setName": "狗头人与地下城",
    "nameEn": "kobolds-and-catacombs",
    "achievementId": null,
    "achievementName": null
  },
  "knights-of-the-frozen-throne": {
    "cardSetId": 1001,
    "setName": "冰封王座的骑士",
    "nameEn": "knights-of-the-frozen-throne",
    "achievementId": null,
    "achievementName": null
  },
  "journey-to-ungoro": {
    "cardSetId": 27,
    "setName": "勇闯安戈洛",
    "nameEn": "journey-to-ungoro",
    "achievementId": null,
    "achievementName": null
  },
  "mean-streets-of-gadgetzan": {
    "cardSetId": 25,
    "setName": "龙争虎斗加基森",
    "nameEn": "mean-streets-of-gadgetzan",
    "achievementId": null,
    "achievementName": null
  },
  "one-night-in-karazhan": {
    "cardSetId": 23,
    "setName": "卡拉赞之夜",
    "nameEn": "one-night-in-karazhan",
    "achievementId": null,
    "achievementName": null
  },
  "whispers-of-the-old-gods": {
    "cardSetId": 21,
    "setName": "上古之神的低语",
    "nameEn": "whispers-of-the-old-gods",
    "achievementId": null,
    "achievementName": null
  },
  "league-of-explorers": {
    "cardSetId": 20,
    "setName": "探险者协会",
    "nameEn": "league-of-explorers",
    "achievementId": null,
    "achievementName": null
  },
  "the-grand-tournament": {
    "cardSetId": 15,
    "setName": "冠军的试炼",
    "nameEn": "the-grand-tournament",
    "achievementId": null,
    "achievementName": null
  },
  "blackrock-mountain": {
    "cardSetId": 14,
    "setName": "黑石山的火焰",
    "nameEn": "blackrock-mountain",
    "achievementId": null,
    "achievementName": null
  },
  "goblins-vs-gnomes": {
    "cardSetId": 13,
    "setName": "地精大战侏儒",
    "nameEn": "goblins-vs-gnomes",
    "achievementId": null,
    "achievementName": null
  },
  "naxxramas": {
    "cardSetId": 12,
    "setName": "纳克萨玛斯的诅咒",
    "nameEn": "naxxramas",
    "achievementId": null,
    "achievementName": null
  },
  "classic": {
    "cardSetId": 3,
    "setName": "经典",
    "nameEn": "classic",
    "achievementId": null,
    "achievementName": null
  }
}

export const SET_BY_ACHIEVEMENT_ID = {
  "violet-hold": {
    "cardSetId": 1988,
    "setName": "逃离紫罗兰监狱",
    "nameEn": "escape-from-violet-hold",
    "achievementId": "violet-hold",
    "achievementName": "紫罗兰监狱"
  },
  "cataclysm": {
    "cardSetId": 1980,
    "setName": "大地的裂变",
    "nameEn": "cataclysm",
    "achievementId": "cataclysm",
    "achievementName": "大地的裂变"
  },
  "caverns-of-time": {
    "cardSetId": 1957,
    "setName": "穿越时间流",
    "nameEn": "across-the-timeways",
    "achievementId": "caverns-of-time",
    "achievementName": "穿越时间流"
  },
  "ungoro": {
    "cardSetId": 1952,
    "setName": "安戈洛龟途",
    "nameEn": "the-lost-city-of-ungoro",
    "achievementId": "ungoro",
    "achievementName": "安戈洛龟途"
  },
  "emerald-dream": {
    "cardSetId": 1946,
    "setName": "漫游翡翠梦境",
    "nameEn": "into-the-emerald-dream",
    "achievementId": "emerald-dream",
    "achievementName": "翡翠梦境"
  },
  "deepdark": {
    "cardSetId": 1935,
    "setName": "深暗领域",
    "nameEn": "the-great-dark-beyond",
    "achievementId": "deepdark",
    "achievementName": "深暗领域"
  },
  "perils-in-paradise": {
    "cardSetId": 1905,
    "setName": "胜地历险记",
    "nameEn": "perils-in-paradise",
    "achievementId": "perils-in-paradise",
    "achievementName": "胜地历险记"
  },
  "whizbang": {
    "cardSetId": 1897,
    "setName": "威兹班的工坊",
    "nameEn": "whizbangs-workshop",
    "achievementId": "whizbang",
    "achievementName": "威兹班"
  },
  "badlands": {
    "cardSetId": 1892,
    "setName": "决战荒芜之地",
    "nameEn": "showdown-in-the-badlands",
    "achievementId": "badlands",
    "achievementName": "荒芜之地"
  },
  "titan": {
    "cardSetId": 1858,
    "setName": "泰坦诸神",
    "nameEn": "titans",
    "achievementId": "titan",
    "achievementName": "泰坦诸神"
  },
  "legend-festival": {
    "cardSetId": 1809,
    "setName": "传奇音乐节",
    "nameEn": "festival-of-legends",
    "achievementId": "legend-festival",
    "achievementName": "传奇音乐节"
  },
  "lich-king": {
    "cardSetId": 1776,
    "setName": "巫妖王的进军",
    "nameEn": "march-of-the-lich-king",
    "achievementId": "lich-king",
    "achievementName": "巫妖王"
  },
  "nathria": {
    "cardSetId": 1691,
    "setName": "纳斯利亚堡的悬案",
    "nameEn": "murder-at-castle-nathria",
    "achievementId": "nathria",
    "achievementName": "纳斯利亚堡"
  },
  "sunken-city": {
    "cardSetId": 1658,
    "setName": "探寻沉没之城",
    "nameEn": "voyage-to-the-sunken-city",
    "achievementId": "sunken-city",
    "achievementName": "沉没之城"
  },
  "core-2021": {
    "cardSetId": 1637,
    "setName": "核心",
    "nameEn": "core",
    "achievementId": [
      "core-2021",
      "core-2022",
      "core-2023"
    ],
    "achievementName": [
      "核心（独狼年）",
      "核心（多头蛇年）",
      "核心（狮鹫年）"
    ]
  },
  "core-2022": {
    "cardSetId": 1637,
    "setName": "核心",
    "nameEn": "core",
    "achievementId": [
      "core-2021",
      "core-2022",
      "core-2023"
    ],
    "achievementName": [
      "核心（独狼年）",
      "核心（多头蛇年）",
      "核心（狮鹫年）"
    ]
  },
  "core-2023": {
    "cardSetId": 1637,
    "setName": "核心",
    "nameEn": "core",
    "achievementId": [
      "core-2021",
      "core-2022",
      "core-2023"
    ],
    "achievementName": [
      "核心（独狼年）",
      "核心（多头蛇年）",
      "核心（狮鹫年）"
    ]
  },
  "alterac": {
    "cardSetId": 1626,
    "setName": "奥特兰克的决裂",
    "nameEn": "fractured-in-alterac-valley",
    "achievementId": "alterac",
    "achievementName": "奥特兰克"
  },
  "stormwind": {
    "cardSetId": 1578,
    "setName": "暴风城下的集结",
    "nameEn": "united-in-stormwind",
    "achievementId": "stormwind",
    "achievementName": "暴风城"
  },
  "barrens": {
    "cardSetId": 1525,
    "setName": "贫瘠之地的锤炼",
    "nameEn": "forged-in-the-barrens",
    "achievementId": "barrens",
    "achievementName": "贫瘠之地"
  },
  "darkmoon": {
    "cardSetId": 1466,
    "setName": "疯狂的暗月马戏团",
    "nameEn": "madness-at-the-darkmoon-faire",
    "achievementId": "darkmoon",
    "achievementName": "暗月马戏团"
  },
  "scholomance": {
    "cardSetId": 1443,
    "setName": "通灵学园",
    "nameEn": "scholomance-academy",
    "achievementId": "scholomance",
    "achievementName": "通灵学园"
  },
  "outland": {
    "cardSetId": 1414,
    "setName": "外域的灰烬",
    "nameEn": "ashes-of-outland",
    "achievementId": "outland",
    "achievementName": "外域的灰烬"
  },
  "dragons": {
    "cardSetId": 1347,
    "setName": "巨龙降临",
    "nameEn": "descent-of-dragons",
    "achievementId": "dragons",
    "achievementName": "巨龙降临"
  },
  "uldum": {
    "cardSetId": 1158,
    "setName": "奥丹姆奇兵",
    "nameEn": "saviors-of-uldum",
    "achievementId": "uldum",
    "achievementName": "奥丹姆奇兵"
  },
  "rise-of-shadows": {
    "cardSetId": 1130,
    "setName": "暗影崛起",
    "nameEn": "rise-of-shadows",
    "achievementId": "rise-of-shadows",
    "achievementName": "暗影崛起"
  }
}

/** 按数字 cardSetId 取版本信息 */
export const getByCardSetId = (id) => SET_BY_CARDSETID[id] || null
/** 按中文完整版本名取版本信息 */
export const getBySetName = (name) => SET_BY_SETNAME[name] || null
/** 按官方英文 slug 取版本信息 */
export const getByNameEn = (slug) => SET_BY_NAME_EN[slug] || null
/** 按成就系统英文 id 取版本信息 */
export const getByAchievementId = (id) => SET_BY_ACHIEVEMENT_ID[id] || null
/** 取中文完整版本名（接受任意键类型） */
export const getFullSetName = (q) =>
  typeof q === "number" ? SET_BY_CARDSETID[q]?.setName || null
  : getBySetName(q)?.setName || getByAchievementId(q)?.setName || getByNameEn(q)?.setName || null
/** 取官方英文 slug（接受任意键类型） */
export const getEnglishSlug = (q) =>
  typeof q === "number" ? SET_BY_CARDSETID[q]?.nameEn || null
  : getBySetName(q)?.nameEn || getByAchievementId(q)?.nameEn || getByNameEn(q)?.nameEn || null
/** 取成就系统内中文展示名（接受任意键类型） */
export const getAchievementName = (q) =>
  typeof q === "number" ? SET_BY_CARDSETID[q]?.achievementName || null
  : getBySetName(q)?.achievementName || getByAchievementId(q)?.achievementName || null
/** 全部版本（数组，便于遍历/展示） */
export const VERSION_NAME_LIST = VERSION_SETS
