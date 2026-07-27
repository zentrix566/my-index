import fs from 'fs'
const DIR = 'src/features/hearthstone/data/achievements'

// iyingdi 速战速决 全成就攻略页（已通过 WebSearch 核实存在且含 <aside> 卡组码）
const GUIDES = {
  titan: { name: '旅法师营地：泰坦诸神全成就攻略', url: 'https://www.iyingdi.com/tz/post/5461437' },
  'legend-festival': { name: '旅法师营地：传奇音乐节全成就攻略', url: 'http://iyingdi.com/tz/post/5473197' },
  nathria: { name: '旅法师营地：纳斯利亚堡全成就攻略', url: 'https://www.iyingdi.com/tz/post/5207563' },
  'sunken-city': { name: '旅法师营地：沉没之城全成就攻略', url: 'https://www.iyingdi.com/tz/post/5185217' },
  alterac: { name: '旅法师营地：奥特兰克全成就攻略', url: 'http://iyingdi.com/tz/post/5159127' },
  stormwind: { name: '旅法师营地：暴风城全成就攻略', url: 'https://www.iyingdi.com/tz/post/5095416' },
  barrens: { name: '旅法师营地：贫瘠之地全成就攻略', url: 'https://www.iyingdi.com/tz/post/2369171' },
  darkmoon: { name: '旅法师营地：暗月马戏团全成就攻略', url: 'https://mob.iyingdi.com/post/2361620' },
  scholomance: { name: '旅法师营地：通灵学园全成就攻略', url: 'https://www.iyingdi.com/tz/post/5489932' },
  outland: { name: '旅法师营地：外域的灰烬全成就攻略', url: 'https://www.iyingdi.com/tz/post/5490837' },
  dragons: { name: '旅法师营地：巨龙降临全成就攻略', url: 'https://www.iyingdi.com/tz/post/5490473' },
  uldum: { name: '旅法师营地：奥丹姆奇兵全成就攻略', url: 'http://iyingdi.com/tz/post/5490103' },
  'rise-of-shadows': { name: '旅法师营地：暗影崛起全成就攻略', url: 'https://www.iyingdi.com/tz/post/5488439' },
  'lich-king': { name: '旅法师营地：巫妖王的进军全成就攻略', url: 'http://iyingdi.com/tz/post/5237802' },
  'core-2023': { name: '旅法师营地：狮鹫年核心全成就攻略', url: 'https://www.iyingdi.com/tz/post/2370919' },
  'core-2022': { name: '旅法师营地：多头蛇年核心全成就攻略', url: 'https://iyingdi.com/tz/post/5184046' },
  'core-2021': { name: '旅法师营地：独狼年核心全成就攻略', url: 'https://www.iyingdi.com/tz/post/5473941' },
}

let added = 0, exists = 0
for (const [id, g] of Object.entries(GUIDES)) {
  const file = `${DIR}/${id}.json`
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  data.referenceLinks = data.referenceLinks || []
  if (data.referenceLinks.some((l) => l.url === g.url)) {
    exists++
    console.log(`[exists] ${id}`)
    continue
  }
  data.referenceLinks.push({ name: g.name, url: g.url })
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
  added++
  console.log(`[added]  ${id} -> ${g.url}`)
}
console.log(`\nDONE. added=${added} exists=${exists}`)
