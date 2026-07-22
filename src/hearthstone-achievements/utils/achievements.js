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
 * 将成就按职业分组
 * 双职业成就若含 dualClasses 字段，则拆分到对应职业（双职业组不再出现）；
 * 若仅 heroClass="双职业" 但无 dualClasses（如新增版本未补全映射），则仍归入双职业组作兜底。
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
      for (const cls of achievement.dualClasses) pushTo(cls, achievement);
    } else {
      const heroClass = achievement.heroClass || "中立";
      pushTo(heroClass, achievement);
    }
  }
  return groups;
}

/**
 * 获取职业排序列表
 * @returns {Array} 职业按固定顺序排列
 */
export function getClassOrder() {
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
