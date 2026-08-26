// 暗月宝藏各期配置。新增一期时追加配置，不要修改已有期数。
export const TREASURE_EVENTS = [
  {
    id: 'qixi-2026-08',
    name: '宿命起源',
    version: '34.4',
    endAt: '2026-09-09T00:00:00+08:00',
    prizes: [
      { id: 'volazj', name: '异画威拉诺兹', note: '12%', weight: 120, image: '/hearthstone-cards/大地的裂变/full/威拉诺兹_123151.png', rarity: 'rare' },
      { id: 'coin', name: '幸运币异画：锁链', note: '30%', weight: 300, image: '/hearthstone-cosmetics/coins/JAIL_COIN3.png', rarity: 'common' },
      { id: 'doom', name: '异画毁灭', note: '7.5%', weight: 75, image: '/hearthstone-cards/逃离紫罗兰监狱/full/毁灭_126128.png', rarity: 'epic' },
      { id: 'illidan', name: '痴情的伊利丹', note: '2.5%', weight: 25, image: '/hearthstone-cosmetics/hero-skins/demon-hunter/HERO_10bx.png', rarity: 'epic' },
      { id: 'prophet', name: '异画上古预言师', note: '10%', weight: 100, image: '/hearthstone-cards/逃离紫罗兰监狱/full/上古预言师_125878.png', rarity: 'rare' },
      { id: 'arator', name: '救赎者阿拉托尔及卡背', note: '2.5%', weight: 25, image: '/hearthstone-cosmetics/hero-skins/paladin/HERO_04cb.png', rarity: 'epic' },
      { id: 'imprison', name: '异画恶魔监禁', note: '6%', weight: 60, image: '/hearthstone-cards/逃离紫罗兰监狱/full/恶魔监禁_125915.png', rarity: 'epic' },
      { id: 'velen', name: '异画高阶女巫维洛', note: '28%', weight: 280, image: '/hearthstone-cards/通灵学园/full/高阶女巫维洛_59252.png', rarity: 'common' },
      { id: 'turalyon', name: '七夕图拉扬 · 术士神话', note: '0.1%', weight: 1, image: '/hearthstone-cosmetics/hero-skins/warlock/HERO_07ca.png', rarity: 'mythic' },
      { id: 'alleria', name: '七夕奥蕾莉亚 · 猎人钻石', note: '1.4%', weight: 14, image: '/hearthstone-cosmetics/hero-skins/hunter/HERO_05bz.png', rarity: 'legendary' }
    ],
    drawCosts: [0, 120, 240, 360, 600, 840, 1160, 1580, 1980, 3280]
  },
  {
    id: 'rabbitath-2026-08',
    name: '萨拉兔斯',
    version: '33.4',
    endAt: '2026-09-09T00:00:00+08:00',
    prizes: [
      { id: 'rabbitath-pet', name: '宠物：萨拉兔斯', note: '大奖', weight: 1, image: '/hearthstone-cosmetics/pets/PET_4_1.png', icon: '🐇', rarity: 'mythic', isGrand: true },
      { id: 'colossal-mountain-dragon', name: '异画超巨摩天龙', note: '安戈洛龟途卡牌', weight: 300, image: '/hearthstone-cards/安戈洛龟途/full/超巨摩天龙_118238.png', icon: '🦖', rarity: 'common' },
      { id: 'diamond-drakerys', name: '钻石伟岸的德拉克雷斯', note: '安戈洛龟途卡牌', weight: 14, image: '/hearthstone-cards/安戈洛龟途/full/伟岸的德拉克雷斯_118404.png', icon: '💎', rarity: 'legendary' },
      { id: 'ancient-pterrordax', name: '异画远古翼手龙', note: '安戈洛龟途卡牌', weight: 100, image: '/hearthstone-cards/安戈洛龟途/full/远古翼手龙_118232.png', icon: '🦎', rarity: 'rare' },
      { id: 'ancient-raptor', name: '异画远古迅猛龙', note: '安戈洛龟途卡牌', weight: 100, image: '/hearthstone-cards/安戈洛龟途/full/远古迅猛龙_118224.png', icon: '🦖', rarity: 'rare' },
      { id: 'rabbitath-coin', name: '萨拉兔斯幸运币', note: '幸运币', weight: 110, image: '/hearthstone-cosmetics/coins/DINO_COIN2.png', icon: '🪙', rarity: 'rare' },
      { id: 'faerin-lothar', name: '骑士新皮肤“菲琳·洛萨”及其配套卡背', note: '骑士英雄皮肤', weight: 50, image: '/hearthstone-cosmetics/hero-skins/paladin/HERO_04bg.png', icon: '⚔️', rarity: 'legendary' },
      { id: 'owena', name: '德鲁伊新皮肤“奥威娜”', note: '德鲁伊英雄皮肤', weight: 65, image: '/hearthstone-cosmetics/hero-skins/druid/HERO_06be.png', icon: '🌿', rarity: 'epic' },
      { id: 'myrallis-crystalized-mirror-dragon', name: '异画米尔雷斯，晶化镜甲龙', note: '安戈洛龟途卡牌', weight: 25, image: '/hearthstone-cards/安戈洛龟途/full/米尔雷斯，晶化镜甲龙_118481.png', icon: '🐉', rarity: 'legendary' },
      { id: 'titans-golden-pack', name: '安戈洛龟途金色卡包*1', note: '安戈洛龟途金色卡包', weight: 280, image: '/hearthstone-cosmetics/treasure-packs/ANGORO_GOLDEN_PACK.png', icon: '📦', rarity: 'common' }
    ],
    drawCosts: [0, 120, 240, 360, 600, 840, 1160, 1580, 1980, 3280]
  }
]
