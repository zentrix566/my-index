#!/usr/bin/env node
/** 从本机 Hearthstone 客户端同步幸运币的简体中文正式名称。 */
import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const manifestPath = join(repoRoot, 'src/features/hearthstone/data/coins.json')
const mappingPath = join(repoRoot, 'src/features/hearthstone/data/cosmetic-coin-map.json')
const defaultGameDirectory = 'E:/Hearthstone'
const defaultSourceDirectory = 'E:/github/my-heartstone/hearthstone_cosmetics'
const defaultAssetStudioPath = join(
  repoRoot,
  '.local-tools/assetstudio-net472/AssetStudioModCLI_net472_win32_64/AssetStudioModCLI.exe'
)
const defaultWorkDirectory = join(repoRoot, '.hs-extract/coin-names')
const zhCnIndex = 12

function loadEnv() {
  const envPath = join(repoRoot, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}

function parseArgs(argv) {
  const args = { gameDirectory: '', sourceDirectory: '', assetStudioPath: '', workDirectory: '' }
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--game-dir') args.gameDirectory = resolve(argv[++index])
    else if (argv[index] === '--source') args.sourceDirectory = resolve(argv[++index])
    else if (argv[index] === '--asset-studio') args.assetStudioPath = resolve(argv[++index])
    else if (argv[index] === '--work-dir') args.workDirectory = resolve(argv[++index])
    else throw new Error(`未知参数：${argv[index]}`)
  }
  return args
}

function runAssetStudio(executable, input, output) {
  const args = [
    input,
    '--mode', 'export',
    '--asset-type', 'monoBehaviour',
    '--group-option', 'none',
    '--filename-format', 'assetName_pathID',
    '--output', output,
    '--overwrite-existing',
    '--unity-version', '6000.3.11f1',
    '--filter-by-name', '^COSMETIC_COIN$',
    '--filter-with-regex',
    '--log-level', 'warning'
  ]
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`AssetStudio 执行失败，退出码：${code}`))
    })
  })
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv)
  const gameDirectory = resolve(args.gameDirectory || process.env.HS_GAME_DIR || defaultGameDirectory)
  const sourceDirectory = resolve(args.sourceDirectory || process.env.HS_COSMETICS_SOURCE_DIR || defaultSourceDirectory)
  const assetStudioPath = resolve(args.assetStudioPath || process.env.HS_ASSET_STUDIO_PATH || defaultAssetStudioPath)
  const workDirectory = resolve(args.workDirectory || defaultWorkDirectory)
  const dbfBundlePath = join(gameDirectory, 'Data/Win/dbf.unity3d')
  const stagedBundlePath = join(workDirectory, 'dbf.unity3d')
  const outputDirectory = join(workDirectory, 'dbf')
  if (!existsSync(assetStudioPath)) throw new Error(`没有找到 AssetStudioModCLI：${assetStudioPath}`)
  if (!existsSync(dbfBundlePath)) throw new Error(`没有找到游戏数据：${dbfBundlePath}`)

  await rm(workDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })
  await copyFile(dbfBundlePath, stagedBundlePath)
  await runAssetStudio(assetStudioPath, stagedBundlePath, outputDirectory)
  const tableFile = (await readdir(outputDirectory)).find((name) => name.startsWith('COSMETIC_COIN') && name.endsWith('.json'))
  if (!tableFile) throw new Error('没有从客户端提取到 COSMETIC_COIN 数据表')

  const table = JSON.parse(await readFile(join(outputDirectory, tableFile), 'utf8'))
  const recordsByDbfId = new Map(
    table.Records.filter((record) => record.m_enabled)
      .map((record) => [record.m_cardId, record])
  )
  const coinDirectory = join(sourceDirectory, 'coins')
  const metadataFiles = (await readdir(coinDirectory)).filter((name) => name.endsWith('.json'))
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const manifestByCardId = new Map(
    manifest.map((item) => [item.id.replace(/^coins-/, '').toLocaleUpperCase(), item])
  )
  const mappings = []
  let matched = 0

  for (const fileName of metadataFiles) {
    const metadataPath = join(coinDirectory, fileName)
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    const record = recordsByDbfId.get(metadata.dbfId)
    const officialName = record?.m_name?.m_locValues?.[zhCnIndex]?.trim() || metadata.name
    const relativeImagePath = `coins/${metadata.cardId}.png`
    const ossObjectKey = `hearthstone-cosmetics/${relativeImagePath}`
    const mapping = {
      cardId: metadata.cardId,
      dbfId: metadata.dbfId,
      cosmeticCoinId: record?.m_ID ?? null,
      officialName,
      flavorText: metadata.flavorText || '',
      howToGet: metadata.howToGet || '',
      localImagePath: relativeImagePath,
      ossObjectKey,
      imageUrl: `/${ossObjectKey.split('/').map(encodeURIComponent).join('/')}`,
      source: record ? 'Hearthstone 客户端 COSMETIC_COIN' : '客户端当前版本未收录，保留现有名称'
    }
    mappings.push(mapping)
    if (!record) continue

    metadata.name = officialName
    metadata.cosmeticCoinId = record.m_ID
    metadata.nameSource = 'Hearthstone 客户端 COSMETIC_COIN'
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
    const manifestItem = manifestByCardId.get(metadata.cardId.toLocaleUpperCase())
    if (manifestItem) manifestItem.officialName = officialName
    matched += 1
  }

  mappings.sort((left, right) => left.dbfId - right.dbfId)
  await writeFile(mappingPath, `${JSON.stringify(mappings, null, 2)}\n`, 'utf8')
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`幸运币名称同步完成：客户端正式名称 ${matched}/${mappings.length}`)
  console.log(`映射表：${mappingPath}`)
  const unmatched = mappings.filter((item) => item.cosmeticCoinId === null)
  if (unmatched.length) console.log(`客户端当前版本未收录：${unmatched.map((item) => item.cardId).join(', ')}`)
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
