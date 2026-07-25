import https from 'https'
const urls = {
  'barrens': 'https://www.iyingdi.com/tz/post/2369171',
  'dragons': 'https://www.iyingdi.com/tz/post/5490473',
  'scholomance': 'https://www.iyingdi.com/tz/post/5489932',
  'sunken-city': 'https://www.iyingdi.com/tz/post/5185217',
}
function fetchText(url){return new Promise((res,rej)=>{
  https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},r=>{
    if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){return fetchText(new URL(r.headers.location,url).href).then(res,rej)}
    let d='';r.setEncoding('utf8');r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej)
})}
for (const [id,url] of Object.entries(urls)) {
  try {
    const html = await fetchText(url)
    const asides = (html.match(/<aside>/g)||[]).length
    const codes = (html.match(/AAECA[0-9A-Za-z]{20,}/g)||[])
    console.log(`\n=== ${id} (${url}) ===`)
    console.log(`  len=${html.length} <aside>=${asides} AAECA-long=${codes.length}`)
    const idx = html.indexOf('<aside>')
    if (idx>=0) console.log('  snippet: '+html.slice(Math.max(0,idx-300), idx+80).replace(/\n/g,' '))
  } catch(e){ console.log(`${id} ERROR ${e.message}`) }
}
