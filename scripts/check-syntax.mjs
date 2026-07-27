import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const roots = ['server', 'scripts', 'src']
const files = ['vite.config.js']

function collectJavaScriptFiles(directory) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      collectJavaScriptFiles(filePath)
    } else if (/\.(?:c?js|mjs)$/.test(entry.name)) {
      files.push(filePath)
    }
  }
}

for (const root of roots) collectJavaScriptFiles(root)

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
    windowsHide: true
  })
  if (result.status !== 0) {
    process.stderr.write(result.stderr || `语法检查失败：${file}\n`)
    process.exit(result.status || 1)
  }
}

console.log(`语法检查通过：${files.length} 个 JavaScript 文件`)
