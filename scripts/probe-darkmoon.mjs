import https from 'https'
import http from 'http'

function fetchText(url, depth = 0) {
  if (depth > 5) return Promise.reject(new Error('too many redirects'))
  const get = url.startsWith('https') ? https.get : http.get
  return new Promise((resolve, reject) => {
    const req = get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
      if ([301, 302, 303, 307, 308].includes(resp.statusCode) && resp.headers.location) {
        resp.resume()
        return resolve(fetchText(new URL(resp.headers.location, url).toString(), depth + 1))
      }
      let d = ''
      resp.on('data', (c) => (d += c))
      resp.on('end', () => resolve(d))
    })
    req.on('error', reject)
    req.setTimeout(20000, () => req.destroy(new Error('timeout')))
  })
}

const urls = [
  'https://mob.iyingdi.com/post/2361620',
  'https://www.iyingdi.com/tz/post/2361620',
  'https://www.iyingdi.com/tz/post/2333564',
  'https://www.iyingdi.com/tz/post/2337514',
]

for (const u of urls) {
  try {
    const h = await fetchText(u)
    const m = h.match(/<aside>/g)
    console.log(u + '\n  len=' + h.length + ' <aside>=' + (m ? m.length : 0))
  } catch (e) {
    console.log(u + ' ERROR ' + e.message)
  }
}
