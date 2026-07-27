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
    assert.deepEqual(store.getUserById(userId), {
      id: userId,
      username: 'owner',
      created_at: store.getUserById(userId).created_at
    })

    store.upsertProgress(userId, {
      achievementId: 'demo-achievement',
      stages: { 0: true },
      count: 3,
      name: '测试成就',
      version: '测试版本',
      heroClass: '中立'
    })
    assert.deepEqual(store.getProgress(userId), {
      'demo-achievement': { stages: { 0: true }, count: 3 }
    })

    assert.deepEqual(store.getAiUsage(String(userId), '2026-07-27'), {
      fixedCount: 0,
      freeCount: 0
    })
    assert.deepEqual(store.incrementAiUsage(String(userId), '2026-07-27', 'fixed'), {
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
