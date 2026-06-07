import {
  BEHAVIOR_WEIGHTS,
  COMBO_DIMENSIONS,
  CONVERSION_BEHAVIORS,
  createEmptyComboScores,
  createEmptyDimensionScores,
  createItemSnapshot,
  DIMENSION_OPTIONS,
  FILTER_ALL,
  INTEREST_BEHAVIORS,
  SCORE_FLOOR,
  TAG_ALPHA
} from '@/types/recommendation'

function cloneScores(scores) {
  return JSON.parse(JSON.stringify(scores))
}

function buildSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyUserProfile(userId) {
  return {
    userId,
    interestScore: createEmptyDimensionScores(),
    conversionScore: createEmptyDimensionScores(),
    comboScore: createEmptyComboScores(),
    sessionScore: createEmptyDimensionScores(),
    behaviorCount: {
      interest: 0,
      conversion: 0,
      total: 0
    },
    confidence: {
      interest: 0,
      conversion: 0,
      overall: 0
    },
    explorationRate: 0.4,
    updatedAt: new Date(0).toISOString(),
    activeSessionId: ''
  }
}

export function recordUserBehavior(userId, item, behaviorType, extra = {}) {
  const behaviorWeight = BEHAVIOR_WEIGHTS[behaviorType] ?? 0
  return {
    id: extra.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    itemId: item.id,
    behaviorType,
    weight: extra.weight ?? behaviorWeight,
    itemSnapshot: extra.itemSnapshot || createItemSnapshot(item),
    timestamp: extra.timestamp || new Date().toISOString(),
    sessionId: extra.sessionId || buildSessionId(),
    sourcePage: extra.sourcePage || 'user-data-page',
    filterDimension: extra.filterDimension,
    filterValue: extra.filterValue,
    visibleRatio: extra.visibleRatio,
    visibleDurationMs: extra.visibleDurationMs
  }
}

export function applyTimeDecay(profile, now = new Date()) {
  const lastTime = new Date(profile.updatedAt || 0).getTime()
  const nextTime = now.getTime()
  if (!lastTime || Number.isNaN(lastTime) || nextTime <= lastTime) {
    return { ...profile }
  }

  const daysSinceLastUpdate = Math.floor((nextTime - lastTime) / (24 * 60 * 60 * 1000))
  if (daysSinceLastUpdate <= 0) return { ...profile }

  const interestDecay = 0.97 ** daysSinceLastUpdate
  const conversionDecay = 0.99 ** daysSinceLastUpdate
  const nextProfile = { ...profile }
  nextProfile.interestScore = decayDimensionScores(profile.interestScore, interestDecay)
  nextProfile.conversionScore = decayDimensionScores(profile.conversionScore, conversionDecay)
  nextProfile.comboScore = decayComboScores(profile.comboScore, interestDecay)
  nextProfile.updatedAt = new Date(now).toISOString()
  return nextProfile
}

export function updateUserProfile(profile, behaviorLog) {
  const eventTime = new Date(behaviorLog.timestamp || Date.now())
  let nextProfile = applyTimeDecay(profile, eventTime)
  nextProfile = {
    ...nextProfile,
    interestScore: cloneScores(nextProfile.interestScore),
    conversionScore: cloneScores(nextProfile.conversionScore),
    sessionScore: cloneScores(nextProfile.sessionScore),
    comboScore: cloneComboScores(nextProfile.comboScore),
    behaviorCount: { ...nextProfile.behaviorCount },
    confidence: { ...nextProfile.confidence }
  }

  if (nextProfile.activeSessionId !== behaviorLog.sessionId) {
    nextProfile.sessionScore = createEmptyDimensionScores()
    nextProfile.activeSessionId = behaviorLog.sessionId
  }

  const snapshot = behaviorLog.itemSnapshot || {}
  const isInterest = INTEREST_BEHAVIORS.includes(behaviorLog.behaviorType)
  const isConversion = CONVERSION_BEHAVIORS.includes(behaviorLog.behaviorType)

  if (!isInterest && !isConversion) return nextProfile

  let weight = Number(behaviorLog.weight ?? BEHAVIOR_WEIGHTS[behaviorLog.behaviorType] ?? 0)
  if (behaviorLog.behaviorType === 'remove_tryon' && weight < 0) {
    weight *= 0.5
  }

  const targetScores = isConversion ? nextProfile.conversionScore : nextProfile.interestScore
  applyTagWeight(targetScores, snapshot, weight, behaviorLog)
  applyTagWeight(nextProfile.sessionScore, snapshot, weight, behaviorLog)
  if (behaviorLog.behaviorType !== 'filter_click') {
    applyComboWeight(nextProfile.comboScore, snapshot, weight)
  }

  if (isInterest) nextProfile.behaviorCount.interest += 1
  if (isConversion) nextProfile.behaviorCount.conversion += 1
  nextProfile.behaviorCount.total += 1

  nextProfile.confidence = calculateConfidence(nextProfile)
  nextProfile.explorationRate = calculateExplorationRate(nextProfile.confidence.overall)
  nextProfile.updatedAt = eventTime.toISOString()
  return nextProfile
}

export function calculateConfidence(profile) {
  const nInterest = profile.behaviorCount.interest || 0
  const nConversion = profile.behaviorCount.conversion || 0
  const total = profile.behaviorCount.total || 0
  return {
    interest: round(nInterest / (nInterest + 15)),
    conversion: round(nConversion / (nConversion + 5)),
    overall: round(total / (total + 15))
  }
}

export function calculateExplorationRate(overallConfidence) {
  return round(0.3 * (1 - overallConfidence) + 0.1)
}

export function calculateTagProbabilities(profile) {
  const interestPref = dimensionProbabilities(profile.interestScore)
  const conversionPref = dimensionProbabilities(profile.conversionScore)
  const sessionPref = dimensionProbabilities(profile.sessionScore)
  const confInterest = profile.confidence.interest || 0
  const confConversion = profile.confidence.conversion || 0
  const hasConversion = (profile.behaviorCount.conversion || 0) > 0

  const mixed = {}
  Object.keys(DIMENSION_OPTIONS).forEach((dimension) => {
    const interest = interestPref[dimension]
    const conversion = conversionPref[dimension]
    mixed[dimension] = hasConversion
      ? normalizeRecord(
          Object.keys(interest).reduce((acc, key) => {
            acc[key] = 0.35 * confInterest * interest[key] + 0.65 * confConversion * conversion[key]
            return acc
          }, {})
        )
      : interest
  })

  return {
    seasonPref: mixed.season,
    stylePref: mixed.style,
    typePref: mixed.type,
    shapePref: mixed.shape,
    sessionPref
  }
}

export function buildProfileFromLogs(userId, logs) {
  return [...logs]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .reduce((profile, log) => updateUserProfile(profile, log), createEmptyUserProfile(userId))
}

function applyTagWeight(target, snapshot, weight, behaviorLog = {}) {
  if (
    behaviorLog.behaviorType === 'filter_click' &&
    behaviorLog.filterDimension &&
    behaviorLog.filterValue &&
    behaviorLog.filterValue !== FILTER_ALL &&
    target[behaviorLog.filterDimension]?.[behaviorLog.filterValue] !== undefined
  ) {
    target[behaviorLog.filterDimension][behaviorLog.filterValue] = clampFloor(
      (target[behaviorLog.filterDimension][behaviorLog.filterValue] || 0) + weight
    )
    return
  }

  Object.keys(DIMENSION_OPTIONS).forEach((dimension) => {
    const tag = snapshot[dimension]
    if (!tag || tag === FILTER_ALL || target[dimension][tag] === undefined) return
    target[dimension][tag] = clampFloor((target[dimension][tag] || 0) + weight)
  })
}

function applyComboWeight(target, snapshot, weight) {
  Object.entries(COMBO_DIMENSIONS).forEach(([comboKey, dimensions]) => {
    const tags = dimensions.map((name) => snapshot[name]).filter(Boolean)
    if (tags.length !== dimensions.length || tags.includes(FILTER_ALL)) return
    const joined = tags.join('|')
    target[comboKey][joined] = clampFloor((target[comboKey][joined] || 0) + weight)
  })
}

function dimensionProbabilities(scores) {
  return Object.keys(DIMENSION_OPTIONS).reduce((acc, dimension) => {
    acc[dimension] = probabilityFromScores(scores[dimension], DIMENSION_OPTIONS[dimension])
    return acc
  }, {})
}

function probabilityFromScores(scoreRecord, tags) {
  const safeScores = tags.map((tag) => Math.max(scoreRecord[tag] || 0, 0))
  const denominator = safeScores.reduce((sum, value) => sum + value, 0) + TAG_ALPHA * tags.length
  return tags.reduce((acc, tag, index) => {
    acc[tag] = round((safeScores[index] + TAG_ALPHA) / denominator)
    return acc
  }, {})
}

function normalizeRecord(record) {
  const values = Object.values(record)
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0)
  if (!total) {
    const keys = Object.keys(record)
    const uniform = 1 / Math.max(1, keys.length)
    return keys.reduce((acc, key) => {
      acc[key] = round(uniform)
      return acc
    }, {})
  }
  return Object.keys(record).reduce((acc, key) => {
    acc[key] = round(record[key] / total)
    return acc
  }, {})
}

function decayDimensionScores(scores, factor) {
  return Object.keys(scores).reduce((acc, dimension) => {
    acc[dimension] = Object.keys(scores[dimension]).reduce((tagMap, tag) => {
      tagMap[tag] = clampFloor(scores[dimension][tag] * factor)
      return tagMap
    }, {})
    return acc
  }, {})
}

function decayComboScores(scores, factor) {
  return Object.keys(scores).reduce((acc, comboKey) => {
    acc[comboKey] = Object.keys(scores[comboKey]).reduce((bucket, key) => {
      bucket[key] = clampFloor(scores[comboKey][key] * factor)
      return bucket
    }, {})
    return acc
  }, {})
}

/**
 * 从行为日志派生额外信号：超仿真试戴率、移除率、试戴成单率、价格带偏好
 * 这些信号是区分大学生 / 职场白领 / 宝妈的关键维度
 */
export function deriveExtraSignals(logs = []) {
  let addTryon = 0, normalTryon = 0, realisticTryon = 0
  let removeTryon = 0, confirmDo = 0
  let priceSum = 0, priceCount = 0

  for (const log of logs) {
    const t = log.behaviorType
    const price = log.itemSnapshot?.price || 0
    if (t === 'add_tryon')       addTryon++
    if (t === 'normal_tryon')    normalTryon++
    if (t === 'realistic_tryon') realisticTryon++
    if (t === 'remove_tryon')    removeTryon++
    if (t === 'confirm_do') {
      confirmDo++
      if (price > 0) { priceSum += price; priceCount++ }
    }
    if (t === 'want_do' && price > 0) { priceSum += price * 0.5; priceCount += 0.5 }
  }

  const tryonTotal = normalTryon + realisticTryon
  return {
    hyperRealRate:      tryonTotal > 0 ? realisticTryon / tryonTotal : 0,
    removeRate:         addTryon   > 0 ? removeTryon   / addTryon    : 0,
    tryonToConfirmRate: addTryon   > 0 ? confirmDo     / addTryon    : 0,
    avgPrice:           priceCount > 0 ? priceSum      / priceCount  : 0
  }
}

export function classifyUserCrowd(profile, preferenceBundle, extraSignals = {}) {
  const { stylePref = {}, typePref = {}, shapePref = {}, seasonPref = {} } = preferenceBundle
  const { explorationRate = 0.2, behaviorCount = {}, confidence = {} } = profile
  const totalBeh = behaviorCount.total || 0
  const conv  = behaviorCount.conversion || 0
  const interestBeh = behaviorCount.interest || 0
  const convRate = totalBeh > 0 ? conv / totalBeh : 0

  // 新增维度：从 logs 算出的行为比率 + 价格带
  const { hyperRealRate = 0, removeRate = 0, tryonToConfirmRate = 0, avgPrice = 0 } = extraSignals
  // 价格带分层：低(<110)=学生, 中(110-170)=职场, 高(>170)=宝妈/精品
  const priceLow  = avgPrice > 0 && avgPrice < 110 ? 1 : 0
  const priceMid  = avgPrice >= 110 && avgPrice <= 170 ? 1 : 0
  const priceHigh = avgPrice > 170 ? 1 : 0

  // ── 新增辅助指标 ──────────────────────────────────────────────
  // 1. 工艺复杂度倾向：视觉炫技系 vs 精致含蓄系 vs 极简系
  //    视觉系（学生/达人爱）：猫眼/贴饰/极光/晕染/波点
  //    精致系（宝妈/职场爱）：法式/金线/金箔/渐变
  //    极简系：纯色/冰透
  const visualCraft =
    (typePref['猫眼'] || 0) * 1.0 +
    (typePref['贴饰/珍珠'] || 0) * 0.9 +
    (typePref['极光'] || 0) * 0.9 +
    (typePref['晕染'] || 0) * 0.7 +
    (typePref['波点'] || 0) * 0.7 +
    (typePref['手绘'] || 0) * 0.8
  const refinedCraft =
    (typePref['法式'] || 0) * 1.0 +
    (typePref['金线'] || 0) * 0.9 +
    (typePref['金箔'] || 0) * 0.8 +
    (typePref['渐变'] || 0) * 0.6 +
    (typePref['撞色'] || 0) * 0.5
  const simpleCraft =
    (typePref['纯色'] || 0) * 1.0 +
    (typePref['冰透'] || 0) * 0.9

  // 2. 决策效率：confirm / (interest + confirm)，越高越果断（宝妈职场）
  const decisionEfficiency = (interestBeh + conv) > 0 ? conv / (interestBeh + conv) : 0

  // 3. 忠诚度信号：confirm 次数分层
  const loyaltyTier = conv >= 10 ? 1.0 : conv >= 5 ? 0.6 : conv >= 2 ? 0.3 : 0

  // 4. 甲型功能倾向
  //    实用型（短甲/穿戴甲）偏学生/职场；打理型（延长甲）偏宝妈/时尚
  const practicalShape = (shapePref['短甲'] || 0) + (shapePref['穿戴甲'] || 0)
  const fashionShape   = (shapePref['延长甲'] || 0)

  // 5. 季节多样性：偏好均匀分布 → 全年稳定（宝妈/职场）；
  //                集中在夏季 → 年轻/流行驱动（学生）
  const summerBias = (seasonPref['夏日'] || 0) - 0.33   // 超过均值则偏夏
  const seasonFocus = Math.max(...Object.values(seasonPref).map(v => v || 0), 0)

  // ── 人群评分（仅三类）────────────────────────────────────────
  const crowds = [
    {
      key: 'career',
      label: '职场女性',
      desc: '通勤 / 高级感，短甲实用，果断成单',
      color: '#c97a4e',
      score:
        (stylePref['高级感'] || 0) * 0.50 +
        (stylePref['优雅']   || 0) * 0.30 +
        (stylePref['通勤']   || 0) * 0.30 +
        (stylePref['极简']   || 0) * 0.15 +
        practicalShape * 0.30 +
        refinedCraft   * 0.25 +
        simpleCraft    * 0.20 +
        decisionEfficiency * 0.35 +
        (explorationRate < 0.15 ? 0.15 : 0) +
        priceMid * 0.25 +
        tryonToConfirmRate * 0.30 +
        (removeRate < 0.10 ? 0.15 : 0) +
        hyperRealRate * 0.10 +
        loyaltyTier * 0.15
    },
    {
      key: 'mom',
      label: '宝妈',
      desc: '精致工艺 / 延长甲，稳定复购，在意效果',
      color: '#e87899',
      score:
        (stylePref['温柔感'] || 0) * 0.45 +
        (stylePref['优雅']   || 0) * 0.30 +
        (stylePref['甜美']   || 0) * 0.10 +
        refinedCraft * 0.50 +
        fashionShape * 0.45 +
        decisionEfficiency * 0.25 +
        loyaltyTier  * 0.30 +
        (explorationRate < 0.18 ? 0.20 : 0) +
        ((confidence.overall || 0) > 0.7 ? 0.10 : 0) +
        (visualCraft < 0.30 ? 0.10 : -0.08) +
        priceHigh * 0.30 +
        hyperRealRate * 0.25 +
        (removeRate < 0.08 ? 0.15 : 0)
    },
    {
      key: 'student',
      label: '大学生',
      desc: '视觉系工艺 / 短甲，探索多成单少，价格敏感',
      color: '#4ab8b0',
      score:
        (stylePref['甜美'] || 0) * 0.35 +
        (stylePref['少女'] || 0) * 0.40 +
        (stylePref['清透'] || 0) * 0.20 +
        (stylePref['ins风']|| 0) * 0.25 +
        visualCraft * 0.45 +
        practicalShape * 0.20 +
        (fashionShape < 0.15 ? 0.10 : -0.10) +
        (explorationRate > 0.20 ? 0.35 : explorationRate > 0.15 ? 0.15 : 0) +
        (convRate < 0.15 ? 0.20 : 0) +
        (decisionEfficiency < 0.15 ? 0.20 : 0) +
        (summerBias > 0 ? 0.10 : 0) +
        (loyaltyTier < 0.30 ? 0.15 : 0) +
        priceLow * 0.35 +
        removeRate * 0.30 +
        (tryonToConfirmRate < 0.12 ? 0.20 : 0) +
        (hyperRealRate < 0.30 ? 0.10 : 0)
    }
  ]

  const total = crowds.reduce((sum, c) => sum + Math.max(c.score, 0.001), 0)
  return crowds
    .map(c => ({ ...c, pct: Math.round(Math.max(c.score, 0.001) / total * 100) }))
    .sort((a, b) => b.pct - a.pct)
}

function cloneComboScores(scores) {
  return Object.keys(scores).reduce((acc, comboKey) => {
    acc[comboKey] = { ...scores[comboKey] }
    return acc
  }, {})
}

function clampFloor(value) {
  return Math.max(SCORE_FLOOR, round(value))
}

function round(value) {
  return Math.round(Number(value || 0) * 10000) / 10000
}
