import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '..')
const achievementsDirectory = path.join(
  projectRoot,
  'src',
  'features',
  'hearthstone',
  'data',
  'achievements'
)
const fullManifestPath = path.join(
  projectRoot,
  'src',
  'features',
  'hearthstone',
  'data',
  'deck-card-images.json'
)
const outputPath = path.join(
  projectRoot,
  'src',
  'features',
  'hearthstone',
  'data',
  'achievement-card-images.json'
)
const cardMetadataPath = process.env.CARD_META_SOURCE || path.join(
  process.env.CARD_IMG_SOURCE ||
    'E:/github/my-heartstone/hearthstone_cards/wild',
  'cards_meta.json'
)
const detailsOutputPath = path.join(
  projectRoot,
  'src',
  'features',
  'hearthstone',
  'data',
  'achievement-card-details.json'
)

const manifest = JSON.parse(await readFile(fullManifestPath, 'utf8'))
const cardMetadata = JSON.parse(
  await readFile(cardMetadataPath, 'utf8').catch(() => '[]')
)
const achievementFiles = (await readdir(achievementsDirectory))
  .filter((fileName) => fileName.endsWith('.json'))
  .sort()
const referencedCardNames = new Set()

for (const fileName of achievementFiles) {
  const expansion = JSON.parse(
    await readFile(path.join(achievementsDirectory, fileName), 'utf8')
  )
  for (const achievement of expansion.achievements || []) {
    for (const cardName of achievement.relatedCards || []) {
      referencedCardNames.add(cardName)
    }
  }
}

const compactManifest = {}
const missingCardNames = []
const metadataById = new Map(cardMetadata.map((card) => [card.id, card]))
const metadataByName = new Map()
for (const card of cardMetadata) {
  const current = metadataByName.get(card.name)
  if (!current || (!current.collectible && card.collectible)) {
    metadataByName.set(card.name, card)
  }
}

const compactDetails = {}
const missingDetailNames = []
for (const cardName of [...referencedCardNames].sort((a, b) => a.localeCompare(b, 'zh'))) {
  if (manifest[cardName]) {
    compactManifest[cardName] = manifest[cardName]
  } else {
    missingCardNames.push(cardName)
  }

  const manifestCardId = getManifestCardId(manifest[cardName])
  const metadataCard =
    metadataById.get(manifestCardId) ||
    metadataByName.get(cardName)
  if (metadataCard) {
    compactDetails[cardName] = {
      text: normalizeCardText(metadataCard.text),
      manaCost: metadataCard.mana_cost ?? 0,
      attack: metadataCard.attack ?? null,
      health: metadataCard.health ?? null
    }
  } else {
    missingDetailNames.push(cardName)
  }
}

await writeFile(outputPath, `${JSON.stringify(compactManifest, null, 2)}\n`, 'utf8')
await writeFile(
  detailsOutputPath,
  `${JSON.stringify(compactDetails, null, 2)}\n`,
  'utf8'
)

console.log(
  `已生成 ${path.relative(projectRoot, outputPath)}：` +
  `${Object.keys(compactManifest).length} 张卡牌，${missingCardNames.length} 张缺图`
)
if (missingCardNames.length) {
  console.log(`缺图卡牌：${missingCardNames.join('、')}`)
}
console.log(
  `已生成 ${path.relative(projectRoot, detailsOutputPath)}：` +
  `${Object.keys(compactDetails).length} 张卡牌，${missingDetailNames.length} 张缺效果资料`
)
if (missingDetailNames.length) {
  console.log(`缺效果资料卡牌：${missingDetailNames.join('、')}`)
}

function getManifestCardId(cardImages) {
  const imagePath = cardImages?.full || cardImages?.crop || ''
  const match = imagePath.match(/_(\d+)\.[^.]+$/)
  return match ? Number(match[1]) : null
}

function normalizeCardText(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\[x\]/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
