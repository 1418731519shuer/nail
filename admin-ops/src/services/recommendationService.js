import { mockNailItems } from '@/data/mockNailItems'
import { generateMockBehaviorLogs } from '@/data/mockUserBehavior'
import {
  COMBO_DIMENSIONS,
  DEFAULT_FILTER,
  FILTER_ALL,
  matchFilter,
  MOCK_USER_ID
} from '@/types/recommendation'
import {
  buildProfileFromLogs,
  calculateTagProbabilities,
  createEmptyUserProfile
} from '@/services/userProfileService'

function normalizeMetric(value, maxValue) {
  if (!maxValue) return 0
  return Math.min(1, Math.max(0, value / maxValue))
}

function probabilityOfCombo(bucket, comboKey) {
  const values = Object.values(bucket).map((item) => Math.max(0, Number(item || 0)))
  const sum = values.reduce((acc, item) => acc + item, 0)
  const safe = Math.max(0, Number(bucket[comboKey] || 0))
  const denominator = sum + Math.max(1, Object.keys(bucket).length)
  return (safe + 1) / denominator
}

function sessionBoost(item, sessionPref) {
  return (
    0.1 * (sessionPref.season?.[item.season] || 0) +
    0.35 * (sessionPref.style?.[item.style] || 0) +
    0.3 * (sessionPref.type?.[item.type] || 0) +
    0.25 * (sessionPref.shape?.[item.shape] || 0)
  )
}

export function calculatePersonalScore(item, profile) {
  const { seasonPref, stylePref, typePref, shapePref, sessionPref } = calculateTagProbabilities(profile)

  const longTermScore =
    0.1 * (seasonPref[item.season] || 0) +
    0.35 * (stylePref[item.style] || 0) +
    0.3 * (typePref[item.type] || 0) +
    0.25 * (shapePref[item.shape] || 0)

  const sessionScore = sessionBoost(item, sessionPref)
  return round(0.7 * longTermScore + 0.3 * sessionScore)
}

export function calculateComboScore(item, profile) {
  const comboPairs = Object.entries(COMBO_DIMENSIONS).map(([comboKey, dimensions]) => {
    const key = dimensions.map((name) => item[name]).join('|')
    return probabilityOfCombo(profile.comboScore[comboKey] || {}, key)
  })
  return round(comboPairs.reduce((sum, value) => sum + value, 0) / comboPairs.length)
}

export function calculateBaseScore(item) {
  const exposure = Number(item.exposureCount || 0)
  const click = Number(item.clickCount || 0)
  const addTryon = Number(item.addTryonCount || 0)
  const want = Number(item.wantDoCount || 0)
  const confirm = Number(item.confirmDoCount || 0)
  const likes = Number(item.likes || 0)
  const rating = Number(item.rating || 0)

  const hotScore = round(
    0.35 * normalizeMetric(likes, 5000) +
      0.25 * normalizeMetric(exposure, 9000) +
      0.2 * normalizeMetric(click, 2200) +
      0.2 * normalizeMetric(addTryon, 1200)
  )

  const wantRate = click ? want / click : 0
  const confirmRate = want ? confirm / want : 0
  const itemConversionScore = round(0.55 * wantRate + 0.45 * confirmRate)

  const ageDays = Math.max(
    1,
    Math.round((Date.now() - new Date(item.createdAt || Date.now()).getTime()) / (24 * 60 * 60 * 1000))
  )
  const freshnessScore = round(Math.max(0.15, 1 - ageDays / 180))
  const qualityScore = round(0.7 * normalizeMetric(rating, 5) + 0.3 * normalizeMetric(likes, 5000))

  return round(
    0.35 * hotScore +
      0.35 * itemConversionScore +
      0.2 * freshnessScore +
      0.1 * qualityScore
  )
}

export function calculateFinalScore(item, profile) {
  const personalScore = calculatePersonalScore(item, profile)
  const comboScore = calculateComboScore(item, profile)
  const baseScore = calculateBaseScore(item)

  const comboDataCount = Object.values(profile.comboScore || {}).reduce(
    (sum, bucket) => sum + Object.keys(bucket || {}).length,
    0
  )
  const beta = Math.min(0.25, comboDataCount / (comboDataCount + 30))
  const personalScoreFinal = round((1 - beta) * personalScore + beta * comboScore)
  const finalScore = round((profile.confidence.overall || 0) * personalScoreFinal + (1 - (profile.confidence.overall || 0)) * baseScore)

  return {
    personalScore: round(personalScore),
    comboScore: round(comboScore),
    baseScore: round(baseScore),
    finalScore
  }
}

export function rankItemsForUser(items, profile, filter = DEFAULT_FILTER) {
  return items
    .filter((item) => matchFilter(item, filter))
    .map((item) => ({
      ...item,
      ...calculateFinalScore(item, profile)
    }))
    .sort((a, b) => b.finalScore - a.finalScore)
}

export function buildMockUserProfile() {
  const logs = generateMockBehaviorLogs(MOCK_USER_ID, mockNailItems)
  const profile = buildProfileFromLogs(MOCK_USER_ID, logs)
  const rankedItems = rankItemsForUser(mockNailItems, profile)
  return {
    userId: MOCK_USER_ID,
    profile,
    logs,
    rankedItems
  }
}

export function buildSummaryText(profile) {
  const { seasonPref, stylePref, typePref, shapePref } = calculateTagProbabilities(profile)
  const topSeason = topN(seasonPref, 2)
  const topStyle = topN(stylePref, 2)
  const topType = topN(typePref, 2)
  const topShape = topN(shapePref, 2)

  return `你最近更偏好：${topStyle[0]?.label || ''}、${topType[0]?.label || ''}、${topShape[0]?.label || ''}类款式，同时对${topSeason[1]?.label || topSeason[0]?.label || ''}和${topStyle[1]?.label || topStyle[0]?.label || ''}也有持续兴趣。`
}

export function topN(record, count = 2) {
  return Object.entries(record || {})
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count)
}

function round(value) {
  return Math.round(Number(value || 0) * 10000) / 10000
}
