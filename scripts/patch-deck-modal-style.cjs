// 一次性批量替换 DeckDetailModal.vue 的写死深色样式为主题变量（跟随主页亮/暗）
const fs = require('fs')
const path = require('path')

const file = path.resolve(__dirname, '../src/hearthstone-achievements/components/DeckDetailModal.vue')
let s = fs.readFileSync(file, 'utf8')
const before = s

const reps = [
  // 关闭按钮（保留已改好的 hover）
  [
`  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);`,
`  border: 1px solid var(--hs-border);
  border-radius: 10px;
  color: var(--hs-muted);
  background: var(--hs-surface-soft);`
  ],
  // 标题 / 元信息
  [
`.ddm-title { margin: 8px 0 2px; color: #f8fafc; font-size: 22px; font-weight: 700; }
.ddm-meta { margin: 0; color: #94a3b8; font-size: 13px; }`,
`.ddm-title { margin: 8px 0 2px; color: var(--hs-text); font-size: 22px; font-weight: 700; }
.ddm-meta { margin: 0; color: var(--hs-muted); font-size: 13px; }`
  ],
  // 卡牌列表容器
  [
`  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(148, 163, 184, 0.12);
}
.ddm-card-list {`,
`  background: var(--hs-inset-bg);
  border: 1px solid var(--hs-border);
}
.ddm-card-list {`
  ],
  // 列表行 hover / active
  [
`.ddm-card-row:hover { background: rgba(255, 255, 255, 0.08); }
.ddm-card-row.ddm-card-active { background: rgba(255, 255, 255, 0.14); }`,
`.ddm-card-row:hover { background: var(--hs-surface-soft); }
.ddm-card-row.ddm-card-active { background: var(--hs-surface-overlay); }`
  ],
  // 费用宝石描边
  [
`.ddm-cost-svg polygon {
  stroke: rgba(255,255,255,.35);
  stroke-width: 0.8;
}`,
`.ddm-cost-svg polygon {
  stroke: var(--hs-border);
  stroke-width: 0.8;
}`
  ],
  // 白卡文字跟随主题
  [
`.ddm-rarity-common   { color: #f8fafc; }  /* 白卡：弹窗与详情均为深色背景，文字用白色保证可读 */`,
`.ddm-rarity-common   { color: var(--hs-text); }  /* 白卡：跟随主题（亮色=黑字，暗色=白字） */`
  ],
  // 缩略图边框
  [
`  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  opacity: .9;`,
`  border-radius: 4px;
  border: 1px solid var(--hs-border);
  opacity: .9;`
  ],
  // 占位背景
  [
`.ddm-art-placeholder {
  background: rgba(255,255,255,0.06);
}`,
`.ddm-art-placeholder {
  background: var(--hs-surface-soft);
}`
  ],
  // 数量徽标
  [
`  color: #ffd54f;
  background: rgba(255, 213, 79, 0.12);
  border: 1px solid rgba(255, 213, 79, 0.25);`,
`  color: var(--hs-gold);
  background: rgba(217, 119, 6, 0.12);
  border: 1px solid rgba(217, 119, 6, 0.25);`
  ],
  // 详情面板
  [
`  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(148, 163, 184, 0.12);
}
.ddm-detail-card {`,
`  background: var(--hs-inset-bg);
  border: 1px solid var(--hs-border);
}
.ddm-detail-card {`
  ],
  // 详情大图阴影
  [ `  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);`, `  box-shadow: var(--hs-shadow-strong);` ],
  // 详情提示文字
  [
`  color: #94a3b8;
  font-size: 13px;
  text-align: center;
}
.ddm-detail-placeholder p { margin: 0; }`,
`  color: var(--hs-muted);
  font-size: 13px;
  text-align: center;
}
.ddm-detail-placeholder p { margin: 0; }`
  ],
  // 卡组介绍
  [
`  background: rgba(2, 6, 23, 0.3);
  border: 1px solid rgba(148, 163, 184, 0.14);
}
.ddm-intro-label {`,
`  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
}
.ddm-intro-label {`
  ],
  // 介绍 label
  [ `  color: #cbd5e1;`, `  color: var(--hs-text-soft);` ],
  // 介绍 text
  [
`  margin: 0;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.7;`,
`  margin: 0;
  color: var(--hs-muted);
  font-size: 13px;
  line-height: 1.7;`
  ],
  // 空状态
  [
`  color: #94a3b8;
  text-align: center;
  background: rgba(0, 0, 0, 0.2);
}`,
`  color: var(--hs-muted);
  text-align: center;
  background: var(--hs-surface-soft);
}`
  ],
  // 复制按钮
  [
`  color: #4ade80;
  background: rgba(74, 222, 128, 0.08);`,
`  color: #16a34a;
  background: rgba(74, 222, 128, 0.08);`
  ],
  [
`.ddm-copied { color: #fff; background: #4ade80; border-color: #4ade80; }`,
`.ddm-copied { color: #fff; background: #16a34a; border-color: #16a34a; }`
  ],
  // 提示文字
  [ `.ddm-hint { margin: 8px 0 0; color: #64748b; font-size: 12px; }`, `.ddm-hint { margin: 8px 0 0; color: var(--hs-muted); font-size: 12px; }` ],
  // focus 描边
  [ `  outline: 3px solid rgba(251, 191, 36, 0.5);`, `  outline: 3px solid var(--hs-focus);` ],
]

for (const [oldStr, newStr] of reps) {
  const cnt = s.split(oldStr).length - 1
  if (cnt !== 1) {
    console.error('匹配异常 (count=' + cnt + '):\n' + oldStr.split('\n').slice(0, 3).join('\n'))
    process.exit(1)
  }
  s = s.split(oldStr).join(newStr)
}

// 暗色主题：稀有度文字提亮（插到 @media 之前）
const darkBlock = `
/* 暗色主题：稀有度文字在深色表面提亮，保证对比度 */
.hs-page[data-hs-theme="dark"] .ddm-rarity-rare { color: #60a5fa; }
.hs-page[data-hs-theme="dark"] .ddm-rarity-epic { color: #c084fc; }
.hs-page[data-hs-theme="dark"] .ddm-rarity-legendary { color: #fb923c; }
`
if (!s.includes(darkBlock.trim())) {
  s = s.replace('@media (max-width: 760px) {', darkBlock + '@media (max-width: 760px) {')
}

if (s === before) {
  console.error('没有任何替换发生，请检查')
  process.exit(1)
}
fs.writeFileSync(file, s, 'utf8')
console.log('DeckDetailModal.vue 样式主题化完成，替换项：' + reps.length)
