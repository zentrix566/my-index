#!/usr/bin/env node
// 生成 站内成就 slug ↔ 游戏内成就数字 ID 的映射表。
//
// 背景：采集器（tools/hs-cosmetics-collector）从游戏内存导出的 achievements.json
// 只含游戏数字 AchievementId；而站内 data/achievements/*.json 用自定义 slug（如 ct-001）。
// 本脚本读取 HSAchieveGuide 项目的 hs-achievement-data.json（游戏全量成就快照，
// 含中文名称/Quota/数字 ID），按「名称 + 阶段 quota 序列」匹配，生成映射表
// src/features/hearthstone/data/achievement-id-map.json，供前端导入进度时换算。
//
// 用法：
//   node scripts/build-achievement-id-map.mjs [--hs-data <hs-achievement-data.json 路径>]
//
// 匹配策略（两层，宁缺毋滥，避免错配）：
//   L1 归一化名称相同 + 阶段 quota 序列（站内 quota=0 视为 1）按升序精确对齐
//   L2 归一化名称相同的游戏条目总数恰好等于站内阶段数 → 整组接受（quota 随版本调整过）

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const ACHIEVEMENTS_DIR = join(repoRoot, 'src/features/hearthstone/data/achievements');
const OUTPUT_PATH = join(repoRoot, 'src/features/hearthstone/data/achievement-id-map.json');

// 常见存放位置：优先命令行参数，其次项目外 HSAchieveGuide 检出目录
const argIndex = process.argv.indexOf('--hs-data');
const candidates = argIndex > -1
  ? [process.argv[argIndex + 1]]
  : [
      'C:/Users/19872/Downloads/HSAchieveGuide-main/data/hs-achievement-data.json',
      join(repoRoot, '..', 'HSAchieveGuide-main', 'data', 'hs-achievement-data.json'),
    ];
const hsDataPath = candidates.find((p) => p && existsSync(p));
if (!hsDataPath) {
  console.error('找不到 hs-achievement-data.json，请用 --hs-data 指定路径');
  process.exit(1);
}

// 名称归一化：去空白与中英文标点、统一小写；归一化后为空则回退原名，避免特殊符号名称互相碰撞
function normalizeName(name) {
  const normalized = String(name ?? '')
    .replace(/\s+/g, '')
    .replace(/[\p{P}\p{S}]/gu, '')
    .toLowerCase();
  return normalized || String(name ?? '').trim();
}

function readJson(path) {
  let text = readFileSync(path, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

const hsAchievements = readJson(hsDataPath).achievements;
if (!Array.isArray(hsAchievements) || !hsAchievements.length) {
  console.error('hs-achievement-data.json 中没有 achievements 数组');
  process.exit(1);
}

// 游戏条目按归一化名称分桶；桶内按 Quota 升序（同成就各阶段共享名称，Quota 递增）
const buckets = new Map();
for (const item of hsAchievements) {
  const key = normalizeName(item.Name);
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push(item);
}
for (const bucket of buckets.values()) {
  bucket.sort((a, b) => (a.Quota || 0) - (b.Quota || 0));
}

// 站内成就：全部扩展包文件里的 achievements 摊平
const siteAchievements = [];
for (const file of readdirSync(ACHIEVEMENTS_DIR)) {
  if (!file.endsWith('.json')) continue;
  const data = readJson(join(ACHIEVEMENTS_DIR, file));
  for (const achievement of data.achievements || []) {
    siteAchievements.push({ ...achievement, expansionFile: file });
  }
}

const map = {};
const unmatchedIds = [];
const hsIdOwners = new Map();
let level1 = 0;
let level2 = 0;
let conflicts = 0;

for (const site of siteAchievements) {
  const quotas = (site.stages || [])
    .map((stage) => stage.quota)
    .filter((q) => typeof q === 'number')
    .map((q) => (q === 0 ? 1 : q));
  const bucket = buckets.get(normalizeName(site.name));
  if (!bucket || !quotas.length) {
    unmatchedIds.push(site.id);
    continue;
  }

  // L1：按升序在桶内挑出与站内 quota 序列完全一致的子序列
  const picked = [];
  let cursor = 0;
  for (const item of bucket) {
    if (cursor < quotas.length && (item.Quota || 0) === quotas[cursor]) {
      picked.push(item);
      cursor += 1;
    }
  }

  let matched = cursor === quotas.length ? picked : null;
  // L2：同名桶条目数恰好等于阶段数 → 整组接受（quota 数值随版本调整的情况）
  if (!matched && bucket.length === quotas.length) matched = bucket;

  if (!matched) {
    unmatchedIds.push(site.id);
    continue;
  }

  // 同一个游戏 ID 不允许映射到两个站内成就（同名同 quota 的歧义组）
  const clash = matched.some((item) => hsIdOwners.has(item.HsAchievementId));
  if (clash) {
    conflicts += 1;
    unmatchedIds.push(site.id);
    continue;
  }
  for (const item of matched) hsIdOwners.set(item.HsAchievementId, site.id);
  map[site.id] = matched.map((item) => item.HsAchievementId);
  if (matched === bucket) level2 += 1;
  else level1 += 1;
}

const total = siteAchievements.length;
const matchedCount = total - unmatchedIds.length;
const output = {
  meta: {
    description: '站内成就 slug → 游戏内成就数字 ID（按阶段顺序），供成就进度导入换算使用',
    generatedAt: new Date().toISOString(),
    source: 'HSAchieveGuide hs-achievement-data.json',
    sourcePath: hsDataPath.replace(/\\/g, '/'),
    total,
    matched: matchedCount,
    unmatched: unmatchedIds.length,
    unmatchedIds,
  },
  map,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

console.log(`源数据: ${hsDataPath}`);
console.log(`站内成就 ${total} 个，匹配 ${matchedCount} 个（L1 精确 ${level1} + L2 整组 ${level2}），未匹配 ${unmatchedIds.length} 个`);
if (conflicts) console.warn(`警告: ${conflicts} 个成就因游戏 ID 重复归属而放弃匹配`);
console.log(`已生成: ${OUTPUT_PATH}`);
if (unmatchedIds.length) {
  console.log('未匹配清单:', unmatchedIds.join(', '));
}
