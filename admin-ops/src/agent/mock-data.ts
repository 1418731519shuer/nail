import type { RiskLevel } from './atomic-operations'
import xhsAdminSeed from '../data/xhs-admin-seed.json'

const AGENT_STATE_STORAGE_KEY = 'nail_ops_agent_state_v4'

export type NailStyle = {
  id: string
  styleCode?: string
  name: string
  description: string
  status: 'draft' | 'pending_review' | 'published' | 'hidden' | 'unpublished' | 'archived'
  category: string
  price: number
  coverImage: string
  isPromoted: boolean
  isColdStart: boolean
  listedAt?: string
  unpublishedAt?: string
  crawled: boolean
  makeable: boolean
  imageAssets?: {
    detailImages: string[]
    referenceImages: string[]
    tryonAssets: string[]
  }
  tags: {
    color: string[]
    style: string[]
    craft: string[]
    length: string[]
    scene: string[]
    effect: string[]
  }
  metrics: {
    exposure: number
    view: number
    detail: number
    basketAdd: number
    tryonSuccess: number
    resultView: number
    want: number
    confirm: number
    orders: number
    hotScore: number
    coldRiskScore: number
    growthScore: number
    trendLabel: 'HotUp' | 'Stable' | 'Potential' | 'ColdDown' | 'Untested'
    sampleStatus: 'enough' | 'low_sample'
    suggestion: string
    sourceBreakdown: Record<string, number>
    generationSuccessRate: number
    avgLatencySec: number
    resultViewDurationSec: number
  }
}

export type ReportRecord = {
  reportId: string
  reportType: 'daily' | 'weekly' | 'anomaly' | 'feed' | 'selection' | 'generic'
  title: string
  summary: string
  status: 'draft' | 'reviewed' | 'confirmed' | 'exported'
  dateRange: { startDate: string; endDate: string }
  compareTo?: string
  sections: Array<{ title: string; items: string[] }>
  suggestions: string[]
  createdAt: string
  updatedAt: string
  reviewedAt?: string
}

export type OperationTaskRecord = {
  taskId: string
  title: string
  description: string
  source: 'report' | 'manual' | 'suggestion'
  sourceId?: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high'
  ownerId?: string
  createdAt: string
  updatedAt: string
}

export type ExperimentRecord = {
  experimentId: string
  name: string
  sectionId: string
  status: 'draft' | 'running' | 'stopped' | 'completed'
  trafficSplit: { control: number; variant: number }
  variants: Array<{ id: string; name: string; slotCount: number }>
  result: {
    clickLift: number
    tryonLift: number
    confirmLift: number
    winner: 'control' | 'variant' | 'inconclusive'
  }
  createdAt: string
  updatedAt: string
}

export type OperatorProfile = {
  operatorId: string
  name: string
  role: 'ops_admin' | 'store_operator' | 'analyst'
  permissions: string[]
}

const svg = (seed: string, color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="16" fill="${color}"/><path d="M60 18c20 0 31 17 31 41 0 27-13 47-31 47S29 86 29 59c0-24 11-41 31-41z" fill="#f8d6c7" stroke="#d69d8e" stroke-width="3"/><path d="M42 62c14-12 24-13 36-1" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><text x="60" y="112" text-anchor="middle" font-size="10" fill="#6f5361">${seed}</text></svg>`)}`

const cloneStyle = (style: NailStyle): NailStyle => ({
  ...style,
  tags: {
    color: [...style.tags.color],
    style: [...style.tags.style],
    craft: [...style.tags.craft],
    length: [...style.tags.length],
    scene: [...style.tags.scene],
    effect: [...style.tags.effect]
  },
  metrics: {
    ...style.metrics,
    sourceBreakdown: { ...style.metrics.sourceBreakdown }
  }
})

const buildFeedSlotsFromStyles = (styles: NailStyle[]) =>
  styles
    .filter((style) => style.status === 'published')
    .sort((a, b) => b.metrics.hotScore - a.metrics.hotScore)
    .slice(0, 8)
    .map((style, index) => ({
      slotId: `home-${index + 1}`,
      sectionId: 'home_feed',
      position: index + 1,
      visibleType: index < 4 ? 'full_visible' : 'half_visible',
      styleId: style.id,
      styleName: style.name,
      exposure: Math.round(style.metrics.exposure * (index < 4 ? 0.72 : 0.38)),
      click: style.metrics.view,
      tryon: style.metrics.tryonSuccess,
      want: style.metrics.want,
      confirm: style.metrics.confirm,
      conversionRate: style.metrics.exposure ? Number((style.metrics.confirm / style.metrics.exposure).toFixed(4)) : 0,
      reason: index < 4 ? '首屏完整露出' : '半露出探索位'
    }))

export const mockStyles: NailStyle[] = [
  {
    id: 'style-french-001',
    name: '法式优雅月光',
    description: '裸粉底叠细法式白边，适合通勤和婚礼前试戴。',
    status: 'published',
    category: '法式',
    price: 168,
    coverImage: svg('FR', '#fff0f5'),
    isPromoted: true,
    isColdStart: false,
    listedAt: '2026-04-12',
    crawled: false,
    makeable: true,
    tags: { color: ['裸粉', '白色'], style: ['通勤', '优雅'], craft: ['法式'], length: ['短甲', '中长甲'], scene: ['上班', '婚礼'], effect: ['显手长'] },
    metrics: { exposure: 2480, view: 740, detail: 390, basketAdd: 315, tryonSuccess: 286, resultView: 252, want: 98, confirm: 45, orders: 42, hotScore: 92, coldRiskScore: 8, growthScore: 76, trendLabel: 'HotUp', sampleStatus: 'enough', suggestion: '保留首页前两位，继续承接成交。', sourceBreakdown: { card: 16, detail: 7, tryon_result: 12, ai_recommend: 5, want_list: 5 }, generationSuccessRate: 0.96, avgLatencySec: 8.4, resultViewDurationSec: 42 }
  },
  {
    id: 'style-cat-eye-002',
    styleCode: 'S0244',
    name: '青柠星月猫眼',
    description: '青柠猫眼叠星月线条，清透不浮夸。',
    status: 'published',
    category: '猫眼',
    price: 188,
    coverImage: svg('CE', '#eef7d7'),
    isPromoted: true,
    isColdStart: false,
    listedAt: '2026-04-20',
    crawled: false,
    makeable: true,
    tags: { color: ['绿色', '裸粉'], style: ['高级感', '清透'], craft: ['猫眼', '金线'], length: ['中长甲'], scene: ['约会', '通勤'], effect: ['透亮', '显白'] },
    metrics: { exposure: 1900, view: 590, detail: 280, basketAdd: 260, tryonSuccess: 238, resultView: 218, want: 84, confirm: 36, orders: 34, hotScore: 86, coldRiskScore: 12, growthScore: 68, trendLabel: 'Stable', sampleStatus: 'enough', suggestion: '主推保护，猫眼需求仍稳定。', sourceBreakdown: { card: 10, detail: 5, tryon_result: 11, ai_recommend: 6, want_list: 4 }, generationSuccessRate: 0.94, avgLatencySec: 9.1, resultViewDurationSec: 38 }
  },
  {
    id: 'style-gradient-003',
    name: '粉橘薄荷渐变',
    description: '粉橘到薄荷的水光渐变，带少量金箔。',
    status: 'published',
    category: '渐变',
    price: 198,
    coverImage: svg('GR', '#f5ead2'),
    isPromoted: false,
    isColdStart: false,
    listedAt: '2026-05-02',
    crawled: false,
    makeable: true,
    tags: { color: ['粉橘', '薄荷绿'], style: ['甜美', '春夏'], craft: ['渐变', '金箔'], length: ['短甲', '中长甲'], scene: ['约会', '旅行'], effect: ['清透'] },
    metrics: { exposure: 620, view: 230, detail: 110, basketAdd: 98, tryonSuccess: 88, resultView: 84, want: 38, confirm: 18, orders: 16, hotScore: 78, coldRiskScore: 18, growthScore: 81, trendLabel: 'Potential', sampleStatus: 'enough', suggestion: '曝光偏少但意向高，适合补首屏测试。', sourceBreakdown: { card: 4, detail: 2, tryon_result: 8, ai_recommend: 2, want_list: 2 }, generationSuccessRate: 0.97, avgLatencySec: 7.9, resultViewDurationSec: 44 }
  },
  {
    id: 'style-ice-004',
    name: '奶白冰透纯色',
    description: '低调奶白冰透，适合面试和见家长。',
    status: 'published',
    category: '纯色',
    price: 128,
    coverImage: svg('IC', '#fff8f3'),
    isPromoted: false,
    isColdStart: false,
    listedAt: '2026-04-28',
    crawled: false,
    makeable: true,
    tags: { color: ['奶白', '裸粉'], style: ['纯欲', '通勤'], craft: ['冰透', '纯色'], length: ['短甲'], scene: ['面试', '日常'], effect: ['干净'] },
    metrics: { exposure: 1500, view: 430, detail: 208, basketAdd: 180, tryonSuccess: 160, resultView: 130, want: 47, confirm: 24, orders: 22, hotScore: 72, coldRiskScore: 24, growthScore: 52, trendLabel: 'Stable', sampleStatus: 'enough', suggestion: '稳定成交款，适合与高工艺款搭配。', sourceBreakdown: { card: 8, detail: 3, tryon_result: 7, ai_recommend: 2, want_list: 4 }, generationSuccessRate: 0.95, avgLatencySec: 8.7, resultViewDurationSec: 31 }
  },
  {
    id: 'style-metal-005',
    name: '银灰金属镜面',
    description: '银灰镜面和金属线条，偏酷感。',
    status: 'published',
    category: '特效',
    price: 228,
    coverImage: svg('MT', '#e8e9ef'),
    isPromoted: false,
    isColdStart: false,
    listedAt: '2026-03-29',
    crawled: false,
    makeable: true,
    tags: { color: ['银色', '灰色'], style: ['甜酷', '个性'], craft: ['金属', '镜面'], length: ['长甲'], scene: ['派对'], effect: ['高冷'] },
    metrics: { exposure: 1180, view: 120, detail: 54, basketAdd: 38, tryonSuccess: 31, resultView: 22, want: 4, confirm: 1, orders: 1, hotScore: 22, coldRiskScore: 86, growthScore: 18, trendLabel: 'ColdDown', sampleStatus: 'enough', suggestion: '曝光足但漏斗弱，建议下架观察或改封面。', sourceBreakdown: { card: 1, detail: 0, tryon_result: 0, ai_recommend: 0, want_list: 0 }, generationSuccessRate: 0.88, avgLatencySec: 13.2, resultViewDurationSec: 12 }
  },
  {
    id: 'style-neon-006',
    name: '荧光撞色手绘',
    description: '荧光粉绿撞色，视觉强但日常适配低。',
    status: 'published',
    category: '手绘',
    price: 218,
    coverImage: svg('NE', '#eaffd8'),
    isPromoted: false,
    isColdStart: false,
    listedAt: '2026-04-01',
    crawled: false,
    makeable: true,
    tags: { color: ['荧光绿', '粉色'], style: ['个性', '甜酷'], craft: ['手绘', '撞色'], length: ['长甲'], scene: ['派对'], effect: ['吸睛'] },
    metrics: { exposure: 860, view: 190, detail: 96, basketAdd: 150, tryonSuccess: 136, resultView: 112, want: 9, confirm: 2, orders: 2, hotScore: 36, coldRiskScore: 74, growthScore: 22, trendLabel: 'ColdDown', sampleStatus: 'enough', suggestion: '试戴高但想做低，优先查试戴效果和价格。', sourceBreakdown: { card: 0, detail: 1, tryon_result: 1, ai_recommend: 0, want_list: 0 }, generationSuccessRate: 0.91, avgLatencySec: 10.8, resultViewDurationSec: 16 }
  },
  {
    id: 'style-ink-007',
    name: '水墨晕染短甲',
    description: '黑白水墨晕染，短甲也能做。',
    status: 'published',
    category: '晕染',
    price: 178,
    coverImage: svg('IN', '#eef0f2'),
    isPromoted: false,
    isColdStart: true,
    listedAt: '2026-05-26',
    crawled: false,
    makeable: true,
    tags: { color: ['黑色', '白色'], style: ['国风', '极简'], craft: ['晕染'], length: ['短甲'], scene: ['日常'], effect: ['耐看'] },
    metrics: { exposure: 90, view: 36, detail: 18, basketAdd: 16, tryonSuccess: 14, resultView: 13, want: 8, confirm: 3, orders: 2, hotScore: 61, coldRiskScore: 28, growthScore: 73, trendLabel: 'Untested', sampleStatus: 'low_sample', suggestion: '刚上架且样本不足，继续小流量测试。', sourceBreakdown: { card: 0, detail: 0, tryon_result: 2, ai_recommend: 1, want_list: 0 }, generationSuccessRate: 0.93, avgLatencySec: 9.4, resultViewDurationSec: 35 }
  },
  {
    id: 'style-bow-008',
    name: '奶油蝴蝶结甜款',
    description: '奶油裸底搭配小蝴蝶结和珍珠。',
    status: 'draft',
    category: '甜美',
    price: 188,
    coverImage: svg('BW', '#fff0ea'),
    isPromoted: false,
    isColdStart: true,
    listedAt: undefined,
    crawled: true,
    makeable: true,
    tags: { color: ['奶油', '粉色'], style: ['甜美', '少女'], craft: ['贴饰', '珍珠'], length: ['中长甲'], scene: ['约会'], effect: ['减龄'] },
    metrics: { exposure: 0, view: 0, detail: 0, basketAdd: 0, tryonSuccess: 0, resultView: 0, want: 0, confirm: 0, orders: 0, hotScore: 0, coldRiskScore: 0, growthScore: 0, trendLabel: 'Untested', sampleStatus: 'low_sample', suggestion: '爬取新款，资料完整且门店可制作，可预览上架。', sourceBreakdown: {}, generationSuccessRate: 0, avgLatencySec: 0, resultViewDurationSec: 0 }
  },
  {
    id: 'style-aurora-009',
    name: '极光猫眼长甲',
    description: '偏派对的极光猫眼长甲。',
    status: 'pending_review',
    category: '猫眼',
    price: 238,
    coverImage: svg('AU', '#edf2ff'),
    isPromoted: false,
    isColdStart: true,
    listedAt: undefined,
    crawled: true,
    makeable: false,
    tags: { color: ['紫色', '蓝色'], style: ['高级感', '派对'], craft: ['猫眼', '极光'], length: ['长甲'], scene: ['派对'], effect: ['闪耀'] },
    metrics: { exposure: 0, view: 0, detail: 0, basketAdd: 0, tryonSuccess: 0, resultView: 0, want: 0, confirm: 0, orders: 0, hotScore: 0, coldRiskScore: 0, growthScore: 0, trendLabel: 'Untested', sampleStatus: 'low_sample', suggestion: '门店暂不可制作，建议不上架或培训后再上。', sourceBreakdown: {}, generationSuccessRate: 0, avgLatencySec: 0, resultViewDurationSec: 0 }
  },
  {
    id: 'style-archive-010',
    name: '旧款波点复古',
    description: '老波点款，已归档。',
    status: 'archived',
    category: '复古',
    price: 148,
    coverImage: svg('PO', '#f7eadf'),
    isPromoted: false,
    isColdStart: false,
    listedAt: '2025-12-20',
    unpublishedAt: '2026-04-15',
    crawled: false,
    makeable: true,
    tags: { color: ['红色', '白色'], style: ['复古'], craft: ['波点'], length: ['短甲'], scene: ['日常'], effect: ['活泼'] },
    metrics: { exposure: 30, view: 4, detail: 1, basketAdd: 1, tryonSuccess: 1, resultView: 1, want: 0, confirm: 0, orders: 0, hotScore: 8, coldRiskScore: 95, growthScore: 4, trendLabel: 'ColdDown', sampleStatus: 'low_sample', suggestion: '已归档，不进入推荐判断。', sourceBreakdown: {}, generationSuccessRate: 0.7, avgLatencySec: 15, resultViewDurationSec: 5 }
  }
]

export const mockFeedSlots = mockStyles
  .filter((style) => style.status === 'published')
  .sort((a, b) => {
    const order = ['style-french-001', 'style-ice-004', 'style-gradient-003', 'style-neon-006', 'style-cat-eye-002', 'style-metal-005', 'style-ink-007']
    return order.indexOf(a.id) - order.indexOf(b.id)
  })
  .slice(0, 8)
  .map((style, index) => ({
    slotId: `home-${index + 1}`,
    sectionId: 'home_feed',
    position: index + 1,
    visibleType: index < 4 ? 'full_visible' : 'half_visible',
    styleId: style.id,
    styleName: style.name,
    exposure: Math.round(style.metrics.exposure * (index < 4 ? 0.72 : 0.38)),
    click: style.metrics.view,
    tryon: style.metrics.tryonSuccess,
    want: style.metrics.want,
    confirm: style.metrics.confirm,
    conversionRate: style.metrics.exposure ? Number((style.metrics.confirm / style.metrics.exposure).toFixed(4)) : 0,
    reason: index < 4 ? '首屏完整露出' : '半露出探索位'
  }))

const seedStyles = ((Array.isArray(xhsAdminSeed) ? xhsAdminSeed : []) as NailStyle[]).map(cloneStyle)
const initialStyles = seedStyles.length ? seedStyles : mockStyles.map(cloneStyle)
const initialFeedSlots = buildFeedSlotsFromStyles(initialStyles)

export const storePreference = {
  colors: [
    { name: '裸粉', score: 92 },
    { name: '奶白', score: 84 },
    { name: '薄荷绿', score: 73 },
    { name: '银色', score: 36 }
  ],
  styles: [
    { name: '通勤', score: 90 },
    { name: '高级感', score: 82 },
    { name: '甜美', score: 71 },
    { name: '甜酷', score: 42 }
  ],
  crafts: [
    { name: '法式', score: 88 },
    { name: '猫眼', score: 81 },
    { name: '渐变', score: 77 },
    { name: '金属', score: 31 }
  ],
  lengths: [
    { name: '短甲', score: 86 },
    { name: '中长甲', score: 78 },
    { name: '长甲', score: 40 }
  ]
}

export const aiDemandSignals = {
  queries: ['短甲显白通勤款', '预算 200 以内的猫眼', '不要显黑', '三周后长出来不明显', '小红书同款蝴蝶结'],
  unmatchedDemands: ['低饱和蓝灰短甲', '可爱贴饰但不幼稚', '低维护长效猫眼'],
  concerns: ['显黑', '手绘翻车', '预算超过 200', '短甲不好看', '长出来明显']
}

export type RecommendStrategyId = 'hot' | 'potential' | 'cold' | 'personalized' | 'custom'
export type RecommendCategory = 'hot' | 'potential' | 'cold' | 'personalized'

export type RecommendSlotPlan = {
  position: number
  slotName: string
  slotType: 'full_visible' | 'half_visible'
  category: RecommendCategory
  strategyLabel: string
  reason: string
}

const baseRecommendSlots = [
  { position: 1, slotName: 'P1 主爆款位', slotType: 'full_visible' as const },
  { position: 2, slotName: 'P2 稳转化位', slotType: 'full_visible' as const },
  { position: 3, slotName: 'P3 潜力激活位', slotType: 'full_visible' as const },
  { position: 4, slotName: 'P4 风格补位', slotType: 'full_visible' as const },
  { position: 5, slotName: 'P5 下滑吸引位', slotType: 'half_visible' as const },
  { position: 6, slotName: 'P6 新品测试位', slotType: 'half_visible' as const },
  { position: 7, slotName: 'P7 潜力扩展位', slotType: 'half_visible' as const },
  { position: 8, slotName: 'P8 多样性兜底位', slotType: 'half_visible' as const }
]

export const recommendStrategyOptions = [
  { value: 'hot' as RecommendStrategyId, title: '热门优先', description: '优先保证点击和确认，首屏更多放热度高、确认高的款式。' },
  { value: 'potential' as RecommendStrategyId, title: '潜力放大', description: '增加低曝光高转化款的测试机会，放大潜力款。' },
  { value: 'cold' as RecommendStrategyId, title: '冷门观察', description: '保留少量冷门观察位，用于验证封面和风格是否还有机会。' },
  { value: 'personalized' as RecommendStrategyId, title: '个性化优先', description: '根据最近用户搜索偏好和对话需求，优先给个性化匹配款。' },
  { value: 'custom' as RecommendStrategyId, title: '自定义', description: '运营手动指定每个坑位放热门、潜力、冷门或个性化。' }
]

const recommendStrategyPresets: Record<Exclude<RecommendStrategyId, 'custom'>, RecommendCategory[]> = {
  hot: ['hot', 'hot', 'potential', 'personalized', 'hot', 'potential', 'hot', 'personalized'],
  potential: ['hot', 'potential', 'potential', 'personalized', 'potential', 'personalized', 'potential', 'hot'],
  cold: ['hot', 'cold', 'potential', 'personalized', 'cold', 'personalized', 'cold', 'potential'],
  personalized: ['personalized', 'hot', 'potential', 'personalized', 'hot', 'personalized', 'potential', 'personalized']
}

const categoryLabelMap: Record<RecommendCategory, string> = {
  hot: '热门成交',
  potential: '潜力测试',
  cold: '冷门观察',
  personalized: '个性化匹配'
}

const categoryReasonMap: Record<RecommendCategory, string> = {
  hot: '优先放热度高、确认高的款，承接首屏点击和成交。',
  potential: '给低曝光高转化款更多测试流量，观察放量后的表现。',
  cold: '保留少量冷门观察位，判断是封面问题还是需求确实偏弱。',
  personalized: '结合最近用户搜索与偏好词，放更贴近当前需求的款。'
}

function scoreByPersonalDemand(style: NailStyle, intentText: string) {
  const haystack = [
    style.name,
    style.category,
    style.description,
    ...style.tags.color,
    ...style.tags.style,
    ...style.tags.craft,
    ...style.tags.length,
    ...style.tags.scene,
    ...style.tags.effect
  ].join(' ').toLowerCase()
  const keywords = intentText
    .toLowerCase()
    .split(/[\s,，。！!？?、/]+/)
    .map((token) => token.trim())
    .filter(Boolean)

  return keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 12 : 0), 0)
}

function scoreStyleForCategory(style: NailStyle, category: RecommendCategory, intentText: string) {
  const confirmRate = style.metrics.confirm / Math.max(style.metrics.exposure, 1)
  const wantRate = style.metrics.want / Math.max(style.metrics.exposure, 1)
  const tryonRate = style.metrics.tryonSuccess / Math.max(style.metrics.exposure, 1)

  if (category === 'hot') return style.metrics.hotScore * 1.2 + style.metrics.confirm * 2.4 + confirmRate * 900 + wantRate * 320
  if (category === 'potential') return style.metrics.growthScore * 1.3 + wantRate * 1000 + confirmRate * 1200 - style.metrics.exposure * 0.08
  if (category === 'cold') return style.metrics.coldRiskScore * 1.4 + Math.max(0, 160 - style.metrics.view) + Math.max(0, 80 - style.metrics.confirm * 8)
  return scoreByPersonalDemand(style, intentText) + style.metrics.hotScore * 0.45 + tryonRate * 700 + wantRate * 880
}

function categoryPriority(style: NailStyle, category: RecommendCategory) {
  if (category === 'hot') {
    if (style.metrics.trendLabel === 'HotUp') return 4
    if (style.metrics.trendLabel === 'Stable') return 3
    if (style.metrics.trendLabel === 'Potential') return 2
    return 1
  }
  if (category === 'potential') {
    if (style.metrics.trendLabel === 'Potential') return 4
    if (style.metrics.trendLabel === 'Untested') return 3
    if (style.metrics.trendLabel === 'Stable') return 2
    return 1
  }
  if (category === 'cold') return style.metrics.trendLabel === 'ColdDown' ? 4 : 1
  return scoreByPersonalDemand(style, `${aiDemandSignals.queries.join(' ')} ${storePreference.styles.map((item) => item.name).join(' ')}`) > 0 ? 4 : 2
}

function buildCategoryPlan(strategyId: RecommendStrategyId, customCategories?: RecommendCategory[]) {
  const categories = strategyId === 'custom'
    ? (customCategories?.length === 8 ? customCategories : ['hot', 'potential', 'personalized', 'hot', 'personalized', 'potential', 'cold', 'personalized'])
    : recommendStrategyPresets[strategyId]

  return baseRecommendSlots.map((slot, index) => ({
    ...slot,
    category: categories[index],
    strategyLabel: categoryLabelMap[categories[index]],
    reason: categoryReasonMap[categories[index]]
  }))
}

function pickStyleForCategory(availableStyles: NailStyle[], category: RecommendCategory, usedIds: Set<string>, intentText: string) {
  const ranked = availableStyles
    .filter((style) => style.status === 'published' && style.makeable)
    .sort((left, right) => {
      const priorityDelta = categoryPriority(right, category) - categoryPriority(left, category)
      if (priorityDelta) return priorityDelta
      return scoreStyleForCategory(right, category, intentText) - scoreStyleForCategory(left, category, intentText)
    })

  const unused = ranked.find((style) => !usedIds.has(style.id))
  const fallback = ranked[0]
  const picked = unused || fallback || availableStyles.find((style) => style.status === 'published')
  if (picked) usedIds.add(picked.id)
  return picked
}

export function generateRecommendRowsByStrategy(strategyId: RecommendStrategyId, customCategories?: RecommendCategory[], intentText = aiDemandSignals.queries.join(' ')) {
  hydrateAgentState()
  const slotPlan = buildCategoryPlan(strategyId, customCategories)
  const usedIds = new Set<string>()
  const riskNotes: string[] = []
  const rows = slotPlan.map((slot) => {
    const style = pickStyleForCategory(writeState.styles, slot.category, usedIds, intentText) || writeState.styles[0]
    return {
      id: `home-${slot.position}`,
      position: slot.position,
      slotType: slot.slotType === 'full_visible' ? `hero_full_${slot.position}` : `peek_half_${slot.position}`,
      userLabel: slot.slotType === 'full_visible' ? '完整露出' : '半露出',
      style: {
        id: style.id,
        code: style.styleCode,
        name: style.name,
        image: style.coverImage
      },
      reason: `${slot.slotName}：${slot.reason}`,
      exposureCount: style.metrics.exposure,
      tryOnCount: style.metrics.tryonSuccess,
      wantCount: style.metrics.want,
      confirmCount: style.metrics.confirm,
      confirmRate: style.metrics.exposure ? Math.round((style.metrics.confirm / style.metrics.exposure) * 1000) / 10 : 0,
      hotIndex: style.metrics.hotScore,
      isAuto: true,
      slotCategory: slot.category,
      slotName: slot.slotName,
      strategyLabel: slot.strategyLabel
    }
  })

  if (new Set(rows.map((row) => row.style.id)).size < rows.length) {
    riskNotes.push('当前可上架且可制作的款式不足 8 个，部分坑位会复用高匹配款。')
  }

  return {
    strategyId,
    slotPlan,
    rows,
    intentText,
    riskNotes
  }
}

export function saveRecommendDraft(
  rows: Array<any>,
  payload: { strategyId: RecommendStrategyId; customCategories?: RecommendCategory[]; intentText?: string }
) {
  const savedAt = new Date().toISOString()
  writeState.feedSlots = rows.map((row) => {
    const style = findStyle(row.style.id)
    return {
      slotId: row.id || `home-${row.position}`,
      sectionId: 'home_feed',
      position: row.position,
      visibleType: row.position <= 4 ? 'full_visible' : 'half_visible',
      styleId: style.id,
      styleName: style.name,
      exposure: row.exposureCount,
      click: style.metrics.view,
      tryon: row.tryOnCount,
      want: row.wantCount,
      confirm: row.confirmCount,
      conversionRate: style.metrics.exposure ? Number((style.metrics.confirm / style.metrics.exposure).toFixed(4)) : 0,
      reason: row.reason
    }
  })
  writeState.recommendConfigDraft = {
    ...writeState.recommendConfigDraft,
    versionId: `draft-home-${Date.now()}`,
    status: 'draft',
    strategyId: payload.strategyId,
    customCategories: payload.customCategories || [],
    intentText: payload.intentText || '',
    sections: writeState.feedSlots.map((slot) => ({ ...slot })),
    updatedAt: savedAt
  }
  persistAgentState()
}

export function loadRecommendDraftFromServer(payload: {
  versionId?: string
  strategyId?: RecommendStrategyId
  customCategories?: RecommendCategory[]
  intentText?: string
  savedAt?: string
  updatedAt?: string
  slots?: Array<{
    position?: number
    slotName?: string
    category?: RecommendCategory
    strategyLabel?: string
    reason?: string
    styleId?: string
    styleName?: string
  }>
}) {
  hydrateAgentState()
  const savedAt = payload.savedAt || payload.updatedAt || new Date().toISOString()
  const fallbackStyles = writeState.styles.filter((style) => style.status === 'published')

  const resolveStyle = (slot: { styleId?: string; styleName?: string }, index: number) => {
    if (slot.styleId) {
      const found = findStyle(slot.styleId)
      if (found) return found
    }
    if (slot.styleName) {
      const foundByName = writeState.styles.find((style) => style.name === slot.styleName)
      if (foundByName) return foundByName
    }
    return fallbackStyles[index] || fallbackStyles[0] || writeState.styles[0]
  }

  const slots = Array.isArray(payload.slots) ? payload.slots.slice(0, 8) : []
  if (!slots.length) return

  writeState.feedSlots = slots.map((slot, index) => {
    const style = resolveStyle(slot, index)
    return {
      slotId: `home-${slot.position || index + 1}`,
      sectionId: 'home_feed',
      position: slot.position || index + 1,
      visibleType: (slot.position || index + 1) <= 4 ? 'full_visible' : 'half_visible',
      styleId: style.id,
      styleName: style.name,
      exposure: style.metrics.exposure,
      click: style.metrics.view,
      tryon: style.metrics.tryonSuccess,
      want: style.metrics.want,
      confirm: style.metrics.confirm,
      conversionRate: style.metrics.exposure ? Number((style.metrics.confirm / style.metrics.exposure).toFixed(4)) : 0,
      reason: slot.reason || '服务端推荐配置同步'
    }
  })

  writeState.recommendConfigDraft = {
    ...writeState.recommendConfigDraft,
    versionId: payload.versionId || `draft-home-${Date.now()}`,
    status: 'draft',
    strategyId: payload.strategyId || 'hot',
    customCategories: payload.customCategories || [],
    intentText: payload.intentText || '',
    sections: writeState.feedSlots.map((slot) => ({ ...slot })),
    updatedAt: savedAt
  }
  persistAgentState()
}

const now = '2026-05-30T10:00:00+08:00'

const initialReports: ReportRecord[] = [
  {
    reportId: 'report-daily-20260529',
    reportType: 'daily',
    title: '2026-05-29 运营日报',
    summary: '首屏成交稳定，潜力款曝光仍可继续放大。',
    status: 'reviewed',
    dateRange: { startDate: '2026-05-29', endDate: '2026-05-29' },
    compareTo: 'yesterday',
    sections: [
      { title: '整体结论', items: ['确认做人数较昨日提升 8%。', 'P3 潜力位带动了渐变款试戴增长。'] },
      { title: '建议动作', items: ['保留首页高转化款。', '继续测试潜力款曝光。'] }
    ],
    suggestions: ['保留首页高转化款', '继续测试潜力款曝光'],
    createdAt: now,
    updatedAt: now,
    reviewedAt: now
  }
]

const initialTasks: OperationTaskRecord[] = [
  {
    taskId: 'task-cover-001',
    title: '优化金属镜面封面图',
    description: '曝光高但点击低，建议替换更强对比度封面。',
    source: 'suggestion',
    status: 'todo',
    priority: 'high',
    ownerId: 'ops-admin',
    createdAt: now,
    updatedAt: now
  }
]

const initialExperiments: ExperimentRecord[] = [
  {
    experimentId: 'exp-home-001',
    name: '首页 P3 潜力位 A/B 测试',
    sectionId: 'home_feed',
    status: 'running',
    trafficSplit: { control: 70, variant: 30 },
    variants: [
      { id: 'control', name: '当前首页配置', slotCount: 8 },
      { id: 'variant', name: '潜力款强化配置', slotCount: 8 }
    ],
    result: {
      clickLift: 0.06,
      tryonLift: 0.11,
      confirmLift: 0.03,
      winner: 'variant'
    },
    createdAt: now,
    updatedAt: now
  }
]

const initialOperators: OperatorProfile[] = [
  { operatorId: 'ops-admin', name: '运营管理员', role: 'ops_admin', permissions: ['*'] },
  {
    operatorId: 'store-ops',
    name: '门店运营',
    role: 'store_operator',
    permissions: ['get_*', 'check_*', 'generate_*', 'preview_*', 'create_approval', 'get_approval_status', 'create_operation_task', 'list_operation_tasks', 'update_task_status']
  },
  {
    operatorId: 'ops-analyst',
    name: '数据分析师',
    role: 'analyst',
    permissions: ['get_*', 'check_*', 'generate_*', 'create_report_draft', 'save_report_snapshot', 'export_report']
  }
]

export const writeState = {
  styles: initialStyles.map(cloneStyle),
  feedSlots: initialFeedSlots.map((slot) => ({ ...slot })),
  reports: initialReports.map((report) => ({ ...report, dateRange: { ...report.dateRange }, sections: report.sections.map((section) => ({ ...section, items: [...section.items] })), suggestions: [...report.suggestions] })),
  tasks: initialTasks.map((task) => ({ ...task })),
  experiments: initialExperiments.map((experiment) => ({ ...experiment, trafficSplit: { ...experiment.trafficSplit }, variants: experiment.variants.map((variant) => ({ ...variant })), result: { ...experiment.result } })),
  recommendConfigDraft: { versionId: 'draft-home-20260530', status: 'draft', sections: initialFeedSlots.map((slot) => ({ ...slot })), updatedAt: now },
  recommendConfigPublished: { versionId: 'published-home-20260529', status: 'published', sections: initialFeedSlots.map((slot) => ({ ...slot })), publishedAt: '2026-05-29T09:00:00+08:00' },
  operators: initialOperators.map((operator) => ({ ...operator, permissions: [...operator.permissions] })),
  currentOperatorId: 'ops-admin'
}

export function hydrateAgentState() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(AGENT_STATE_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.styles)) writeState.styles = parsed.styles
    if (Array.isArray(parsed.feedSlots)) writeState.feedSlots = parsed.feedSlots
    if (Array.isArray(parsed.reports)) writeState.reports = parsed.reports
    if (Array.isArray(parsed.tasks)) writeState.tasks = parsed.tasks
    if (Array.isArray(parsed.experiments)) writeState.experiments = parsed.experiments
    if (parsed.recommendConfigDraft) writeState.recommendConfigDraft = parsed.recommendConfigDraft
    if (parsed.recommendConfigPublished) writeState.recommendConfigPublished = parsed.recommendConfigPublished
    if (Array.isArray(parsed.operators)) writeState.operators = parsed.operators
    if (parsed.currentOperatorId) writeState.currentOperatorId = parsed.currentOperatorId
  } catch {
    // Ignore corrupt local mock state and keep bundled fixtures.
  }
}

export function persistAgentState() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AGENT_STATE_STORAGE_KEY, JSON.stringify(writeState))
}

export type CreateStyleInput = {
  styleCode?: string
  name: string
  description: string
  category: string
  price: number
  colorTags?: string[]
  styleTags?: string[]
  craftTags?: string[]
  lengthTags?: string[]
  sceneTags?: string[]
  effectTags?: string[]
  coverImage?: string
  detailImages?: string[]
  referenceImages?: string[]
  tryonAssets?: string[]
  status?: NailStyle['status']
  makeable?: boolean
  crawled?: boolean
}

export function createMockStyle(input: CreateStyleInput) {
  hydrateAgentState()
  const stamp = Date.now().toString(36)
  const normalizedCode = (input.styleCode || `S${String(writeState.styles.length + 240).padStart(4, '0')}`).toUpperCase()
  const normalizedName = input.name.trim()
  const primaryColor = input.colorTags?.[0] || '奶白'
  const accentColor = input.effectTags?.includes('猫眼') ? '#d7e8b5' : '#f8e3dd'
  const coverImage = input.coverImage || svg(normalizedCode.slice(-2), accentColor)
  const style: NailStyle = {
    id: `style-${stamp}`,
    styleCode: normalizedCode,
    name: normalizedName,
    description: input.description.trim(),
    status: input.status || 'draft',
    category: input.category.trim(),
    price: Number(input.price || 0),
    coverImage,
    isPromoted: false,
    isColdStart: true,
    listedAt: undefined,
    unpublishedAt: undefined,
    crawled: Boolean(input.crawled),
    makeable: input.makeable ?? true,
    imageAssets: {
      detailImages: input.detailImages?.filter(Boolean) || [],
      referenceImages: input.referenceImages?.filter(Boolean) || [],
      tryonAssets: input.tryonAssets?.filter(Boolean) || []
    },
    tags: {
      color: input.colorTags?.filter(Boolean) || [primaryColor],
      style: input.styleTags?.filter(Boolean) || ['通勤'],
      craft: input.craftTags?.filter(Boolean) || ['纯色'],
      length: input.lengthTags?.filter(Boolean) || ['短甲'],
      scene: input.sceneTags?.filter(Boolean) || ['日常'],
      effect: input.effectTags?.filter(Boolean) || ['显白']
    },
    metrics: {
      exposure: 0,
      view: 0,
      detail: 0,
      basketAdd: 0,
      tryonSuccess: 0,
      resultView: 0,
      want: 0,
      confirm: 0,
      orders: 0,
      hotScore: 0,
      coldRiskScore: 0,
      growthScore: 0,
      trendLabel: 'Untested',
      sampleStatus: 'low_sample',
      suggestion: '新建款式，建议先补充资料并安排小流量测试。',
      sourceBreakdown: {},
      generationSuccessRate: 0,
      avgLatencySec: 0,
      resultViewDurationSec: 0
    }
  }

  writeState.styles.unshift(style)
  persistAgentState()
  return style
}

export function findStyle(styleId?: string) {
  return writeState.styles.find((style) => style.id === styleId || style.styleCode === styleId) || writeState.styles[0]
}

export function getCurrentOperator() {
  return writeState.operators.find((operator) => operator.operatorId === writeState.currentOperatorId) || writeState.operators[0]
}

export function findOperator(operatorId?: string) {
  return writeState.operators.find((operator) => operator.operatorId === operatorId) || getCurrentOperator()
}

export function findReport(reportId?: string) {
  return writeState.reports.find((report) => report.reportId === reportId)
}

export function findTask(taskId?: string) {
  return writeState.tasks.find((task) => task.taskId === taskId)
}

export function findExperiment(experimentId?: string) {
  return writeState.experiments.find((experiment) => experiment.experimentId === experimentId)
}

export function metricSummary(style: NailStyle) {
  return {
    exposure: style.metrics.exposure,
    view: style.metrics.view,
    detail: style.metrics.detail,
    basketAdd: style.metrics.basketAdd,
    tryonSuccess: style.metrics.tryonSuccess,
    resultView: style.metrics.resultView,
    want: style.metrics.want,
    confirm: style.metrics.confirm,
    orders: style.metrics.orders,
    hotScore: style.metrics.hotScore,
    coldRiskScore: style.metrics.coldRiskScore,
    growthScore: style.metrics.growthScore,
    trendLabel: style.metrics.trendLabel,
    sampleStatus: style.metrics.sampleStatus,
    suggestion: style.metrics.suggestion
  }
}

export function riskLabel(level: RiskLevel) {
  return ({ low: '低风险', medium: '中风险', high: '高风险', critical: '极高风险' } as Record<RiskLevel, string>)[level]
}

export function getStyleManagementRows() {
  hydrateAgentState()
  return writeState.styles.map((style) => ({
    id: style.id,
    styleCode: style.styleCode,
    name: style.name,
    image: style.coverImage,
    detailImages: style.imageAssets?.detailImages || [],
    referenceImages: style.imageAssets?.referenceImages || [],
    tryonAssets: style.imageAssets?.tryonAssets || [],
    category: style.category,
    priceLevel: style.price <= 140 ? 'low' : style.price >= 220 ? 'high' : 'mid',
    tags: [...style.tags.color, ...style.tags.style, ...style.tags.craft].slice(0, 5),
    price: style.price,
    status: style.status === 'published' ? 'active' : 'inactive',
    rawStatus: style.status,
    isHot: style.metrics.trendLabel === 'HotUp',
    isRecommend: style.isPromoted,
    viewCount: style.metrics.view,
    tryOnCount: style.metrics.tryonSuccess,
    wantCount: style.metrics.want,
    confirmCount: style.metrics.confirm,
    confirmRate: style.metrics.exposure ? Math.round((style.metrics.confirm / style.metrics.exposure) * 1000) / 10 : 0,
    hotIndex: style.metrics.hotScore,
    coldRisk: style.metrics.coldRiskScore,
    createTime: style.listedAt || '未上架'
  }))
}

export function getRecommendManagementRows() {
  hydrateAgentState()
  return writeState.feedSlots
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((slot) => {
      const style = findStyle(slot.styleId)
      return {
        id: slot.slotId || `home-${slot.position}`,
        position: slot.position,
        slotType: slot.visibleType === 'full_visible' ? `hero_full_${slot.position}` : `peek_half_${slot.position}`,
        userLabel: slot.visibleType === 'full_visible' ? '完整露出' : '半露出',
        style: {
          id: style.id,
          code: style.styleCode,
          name: style.name,
          image: style.coverImage
        },
        reason: slot.reason || 'AI 原子操作推荐',
        exposureCount: slot.exposure,
        tryOnCount: slot.tryon,
        wantCount: slot.want,
        confirmCount: slot.confirm,
        confirmRate: style.metrics.exposure ? Math.round((style.metrics.confirm / style.metrics.exposure) * 1000) / 10 : 0,
        hotIndex: style.metrics.hotScore,
        isAuto: slot.reason !== '商家手动调整'
      }
    })
}
