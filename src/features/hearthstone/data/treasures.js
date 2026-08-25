// 暗月宝藏各期配置。新增一期时追加配置，不要修改已有期数。
export const TREASURE_EVENTS = [
  {
    id: 'qixi-2026-08',
    name: '七夕暗月宝藏',
    version: '34.4',
    prizes: [
      { id: 'coin', name: '幸运币异画：锁链', note: '30%', weight: 300, image: '/hearthstone-cosmetics/coins/JAIL_COIN3.png', rarity: 'common' },
      { id: 'velen', name: '异画高阶女巫维洛', note: '28%', weight: 280, image: '/hearthstone-cards/通灵学园/full/高阶女巫维洛_59252.png', rarity: 'common' },
      { id: 'volazj', name: '异画威拉诺兹', note: '12%', weight: 120, image: '/hearthstone-cards/大地的裂变/full/威拉诺兹_123151.png', rarity: 'rare' },
      { id: 'prophet', name: '异画上古预言师', note: '10%', weight: 100, image: '/hearthstone-cards/逃离紫罗兰监狱/full/上古预言师_125878.png', rarity: 'rare' },
      { id: 'doom', name: '异画毁灭', note: '7.5%', weight: 75, image: '/hearthstone-cards/逃离紫罗兰监狱/full/毁灭_126128.png', rarity: 'epic' },
      { id: 'imprison', name: '异画恶魔监禁', note: '6%', weight: 60, image: '/hearthstone-cards/逃离紫罗兰监狱/full/恶魔监禁_125915.png', rarity: 'epic' },
      { id: 'arator', name: '救赎者阿拉托尔及卡背', note: '2.5%', weight: 25, image: '/hearthstone-cosmetics/hero-skins/paladin/HERO_04cb.png', rarity: 'epic' },
      { id: 'illidan', name: '痴情的伊利丹', note: '2.5%', weight: 25, image: '/hearthstone-cosmetics/hero-skins/demon-hunter/HERO_10bx.png', rarity: 'epic' },
      { id: 'alleria', name: '七夕奥蕾莉亚 · 猎人钻石', note: '1.4%', weight: 14, image: '/hearthstone-cosmetics/hero-skins/hunter/HERO_05bz.png', rarity: 'legendary' },
      { id: 'turalyon', name: '七夕图拉扬 · 术士神话', note: '0.1%', weight: 1, image: '/hearthstone-cosmetics/hero-skins/warlock/HERO_07ca.png', rarity: 'mythic' }
    ],
    drawCosts: [0, 120, 240, 360, 600, 840, 1160, 1580, 1980, 3280]
  }
]
