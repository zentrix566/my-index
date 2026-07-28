import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createLocalSqliteStore } from '../server/db/local-sqlite.js'

test('SQLite 本地存储支持用户、进度和 AI 配额', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zentrix-sqlite-'))
  const store = createLocalSqliteStore(path.join(directory, 'app.db'))
  try {
    const userId = store.createUser('owner', 'hash')
    assert.equal(store.getUserByUsername('owner').id, userId)
    const user = store.getUserById(userId)
    assert.deepEqual(user, {
      id: userId,
      username: 'owner',
      email: null,
      email_verified: 0,
      has_password: 1,
      created_at: user.created_at
    })

    store.upsertProgress(userId, {
      achievementId: 'demo-achievement',
      stages: { 0: true },
      count: 3,
      name: '测试成就',
      version: '测试版本',
      heroClass: '中立'
    })
    const progress = store.getProgress(userId)
    assert.deepEqual(progress['demo-achievement'], {
      stages: { 0: true },
      count: 3,
      updatedAt: progress['demo-achievement'].updatedAt
    })
    assert.ok(progress['demo-achievement'].updatedAt)

    assert.deepEqual(store.getHearthstoneProfile(userId), {
      pinnedAchievementIds: [],
      preferences: {},
      updatedAt: null
    })
    const savedProfile = store.saveHearthstoneProfile(userId, {
      pinnedAchievementIds: ['demo-achievement', 'second-achievement'],
      preferences: {
        hardcore: true,
        defaultExpansionId: 'violet-hold',
        compactMode: true
      }
    })
    assert.deepEqual(store.getHearthstoneProfile(userId), savedProfile)
    assert.deepEqual(savedProfile.pinnedAchievementIds, [
      'demo-achievement',
      'second-achievement'
    ])
    assert.equal(savedProfile.preferences.compactMode, true)

    assert.deepEqual(store.getAiUsage(String(userId), '2026-07-27'), {
      fixedCount: 0,
      freeCount: 0
    })
    assert.deepEqual(store.incrementAiUsage(String(userId), '2026-07-27', 'fixed'), {
      fixedCount: 1,
      freeCount: 0
    })
    assert.deepEqual(store.reserveAiUsage(String(userId), '2026-07-27', 'fixed', 2), {
      fixedCount: 2,
      freeCount: 0
    })
    assert.equal(store.reserveAiUsage(String(userId), '2026-07-27', 'fixed', 2), null)
    assert.deepEqual(store.releaseAiUsage(String(userId), '2026-07-27', 'fixed'), {
      fixedCount: 1,
      freeCount: 0
    })
  } finally {
    store.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('SQLite 用户名唯一约束与 PostgreSQL 错误码保持兼容', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zentrix-sqlite-'))
  const store = createLocalSqliteStore(path.join(directory, 'app.db'))
  try {
    store.createUser('same-name', 'first')
    assert.throws(
      () => store.createUser('same-name', 'second'),
      (error) => error.code === '23505'
    )
  } finally {
    store.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('SQLite 账户安全字段与一次性令牌保持一致', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zentrix-sqlite-'))
  const store = createLocalSqliteStore(path.join(directory, 'app.db'))
  try {
    const userId = store.createUser('account', 'initial-hash', 'User@example.com')
    assert.equal(store.getUserByEmail('user@EXAMPLE.com').id, userId)
    assert.equal(store.getUserByIdentifier('USER@example.com').id, userId)

    store.setUserEmail(userId, 'new@example.com')
    store.setEmailVerified(userId, true)
    store.setHasPassword(userId, false)
    store.updatePasswordById(userId, 'updated-hash')
    assert.deepEqual(store.getUserAuthById(userId), {
      id: userId,
      username: 'account',
      password_hash: 'updated-hash',
      email: 'new@example.com',
      has_password: 0
    })

    const future = new Date(Date.now() + 60_000).toISOString()
    store.createVerificationToken(userId, 'old-verification', future)
    store.createVerificationToken(userId, 'new-verification', future)
    store.invalidateUserVerificationTokens(userId)
    assert.equal(store.getValidVerificationToken('old-verification'), null)
    assert.equal(store.getValidVerificationToken('new-verification'), null)

    store.createVerificationToken(userId, 'active-verification', future)
    store.consumeVerificationToken('active-verification', userId)
    assert.equal(store.getValidVerificationToken('active-verification'), null)
    assert.equal(store.getUserById(userId).email_verified, 1)

    store.createResetToken(userId, 'old-reset', future)
    store.createResetToken(userId, 'active-reset', future)
    store.consumeResetToken('active-reset', userId)
    assert.equal(store.getValidResetToken('old-reset'), null)
    assert.equal(store.getValidResetToken('active-reset'), null)
  } finally {
    store.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
