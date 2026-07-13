import IP2RegionModule from 'ip2region'

// 兼容 CJS/ESM 双重 default 导出
const IP2Region = IP2RegionModule.default || IP2RegionModule

let query = null

try {
  query = new IP2Region()
  console.log('[geoip] IP 地理定位数据库加载成功')
} catch (e) {
  console.warn('[geoip] IP 地理定位数据库加载失败:', e.message)
}

// 直辖市/特别行政区，省/市名称相同时不重复显示
const MUNICIPALITIES = new Set(['北京', '上海', '天津', '重庆'])

/**
 * 查询 IP 地理信息
 * @param {string} ip
 * @returns {{ country: string, region: string, city: string, isp: string }}
 */
export function lookup(ip) {
  const empty = { country: '', region: '', city: '', isp: '' }
  if (!ip || !query) return empty

  // 先处理 IPv4-mapped IPv6 地址（::ffff:x.x.x.x）
  let normalizedIp = ip
  if (normalizedIp.startsWith('::ffff:')) {
    normalizedIp = normalizedIp.slice(7)
  }

  // 跳过内网 IP
  if (isPrivateIP(normalizedIp)) return { country: '内网', region: '', city: '', isp: '' }

  try {
    const result = query.search(normalizedIp)
    if (!result) return empty

    // ip2region 对内网 IP 可能返回 country="" city="内网IP"
    if (!result.country && (result.city === '内网IP' || result.isp === '内网IP')) {
      return { country: '内网', region: '', city: '', isp: '' }
    }
    if (result.city === '本机地址' || result.isp === '本机地址') {
      return { country: '内网', region: '', city: '', isp: '' }
    }

    const country = result.country || ''
    let province = result.province || ''
    const city = result.city || ''
    const isp = result.isp || ''

    // 直辖市处理：省名和市名相同时，省字段留空避免重复（如"北京 北京市"）
    if (MUNICIPALITIES.has(province)) {
      province = ''
    }
    // 如果 city 包含 province 名称，也不重复显示（如"河北 保定市" ok，但有些数据可能重复）

    return { country, region: province, city, isp }
  } catch {
    return empty
  }
}

/**
 * 判断是否为内网 IP
 */
function isPrivateIP(ip) {
  // IPv6 本地地址
  if (ip === '::1' || ip === '::') return true
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true

  // IPv6 包含冒号但不是上述内网段，交给 ip2region 处理
  if (ip.includes(':')) return false

  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) return false
  // 0.0.0.0
  if (parts[0] === 0) return true
  // 10.0.0.0/8
  if (parts[0] === 10) return true
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true
  // 127.0.0.0/8
  if (parts[0] === 127) return true
  // 169.254.0.0/16 (link-local)
  if (parts[0] === 169 && parts[1] === 254) return true
  return false
}
