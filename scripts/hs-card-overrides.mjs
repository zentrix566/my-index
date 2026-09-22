/**
 * 游戏实测优先的卡牌字段覆盖。
 *
 * 国服 API 偶尔会早于或滞后于客户端热修数据；这里仅记录已由游戏内核实的差异，
 * 防止常规同步再次把站内卡牌库覆盖为错误数值。
 */
export const GAME_CARD_OVERRIDES = {
  127946: { health: 2 },
  118183: { text: '<b>任务：</b><b>发现</b>8张牌。<b>奖励：</b>源生之石。' }
}

export function applyGameCardOverrides(card) {
  const override = GAME_CARD_OVERRIDES[card.id]
  return override ? { ...card, ...override } : card
}
