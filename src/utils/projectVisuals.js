const visualMap = {
  '/hearthstone': { icon: 'cards', tone: 'violet' },
  '/todo': { icon: 'todo', tone: 'blue' },
  '/willpower': { icon: 'shield', tone: 'green' },
  '/dream': { icon: 'moon', tone: 'amber' },
  '/hearthstone/frog': { icon: 'game', tone: 'green' },
  '/hearthstone/deck': { icon: 'cards', tone: 'violet' },
  '/hearthstone/lookup': { icon: 'search', tone: 'violet' },
  '/crazy-people': { icon: 'game', tone: 'rose' },
  '/subway': { icon: 'subway', tone: 'blue' },
  '/aiops': { icon: 'terminal', tone: 'cyan' },
  '/countdown': { icon: 'clock', tone: 'blue' },
  '/age-calculator': { icon: 'calculator', tone: 'cyan' },
  'aiops-mcp-analyzer': { icon: 'terminal', tone: 'cyan' },
  'cicd-architecture': { icon: 'pipeline', tone: 'blue' },
  'cloud-migration': { icon: 'cloud', tone: 'violet' }
}

/** 返回项目卡片的统一图标和主题色。 */
export function projectVisual(key) {
  return visualMap[key] || { icon: 'grid', tone: 'blue' }
}

