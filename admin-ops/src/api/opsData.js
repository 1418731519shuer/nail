const fallbackMetrics = {
  totals: {
    exposures: 0,
    views: 0,
    candidates: 0,
    try_ons: 0,
    try_on_users: 0,
    result_views: 0,
    intents: 0,
    orders: 0,
    candidate_rate: 0,
    tryon_confirm_rate: 0,
    total_confirm_rate: 0,
    intent_to_order_rate: 0
  },
  styles: [],
  recent_events: []
}

const fallbackSimulation = {
  latest_week: 0,
  latest_3class_distribution: {},
  model_report_true_3class: null,
  top_hot: [],
  top_cold: [],
  top_potential: []
}

const fallbackXhsDataset = {
  updatedAt: '',
  styles: [],
  filterGroups: {},
  stats: {}
}

const fallbackTrendSnapshot = {
  updatedAt: '',
  dateRange: { startDate: '', endDate: '', days: 0 },
  weeklyRange: { startWeek: 0, endWeek: 0 },
  latestHotIds: [],
  latestColdIds: [],
  latestPotentialIds: [],
  styles: []
}

const OPS_CACHE_TTL_MS = 30 * 1000
let opsCacheValue = null
let opsCacheTime = 0
let opsCachePromise = null

async function getJson(url, fallback) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.warn(`[opsData] ${url} fallback`, error)
    return fallback
  }
}

export async function fetchOpsData() {
  const now = Date.now()
  if (opsCacheValue && now - opsCacheTime < OPS_CACHE_TTL_MS) {
    return opsCacheValue
  }

  if (opsCachePromise) {
    return opsCachePromise
  }

  opsCachePromise = Promise.all([
    getJson('/api/metrics-summary', fallbackMetrics),
    getJson('/api/simulation-summary', fallbackSimulation),
    getJson('/api/xhs-style-dataset', fallbackXhsDataset),
    getJson('/api/xhs-trend-snapshot', fallbackTrendSnapshot)
  ]).then(([metrics, simulation, xhsDataset, trendSnapshot]) => {
    const built = buildOpsData(metrics, simulation, xhsDataset, trendSnapshot)
    opsCacheValue = built
    opsCacheTime = Date.now()
    return built
  }).finally(() => {
    opsCachePromise = null
  })

  return opsCachePromise
}

export function invalidateOpsDataCache() {
  opsCacheValue = null
  opsCacheTime = 0
  opsCachePromise = null
}

function percent(value) {
  return Math.round((Number(value) || 0) * 1000) / 10
}

function pickContentBank(styles, bucket) {
  if (bucket === 'hot') return styles.filter((item) => item.recommendBucket === 'hot' || item.recommendBucket === 'stable')
  if (bucket === 'potential') return styles.filter((item) => item.recommendBucket === 'potential')
  if (bucket === 'cold') return styles.filter((item) => item.recommendBucket === 'cold')
  return styles
}

function flattenTags(style) {
  const orderedGroups = ['款式', '风格', '季节', '甲型']
  return orderedGroups.flatMap((group) => style.tagGroups?.[group] || [])
}

function makeSuggestion(item) {
  if (item.type === 'hot') return '互动和热度都高，适合继续保留在核心流量位。'
  if (item.type === 'potential') return '曝光仍有提升空间，建议继续做潜力测试。'
  if (item.type === 'untested') return '样本不足，建议继续给基础曝光，不急着判断冷门。'
  return '热度偏弱，优先检查封面、分类和转化承接。'
}

function normalizeMetricRow(row, index, contentStyle) {
  const label = row.label || row.true_state || 'Stable'
  const tags = flattenTags(contentStyle)
  const viewCount = row.view_uv || row.exposures || 0
  const confirmCount = row.total_confirm_uv || row.orders || 0
  const confirmRate = row.total_confirm_rate ?? row.booking_rate ?? row.intent_rate ?? (viewCount ? confirmCount / viewCount : 0)
  return {
    id: contentStyle?.id || row.style_id || `style-${index + 1}`,
    name: contentStyle?.name || `模拟款式 ${index + 1}`,
    image: contentStyle?.image || '',
    category: contentStyle?.primaryTag || contentStyle?.secondaryTag || row.category || '精选',
    priceLevel: row.price_level || 'mid',
    tags: tags.length ? tags.slice(0, 4) : [contentStyle?.primaryTag, contentStyle?.secondaryTag].filter(Boolean),
    tryOnCount: row.tryon_uv || row.try_ons || 0,
    viewCount,
    wantCount: row.want_uv || row.intents || 0,
    confirmCount,
    confirmRate: percent(confirmRate),
    tryonConfirmRate: percent(row.tryon_confirm_rate),
    hotIndex: Math.round((row.hot_score || row.booking_rate || row.intent_rate || 0) * 100),
    coldRisk: Math.round((row.cold_risk_score || 0) * 100),
    growthScore: Math.round((row.growth_score || 0) * 100),
    trend: label === 'HotUp' ? 'up' : label === 'ColdDown' ? 'down' : 'stable',
    label,
    type: label === 'Potential' ? 'potential' : label === 'ColdDown' ? 'cold' : 'hot',
    status: 'active',
    isHot: label === 'HotUp',
    isRecommend: index < 8,
    price: row.price_level === 'high' ? 298 : row.price_level === 'low' ? 98 : 168,
    createTime: '2026-05-31',
    suggestion: makeSuggestion({ type: label === 'Potential' ? 'potential' : label === 'ColdDown' ? 'cold' : 'hot' }),
    contentHeat: {
      likes: Number(contentStyle?.postStats?.likes || contentStyle?.likes || 0),
      saves: Number(contentStyle?.postStats?.saves || 0),
      comments: Number(contentStyle?.postStats?.comments || 0),
      shares: Number(contentStyle?.postStats?.shares || 0)
    }
  }
}

function buildTrendData(metrics, hotStyles, coldStyles) {
  const dates = Array.from({ length: 7 }, (_, i) => `D${i + 1}`)
  const hotBase = hotStyles.slice(0, 7).map((item) => item.confirmCount || item.tryOnCount || 0)
  const coldBase = coldStyles.slice(0, 7).map((item) => item.tryOnCount || item.viewCount || 0)
  return {
    dates,
    hotTrend: dates.map((_, i) => hotBase[i] || Math.round((metrics.totals?.orders || 1) * (0.7 + i * 0.12))),
    coldTrend: dates.map((_, i) => coldBase[i] || Math.round((metrics.totals?.try_ons || 1) * (1.05 - i * 0.04)))
  }
}

function buildSuggestions(hotStyles, coldStyles, potentialStyles, totals) {
  const hot = hotStyles[0]
  const cold = coldStyles[0]
  const potential = potentialStyles[0]
  return [
    {
      type: 'hot',
      priority: 'high',
      title: '保留高热主推位',
      content: hot ? `${hot.name} 当前热度 ${hot.hotIndex}，适合继续放在首屏成交位。` : '当前暂无足够高热款样本。'
    },
    {
      type: 'potential',
      priority: 'medium',
      title: '扩大潜力测试',
      content: potential ? `${potential.name} 互动不错但还没吃满曝光，建议继续给测试位。` : '当前暂无明显潜力款。'
    },
    {
      type: 'cold',
      priority: 'medium',
      title: '冷门款观察',
      content: cold ? `${cold.name} 当前冷门风险 ${cold.coldRisk}，优先检查封面和定位。` : '当前暂无明显冷门风险。'
    },
    {
      type: 'data',
      priority: 'low',
      title: '数据口径',
      content: `当前有效浏览 ${totals.views || 0}，确认要做 ${totals.orders || 0}，试戴后确认率 ${percent(totals.tryon_confirm_rate)}%。`
    }
  ]
}

function buildActivities(events, styleLookup) {
  return (events || []).slice(0, 8).map((event, index) => {
    const style = styleLookup.get(event.style_id)
    return {
      id: event.id || index,
      user: event.user_id ? String(event.user_id).slice(0, 10) : `用户${index + 1}`,
      type: event.event_type?.includes('tryon') ? 'tryon' : event.event_type?.includes('confirm') ? 'confirm' : event.event_type?.includes('want') ? 'favorite' : 'view',
      content: `${event.event_type || 'event'} · ${style?.name || event.style_id || '未知款式'}`,
      time: event.created_at ? new Date(event.created_at).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '刚刚'
    }
  })
}

function pickUnique(source, used, predicate = () => true) {
  const item = source.find((candidate) => candidate && !used.has(candidate.id) && predicate(candidate))
  if (item) used.add(item.id)
  return item
}

function buildRecommendationSlots({ hotStyles, potentialStyles, coldStyles, styleList }) {
  const used = new Set()
  const untestedStyles = potentialStyles.filter((item) => item.label === 'Potential').slice(0, 6)
  const diversityStyles = styleList.filter((item) => item.type !== 'cold')

  const slotDefs = [
    ['hero_full_1', '今日精选', '首屏高热度', hotStyles],
    ['hero_full_2', '店内常做款', '高确认转化', hotStyles],
    ['hero_full_3', '小众但好看', '潜力款激活', potentialStyles],
    ['hero_full_4', '适合你试试', '风格补位', diversityStyles],
    ['peek_half_1', '正在流行', '热门延续', hotStyles],
    ['peek_half_2', '新款灵感', '潜力二次测试', potentialStyles],
    ['peek_half_3', '冷门观察', '小流量验证', coldStyles.length ? coldStyles : untestedStyles],
    ['peek_half_4', '换个风格', '多样性补位', diversityStyles]
  ]

  return slotDefs
    .map(([slotType, userLabel, reason, pool], index) => {
      const style = pickUnique(pool, used) || pickUnique(styleList, used) || styleList[index % Math.max(styleList.length, 1)]
      return style
        ? {
            id: `rec-${index + 1}`,
            position: index + 1,
            slotType,
            userLabel,
            style,
            reason,
            exposureCount: style.viewCount || 0,
            tryOnCount: style.tryOnCount || 0,
            wantCount: style.wantCount || 0,
            confirmCount: style.confirmCount || 0,
            confirmRate: style.confirmRate || 0,
            hotIndex: style.hotIndex || 0,
            isAuto: true
          }
        : null
    })
    .filter(Boolean)
}

export function buildOpsData(metrics = fallbackMetrics, simulation = fallbackSimulation, xhsDataset = fallbackXhsDataset, trendSnapshot = fallbackTrendSnapshot) {
  const totals = metrics.totals || fallbackMetrics.totals
  const xhsStyles = Array.isArray(xhsDataset.styles) ? xhsDataset.styles : []
  const hotBank = pickContentBank(xhsStyles, 'hot')
  const potentialBank = pickContentBank(xhsStyles, 'potential')
  const coldBank = pickContentBank(xhsStyles, 'cold')
  const allBank = xhsStyles.length ? xhsStyles : [{ id: 'fallback', name: '示例款', image: '', primaryTag: '精选', secondaryTag: '精选', tagGroups: {}, postStats: {} }]
  const poolCursor = { hot: 0, potential: 0, cold: 0, all: 0 }
  const takeContent = (bucket) => {
    const bank = bucket === 'hot' ? hotBank : bucket === 'potential' ? potentialBank : bucket === 'cold' ? coldBank : allBank
    const safeBank = bank.length ? bank : allBank
    const key = bucket === 'hot' ? 'hot' : bucket === 'potential' ? 'potential' : bucket === 'cold' ? 'cold' : 'all'
    const item = safeBank[poolCursor[key] % safeBank.length]
    poolCursor[key] += 1
    return item
  }
  const hotStyles = (simulation.top_hot?.length ? simulation.top_hot : metrics.styles || [])
    .slice(0, 16)
    .map((row, index) => normalizeMetricRow(row, index, takeContent('hot')))
  const coldStyles = (simulation.top_cold || [])
    .slice(0, 16)
    .map((row, index) => normalizeMetricRow(row, index, takeContent('cold')))
  const potentialStyles = (simulation.top_potential || [])
    .slice(0, 12)
    .map((row, index) => normalizeMetricRow({ ...row, label: 'Potential' }, index, takeContent('potential')))
  const styleList = [...hotStyles, ...potentialStyles, ...coldStyles]
    .filter((item, index, arr) => item.id && arr.findIndex((x) => x.id === item.id) === index)
  const styleLookup = new Map(styleList.map((item) => [item.id, item]))

  const todayStats = {
    tryOnCount: totals.try_ons || potentialStyles.reduce((sum, item) => sum + item.tryOnCount, 0),
    userCount: totals.try_on_users || Math.max(0, Math.round((totals.try_ons || 0) * 0.58)),
    confirmCount: totals.orders || hotStyles.reduce((sum, item) => sum + item.confirmCount, 0),
    avgTryPerOrder: totals.orders ? Math.round((totals.try_ons / totals.orders) * 10) / 10 : 0,
    tryOnTrend: Math.round((simulation.model_report_true_3class?.accuracy || 0.12) * 100),
    userTrend: percent(totals.candidate_rate),
    confirmTrend: percent(totals.total_confirm_rate),
    avgTryTrend: percent(totals.tryon_confirm_rate) - percent(totals.total_confirm_rate)
  }

  return {
    metrics,
    simulation,
    xhsDataset,
    trendSnapshot,
    todayStats,
    trendData: buildTrendData(metrics, hotStyles, coldStyles),
    hotStyles,
    coldStyles,
    potentialStyles,
    styleList,
    recommendList: buildRecommendationSlots({ hotStyles, potentialStyles, coldStyles, styleList }),
    suggestions: buildSuggestions(hotStyles, coldStyles, potentialStyles, totals),
    activities: buildActivities(metrics.recent_events, styleLookup),
    modelReport: simulation.model_report_true_3class || simulation.model_report_3class
  }
}
