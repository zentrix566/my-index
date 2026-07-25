import fs from 'fs'
const dir = 'src/hearthstone-achievements/data/achievements'
const files = {
  'caverns-of-time': 'caverns-of-time.json',
  'cataclysm': 'cataclysm.json',
  'deepdark': 'deepdark.json',
  'perils-in-paradise': 'perils-in-paradise.json',
  'badlands': 'badlands.json',
  'whizbang': 'whizbang.json',
  'emerald-dream': 'emerald-dream.json',
  'violet-hold': 'violet-hold.json',
  'ungoro': 'ungoro.json',
}
for (const [id, f] of Object.entries(files)) {
  const data = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'))
  let total = 0, empty = 0, filled = 0
  const missingField = []
  for (const a of data.achievements) {
    total++
    if (!('recommendedDecks' in a)) { missingField.push(a.name); continue }
    if (a.recommendedDecks && a.recommendedDecks.length > 0) filled++
    else empty++
  }
  console.log('=== ' + id + ' (' + f + ') ===')
  console.log('  total=' + total + ' filled=' + filled + ' empty=' + empty + ' missingField=' + missingField.length)
  if (missingField.length) console.log('  missingField: ' + missingField.join(', '))
}
