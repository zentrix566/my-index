/**
 * .env 加载器。必须作为 server/index.js 的第一个 import：
 * db/auth 等模块在模块顶层就读取 process.env（如 new Pool(...)），
 * ESM 的 import 按声明顺序执行，此文件先于它们把 .env 注入环境。
 * 与 dotenv 语义一致：不覆盖已存在的环境变量（dev:local 预设的值优先）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env')
try {
  if (fs.existsSync(envPath)) {
    const envText = fs.readFileSync(envPath, 'utf8')
    for (const raw of envText.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const m = line.match(/^([\w.-]+)\s*=\s*(.*)$/)
      if (!m) continue
      const key = m[1]
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  }
} catch {
  /* 无 .env 或解析失败时跳过，不阻断启动 */
}
