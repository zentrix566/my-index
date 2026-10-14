/**
 * 游戏实测优先的卡牌字段覆盖。
 *
 * 国服 API 偶尔会早于或滞后于客户端热修数据；这里仅记录已由游戏内核实的差异，
 * 防止常规同步再次把站内卡牌库覆盖为错误数值。
 */
export const GAME_CARD_OVERRIDES = {
  127946: { health: 2 },
  118183: { text: '<b>任务：</b><b>发现</b>8张牌。<b>奖励：</b>源生之石。' },
  // 36.x 补丁游戏内实测（2026-10-14 用户提供）：国服 API 文本仍为旧值/空占位
  117714: { text: '<b>战吼：</b>造成5点伤害，获得5点护甲值。<b>延系：</b>法力值消耗减少（2）点。' },
  127815: { text: '随机召唤两个法力值消耗为（2）的随从。<i>（在本局对战中你的英雄每攻击一次都会提升。）</i>' }
}

export function applyGameCardOverrides(card) {
  const override = GAME_CARD_OVERRIDES[card.id]
  return override ? { ...card, ...override } : card
}
