import assert from 'node:assert/strict'
import test from 'node:test'
import { isOwnerUser } from '../server/auth-policy.js'

test('owner 判断仅匹配配置的用户名', () => {
  assert.equal(isOwnerUser({ username: 'owner' }, 'owner'), true)
  assert.equal(isOwnerUser({ username: 'visitor' }, 'owner'), false)
  assert.equal(isOwnerUser(null, 'owner'), false)
})
