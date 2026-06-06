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
