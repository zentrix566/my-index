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

const manifest = JSON.parse(await readFile(fullManifestPath, 'utf8'))
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

// 紧凑单行输出：与 deck-card-images.json 等大数据清单保持一致，避免整文件重排的噪声 diff。
const compactManifest = {}
const missingCardNames = []
for (const cardName of [...referencedCardNames].sort((a, b) => a.localeCompare(b, 'zh'))) {
  if (manifest[cardName]) {
    compactManifest[cardName] = manifest[cardName]
  } else {
    missingCardNames.push(cardName)
  }
}

await writeFile(outputPath, `${JSON.stringify(compactManifest)}\n`, 'utf8')

console.log(
  `已生成 ${path.relative(projectRoot, outputPath)}：` +
  `${Object.keys(compactManifest).length} 张卡牌，${missingCardNames.length} 张缺图`
)
if (missingCardNames.length) {
  console.log(`缺图卡牌：${missingCardNames.join('、')}`)
}
