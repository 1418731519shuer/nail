import { mockNailItems } from '@/data/mockNailItems'
import { recordUserBehavior } from '@/services/userProfileService'

function createRng(seed = 42) {
  let state = seed >>> 0
  return function next() {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function countMatches(item, rules) {
  return Object.entries(rules).reduce((sum, [key, values]) => sum + (values.includes(item[key]) ? 1 : 0), 0)
}

function timestampOffset(baseDate, dayOffset, minuteOffset) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + dayOffset)
  date.setMinutes(date.getMinutes() + minuteOffset)
  return date.toISOString()
}

function pushEvent(logs, userId, item, behaviorType, extras) {
  logs.push(recordUserBehavior(userId, item, behaviorType, extras))
}

const strongPreference = {
  season: ['夏日'],
  style: ['高级感'],
  type: ['猫眼'],
  shape: ['短甲']
}

const secondaryPreference = {
  season: ['春日'],
  style: ['温柔感'],
  type: ['法式'],
  shape: ['延长甲']
}

const lowPreference = {
  type: ['钻饰'],
  shape: ['DIY']
}

export function generateMockBehaviorLogs(userId, items = mockNailItems) {
  const rng = createRng(20260604)
  const logs = []
  const baseDate = new Date('2026-05-12T10:00:00+08:00')

  items.forEach((item, index) => {
    const strongHits = countMatches(item, strongPreference)
    const secondaryHits = countMatches(item, secondaryPreference)
    const lowHits = countMatches(item, lowPreference)
    const isExplore = rng() > 0.72

    const rounds = strongHits >= 3 ? 3 : strongHits === 2 ? 2 : secondaryHits >= 2 ? 2 : 1

    for (let round = 0; round < rounds; round += 1) {
      const dayOffset = (index + round * 3) % 18
      const sessionId = `mock_session_${dayOffset}_${Math.floor(index / 2)}`
      const exposureTime = timestampOffset(baseDate, dayOffset, round * 12 + index)

      pushEvent(logs, userId, item, 'effective_exposure', {
        timestamp: exposureTime,
        sessionId,
        sourcePage: 'catalog',
        visibleRatio: 0.78,
        visibleDurationMs: 2100 + round * 300
      })

      if (lowHits >= 1 && rng() > 0.35) {
        if (rng() > 0.25) {
          pushEvent(logs, userId, item, 'quick_skip', {
            timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 1),
            sessionId,
            sourcePage: 'catalog'
          })
        }
        if (rng() > 0.7) {
          pushEvent(logs, userId, item, 'multi_exposure_no_click', {
            timestamp: timestampOffset(baseDate, dayOffset + 3, round * 7 + index + 2),
            sessionId: `mock_session_${dayOffset + 3}_${Math.floor(index / 2)}`,
            sourcePage: 'catalog'
          })
        }
        continue
      }

      if (strongHits >= 2 || secondaryHits >= 2 || isExplore) {
        pushEvent(logs, userId, item, 'view_detail', {
          timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 2),
          sessionId,
          sourcePage: 'detail'
        })
      }

      if (strongHits >= 2 || (secondaryHits >= 2 && rng() > 0.4) || (isExplore && rng() > 0.78)) {
        pushEvent(logs, userId, item, 'add_tryon', {
          timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 3),
          sessionId,
          sourcePage: 'detail'
        })
      }

      if (strongHits >= 3) {
        pushEvent(logs, userId, item, rng() > 0.45 ? 'realistic_tryon' : 'normal_tryon', {
          timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 4),
          sessionId,
          sourcePage: 'tryon'
        })
        if (rng() > 0.18) {
          pushEvent(logs, userId, item, 'want_do', {
            timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 5),
            sessionId,
            sourcePage: 'result'
          })
        }
        if (rng() > 0.42) {
          pushEvent(logs, userId, item, 'confirm_do', {
            timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 6),
            sessionId,
            sourcePage: 'want-list'
          })
        }
      } else if (strongHits === 2) {
        if (rng() > 0.35) {
          pushEvent(logs, userId, item, rng() > 0.55 ? 'normal_tryon' : 'realistic_tryon', {
            timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 4),
            sessionId,
            sourcePage: 'tryon'
          })
        }
        if (rng() > 0.58) {
          pushEvent(logs, userId, item, 'want_do', {
            timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 5),
            sessionId,
            sourcePage: 'result'
          })
        }
      } else if (secondaryHits >= 2) {
        if (rng() > 0.5) {
          pushEvent(logs, userId, item, 'normal_tryon', {
            timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 4),
            sessionId,
            sourcePage: 'tryon'
          })
        }
        if (rng() > 0.72) {
          pushEvent(logs, userId, item, 'want_do', {
            timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 5),
            sessionId,
            sourcePage: 'result'
          })
        }
      } else if (isExplore && rng() > 0.65) {
        pushEvent(logs, userId, item, 'view_detail', {
          timestamp: timestampOffset(baseDate, dayOffset, round * 12 + index + 4),
          sessionId,
          sourcePage: 'detail'
        })
      }
    }

    if (lowHits >= 1 && rng() > 0.62) {
      const dayOffset = (index % 10) + 4
      pushEvent(logs, userId, item, 'remove_tryon', {
        timestamp: timestampOffset(baseDate, dayOffset, index + 8),
        sessionId: `mock_session_${dayOffset}_${index}`,
        sourcePage: 'tryon-basket'
      })
    }
  })

  // Explicit filter intent logs, skipping "全部"
  ;[
    ['style', '高级感'],
    ['type', '猫眼'],
    ['shape', '短甲'],
    ['season', '夏日'],
    ['style', '温柔感']
  ].forEach(([dimension, value], idx) => {
    const item = items[idx % items.length]
      pushEvent(logs, userId, item, 'filter_click', {
        timestamp: timestampOffset(baseDate, 2 + idx, 6 + idx),
        sessionId: `mock_filter_${idx}`,
        sourcePage: 'filters',
        filterDimension: dimension,
        filterValue: value,
        itemSnapshot: {
          season: dimension === 'season' ? value : item.season,
          style: dimension === 'style' ? value : item.style,
        type: dimension === 'type' ? value : item.type,
        shape: dimension === 'shape' ? value : item.shape
      }
    })
  })

  return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}
