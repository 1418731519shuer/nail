import { FEEDBACK_CODE_MAP, RECOMMENDATION_FEEDBACK_CODES } from '@/types/recommendation'

export const FEEDBACK_TYPE_LABELS = {
  tryon_effect: '试戴效果',
  recommendation: '推荐匹配',
  style_content: '内容运营',
  upload_detection: '上传识别',
  performance: '性能体验',
  ui_experience: '界面流程'
}

export const FEEDBACK_CODE_LABELS = {
  nail_position_wrong: '指甲位置不准',
  nail_shape_wrong: '甲型不对',
  style_not_match: '款式不像参考图',
  color_not_match: '颜色不对',
  pattern_deformed: '图案变形',
  hand_changed: '手部被改动',
  background_changed: '背景被改动',
  lighting_wrong: '光影不自然',
  result_unrealistic: '结果不真实',
  not_my_style: '不是我的风格',
  too_repetitive: '推荐太重复',
  wrong_shape: '推荐甲型不适合',
  wrong_season: '季节氛围不对',
  too_fancy: '过于花哨',
  too_plain: '太素了',
  want_more_similar: '想看更多类似款',
  wrong_tag: '标签不准确',
  bad_image_quality: '图片质量差',
  description_wrong: '介绍文案不准',
  comment_irrelevant: '评论不相关',
  style_duplicate: '款式重复',
  upload_failed: '上传失败',
  hand_not_detected: '未识别到手',
  nail_not_detected: '未识别到指甲',
  nail_mask_wrong: '指甲遮罩不准',
  image_too_blurry: '图片太模糊',
  angle_not_supported: '拍摄角度不支持',
  generation_too_slow: '生成太慢',
  page_lag: '页面卡顿',
  image_load_slow: '图片加载慢',
  tryon_failed: '试戴失败',
  button_unclear: '按钮不清晰',
  workflow_confusing: '流程不清楚',
  filter_hard_to_use: '筛选难用',
  cannot_find_feature: '找不到功能'
}

export const FEEDBACK_SOURCE_PAGE_LABELS = {
  home: '首页',
  style_list: '款式列表',
  style_detail: '款式详情',
  tryon_result: '试戴结果',
  upload: '上传页',
  profile_radar: '画像页'
}

export const FEEDBACK_STATUS_LABELS = {
  new: '新建',
  reviewed: '已查看',
  processing: '处理中',
  resolved: '已解决',
  ignored: '已忽略'
}

export const FEEDBACK_SEVERITY_LABELS = {
  low: '低',
  medium: '中',
  high: '高'
}

export const APP_VERSIONS = ['1.0.0', '1.1.0', '1.2.0']

export const MOCK_USER_IDS = [
  'user_mock_001',
  'user_mock_002',
  'user_mock_003',
  'user_mock_004',
  'user_mock_005'
]

export const MOCK_ITEM_IDS = [
  'nail-001',
  'nail-002',
  'nail-003',
  'nail-004',
  'nail-005',
  'nail-006',
  'nail-007',
  'nail-008'
]

const VERSION_PATTERNS = {
  '1.0.0': [
    ['tryon_effect', 'nail_position_wrong', 8],
    ['tryon_effect', 'style_not_match', 5],
    ['performance', 'generation_too_slow', 5],
    ['upload_detection', 'nail_mask_wrong', 4],
    ['upload_detection', 'hand_not_detected', 2],
    ['recommendation', 'not_my_style', 2],
    ['style_content', 'wrong_tag', 1],
    ['ui_experience', 'workflow_confusing', 1]
  ],
  '1.1.0': [
    ['tryon_effect', 'nail_position_wrong', 4],
    ['tryon_effect', 'style_not_match', 4],
    ['recommendation', 'too_repetitive', 5],
    ['recommendation', 'wrong_shape', 4],
    ['performance', 'generation_too_slow', 3],
    ['upload_detection', 'nail_mask_wrong', 2],
    ['style_content', 'wrong_tag', 1],
    ['ui_experience', 'filter_hard_to_use', 1]
  ],
  '1.2.0': [
    ['recommendation', 'too_repetitive', 4],
    ['style_content', 'wrong_tag', 4],
    ['style_content', 'bad_image_quality', 3],
    ['tryon_effect', 'style_not_match', 3],
    ['tryon_effect', 'nail_position_wrong', 2],
    ['ui_experience', 'workflow_confusing', 2],
    ['performance', 'generation_too_slow', 1],
    ['upload_detection', 'image_too_blurry', 1]
  ]
}

const FEEDBACK_TEXT_BANK = {
  nail_position_wrong: ['指甲贴歪了，边缘有点偏。', '中指和无名指位置对不上。', '贴到了皮肤边上，观感不自然。'],
  style_not_match: ['和参考款差得有点多。', '整体感觉不像目标款。', '元素有，但风格还原不够。'],
  generation_too_slow: ['等待时间有点长。', '生成过程偏慢，容易退出。', '试戴结果出来太久了。'],
  nail_mask_wrong: ['遮罩吃到手指边缘了。', '指甲范围识别不准。', '边界有明显溢出。'],
  too_repetitive: ['推荐总是这几种猫眼。', '刷几次还是相似风格。', '列表重复感有点强。'],
  wrong_shape: ['推荐长甲太多，不适合我。', '甲型和我的手型不太搭。', '希望按短甲偏好推更多。'],
  wrong_tag: ['标签写得不够准。', '这个不太算法式。', '风格标签容易误导筛选。'],
  bad_image_quality: ['封面清晰度不够。', '细节有点糊。', '图片质感拉低点击欲望。'],
  workflow_confusing: ['不知道下一步该点哪里。', '我想回看结果时路径有点绕。', '流程提示不够清楚。'],
  not_my_style: ['风格不是我会做的类型。', '这类推荐不太对我的口味。', '更想看低饱和一点的。'],
  image_too_blurry: ['上传图太糊就过不去。', '拍照稍微虚一点就不行。'],
  hand_not_detected: ['明明有手，还是提示没识别到。'],
  filter_hard_to_use: ['筛选项有点难找。'],
  default: ['这里体验不太好，想反馈一下。']
}

export function seededRandom(seed = 20260604) {
  let value = seed
  return function next() {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

function buildRecord(version, feedbackType, feedbackCode, index, random) {
  const userId = MOCK_USER_IDS[index % MOCK_USER_IDS.length]
  const sessionId = `session_${version.replaceAll('.', '')}_${String(index + 1).padStart(3, '0')}`
  const sourcePages = ['tryon_result', 'style_list', 'style_detail', 'upload', 'home', 'profile_radar']
  const statuses = ['new', 'reviewed', 'processing', 'resolved', 'ignored']
  const severityByType = {
    tryon_effect: ['medium', 'high', 'high'],
    recommendation: ['low', 'medium', 'medium'],
    style_content: ['low', 'medium', 'medium'],
    upload_detection: ['medium', 'high', 'medium'],
    performance: ['medium', 'high', 'high'],
    ui_experience: ['low', 'medium', 'medium']
  }
  const actionBeforeFeedback = {
    tryon_effect: 'view_tryon_result',
    recommendation: 'browse_recommendation_feed',
    style_content: 'view_style_detail',
    upload_detection: 'upload_hand_image',
    performance: 'start_tryon_generation',
    ui_experience: 'browse_profile_radar'
  }

  const baseDate = {
    '1.0.0': new Date('2026-05-10T09:00:00+08:00'),
    '1.1.0': new Date('2026-05-20T09:00:00+08:00'),
    '1.2.0': new Date('2026-05-30T09:00:00+08:00')
  }[version]

  const createdAt = new Date(baseDate)
  createdAt.setHours(createdAt.getHours() + index * 3)
  createdAt.setMinutes(createdAt.getMinutes() + Math.floor(random() * 45))

  const status = statuses[Math.floor(random() * statuses.length)]
  const severityPool = severityByType[feedbackType] || ['medium']
  const severity = severityPool[Math.floor(random() * severityPool.length)]
  const textBank = FEEDBACK_TEXT_BANK[feedbackCode] || FEEDBACK_TEXT_BANK.default

  return {
    id: `feedback_${version.replaceAll('.', '')}_${String(index + 1).padStart(3, '0')}`,
    userId,
    sessionId,
    feedbackType,
    feedbackCode,
    feedbackText: textBank[Math.floor(random() * textBank.length)],
    rating: 2 + Math.round(random() * 3),
    severity,
    sourcePage: sourcePages[Math.floor(random() * sourcePages.length)],
    relatedItemId: MOCK_ITEM_IDS[index % MOCK_ITEM_IDS.length],
    relatedTryonResultId: feedbackType === 'tryon_effect' || feedbackType === 'performance' ? `tryon_${index + 1}` : undefined,
    relatedImageId: feedbackType === 'upload_detection' ? `upload_${index + 1}` : undefined,
    userActionBeforeFeedback: actionBeforeFeedback[feedbackType],
    appVersion: version,
    status,
    createdAt: createdAt.toISOString(),
    updatedAt: status === 'new' ? undefined : new Date(createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    affectsRecommendation: RECOMMENDATION_FEEDBACK_CODES.has(feedbackCode),
    pipeline:
      feedbackType === 'recommendation'
        ? 'recommendation_correction'
        : feedbackType === 'style_content'
          ? 'content_operations'
          : 'product_model_quality'
  }
}

export function isValidFeedbackCode(feedbackType, feedbackCode) {
  return (FEEDBACK_CODE_MAP[feedbackType] || []).includes(feedbackCode)
}

export function generateMockFeedbackRecords() {
  const random = seededRandom(20260604)
  const records = []

  APP_VERSIONS.forEach((version) => {
    let cursor = 0
    VERSION_PATTERNS[version].forEach(([feedbackType, feedbackCode, count]) => {
      for (let index = 0; index < count; index += 1) {
        if (!isValidFeedbackCode(feedbackType, feedbackCode)) {
          throw new Error(`Invalid feedback mapping: ${feedbackType} -> ${feedbackCode}`)
        }
        records.push(buildRecord(version, feedbackType, feedbackCode, cursor, random))
        cursor += 1
      }
    })
  })

  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export const mockFeedbackRecords = generateMockFeedbackRecords()

export function getFeedbackOverview(records = mockFeedbackRecords) {
  const total = records.length
  const avgRating = round(records.reduce((sum, item) => sum + Number(item.rating || 0), 0) / Math.max(1, total))
  const highSeverityCount = records.filter((item) => item.severity === 'high').length
  const recommendationImpactCount = records.filter((item) => item.affectsRecommendation).length
  const versionCount = new Set(records.map((item) => item.appVersion)).size
  return {
    total,
    avgRating,
    highSeverityCount,
    recommendationImpactCount,
    versionCount
  }
}

export function getFeedbackCategoryStats(records = mockFeedbackRecords) {
  const total = Math.max(1, records.length)
  return Object.keys(FEEDBACK_CODE_MAP).map((feedbackType) => {
    const list = records.filter((item) => item.feedbackType === feedbackType)
    return {
      feedbackType,
      label: FEEDBACK_TYPE_LABELS[feedbackType],
      count: list.length,
      percentage: round((list.length / total) * 100),
      highSeverity: list.filter((item) => item.severity === 'high').length
    }
  }).sort((a, b) => b.count - a.count)
}

export function getTopIssueCodes(records = mockFeedbackRecords, limit = 8) {
  const bucket = new Map()
  records.forEach((item) => {
    if (!bucket.has(item.feedbackCode)) {
      bucket.set(item.feedbackCode, {
        feedbackCode: item.feedbackCode,
        label: FEEDBACK_CODE_LABELS[item.feedbackCode] || item.feedbackCode,
        feedbackType: item.feedbackType,
        feedbackTypeLabel: FEEDBACK_TYPE_LABELS[item.feedbackType],
        count: 0,
        avgRating: 0
      })
    }
    const current = bucket.get(item.feedbackCode)
    current.count += 1
    current.avgRating += Number(item.rating || 0)
  })

  return [...bucket.values()]
    .map((item) => ({
      ...item,
      avgRating: round(item.avgRating / Math.max(1, item.count))
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function getVersionTrendStats(records = mockFeedbackRecords) {
  return APP_VERSIONS.map((version) => {
    const list = records.filter((item) => item.appVersion === version)
    const codeCount = (feedbackCode) => list.filter((item) => item.feedbackCode === feedbackCode).length
    return {
      appVersion: version,
      total: list.length,
      tryonEffect: list.filter((item) => item.feedbackType === 'tryon_effect').length,
      recommendation: list.filter((item) => item.feedbackType === 'recommendation').length,
      styleContent: list.filter((item) => item.feedbackType === 'style_content').length,
      uploadDetection: list.filter((item) => item.feedbackType === 'upload_detection').length,
      performance: list.filter((item) => item.feedbackType === 'performance').length,
      uiExperience: list.filter((item) => item.feedbackType === 'ui_experience').length,
      nailPositionWrong: codeCount('nail_position_wrong'),
      generationTooSlow: codeCount('generation_too_slow'),
      tooRepetitive: codeCount('too_repetitive'),
      wrongTag: codeCount('wrong_tag')
    }
  })
}

export function getSourcePageStats(records = mockFeedbackRecords) {
  const total = Math.max(1, records.length)
  const bucket = new Map()
  records.forEach((item) => {
    const key = item.sourcePage
    bucket.set(key, (bucket.get(key) || 0) + 1)
  })
  return [...bucket.entries()]
    .map(([sourcePage, count]) => ({
      sourcePage,
      label: FEEDBACK_SOURCE_PAGE_LABELS[sourcePage] || sourcePage,
      count,
      percentage: round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count)
}

export function getPipelineStats(records = mockFeedbackRecords) {
  const bucket = {
    recommendation_correction: 0,
    product_model_quality: 0,
    content_operations: 0
  }

  records.forEach((item) => {
    bucket[item.pipeline] += 1
  })

  return [
    {
      key: 'recommendation_correction',
      label: '推荐纠偏',
      count: bucket.recommendation_correction,
      desc: '只允许这部分反馈影响用户画像'
    },
    {
      key: 'product_model_quality',
      label: '产品 / 模型质量',
      count: bucket.product_model_quality,
      desc: '只进质量看板，不改用户偏好'
    },
    {
      key: 'content_operations',
      label: '内容运营复核',
      count: bucket.content_operations,
      desc: '进入标签、封面、文案复核'
    }
  ]
}

export function getRecentFeedbackRecords(records = mockFeedbackRecords, limit = 12) {
  return [...records]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100
}
