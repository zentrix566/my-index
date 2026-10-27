#!/usr/bin/env node
// 自动匹配新版本成就的游戏内数字 ID，写入版本 JSON 的显式 gameIds。
//
// 背景：上游 HSAchieveGuide 更新以月计，新版本成就 ID 的权威来源改为
// 「游戏内存 + Wiki」双源（完整流程见 AGENTS.md「获取新版本成就的游戏 ID」）：
//   1. 采集器 dumpachievedbf 导出的成就 DBF（AchievementId + RewardTrackXp，验证源，无名称）；
//   2. Hearthstone Wiki Feats 页（ID | 名称 | 描述 | XP/点数，名称↔ID 主源）。
// 本脚本解析 Wiki 页的逐条成就表，按「职业分组 + 阶段数 + 描述数值 quota 序列」
// 匹配站内成就，再与 DBF 的 XP 逐一核对；全部通过才写入 gameIds，任何一条验证
// 不过就整体放弃并输出人工排查清单——写错 ID 会错位用户进度，宁缺毋滥。
//
// 用法：
//   node scripts/auto-match-achievement-ids.mjs --version <版本文件名不含 .json>
//     [--wiki <url>]         # 默认取版本 JSON referenceLinks 里的 hearthstone.wiki.gg/wiki/Feats/ 链接
//     [--wiki-html <file>]   # 网络不通时：浏览器另存的页面 HTML
//     [--dbf <file>]         # 默认采集器输出 tools/hs-cosmetics-collector/bin/Release/net48/achievement-dbf.json
//     [--force]              # 覆盖已存在但不一致的 gameIds（默认报错）
//
// 前置：炉石已更到当前补丁并运行过一次 dumpachievedbf。

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const ACHIEVEMENTS_DIR = join(repoRoot, 'src/features/hearthstone/data/achievements');
const DEFAULT_DBF_PATH = join(repoRoot, 'tools/hs-cosmetics-collector/bin/Release/net48/achievement-dbf.json');

// Wiki 职业分组名 → 站内 heroClass 取值
const WIKI_CLASS_TO_SITE = {
  'death knight': '死亡骑士',
  'demon hunter': '恶魔猎手',
  'druid': '德鲁伊',
  'hunter': '猎人',
  'mage': '法师',
  'monk': '武僧',
  'paladin': '圣骑士',
  'priest': '牧师',
  'rogue': '潜行者',
  'shaman': '萨满祭司',
  'warlock': '术士',
  'warrior': '战士',
  'neutral': '中立',
};

function argOf(name) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function readJson(path) {
  let text = readFileSync(path, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

// Wiki HTML 单元格转纯文本（只处理表格里会出现的实体，够用且无依赖）
function stripTags(html) {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#160;|&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// 顺序扫描 HTML：h2/h3 标题切换职业分组，wikitable 行给出逐条成就
function parseWikiFeats(html) {
  const rows = [];
  const tokenRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>|<tr>([\s\S]*?)<\/tr>/g;
  let section = '';
  let m;
  while ((m = tokenRe.exec(html)) !== null) {
    if (m[1] !== undefined) {
      const heading = stripTags(m[1]).replace(/\(.*?\)/g, '').trim();
      if (heading) section = heading;
      continue;
    }
    const cells = [...m[2].matchAll(/<t([dh])[^>]*>([\s\S]*?)<\/t\1>/g)].map((c) => stripTags(c[2]));
    if (cells.length < 4 || cells[0] === 'Id' || !/^\d+$/.test(cells[0])) continue;
    const rewards = cells[3].match(/\d+/g) || [];
    rows.push({
      section,
      id: Number(cells[0]),
      name: cells[1],
      desc: cells[2],
      xp: rewards.length ? Number(rewards[0]) : null,
      pts: rewards.length > 1 ? Number(rewards[1]) : null,
    });
  }
  return rows;
}

// 同职业同名称的行归为一个成就（各阶段），按 ID 升序即阶段顺序
function groupWikiAchievements(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.section}::${row.name}`;
    if (!map.has(key)) map.set(key, { section: row.section, name: row.name, stages: [] });
    map.get(key).stages.push(row);
  }
  const list = [...map.values()];
  for (const item of list) item.stages.sort((a, b) => a.id - b.id);
  return list;
}

// 描述里的首个整数值当作该阶段的 quota（如 "Summon 20 Shredclaws" → 20）
function descQuota(desc) {
  const m = String(desc).match(/\d+/);
  return m ? Number(m[0]) : null;
}

// ---- 入参 ----
const versionId = argOf('--version');
if (!versionId) {
  console.error('用法: node scripts/auto-match-achievement-ids.mjs --version <版本文件名不含 .json> [--wiki <url>] [--wiki-html <file>] [--dbf <file>] [--force]');
  process.exit(1);
}
const versionPath = join(ACHIEVEMENTS_DIR, `${versionId}.json`);
if (!existsSync(versionPath)) {
  const available = readdirSync(ACHIEVEMENTS_DIR).filter((f) => f.endsWith('.json')).join(', ');
  fail(`版本文件不存在: ${versionPath}（现有: ${available}）`);
}

const dbfPath = argOf('--dbf') || DEFAULT_DBF_PATH;
if (!existsSync(dbfPath)) fail(`找不到 DBF 转储: ${dbfPath}\n  先启动炉石并运行 tools/hs-cosmetics-collector 的 dumpachievedbf 模式（见 AGENTS.md）`);
const dbf = readJson(dbfPath);
const xpById = new Map((dbf.records || []).map((r) => [r.AchievementId, r.RewardTrackXp]));
console.log(`DBF 转储: ${dbfPath}（${dbf.records?.length ?? 0} 条，导出于 ${dbf.dumpedAt ?? '未知时间'}）`);

// ---- Wiki 数据 ----
const versionData = readJson(versionPath);
const wikiUrlArg = argOf('--wiki');
const wikiHtmlPath = argOf('--wiki-html');
const wikiUrl = wikiUrlArg
  || (versionData.referenceLinks || []).map((l) => l.url).find((u) => u.includes('hearthstone.wiki.gg/wiki/Feats/'));
let html;
if (wikiHtmlPath) {
  html = readFileSync(wikiHtmlPath, 'utf8');
  console.log(`Wiki 页面: ${wikiHtmlPath}（本地文件）`);
} else if (wikiUrl) {
  const res = await fetch(wikiUrl, { headers: { 'user-agent': 'zentrix-index-achievement-sync/1.0' } });
  if (!res.ok) fail(`拉取 Wiki 页失败: HTTP ${res.status} ${wikiUrl}\n  网络不通时可在浏览器打开该地址另存为 HTML，用 --wiki-html <file> 重试`);
  html = await res.text();
  console.log(`Wiki 页面: ${wikiUrl}`);
} else {
  fail('找不到 Wiki Feats 链接：版本 JSON 的 referenceLinks 里没有 hearthstone.wiki.gg/wiki/Feats/ 链接，可用 --wiki <url> 指定');
}

const wikiGroups = groupWikiAchievements(parseWikiFeats(html));
if (!wikiGroups.length) fail('Wiki 页面里没有解析到任何成就行，页面结构可能变了，请人工核对');

// ---- 逐个匹配站内成就 ----
const matched = [];
const problems = [];
for (const site of versionData.achievements || []) {
  const siteClass = String(site.heroClass || '').trim();
  const siteQuotas = (site.stages || []).map((s) => Number(s.quota));
  const candidates = wikiGroups.filter((g) => {
    const cls = WIKI_CLASS_TO_SITE[g.section.toLowerCase()];
    if (cls !== siteClass) return false;
    if (g.stages.length !== site.stages.length) return false;
    const quotas = g.stages.map((s) => descQuota(s.desc));
    return quotas.every((q, i) => q === siteQuotas[i]);
  });
  if (candidates.length === 1) {
    matched.push({ site, group: candidates[0] });
  } else if (candidates.length === 0) {
    problems.push(`${site.id} ${site.name}：Wiki 上没有「${siteClass} × ${site.stages.length} 阶段 × quota[${siteQuotas.join('/')}]」的成就（站内数据或 Wiki 页需人工核对）`);
  } else {
    problems.push(`${site.id} ${site.name}：匹配到 ${candidates.length} 个候选（${candidates.map((c) => c.name).join(' / ')}），无法唯一确定`);
  }
}

// ---- 交叉验证：全部通过才写入 ----
const usedIds = new Set();
for (const { site, group } of matched) {
  for (const stage of group.stages) {
    if (!xpById.has(stage.id)) problems.push(`${site.id} ← Wiki ID ${stage.id} 不在 DBF 转储里（转储可能早于该补丁，重跑 dumpachievedbf）`);
    else if (stage.xp !== null && stage.xp !== xpById.get(stage.id)) {
      problems.push(`${site.id} ← Wiki ID ${stage.id} XP=${stage.xp} 与 DBF XP=${xpById.get(stage.id)} 不一致`);
    }
    if (usedIds.has(stage.id)) problems.push(`游戏 ID ${stage.id} 被匹配到多个成就（含 ${site.id}）`);
    usedIds.add(stage.id);
  }
}
if (problems.length) {
  console.error(`\n✗ 匹配/验证未全部通过，未写入任何改动（${problems.length} 个问题）：`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('未匹配的 Wiki 成就（站内可能未收录，仅供参考）:');
  const matchedNames = new Set(matched.map(({ group }) => group.name));
  for (const g of wikiGroups) {
    if (!matchedNames.has(g.name)) console.error(`  - [${g.section}] ${g.name}（${g.stages.map((s) => s.id).join(',')}）`);
  }
  process.exit(1);
}

const allIds = [...usedIds].sort((a, b) => a - b);
if (allIds.length && allIds[allIds.length - 1] - allIds[0] + 1 !== allIds.length) {
  console.warn(`⚠ 提示: 匹配到的 ID 段不连续（${allIds[0]}-${allIds[allIds.length - 1]} 共 ${allIds.length} 个），请人工确认合理性`);
}

// ---- 写入 gameIds（文本插入，保持文件其余格式不动） ----
let text = readFileSync(versionPath, 'utf8');
const xpWarnings = [];
let written = 0;
let unchanged = 0;
for (const { site, group } of matched) {
  const ids = group.stages.map((s) => s.id);
  const anchor = `      "id": "${site.id}",\n`;
  const existing = Array.isArray(site.gameIds) ? site.gameIds : null;
  if (existing && existing.join(',') === ids.join(',')) {
    unchanged += 1;
    console.log(`= ${site.id} ${site.name} → [${ids.join(', ')}]（${group.name}）已一致`);
    continue;
  }
  if (existing && !process.argv.includes('--force')) {
    fail(`${site.id} 已有 gameIds [${existing.join(', ')}] 与本次匹配 [${ids.join(', ')}] 不一致；确认要覆盖请加 --force`);
  }
  const idsText = `      "gameIds": [${ids.join(', ')}],\n`;
  const count = text.split(anchor).length - 1;
  if (count !== 1) fail(`锚点 "id": "${site.id}" 命中 ${count} 次，为安全起见不写入`);
  text = existing
    ? text.replace(/(      "id": "[^"]+",\n)      "gameIds": \[[^\]]*\],\n/, `$1${idsText}`)
    : text.replace(anchor, anchor + idsText);
  written += 1;
  console.log(`+ ${site.id} ${site.name} → [${ids.join(', ')}]（${group.name}）`);

  // 站内 XP/点数与权威来源不一致时给出修正建议（不自动改）
  (site.stages || []).forEach((stage, i) => {
    const wiki = group.stages[i];
    if (stage.xpReward !== wiki.xp) xpWarnings.push(`${site.id} 阶段${i + 1} xpReward 站内 ${stage.xpReward} ≠ Wiki/DBF ${wiki.xp}`);
    if (stage.points !== wiki.pts) xpWarnings.push(`${site.id} 阶段${i + 1} points 站内 ${stage.points} ≠ Wiki ${wiki.pts}`);
  });
}

JSON.parse(text);
writeFileSync(versionPath, text, 'utf8');

console.log(`\n完成: 新写入 ${written} 个，已一致 ${unchanged} 个（共 ${matched.length} 个站内成就）`);
for (const w of xpWarnings) console.warn(`⚠ ${w}`);
if (versionData.gameImportable === false) {
  console.warn('⚠ 该版本仍标记 gameImportable: false，导入守卫豁免中；已上线请移除该标记');
}
if (written > 0) {
  console.log('下一步: node scripts/build-achievement-id-map.mjs 重建映射，回归对比后 npm run check，随部署生效');
}
