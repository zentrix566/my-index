/**
 * 已废弃：心魔（Willpower）独立认证路由。
 *
 * 心魔的账号体系已统一到站点主账号（server/auth.js + 主库 users 表），
 * 登录态复用主站 Cookie（site_token），业务接口改用主站的 requireAuth（req.userId）。
 * 本文件不再被任何模块引用，仅保留作历史参考。
 * 确认无引用后可直接删除（git rm server/willpower/auth.js）。
 */
