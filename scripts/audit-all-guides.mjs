import fs from 'fs'
const DIR = 'src/features/hearthstone/data/achievements'
const files = {
  'violet-hold': 'violet-hold.json',
  'cataclysm': 'cataclysm.json',
  'caverns-of-time': 'caverns-of-time.json',
  'ungoro': 'ungoro.json',
  'emerald-dream': 'emerald-dream.json',
  'deepdark': 'deepdark.json',
  'perils-in-paradise': 'perils-in-paradise.json',
  'whizbang': 'whizbang.json',
  'titan': 'titan.json',
  'badlands': 'badlands.json',
  'legend-festival': 'legend-festival.json',
  'core-2023': 'core-2023.json',
  'nathria': 'nathria.json',
  'sunken-city': 'sunken-city.json',
  'core-2022': 'core-2022.json',
  'alterac': 'alterac.json',
  'stormwind': 'stormwind.json',
  'barrens': 'barrens.json',
  'core-2021': 'core-2021.json',
  'darkmoon': 'darkmoon.json',
  'scholomance': 'scholomance.json',
  'outland': 'outland.json',
  'dragons': 'dragons.json',
  'uldum': 'uldum.json',
  'rise-of-shadows': 'rise-of-shadows.json',
  'lich-king': 'lich-king.json',
  'zonghe': 'zonghe.json',
}
console.log('id | hasRefLinks | #links | #ach | #withDecks | #emptyDecks | #noField')
for (const [id, f] of Object.entries(files)) {
  const data = JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8'))
  const ref = data.referenceLinks || []
  let withDecks = 0, emptyDecks = 0, noField = 0
  for (const a of data.achievements) {
    if (!('recommendedDecks' in a)) { noField++; continue }
    if (a.recommendedDecks && a.recommendedDecks.length > 0) withDecks++
    else emptyDecks++
  }
  console.log(`${id} | ${ref.length > 0 ? 'Y' : 'N'} | ${ref.length} | ${data.achievements.length} | ${withDecks} | ${emptyDecks} | ${noField}`)
}
