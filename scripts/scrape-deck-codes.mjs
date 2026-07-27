import fs from 'fs'
import http from 'http'
import https from 'https'

const NODE = 'C:/Users/admin/.workbuddy/binaries/node/versions/22.22.2/node.exe'
void NODE

const DIR = 'src/features/hearthstone/data/achievements'
const VERSIONS = {
  'caverns-of-time': 'caverns-of-time.json',
  'cataclysm': 'cataclysm.json',
  'deepdark': 'deepdark.json',
  'perils-in-paradise': 'perils-in-paradise.json',
  'badlands': 'badlands.json',
  'whizbang': 'whizbang.json',
  'emerald-dream': 'emerald-dream.json',
  'violet-hold': 'violet-hold.json',
  'ungoro': 'ungoro.json',
  'titan': 'titan.json',
  'legend-festival': 'legend-festival.json',
  'nathria': 'nathria.json',
  'sunken-city': 'sunken-city.json',
  'alterac': 'alterac.json',
  'stormwind': 'stormwind.json',
  'barrens': 'barrens.json',
  'darkmoon': 'darkmoon.json',
  'scholomance': 'scholomance.json',
  'outland': 'outland.json',
  'dragons': 'dragons.json',
  'uldum': 'uldum.json',
  'rise-of-shadows': 'rise-of-shadows.json',
  'lich-king': 'lich-king.json',
  'core-2023': 'core-2023.json',
  'core-2022': 'core-2022.json',
  'core-2021': 'core-2021.json',
}

function fetchText(url, depth = 0) {
  if (depth > 5) return Promise.reject(new Error('too many redirects: ' + url))
  const get = url.startsWith('https') ? https.get : http.get
  return new Promise((resolve, reject) => {
    const req = get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume()
        const next = new URL(res.headers.location, url).toString()
        process.stderr.write('  redirect ' + url + ' -> ' + next + '\n')
        return resolve(fetchText(next, depth + 1))
      }
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(20000, () => req.destroy(new Error('timeout: ' + url)))
  })
}

const CODE_RE = /<aside>([A-Za-z0-9+/=]{20,})<\/aside>/g
const DECK_DIV_RE = /<div class="yingdi-deck"/g
void DECK_DIV_RE

// For each version: fetch pages, build name->code(s) mapping
async function scrapeVersion(id, file) {
  const data = JSON.parse(fs.readFileSync(DIR + '/' + file, 'utf8'))
  const urls = (data.referenceLinks || []).map((l) => l.url).filter((u) => u && u.includes('iyingdi'))
  if (!urls.length) return { id, urls: [], mapping: {}, names: [] }
  let html = ''
  for (const u of urls) {
    process.stderr.write('  fetching ' + u + '\n')
    html += await fetchText(u)
  }
  // collect all achievement name occurrences
  const names = data.achievements.map((a) => a.name)
  const namePos = []
  for (const nm of names) {
    let idx = html.indexOf(nm)
    while (idx !== -1) {
      namePos.push({ name: nm, pos: idx })
      idx = html.indexOf(nm, idx + nm.length)
    }
  }
  namePos.sort((a, b) => a.pos - b.pos)
  // collect all deck codes
  const codes = []
  let m
  CODE_RE.lastIndex = 0
  while ((m = CODE_RE.exec(html)) !== null) {
    codes.push({ code: m[1], pos: m.index })
  }
  codes.sort((a, b) => a.pos - b.pos)
  // assign each code to nearest preceding name
  const WINDOW = 4000
  const byName = {}
  for (const c of codes) {
    let best = null
    for (let i = namePos.length - 1; i >= 0; i--) {
      if (namePos[i].pos < c.pos && c.pos - namePos[i].pos <= WINDOW) {
        best = namePos[i]
        break
      }
    }
    if (best) {
      ;(byName[best.name] = byName[best.name] || []).push(c.code)
    }
  }
  return { id, urls, mapping: byName, names }
}

async function main() {
  const dry = !process.argv.includes('--write')
  const results = {}
  for (const [id, file] of Object.entries(VERSIONS)) {
    process.stderr.write('\n[scrape] ' + id + '\n')
    const r = await scrapeVersion(id, file)
    results[id] = r
  }

  if (dry) {
    let mismatch = 0
    for (const [id, r] of Object.entries(results)) {
      console.log('\n########## ' + id + ' ##########')
      console.log('urls: ' + (r.urls.join(', ') || '(none)'))
      const data = JSON.parse(fs.readFileSync(DIR + '/' + VERSIONS[id], 'utf8'))
      for (const a of data.achievements) {
        const codes = r.mapping[a.name] || []
        const existing = a.recommendedDecks && a.recommendedDecks.length ? a.recommendedDecks.map((d) => d.code) : []
        let status
        if (existing.length && codes.length) status = 'HAS(' + existing.length + ') page=' + codes.length
        else if (existing.length) status = 'HAS(' + existing.length + ')'
        else if (codes.length) status = 'FILL x' + codes.length
        else status = 'EMPTY(no code on page)'
        // validate HAS: scraped[0] must equal existing[0]
        let flag = ''
        if (existing.length && codes.length) {
          if (existing[0] !== codes[0]) { flag = '  <<< MISMATCH existing=' + existing[0].slice(0, 20) + ' page=' + codes[0].slice(0, 20); mismatch++ }
        }
        console.log('  [' + status + '] ' + a.name + (codes.length ? ' -> ' + codes[0].slice(0, 24) + '...' : '') + flag)
      }
      const matched = new Set(Object.keys(r.mapping))
      const unmatched = r.names.filter((n) => !matched.has(n))
      if (unmatched.length) console.log('  >>> names with NO code on page: ' + unmatched.length + ' [' + unmatched.join(', ') + ']')
    }
    console.log('\n(DRY RUN) HAS-vs-page mismatches: ' + mismatch)
    console.log('(DRY RUN - no files written)')
  } else {
    // WRITE mode
    let totalFill = 0, totalFix = 0, totalSkip = 0, totalNoCode = 0
    for (const [id, r] of Object.entries(results)) {
      const file = DIR + '/' + VERSIONS[id]
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      let fill = 0, fix = 0
      for (const a of data.achievements) {
        const codes = r.mapping[a.name] || []
        const existingList = a.recommendedDecks && a.recommendedDecks.length ? a.recommendedDecks : null
        if (!codes.length) { totalNoCode++; continue } // no code on page, leave as-is
        if (existingList) {
          if (existingList[0].code === codes[0]) { totalSkip++; continue } // already correct
          fix++
        } else {
          fill++
        }
        const decks = codes.map((code, i) => ({
          name: (existingList && existingList[i] && existingList[i].name)
            ? existingList[i].name
            : (codes.length > 1 ? a.name + ' 卡组' + (i + 1) : a.name),
          code,
        }))
        a.recommendedDecks = decks
      }
      if (fill || fix) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
      totalFill += fill
      totalFix += fix
      console.log('[write] ' + id + ' -> filled=' + fill + ' fixed=' + fix)
    }
    console.log('\nDONE. filled=' + totalFill + ' fixed(corrupted)=' + totalFix + ' skipped(correct)=' + totalSkip + ' noCode=' + totalNoCode)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
