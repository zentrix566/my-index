#!/usr/bin/env node
// 生成 站内成就 slug ↔ 游戏内成就数字 ID 的映射表。
//
// 背景：采集器（tools/hs-cosmetics-collector）从游戏内存导出的 achievements.json
// 只含游戏数字 AchievementId；而站内 data/achievements/*.json 用自定义 slug（如 ct-001）。
// 本脚本读取 HSAchieveGuide 项目的成就快照（含中文名称/Quota/数字 ID），按
// 「名称 + 阶段 quota 序列」匹配，生成映射表
// src/features/hearthstone/data/achievement-id-map.json，供前端导入进度时换算。
//
// 支持两种数据源格式（按记录字段自动识别）：
//   1. data/hs-achievement-data.json — 全量快照，字段 HsAchievementId/Name/Quota
//   2. data/official-calibration/flat.zh-CN.json — 官方 ACHIEVEMENT 表校准数据
//      （顶层数组，字段 achievementId/achievementNameZhCN/quota）。
//      新版本上线后若 hs-achievement-data.json 尚未更新，优先用这份。
//
// 用法：
//   node scripts/build-achievement-id-map.mjs [--hs-data <成就数据 JSON 路径>]
//
// 匹配策略（多层，宁缺毋滥，避免错配）：
//   L0 显式 gameIds：站内成就对象直接给出数字 ID 数组（与 stages 顺序一一对应）时优先采用，
//      跳过名称匹配；用于上游数据源尚未收录的成就（ID 经游戏内 DBF 转储交叉验证后人工录入）
//   L1 归一化名称相同 + 阶段 quota 序列（站内 quota=0 视为 1）按升序精确对齐
//   L2 归一化名称相同的游戏条目总数恰好等于站内阶段数 → 整组接受（quota 随版本调整过）
//   L3 名称是纯符号（如隐藏谜题「？？？」）时名称无区分度，改按归一化描述互为子串取桶，
//      再套用 L1/L2；这类成就各版本的谜题描述唯一，可安全区分
//   L4 站内标记 gameCompletionFillsStages 的隐藏谜题在游戏里只有一个「最终完成」ID
//      （quota 对不上站内多阶段），桶内唯一时直接接受该 ID，导入端负责补全各阶段

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const ACHIEVEMENTS_DIR = join(repoRoot, 'src/features/hearthstone/data/achievements');
const OUTPUT_PATH = join(repoRoot, 'src/features/hearthstone/data/achievement-id-map.json');

// 常见存放位置：优先命令行参数，其次项目外 HSAchieveGuide 检出目录。
// 校准数据排在前：官方表快照对新上线版本的成就更全（hs-achievement-data.json
// 依赖 Firestone 运行时刷新，常滞后于新版本）。
const argIndex = process.argv.indexOf('--hs-data');
const candidates = argIndex > -1
  ? [process.argv[argIndex + 1]]
  : [
      'C:/Users/19872/Downloads/HSAchieveGuide-main/data/official-calibration/flat.zh-CN.json',
      'C:/Users/19872/Downloads/HSAchieveGuide-main/data/hs-achievement-data.json',
      join(repoRoot, '..', 'HSAchieveGuide-main', 'data', 'official-calibration', 'flat.zh-CN.json'),
      join(repoRoot, '..', 'HSAchieveGuide-main', 'data', 'hs-achievement-data.json'),
    ];
const hsDataPath = candidates.find((p) => p && existsSync(p));
if (!hsDataPath) {
  console.error('找不到成就数据 JSON，请用 --hs-data 指定路径');
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

// 纯符号名（隐藏谜题「？？？」等）：去掉符号后什么都不剩，名称本身无区分度
function isDegenerateName(name) {
  const text = String(name ?? '').replace(/\s+/g, '');
  return text.length > 0 && !/[^\p{P}\p{S}]/u.test(text);
}

function readJson(path) {
  let text = readFileSync(path, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

// 两种数据源统一成 { id, name, desc, section, quota }：
//   hs-achievement-data.json → { HsAchievementId, Name, Text, HsSectionId, Quota }
//   official-calibration/flat.zh-CN.json → 顶层数组
//   { achievementId, achievementNameZhCN, achievementDescZhCN, subcategoryNameZhCN, quota }
function normalizeSourceRecords(payload) {
  const records = Array.isArray(payload) ? payload : payload?.achievements;
  if (!Array.isArray(records) || !records.length) return null;
  if (typeof records[0]?.achievementId === 'number') {
    return records.map((item) => ({
      id: item.achievementId,
      name: item.achievementNameZhCN,
      desc: item.achievementDescZhCN,
      section: item.subcategoryNameZhCN || item.categoryNameZhCN,
      quota: item.quota,
    }));
  }
  if (typeof records[0]?.HsAchievementId === 'number') {
    return records.map((item) => ({
      id: item.HsAchievementId,
      name: item.Name,
      desc: item.Text,
      section: item.HsSectionId,
      quota: item.Quota,
    }));
  }
  return null;
}

const sourceRecords = normalizeSourceRecords(readJson(hsDataPath));
if (!sourceRecords) {
  console.error('成就数据中没有可识别的记录（需要 achievements 数组或顶层数组，且含数字成就 ID 字段）');
  process.exit(1);
}

// 游戏条目按归一化名称分桶；桶内按 Quota 升序（同成就各阶段共享名称，Quota 递增）
const buckets = new Map();
for (const item of sourceRecords) {
  const key = normalizeName(item.name);
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push(item);
}
for (const bucket of buckets.values()) {
  bucket.sort((a, b) => (a.quota || 0) - (b.quota || 0));
}

// 站内成就：全部扩展包文件里的 achievements 摊平。
// 顶层 gameImportable: false 的版本尚未在游戏内上线，HSAchieveGuide 里没有对应条目，
// 这些成就不参与匹配、不计入未匹配，只登记到 meta.excluded，避免守卫误报；
// 版本上线并移除该标记后，正常走匹配流程。
const siteAchievements = [];
const exemptSlugs = new Set();
const exemptVersions = [];
for (const file of readdirSync(ACHIEVEMENTS_DIR)) {
  if (!file.endsWith('.json')) continue;
  const data = readJson(join(ACHIEVEMENTS_DIR, file));
  const importable = data.gameImportable !== false;
  if (!importable) {
    exemptVersions.push({ id: data.id, name: data.name });
  }
  for (const achievement of data.achievements || []) {
    siteAchievements.push({ ...achievement, expansionFile: file });
    if (!importable) exemptSlugs.add(achievement.id);
  }
}
const importableAchievements = siteAchievements.filter((a) => !exemptSlugs.has(a.id));

const map = {};
const unmatchedIds = [];
const hsIdOwners = new Map();
let level1 = 0;
let level2 = 0;
let explicitCount = 0;
let conflicts = 0;

for (const site of importableAchievements) {
  // L0：显式 gameIds 优先（见文件头匹配策略说明）
  const explicitIds = Array.isArray(site.gameIds)
    && site.gameIds.length > 0
    && site.gameIds.every((id) => typeof id === 'number')
    ? site.gameIds
    : null;
  if (explicitIds) {
    const stageCount = (site.stages || []).length;
    if (stageCount && explicitIds.length !== stageCount) {
      console.warn(`警告: ${site.id} 显式 gameIds 数量（${explicitIds.length}）与阶段数（${stageCount}）不一致`);
    }
    const clash = explicitIds.some((id) => hsIdOwners.has(id));
    if (clash) {
      conflicts += 1;
      unmatchedIds.push(site.id);
      continue;
    }
    for (const id of explicitIds) hsIdOwners.set(id, site.id);
    map[site.id] = explicitIds;
    explicitCount += 1;
    continue;
  }

  const quotas = (site.stages || [])
    .map((stage) => stage.quota)
    .filter((q) => typeof q === 'number')
    .map((q) => (q === 0 ? 1 : q));
  // 纯符号名分两种：名称桶内条目全部同属一个版本的，名称本身仍唯一可信
  //（如沉没之城「#@*&%!」）；跨多个版本分区的才是真正的同名歧义（如「？？？」），
  // 改按描述取候选——游戏描述与站内任一阶段描述归一化后互为子串即入围
  let bucket;
  if (isDegenerateName(site.name)) {
    const byName = buckets.get(normalizeName(site.name)) || [];
    const sections = new Set(byName.map((item) => item.section));
    if (byName.length && sections.size === 1) {
      bucket = byName;
    } else {
      const stageDescs = (site.stages || [])
        .map((stage) => normalizeName(stage.description))
        .filter(Boolean);
      bucket = sourceRecords.filter((item) => {
        const desc = normalizeName(item.desc);
        return desc && stageDescs.some((d) => d.includes(desc) || desc.includes(d));
      });
      bucket.sort((a, b) => (a.quota || 0) - (b.quota || 0));
    }
  } else {
    bucket = buckets.get(normalizeName(site.name));
  }
  if (!bucket || !quotas.length) {
    unmatchedIds.push(site.id);
    continue;
  }

  // L1：按升序在桶内挑出与站内 quota 序列完全一致的子序列
  const picked = [];
  let cursor = 0;
  for (const item of bucket) {
    if (cursor < quotas.length && (item.quota || 0) === quotas[cursor]) {
      picked.push(item);
      cursor += 1;
    }
  }

  let matched = cursor === quotas.length ? picked : null;
  // L2：同名桶条目数恰好等于阶段数 → 整组接受（quota 数值随版本调整的情况）
  if (!matched && bucket.length === quotas.length) matched = bucket;
  // L4：站内声明的「单 ID 补全多阶段」隐藏谜题，桶内唯一时直接接受
  //（游戏里这类谜题只有一个最终完成条目，quota 是总次数，与站内拆分阶段必然对不齐）
  if (!matched && site.gameCompletionFillsStages === true && bucket.length === 1) matched = bucket;
  // L5：站内「累计」成就把游戏单一档位拆成多个展示阶段（如站内 8/16 对游戏 quota 16），
  // 桶内唯一且 quota 等于站内最高阶段值 → 接受；导入按累计次数自然推进各阶段
  if (!matched && site.type === '累计' && bucket.length === 1 && (bucket[0].quota || 0) === Math.max(...quotas)) {
    matched = bucket;
  }

  if (!matched) {
    unmatchedIds.push(site.id);
    continue;
  }

  // 同一个游戏 ID 不允许映射到两个站内成就（同名同 quota 的歧义组）
  const clash = matched.some((item) => hsIdOwners.has(item.id));
  if (clash) {
    conflicts += 1;
    unmatchedIds.push(site.id);
    continue;
  }
  for (const item of matched) hsIdOwners.set(item.id, site.id);
  map[site.id] = matched.map((item) => item.id);
  if (matched === bucket) level2 += 1;
  else level1 += 1;
}

const total = siteAchievements.length;
const importableTotal = importableAchievements.length;
const matchedCount = importableTotal - unmatchedIds.length;
const output = {
  meta: {
    description: '站内成就 slug → 游戏内成就数字 ID（按阶段顺序），供成就进度导入换算使用',
    generatedAt: new Date().toISOString(),
    source: 'HSAchieveGuide 成就数据（hs-achievement-data.json 或 official-calibration/flat.zh-CN.json）',
    sourcePath: hsDataPath.replace(/\\/g, '/'),
    total,
    importable: importableTotal,
    matched: matchedCount,
    explicit: explicitCount,
    unmatched: unmatchedIds.length,
    unmatchedIds,
    excluded: exemptSlugs.size,
    excludedVersions: exemptVersions,
  },
  map,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

console.log(`源数据: ${hsDataPath}`);
console.log(`站内成就 ${total} 个（含未上线豁免 ${exemptSlugs.size} 个），可导入 ${importableTotal} 个，匹配 ${matchedCount} 个（显式 ${explicitCount} + L1 精确 ${level1} + L2 整组 ${level2}），未匹配 ${unmatchedIds.length} 个`);
if (conflicts) console.warn(`警告: ${conflicts} 个成就因游戏 ID 重复归属而放弃匹配`);
console.log(`已生成: ${OUTPUT_PATH}`);
if (unmatchedIds.length) {
  console.log('未匹配清单:', unmatchedIds.join(', '));
}
