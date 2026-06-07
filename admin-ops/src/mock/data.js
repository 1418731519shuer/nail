// Mock数据 - 美甲运营端
// 基于 mockNailItems.js 真实款式数据生成，确保数字前后一致

// ── 今日运营数据 ──
export const todayStats = {
  tryOnCount: 1180,
  tryOnTrend: 18.4,
  userCount: 743,
  userTrend: 12.6,
  confirmCount: 208,
  confirmTrend: 9.2,
  avgTryPerOrder: 5.7,
  avgTryTrend: 3.1
}

// ── 最近 7 天趋势 ──
export const trendData = {
  dates: ['06-01', '06-02', '06-03', '06-04', '06-05', '06-06', '06-07'],
  hotTrend:  [920, 1040, 980, 1120, 1060, 1240, 1180],
  coldTrend: [180, 162, 174, 158, 144, 136, 128]
}

// ── 热门款 TOP 8 ──
export const hotStyles = [
  {
    id: 'nail-001',
    name: '香槟裸粉猫眼',
    image: 'https://picsum.photos/seed/nail-001/200/200',
    tryOnCount: 1180, confirmCount: 208, confirmRate: 17.6,
    hotIndex: 94, coldRisk: 8, trend: 'up',
    tags: ['猫眼', '高级感', '通勤']
  },
  {
    id: 'nail-015',
    name: '裸金细闪猫眼',
    image: 'https://picsum.photos/seed/nail-015/200/200',
    tryOnCount: 1130, confirmCount: 198, confirmRate: 17.5,
    hotIndex: 91, coldRisk: 10, trend: 'up',
    tags: ['猫眼', '细闪', '约会']
  },
  {
    id: 'nail-004',
    name: '裸粉通勤法式',
    image: 'https://picsum.photos/seed/nail-004/200/200',
    tryOnCount: 960, confirmCount: 172, confirmRate: 17.9,
    hotIndex: 88, coldRisk: 11, trend: 'stable',
    tags: ['法式', '通勤', '高级感']
  },
  {
    id: 'nail-011',
    name: '奶白珍珠法式',
    image: 'https://picsum.photos/seed/nail-011/200/200',
    tryOnCount: 846, confirmCount: 120, confirmRate: 14.2,
    hotIndex: 82, coldRisk: 14, trend: 'up',
    tags: ['法式', '珍珠', '优雅']
  },
  {
    id: 'nail-016',
    name: '通透奶茶法式',
    image: 'https://picsum.photos/seed/nail-016/200/200',
    tryOnCount: 782, confirmCount: 118, confirmRate: 15.1,
    hotIndex: 78, coldRisk: 16, trend: 'up',
    tags: ['法式', '奶茶', '日常']
  },
  {
    id: 'nail-002',
    name: '蓝调玻璃珠猫眼',
    image: 'https://picsum.photos/seed/nail-002/200/200',
    tryOnCount: 780, confirmCount: 96, confirmRate: 12.3,
    hotIndex: 74, coldRisk: 20, trend: 'up',
    tags: ['猫眼', '个性风', '夏日']
  },
  {
    id: 'nail-009',
    name: '温柔花边法式',
    image: 'https://picsum.photos/seed/nail-009/200/200',
    tryOnCount: 620, confirmCount: 74, confirmRate: 11.9,
    hotIndex: 68, coldRisk: 24, trend: 'stable',
    tags: ['法式', '花边', '温柔感']
  },
  {
    id: 'nail-003',
    name: '指尖生花手绘',
    image: 'https://picsum.photos/seed/nail-003/200/200',
    tryOnCount: 702, confirmCount: 88, confirmRate: 12.5,
    hotIndex: 65, coldRisk: 22, trend: 'stable',
    tags: ['手绘', '花朵', '春日']
  }
]

// ── 冷门/风险款 ──
export const coldStyles = [
  {
    id: 'nail-018',
    name: '黑银锋芒钻饰',
    image: 'https://picsum.photos/seed/nail-018/200/200',
    tryOnCount: 138, confirmCount: 8, confirmRate: 5.8,
    hotIndex: 22, coldRisk: 82, trend: 'down',
    tags: ['钻饰', '暗黑', '派对']
  },
  {
    id: 'nail-008',
    name: 'DIY 糖果彩绘穿戴甲',
    image: 'https://picsum.photos/seed/nail-008/200/200',
    tryOnCount: 196, confirmCount: 10, confirmRate: 5.1,
    hotIndex: 28, coldRisk: 76, trend: 'down',
    tags: ['穿戴甲', '彩绘', '个性风']
  },
  {
    id: 'nail-007',
    name: '银钻派对延长甲',
    image: 'https://picsum.photos/seed/nail-007/200/200',
    tryOnCount: 248, confirmCount: 18, confirmRate: 7.3,
    hotIndex: 34, coldRisk: 71, trend: 'down',
    tags: ['延长甲', '钻饰', '派对']
  },
  {
    id: 'nail-013',
    name: '清冷雾面手绘',
    image: 'https://picsum.photos/seed/nail-013/200/200',
    tryOnCount: 250, confirmCount: 21, confirmRate: 8.4,
    hotIndex: 38, coldRisk: 65, trend: 'down',
    tags: ['手绘', '雾面', '清冷']
  }
]

// ── 潜力款 ──
export const potentialStyles = [
  {
    id: 'nail-014',
    name: '春日糖霜小花',
    image: 'https://picsum.photos/seed/nail-014/200/200',
    tryOnCount: 560, confirmCount: 66, confirmRate: 11.8,
    hotIndex: 58, coldRisk: 28, growthScore: 76, trend: 'up',
    tags: ['花朵', '春日', '可爱']
  },
  {
    id: 'nail-006',
    name: '清透蜜桃渐变',
    image: 'https://picsum.photos/seed/nail-006/200/200',
    tryOnCount: 530, confirmCount: 58, confirmRate: 10.9,
    hotIndex: 54, coldRisk: 30, growthScore: 71, trend: 'up',
    tags: ['渐变', '蜜桃', '夏日']
  },
  {
    id: 'nail-012',
    name: '低饱和奶紫渐变',
    image: 'https://picsum.photos/seed/nail-012/200/200',
    tryOnCount: 392, confirmCount: 42, confirmRate: 10.7,
    hotIndex: 50, coldRisk: 34, growthScore: 68, trend: 'up',
    tags: ['渐变', '奶紫', '温柔感']
  }
]

// ── 推荐位 ──
export const recommendSlots = [
  {
    position: 1, slotType: 'hero_full',
    style: { id: 'nail-001', name: '香槟裸粉猫眼', image: 'https://picsum.photos/seed/nail-001/200/200' },
    label: '今日精选', reason: '首屏高热度，成单率 17.6%'
  },
  {
    position: 2, slotType: 'hero_full',
    style: { id: 'nail-015', name: '裸金细闪猫眼', image: 'https://picsum.photos/seed/nail-015/200/200' },
    label: '店内常做款', reason: '高确认转化，适合通勤场景'
  },
  {
    position: 3, slotType: 'card_half',
    style: { id: 'nail-004', name: '裸粉通勤法式', image: 'https://picsum.photos/seed/nail-004/200/200' },
    label: '职场首选', reason: '稳定复购，通勤高频款'
  },
  {
    position: 4, slotType: 'card_half',
    style: { id: 'nail-011', name: '奶白珍珠法式', image: 'https://picsum.photos/seed/nail-011/200/200' },
    label: '新品爬升', reason: '近 7 日增速明显'
  },
  {
    position: 5, slotType: 'peek_half',
    style: { id: 'nail-014', name: '春日糖霜小花', image: 'https://picsum.photos/seed/nail-014/200/200' },
    label: '正在流行', reason: '潜力款，适合测位'
  },
  {
    position: 6, slotType: 'peek_half',
    style: { id: 'nail-016', name: '通透奶茶法式', image: 'https://picsum.photos/seed/nail-016/200/200' },
    label: '热门延续', reason: '客单价稳定，适合留位'
  },
  {
    position: 7, slotType: 'card_half',
    style: { id: 'nail-006', name: '清透蜜桃渐变', image: 'https://picsum.photos/seed/nail-006/200/200' },
    label: '夏日推荐', reason: '季节契合度高'
  },
  {
    position: 8, slotType: 'card_half',
    style: { id: 'nail-002', name: '蓝调玻璃珠猫眼', image: 'https://picsum.photos/seed/nail-002/200/200' },
    label: '个性流行', reason: '年轻用户偏好上升'
  }
]

// ── AI 运营建议 ──
export const suggestions = [
  {
    type: 'hot',
    title: '保留高热主推位',
    content: '香槟裸粉猫眼 当前热度 94，成单率 17.6%，适合继续放在首屏成交位。',
    priority: 'high'
  },
  {
    type: 'potential',
    title: '扶持潜力新品',
    content: '春日糖霜小花 近 7 日增速 +38%，建议补充推荐位曝光测试转化。',
    priority: 'medium'
  },
  {
    type: 'cold',
    title: '冷门款风险预警',
    content: '黑银锋芒钻饰 冷门风险 82，成单率仅 5.8%，建议优先检查封面和定价。',
    priority: 'high'
  },
  {
    type: 'season',
    title: '夏日换款节奏',
    content: '蜜桃渐变、奶紫渐变季节契合度高，可在 6 月第二周起逐步提升排位。',
    priority: 'low'
  }
]

// ── 总览指标 ──
export const metrics = {
  totals: {
    views: 68400,
    tryOns: 11860,
    wants: 3820,
    orders: 1480,
    conversionRate: 12.5
  },
  daily: [
    { date: '06-01', views: 9200,  tryOns: 1560, wants: 510, orders: 196 },
    { date: '06-02', views: 9800,  tryOns: 1680, wants: 542, orders: 214 },
    { date: '06-03', views: 9400,  tryOns: 1620, wants: 528, orders: 202 },
    { date: '06-04', views: 10200, tryOns: 1740, wants: 568, orders: 224 },
    { date: '06-05', views: 9800,  tryOns: 1680, wants: 544, orders: 210 },
    { date: '06-06', views: 10800, tryOns: 1840, wants: 600, orders: 234 },
    { date: '06-07', views: 9200,  tryOns: 1740, wants: 528, orders: 200 }
  ]
}

// ── 活动日志 ──
export const activities = [
  { time: '09:14', type: 'hot',       text: '香槟裸粉猫眼 今日试戴 208 次，成单 37 单' },
  { time: '10:32', type: 'potential', text: '春日糖霜小花 曝光量较昨日上涨 38%' },
  { time: '11:55', type: 'cold',      text: '黑银锋芒钻饰 连续 3 日无确认，建议检查' },
  { time: '13:08', type: 'hot',       text: '裸金细闪猫眼 下午档热度反弹，建议保持首屏' },
  { time: '15:22', type: 'system',    text: '推荐位每日自动更新已完成，共调整 2 处' },
  { time: '16:47', type: 'potential', text: '清透蜜桃渐变 加入试戴用户新增 64 人' }
]

// ── 颜色分布（用户偏好） ──
export const colorStats = [
  { name: '裸色系', value: 38 },
  { name: '白色系', value: 24 },
  { name: '粉色系', value: 18 },
  { name: '蓝色系', value: 12 },
  { name: '其他',   value: 8  }
]

// ── 款式类型分布 ──
export const styleTypeStats = [
  { name: '猫眼', value: 36 },
  { name: '法式', value: 32 },
  { name: '手绘', value: 14 },
  { name: '渐变', value: 12 },
  { name: '其他', value: 6  }
]
