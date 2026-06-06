// Mock数据 - 美甲运营端

// 今日运营数据
export const todayStats = {
  tryOnCount: 156,
  tryOnTrend: 23.5,
  userCount: 89,
  userTrend: 15.2,
  confirmCount: 35,
  confirmTrend: 12.8,
  avgTryPerOrder: 4.5,
  avgTryTrend: -2.1
}

// 趋势数据（最近7天）
export const trendData = {
  dates: ['05-04', '05-05', '05-06', '05-07', '05-08', '05-09', '05-10'],
  hotTrend: [120, 132, 101, 134, 90, 230, 156],
  coldTrend: [45, 52, 38, 44, 35, 62, 48]
}

// 爆款榜数据
export const hotStyles = [
  {
    id: 1,
    name: '法式优雅',
    image: 'https://picsum.photos/seed/nail1/200/200',
    tryOnCount: 2356,
    confirmCount: 356,
    confirmRate: 15.1,
    clickRate: 8.2,
    hotIndex: 92.5,
    tags: ['法式', '优雅', '职场'],
    trend: 'up'
  },
  {
    id: 2,
    name: '渐变梦幻',
    image: 'https://picsum.photos/seed/nail2/200/200',
    tryOnCount: 1823,
    confirmCount: 234,
    confirmRate: 12.8,
    clickRate: 7.5,
    hotIndex: 85.3,
    tags: ['渐变', '梦幻', '约会'],
    trend: 'up'
  },
  {
    id: 3,
    name: '彩绘星空',
    image: 'https://picsum.photos/seed/nail3/200/200',
    tryOnCount: 1256,
    confirmCount: 189,
    confirmRate: 15.0,
    clickRate: 6.8,
    hotIndex: 78.6,
    tags: ['彩绘', '星空', '派对'],
    trend: 'stable'
  },
  {
    id: 4,
    name: '猫眼美甲',
    image: 'https://picsum.photos/seed/nail4/200/200',
    tryOnCount: 986,
    confirmCount: 145,
    confirmRate: 14.7,
    clickRate: 5.9,
    hotIndex: 72.1,
    tags: ['猫眼', '高级感'],
    trend: 'up'
  },
  {
    id: 5,
    name: '纯欲裸色',
    image: 'https://picsum.photos/seed/nail5/200/200',
    tryOnCount: 856,
    confirmCount: 128,
    confirmRate: 15.0,
    clickRate: 5.2,
    hotIndex: 68.4,
    tags: ['裸色', '纯欲', '日常'],
    trend: 'stable'
  },
  {
    id: 6,
    name: '极光猫眼',
    image: 'https://picsum.photos/seed/nail6/200/200',
    tryOnCount: 723,
    confirmCount: 98,
    confirmRate: 13.5,
    clickRate: 4.8,
    hotIndex: 62.8,
    tags: ['猫眼', '极光', '派对'],
    trend: 'up'
  }
]

// 冷门榜数据
export const coldStyles = [
  {
    id: 101,
    name: '复古格纹',
    image: 'https://picsum.photos/seed/nail101/200/200',
    tryOnCount: 45,
    confirmCount: 12,
    confirmRate: 26.7,
    type: 'potential', // 潜力款
    suggestion: '建议提高曝光'
  },
  {
    id: 102,
    name: '金属质感',
    image: 'https://picsum.photos/seed/nail102/200/200',
    tryOnCount: 32,
    confirmCount: 3,
    confirmRate: 9.4,
    type: 'cold', // 真冷门
    suggestion: '建议下架或降权'
  },
  {
    id: 103,
    name: '荧光撞色',
    image: 'https://picsum.photos/seed/nail103/200/200',
    tryOnCount: 156,
    confirmCount: 8,
    confirmRate: 5.1,
    type: 'traffic', // 引流款
    suggestion: '建议优化封面/价格'
  },
  {
    id: 104,
    name: '水墨风',
    image: 'https://picsum.photos/seed/nail104/200/200',
    tryOnCount: 28,
    confirmCount: 7,
    confirmRate: 25.0,
    type: 'potential',
    suggestion: '建议提高曝光'
  },
  {
    id: 105,
    name: '暗黑系',
    image: 'https://picsum.photos/seed/nail105/200/200',
    tryOnCount: 18,
    confirmCount: 1,
    confirmRate: 5.6,
    type: 'cold',
    suggestion: '建议下架或降权'
  },
  {
    id: 106,
    name: '波点复古',
    image: 'https://picsum.photos/seed/nail106/200/200',
    tryOnCount: 52,
    confirmCount: 15,
    confirmRate: 28.8,
    type: 'potential',
    suggestion: '建议提高曝光'
  }
]

// 款式列表数据
export const styleList = [
  {
    id: 1,
    name: '法式优雅',
    image: 'https://picsum.photos/seed/nail1/200/200',
    category: '法式',
    tags: ['优雅', '职场', '简约'],
    price: 128,
    status: 'active',
    isHot: true,
    isRecommend: true,
    tryOnCount: 2356,
    confirmCount: 356,
    confirmRate: 15.1,
    createTime: '2026-03-15'
  },
  {
    id: 2,
    name: '渐变梦幻',
    image: 'https://picsum.photos/seed/nail2/200/200',
    category: '渐变',
    tags: ['梦幻', '约会', '粉色'],
    price: 168,
    status: 'active',
    isHot: true,
    isRecommend: true,
    tryOnCount: 1823,
    confirmCount: 234,
    confirmRate: 12.8,
    createTime: '2026-03-20'
  },
  {
    id: 3,
    name: '彩绘星空',
    image: 'https://picsum.photos/seed/nail3/200/200',
    category: '彩绘',
    tags: ['星空', '派对', '蓝色'],
    price: 198,
    status: 'active',
    isHot: false,
    isRecommend: false,
    tryOnCount: 1256,
    confirmCount: 189,
    confirmRate: 15.0,
    createTime: '2026-04-01'
  },
  {
    id: 4,
    name: '猫眼美甲',
    image: 'https://picsum.photos/seed/nail4/200/200',
    category: '猫眼',
    tags: ['高级感', '日常'],
    price: 158,
    status: 'active',
    isHot: false,
    isRecommend: true,
    tryOnCount: 986,
    confirmCount: 145,
    confirmRate: 14.7,
    createTime: '2026-04-10'
  },
  {
    id: 5,
    name: '纯欲裸色',
    image: 'https://picsum.photos/seed/nail5/200/200',
    category: '纯色',
    tags: ['裸色', '纯欲', '日常'],
    price: 98,
    status: 'active',
    isHot: false,
    isRecommend: false,
    tryOnCount: 856,
    confirmCount: 128,
    confirmRate: 15.0,
    createTime: '2026-04-15'
  },
  {
    id: 6,
    name: '复古格纹',
    image: 'https://picsum.photos/seed/nail101/200/200',
    category: '彩绘',
    tags: ['复古', '格纹'],
    price: 178,
    status: 'active',
    isHot: false,
    isRecommend: false,
    tryOnCount: 45,
    confirmCount: 12,
    confirmRate: 26.7,
    createTime: '2026-04-20'
  },
  {
    id: 7,
    name: '金属质感',
    image: 'https://picsum.photos/seed/nail102/200/200',
    category: '特效',
    tags: ['金属', '酷炫'],
    price: 218,
    status: 'inactive',
    isHot: false,
    isRecommend: false,
    tryOnCount: 32,
    confirmCount: 3,
    confirmRate: 9.4,
    createTime: '2026-04-25'
  }
]

// 推荐位数据
export const recommendList = [
  {
    id: 1,
    position: 1,
    style: {
      id: 1,
      name: '法式优雅',
      image: 'https://picsum.photos/seed/nail1/200/200'
    },
    reason: '爆款主推，今日试戴量最高',
    exposureCount: 1256,
    tryOnCount: 356,
    confirmRate: 15.1,
    isAuto: true
  },
  {
    id: 2,
    position: 2,
    style: {
      id: 2,
      name: '渐变梦幻',
      image: 'https://picsum.photos/seed/nail2/200/200'
    },
    reason: '爆款主推，转化率稳定',
    exposureCount: 986,
    tryOnCount: 234,
    confirmRate: 12.8,
    isAuto: true
  },
  {
    id: 3,
    position: 3,
    style: {
      id: 4,
      name: '猫眼美甲',
      image: 'https://picsum.photos/seed/nail4/200/200'
    },
    reason: '上升趋势明显，潜力爆款',
    exposureCount: 756,
    tryOnCount: 145,
    confirmRate: 14.7,
    isAuto: true
  },
  {
    id: 4,
    position: 4,
    style: {
      id: 3,
      name: '彩绘星空',
      image: 'https://picsum.photos/seed/nail3/200/200'
    },
    reason: '新品推荐，丰富款式类型',
    exposureCount: 568,
    tryOnCount: 189,
    confirmRate: 15.0,
    isAuto: true
  },
  {
    id: 5,
    position: 5,
    style: {
      id: 5,
      name: '纯欲裸色',
      image: 'https://picsum.photos/seed/nail5/200/200'
    },
    reason: '性价比之选，适合日常',
    exposureCount: 423,
    tryOnCount: 128,
    confirmRate: 15.0,
    isAuto: true
  },
  {
    id: 6,
    position: 6,
    style: {
      id: 101,
      name: '复古格纹',
      image: 'https://picsum.photos/seed/nail101/200/200'
    },
    reason: '冷门激活款，高意向率待曝光',
    exposureCount: 156,
    tryOnCount: 12,
    confirmRate: 26.7,
    isAuto: false
  }
]

// 用户偏好数据
export const userPreference = {
  colorPreference: [
    { name: '粉色', value: 32 },
    { name: '蓝色', value: 25 },
    { name: '红色', value: 20 },
    { name: '裸色', value: 15 },
    { name: '其他', value: 8 }
  ],
  stylePreference: [
    { name: '法式', value: 35 },
    { name: '渐变', value: 28 },
    { name: '彩绘', value: 22 },
    { name: '猫眼', value: 10 },
    { name: '其他', value: 5 }
  ],
  scenePreference: [
    { name: '约会', value: 38 },
    { name: '职场', value: 30 },
    { name: '日常', value: 20 },
    { name: '派对', value: 12 }
  ]
}

// 运营建议
export const operationSuggestions = [
  {
    type: 'hot',
    title: '爆款主推建议',
    content: '「法式优雅」今日试戴量最高，建议继续主推，可考虑搭配优惠活动提升转化。',
    priority: 'high'
  },
  {
    type: 'potential',
    title: '潜力款发现',
    content: '「复古格纹」意向率高达26.7%，但曝光不足，建议提高推荐位曝光。',
    priority: 'medium'
  },
  {
    type: 'cold',
    title: '冷门款预警',
    content: '「金属质感」试戴量和意向率均较低，建议下架或调整价格策略。',
    priority: 'low'
  },
  {
    type: 'trend',
    title: '趋势洞察',
    content: '猫眼美甲近3天试戴量上涨45%，建议增加相关款式上新。',
    priority: 'medium'
  }
]

// 实时动态
export const recentActivities = [
  { id: 1, type: 'tryon', user: '小美', content: '试戴了「法式优雅」', time: '2分钟前' },
  { id: 2, type: 'appointment', user: '小红', content: '预约了明天14:00', time: '15分钟前' },
  { id: 3, type: 'favorite', user: '小丽', content: '收藏了「渐变梦幻」', time: '30分钟前' },
  { id: 4, type: 'confirm', user: '小芳', content: '确认选择「彩绘星空」', time: '1小时前' },
  { id: 5, type: 'tryon', user: '小雪', content: '试戴了「猫眼美甲」', time: '1小时前' }
]
