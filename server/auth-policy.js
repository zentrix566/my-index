/** 判断用户是否为当前环境配置的所有者账号。 */
export function isOwnerUser(user, ownerUsername = process.env.OWNER_USERNAME || 'owner') {
  return Boolean(user && user.username === ownerUsername)
}
