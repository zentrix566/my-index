/**
 * 成就数据处理工具
 */

// 职业颜色映射（炉石各职业代表色）
export const classColors = {
  圣骑士: "#f4a34e",
  德鲁伊: "#8b5a2b",
  恶魔猎手: "#7b3fa0",
  战士: "#a32c2c",
  术士: "#7a5ca8",
  死亡骑士: "#3a6290",
  法师: "#5c7bc7",
  潜行者: "#404040",
  牧师: "#999999",
  猎人: "#3d8b3d",
  萨满祭司: "#4a90a0",
  双职业: "#c87c2d",
  中立: "#8b7355",
};

// 难度颜色映射
export const difficultyColors = {
  易: "#4caf50",
  中等: "#ff9800",
  难: "#e53935",
};

// 职业展示顺序（游戏内标准顺序：恶魔猎手、德鲁伊、猎人、法师、圣骑士、牧师、潜行者、萨满祭司、术士、战士、死亡骑士，中立收尾；双职业为合成分组置末）
const classOrderList = [
  "恶魔猎手",
  "德鲁伊",
  "猎人",
  "法师",
  "圣骑士",
  "牧师",
  "潜行者",
  "萨满祭司",
  "术士",
  "战士",
  "死亡骑士",
  "中立",
  "双职业",
];

/**
 * 将成就按职业分组（用于「按版本浏览 / 我的-按版本」，还原游戏内布局）
 * 双职业成就统一归入「双职业」分组，不拆分到每个职业——否则单个职业分组会混入
 * 本不属于它的双职业成就（如穿越时间流的圣骑士会多出 2 条）。
 * 中立多职业成就（带 classes 字段）仍留在「中立」分组。
 * 按职业筛选时同样可做的成就由 matchesClass 命中，不依赖本函数拆分。
 * @param {Array} achievements - 成就列表
 * @returns {Object} 按职业分组的成就
 */
export function groupByClass(achievements) {
  const groups = {};
  const pushTo = (cls, ach) => {
    if (!groups[cls]) groups[cls] = [];
    groups[cls].push(ach);
  };
  for (const achievement of achievements) {
    // 综合类成就用显式 category 分组（职业 / 中立关键字 / 随从类型 / 法术派系 / 特殊），
    // 不再按 heroClass（多为「中立」）平铺。其余版本无此字段，仍按职业分组。
    if (achievement.category) {
      pushTo(achievement.category, achievement);
      continue;
    }
    if (achievement.dualClasses && achievement.dualClasses.length) {
      // 双职业成就统一归入「双职业」分组（游戏内原样），不再按 dualClasses 拆到各职业。
      pushTo("双职业", achievement);
    } else {
      const heroClass = achievement.heroClass || "中立";
      pushTo(heroClass, achievement);
    }
  }
  return groups;
}

// 游戏内职业展示顺序（用户指定，简称已展开为全称：圣骑→圣骑士、盗贼→潜行者、萨满→萨满祭司）。
// 死亡骑士排在术士之后、法师之前；中立收尾；不含双职业分组（用于无双职业成就的版本）。
const GAME_CLASS_ORDER_WITH_DK = ["圣骑士", "德鲁伊", "恶魔猎手", "战士", "术士", "死亡骑士", "法师", "潜行者", "牧师", "猎人", "萨满祭司", "中立"];
// 同上，但含「双职业」分组且置于中立之前（用于穿越时间流、荒芜之地等带双职业成就的版本）。
const GAME_CLASS_ORDER_WITH_DK_DUAL = ["圣骑士", "德鲁伊", "恶魔猎手", "战士", "术士", "死亡骑士", "法师", "潜行者", "牧师", "猎人", "萨满祭司", "双职业", "中立"];
// 其余（纳斯利亚堡 / 沉没之城 / 奥特兰克 / 暴风城 / 贫瘠之地 等）沿用通用游戏内顺序（死亡骑士兜底在中立之前，无双职业）。
const GAME_CLASS_ORDER = ["圣骑士", "德鲁伊", "恶魔猎手", "战士", "术士", "法师", "潜行者", "牧师", "猎人", "萨满祭司", "中立"];

// 各版本「按版本浏览 / 我的-按版本」的职业展示顺序覆盖表（键为版本 id）。
// 未列出的版本（含暗月马戏团）沿用全局标准顺序 classOrderList。
const EXPANSION_CLASS_ORDER = {
  // 死亡骑士在术士之后、法师之前，无双职业分组
  titan: GAME_CLASS_ORDER_WITH_DK,            // 泰坦诸神
  "legend-festival": GAME_CLASS_ORDER_WITH_DK_DUAL, // 传奇音乐节（含 11 个双职业成就，双职业分组置于中立之前）
  "lich-king": GAME_CLASS_ORDER_WITH_DK,       // 巫妖王
  // 用户指定顺序：圣骑士→…→死亡骑士→…→中立（无双职业成就）
  "violet-hold": GAME_CLASS_ORDER_WITH_DK,     // 紫罗兰监狱
  cataclysm: GAME_CLASS_ORDER_WITH_DK,         // 大地的裂变
  ungoro: GAME_CLASS_ORDER_WITH_DK,            // 安戈洛龟途
  "emerald-dream": GAME_CLASS_ORDER_WITH_DK,   // 翡翠梦境
  deepdark: GAME_CLASS_ORDER_WITH_DK,          // 深暗领域
  "perils-in-paradise": GAME_CLASS_ORDER_WITH_DK, // 胜地历险记
  whizbang: GAME_CLASS_ORDER_WITH_DK,          // 威兹班
  // 用户指定顺序：同上 + 双职业分组（置于中立之前）
  "caverns-of-time": GAME_CLASS_ORDER_WITH_DK_DUAL, // 穿越时间流
  badlands: GAME_CLASS_ORDER_WITH_DK_DUAL,     // 荒芜之地
  // 其余版本沿用通用游戏内顺序（死亡骑士兜底在中立之前）
  nathria: GAME_CLASS_ORDER,                   // 纳斯利亚堡
  "sunken-city": GAME_CLASS_ORDER,             // 沉没之城
  alterac: GAME_CLASS_ORDER,                   // 奥特兰克
  stormwind: GAME_CLASS_ORDER,                 // 暴风城
  barrens: GAME_CLASS_ORDER,                   // 贫瘠之地
};

/**
 * 获取职业排序列表
 * @param {string} [expansionId] - 版本 id，命中覆盖表时返回该版本专属顺序
 * @returns {Array} 职业按固定顺序排列
 */
export function getClassOrder(expansionId) {
  if (expansionId && EXPANSION_CLASS_ORDER[expansionId]) {
    const base = EXPANSION_CLASS_ORDER[expansionId]; // [基础职业..., 中立]，可能已含死亡骑士
    if (base.includes("死亡骑士")) return base;
    // 覆盖表只列了基础职业 + 中立；死亡骑士在游戏内排在中立之前，
    // 含死亡骑士的版本将其补插到中立前，避免对应分组在按职业视图中丢失（不影响无此职业的版本）。
    const idx = base.indexOf("中立");
    const order =
      idx >= 0
        ? [...base.slice(0, idx), "死亡骑士", ...base.slice(idx)]
        : [...base, "死亡骑士"];
    if (!order.includes("双职业")) order.push("双职业"); // 双职业合成分组兜底，置末
    return order;
  }
  return classOrderList;
}

/**
 * 判断成就是否属于某职业（含双职业拆分）
 * 双职业成就通过 dualClasses 字段分配到对应职业，heroClass 仍保留 "双职业"
 * @param {Object} ach - 成就对象
 * @param {string} cls - 职业名
 * @returns {boolean}
 */
export function matchesClass(ach, cls) {
  if (ach.heroClass === cls) return true;
  if (ach.classes && ach.classes.includes(cls)) return true;
  if (ach.dualClasses && ach.dualClasses.includes(cls)) return true;
  return false;
}

/**
 * 获取成就的职业显示文本（双职业显示为 "职业A / 职业B"）
 * @param {Object} ach - 成就对象
 * @returns {string}
 */
export function getClassName(ach) {
  if (ach.dualClasses) return ach.dualClasses.join(" / ");
  return ach.heroClass || "中立";
}
