import type { RiskLevel } from './atomic-operations'
import type { ToolPlan } from './tool-planner'
import { findStyle, metricSummary, mockFeedSlots, mockStyles, writeState } from './mock-data'

export type FeedStrategyType =
  | 'hot_conversion'
  | 'stable_conversion'
  | 'potential_activation'
  | 'style_diversity'
  | 'scroll_attraction'
  | 'new_style_test'
  | 'potential_extension'
  | 'long_tail_diversity'

export type FeedSlotRule = {
  slot: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8'
  slotName: string
  goal: string
  prefer: string[]
  avoid: string[]
  metrics: string[]
}

export type FeedMixSlotRecommendation = {
  slot: FeedSlotRule['slot']
  slotName: string
  styleId: string
  styleName: string
  reason: string
  strategyType: FeedStrategyType
  metricsUsed: Record<string, any>
  avoidReasonChecked: string[]
  visibleType: 'full_visible' | 'half_visible'
  position: number
  slotId: string
}

export type FeedMixRecommendation = {
  slots: FeedMixSlotRecommendation[]
  diversityScore: number
  riskNotes: string[]
  expectedImpact: string[]
}

export type OperationPreview = {
  approvalRequired: boolean
  secondConfirmRequired?: boolean
  operationName: string
  riskLevel: RiskLevel
  title: string
  summary: string
  targets: Array<{
    targetType: 'style' | 'section' | 'feed' | 'config'
    targetId: string
    targetName?: string
  }>
  before: any
  after: any
  reasons: string[]
  impact: string[]
  rollbackSupported: boolean
  confirmText?: string
}

export const feedSlotRules: FeedSlotRule[] = [
  {
    slot: 'P1',
    slotName: '主爆款位',
    goal: '快速吸引和快速成交',
    prefer: ['HotUp', 'high_hot_score', 'high_confirm_count', 'high_confirm_rate'],
    avoid: ['Untested', 'ColdDown', 'low_sample', 'new_style'],
    metrics: ['click_rate', 'tryon_rate', 'confirm_count', 'confirm_rate']
  },
  {
    slot: 'P2',
    slotName: '稳转化位',
    goal: '保证首屏成交稳定性',
    prefer: ['Stable', 'high_want_rate', 'high_confirm_rate', 'promoted_style'],
    avoid: ['high_tryon_low_confirm', 'ColdDown'],
    metrics: ['want_rate', 'confirm_rate', 'promoted_hit_rate']
  },
  {
    slot: 'P3',
    slotName: '潜力激活位',
    goal: '给低曝光高转化款更多展示机会',
    prefer: ['Potential', 'low_exposure_high_intent', 'low_exposure_high_confirm'],
    avoid: ['high_exposure_low_conversion', 'ColdDown'],
    metrics: ['intent_rate_after_exposure', 'confirm_rate_after_exposure']
  },
  {
    slot: 'P4',
    slotName: '首屏风格补位',
    goal: '避免首屏 4 款风格同质化',
    prefer: ['style_diversity', 'different_color', 'different_craft', 'different_style'],
    avoid: ['duplicate_color', 'duplicate_craft', 'duplicate_style'],
    metrics: ['click_rate', 'tryon_rate', 'feed_diversity_score']
  },
  {
    slot: 'P5',
    slotName: '下滑吸引位',
    goal: '通过半露出视觉吸引用户继续下滑',
    prefer: ['visual_strong', 'cat_eye', 'bright_color', 'handpaint', 'festival_style'],
    avoid: ['weak_cover', 'low_visual_impact'],
    metrics: ['scroll_continue_rate', 'half_to_full_impression_rate', 'click_rate']
  },
  {
    slot: 'P6',
    slotName: '新品测试位',
    goal: '给新款和样本不足款基础曝光',
    prefer: ['Untested', 'new_style', 'complete_material', 'review_passed'],
    avoid: ['incomplete_image', 'incomplete_price', 'unmakeable'],
    metrics: ['initial_click_rate', 'initial_tryon_rate', 'initial_intent_rate']
  },
  {
    slot: 'P7',
    slotName: '潜力扩展位',
    goal: '继续测试低曝光高转化候补款',
    prefer: ['Potential', 'low_exposure_high_want', 'low_exposure_high_tryon'],
    avoid: ['failed_multiple_tests', 'ColdDown'],
    metrics: ['test_conversion_rate', 'intent_rate', 'confirm_rate']
  },
  {
    slot: 'P8',
    slotName: '多样性兜底位',
    goal: '覆盖小众偏好，保证推荐流丰富度',
    prefer: ['long_tail_style', 'different_from_previous_slots', 'niche_but_quality'],
    avoid: ['duplicate_with_previous_slots', 'ColdDown'],
    metrics: ['long_tail_click_rate', 'niche_intent_rate', 'diversity_score']
  }
]

function coldCandidates(plan: ToolPlan) {
  const protectedText = (plan.objects.protectedConditions || []).join(' ')
  const candidates = writeState.styles.filter((style) => {
    if (style.status !== 'published') return false
    if (style.metrics.trendLabel !== 'ColdDown' && style.metrics.coldRiskScore < 70) return false
    if (style.isPromoted) return false
    if (style.metrics.sampleStatus === 'low_sample') return false
    if (protectedText.includes('猫眼') && style.tags.craft.includes('猫眼')) return false
    return true
  })
  return candidates
}

export function buildOperationPreview(plan: ToolPlan, generated?: any): OperationPreview | null {
  const previewStep = [...plan.plan].reverse().find((item) => item.operation.startsWith('preview_'))
  if (!previewStep) return null
  const operationName = previewStep.operation

  if (operationName === 'preview_batch_unpublish') {
    const candidates = coldCandidates(plan)
    const protectedStyles = writeState.styles.filter((style) => {
      const protectedText = (plan.objects.protectedConditions || []).join(' ')
      return style.isPromoted || (protectedText.includes('猫眼') && style.tags.craft.includes('猫眼')) || style.metrics.sampleStatus === 'low_sample'
    })
    return {
      approvalRequired: true,
      secondConfirmRequired: true,
      operationName,
      riskLevel: 'critical',
      title: `批量下架预览：${candidates.length} 个弱势款`,
      summary: '仅生成下架预览，不会物理删除商品。执行后款式状态改为 unpublished，可恢复。',
      targets: candidates.map((style) => ({ targetType: 'style', targetId: style.id, targetName: style.name })),
      before: candidates.map((style) => ({
        id: style.id,
        name: style.name,
        status: style.status,
        metrics: metricSummary(style),
        currentTags: style.tags
      })),
      after: candidates.map((style) => ({ id: style.id, name: style.name, status: 'unpublished' })),
      reasons: candidates.map((style) => `${style.name}：近 7 日 cold_risk_score ${style.metrics.coldRiskScore}，trend_label=${style.metrics.trendLabel}，确认 ${style.metrics.confirm}。`),
      impact: [
        `影响 ${candidates.length} 个已上架款式，不影响被保护款。`,
        `被排除保护款：${protectedStyles.map((style) => style.name).join('、') || '无'}`,
        '用户端不再展示这些款式，但保留历史试戴、我想做、订单数据。'
      ],
      rollbackSupported: true,
      confirmText: '确认执行'
    }
  }

  if (operationName === 'preview_update_description') {
    const style = findStyle(plan.objects.styleIds?.[0] || 'style-gradient-003')
    const nextDescription = generated?.description || `${style.description} 小红书风格改写：清透显手白，短甲也友好，适合想要日常但有细节的姐妹。`
    return {
      approvalRequired: true,
      operationName,
      riskLevel: 'medium',
      title: `修改介绍预览：${style.name}`,
      summary: '将商品介绍调整为更适合小红书种草的表达，执行前需要人工确认。',
      targets: [{ targetType: 'style', targetId: style.id, targetName: style.name }],
      before: { description: style.description },
      after: { description: nextDescription },
      reasons: ['突出显白、短甲友好、场景适配等用户关心点。', '不修改价格、状态和推荐位。'],
      impact: ['影响商品详情文案展示。', '不影响历史数据和当前推荐排序。'],
      rollbackSupported: true
    }
  }

  if (operationName === 'preview_update_tags') {
    const style = findStyle(String(previewStep.params.styleId || plan.objects.styleIds?.[0] || ''))
    const nextTags = previewStep.params.tags || generated?.tags || style.tags
    return {
      approvalRequired: true,
      operationName,
      riskLevel: 'medium',
      title: `修改标签预览：${style.name}`,
      summary: '更新款式标签会影响筛选、推荐和偏好画像，执行前需要确认。',
      targets: [{ targetType: 'style', targetId: style.id, targetName: style.name }],
      before: { tags: style.tags },
      after: { tags: nextTags },
      reasons: ['用户要求优化或调整标签。', '标签会参与推荐和搜索过滤。'],
      impact: ['影响前端筛选命中。', '影响推荐系统标签画像。'],
      rollbackSupported: true
    }
  }

  if (operationName === 'preview_update_cover_image') {
    const style = findStyle(String(previewStep.params.styleId || plan.objects.styleIds?.[0] || ''))
    const nextCoverImage = previewStep.params.coverImage || previewStep.params.coverImageUrl || style.coverImage
    return {
      approvalRequired: true,
      operationName,
      riskLevel: 'medium',
      title: `修改封面预览：${style.name}`,
      summary: '更新封面会影响曝光点击率，执行前需要确认。',
      targets: [{ targetType: 'style', targetId: style.id, targetName: style.name }],
      before: { coverImage: style.coverImage },
      after: { coverImage: nextCoverImage },
      reasons: ['用户要求更换主图或封面。', `当前点击率 ${style.metrics.exposure ? Math.round((style.metrics.view / style.metrics.exposure) * 1000) / 10 : 0}%。`],
      impact: ['影响款式卡片、详情页和推荐位展示。'],
      rollbackSupported: true
    }
  }

  if (operationName === 'preview_unpublish_style') {
    const styleId = String(previewStep.params.styleId || plan.objects.styleIds?.[0] || '')
    const style = findStyle(styleId)
    return {
      approvalRequired: true,
      secondConfirmRequired: false,
      operationName,
      riskLevel: 'high',
      title: `单款下架预览：${style.name}`,
      summary: '该操作只会把款式状态改为 unpublished，不会物理删除商品，历史试戴、意向和订单数据会保留。',
      targets: [{ targetType: 'style', targetId: style.id, targetName: style.name }],
      before: {
        id: style.id,
        styleCode: style.styleCode,
        name: style.name,
        status: style.status,
        listedAt: style.listedAt,
        metrics: metricSummary(style)
      },
      after: {
        id: style.id,
        styleCode: style.styleCode,
        name: style.name,
        status: 'unpublished',
        unpublishedAt: new Date().toISOString().slice(0, 10)
      },
      reasons: [
        `当前状态：${style.status}。`,
        `近 7 日曝光 ${style.metrics.exposure}，试戴 ${style.metrics.tryonSuccess}，我想做 ${style.metrics.want}，确认 ${style.metrics.confirm}。`,
        `trend_label=${style.metrics.trendLabel}，cold_risk_score=${style.metrics.coldRiskScore}。`
      ],
      impact: [
        '用户端不再展示该款式。',
        '不会删除历史行为数据。',
        '后续可通过恢复上架操作改回 published。'
      ],
      rollbackSupported: true
    }
  }

  if (operationName === 'preview_restore_style') {
    const styleId = String(previewStep.params.styleId || plan.objects.styleIds?.[0] || '')
    const style = findStyle(styleId)
    return {
      approvalRequired: true,
      secondConfirmRequired: false,
      operationName,
      riskLevel: 'high',
      title: `恢复上架预览：${style.name}`,
      summary: '该操作会把款式恢复为 published，让用户端重新可见。执行前需要人工确认。',
      targets: [{ targetType: 'style', targetId: style.id, targetName: style.name }],
      before: {
        id: style.id,
        styleCode: style.styleCode,
        name: style.name,
        status: style.status,
        unpublishedAt: style.unpublishedAt
      },
      after: {
        id: style.id,
        styleCode: style.styleCode,
        name: style.name,
        status: 'published',
        listedAt: style.listedAt || new Date().toISOString().slice(0, 10)
      },
      reasons: [
        `用户要求恢复上架 ${style.styleCode || style.id}。`,
        `恢复后可重新进入款式库和推荐候选池。`,
        `执行仍需保留 before/after 快照，方便回滚。`
      ],
      impact: [
        '用户端可重新看到该款式。',
        '推荐位不会自动变化，除非另行执行推荐位替换。',
        '可回滚为恢复前状态。'
      ],
      rollbackSupported: true
    }
  }

  if (operationName === 'preview_price_change') {
    const style = findStyle(String(previewStep.params.styleId || plan.objects.styleIds?.[0] || ''))
    const nextPrice = Number(previewStep.params.price || previewStep.params.nextPrice || style.price)
    return {
      approvalRequired: true,
      secondConfirmRequired: true,
      operationName,
      riskLevel: 'critical',
      title: `改价预览：${style.name}`,
      summary: '价格修改属于极高风险操作，需要二次确认。',
      targets: [{ targetType: 'style', targetId: style.id, targetName: style.name }],
      before: { price: style.price },
      after: { price: nextPrice },
      reasons: ['用户要求调整价格。', '价格会影响成交和客单价统计。'],
      impact: ['影响用户端展示价格。', '影响后续订单金额和 AOV。'],
      rollbackSupported: true,
      confirmText: '确认执行'
    }
  }

  if (operationName === 'preview_archive_style') {
    const style = findStyle(String(previewStep.params.styleId || plan.objects.styleIds?.[0] || ''))
    return {
      approvalRequired: true,
      secondConfirmRequired: true,
      operationName,
      riskLevel: 'critical',
      title: `归档预览：${style.name}`,
      summary: '归档款式属于极高风险操作，不会物理删除，但会退出常规运营池。',
      targets: [{ targetType: 'style', targetId: style.id, targetName: style.name }],
      before: { status: style.status },
      after: { status: 'archived' },
      reasons: ['用户要求归档或删除；删除已按安全规则转为归档/下架。'],
      impact: ['用户端不展示。', '不进入推荐候选。', '保留历史数据。'],
      rollbackSupported: true,
      confirmText: '确认执行'
    }
  }

  if (operationName === 'preview_feed_mix_change') {
    const recommendation = generated?.feedMix || buildFeedMix()
    const slots = recommendation.slots
    return {
      approvalRequired: false,
      operationName,
      riskLevel: 'medium',
      title: '首页 P1-P8 推荐策略预览',
      summary: '这是基于 8 个坑位职责生成的推荐策略建议。你可以先确认策略方向，再生成替换确认单，或者继续自定义调整。',
      targets: [{ targetType: 'feed', targetId: 'home_feed', targetName: '首页推荐流' }],
      before: writeState.feedSlots,
      after: recommendation,
      reasons: slots.map((slot) => `${slot.slot} ${slot.slotName}：${slot.styleName}，${slot.reason}`),
      impact: [
        'P1-P4 负责首屏成交、潜力激活和首屏差异化。',
        'P5-P8 负责下滑吸引、新品测试、潜力扩展和长尾多样性。',
        '策略建议不会自动改推荐位；如需落地，先生成替换确认单。'
      ],
      rollbackSupported: true
    }
  }

  if (operationName === 'preview_replace_single_slot') {
    const position = Number(previewStep.params.position || plan.objects.filters?.targetPosition || 1)
    const styleId = String(previewStep.params.styleId || plan.objects.styleIds?.[0] || '')
    const targetStyle = writeState.styles.find((style) => style.id === styleId || style.styleCode === styleId) || writeState.styles[0]
    const currentSlot = writeState.feedSlots.find((slot) => slot.position === position) || writeState.feedSlots[0]
    return {
      approvalRequired: true,
      operationName,
      riskLevel: 'high',
      title: `推荐位替换预览：位置 ${position}`,
      summary: `把 ${targetStyle.name}${targetStyle.styleCode ? `（${targetStyle.styleCode}）` : ''} 放到首页推荐位 ${position}。不直接执行，确认后才会替换。`,
      targets: [
        { targetType: 'section', targetId: 'home_feed', targetName: '首页推荐流' },
        { targetType: 'style', targetId: targetStyle.id, targetName: targetStyle.name }
      ],
      before: {
        position,
        slotId: currentSlot.slotId,
        styleId: currentSlot.styleId,
        styleName: currentSlot.styleName,
        visibleType: currentSlot.visibleType
      },
      after: {
        position,
        slotId: currentSlot.slotId,
        styleId: targetStyle.id,
        styleCode: targetStyle.styleCode,
        styleName: targetStyle.name,
        visibleType: position <= 4 ? 'full_visible' : 'half_visible'
      },
      reasons: [
        `用户明确指定 ${targetStyle.styleCode || targetStyle.id} 放到位置 ${position}，用户指定目标优先。`,
        `目标款 trend_label=${targetStyle.metrics.trendLabel}，hot_score=${targetStyle.metrics.hotScore}，确认 ${targetStyle.metrics.confirm}。`,
        `当前位置原款为 ${currentSlot.styleName}，替换会影响${position <= 4 ? '用户端首屏完整露出' : '半露出推荐位'}。`
      ],
      impact: [
        `位置 ${position} 将从 ${currentSlot.styleName} 替换为 ${targetStyle.name}。`,
        position <= 4 ? '影响用户端首屏完整露出。' : '影响用户端半露出探索位。',
        '替换记录 before/after，可回滚。'
      ],
      rollbackSupported: true
    }
  }

  if (operationName === 'preview_replace_section') {
    const replacements = buildReplacementPairs(previewStep.params?.slots)
    return {
      approvalRequired: true,
      secondConfirmRequired: true,
      operationName,
      riskLevel: 'critical',
      title: '推荐区块替换预览',
      summary: '推荐位大规模替换属于极高风险，必须二次确认。',
      targets: [{ targetType: 'section', targetId: 'home_feed', targetName: '首页推荐流' }],
      before: replacements.map((item) => item.from),
      after: replacements.map((item) => item.to),
      reasons: replacements.map((item) => `${item.from.styleName} -> ${item.to.styleName}：${item.reason}`),
      impact: ['会影响用户端首屏或半露出推荐。', '替换后将保留 before/after 快照，可回滚。'],
      rollbackSupported: true,
      confirmText: '确认执行'
    }
  }

  if (operationName === 'preview_publish_style') {
    const candidate = mockStyles.find((style) => style.crawled && style.makeable) || mockStyles.find((style) => style.crawled)!
    return {
      approvalRequired: true,
      operationName,
      riskLevel: 'high',
      title: `上架预览：${candidate.name}`,
      summary: '爬取新款上架前资料完整度检查。',
      targets: [{ targetType: 'style', targetId: candidate.id, targetName: candidate.name }],
      before: { status: candidate.status, crawled: candidate.crawled },
      after: { status: 'published', title: generated?.title || candidate.name, description: generated?.description || candidate.description, tags: candidate.tags },
      reasons: [
        `图片是否完整：${candidate.coverImage ? '是' : '否'}`,
        `标题是否完整：${candidate.name ? '是' : '否'}`,
        `价格是否完整：${candidate.price ? '是' : '否'}`,
        `标签是否完整：${candidate.tags.color.length && candidate.tags.style.length ? '是' : '否'}`,
        `门店是否可制作：${candidate.makeable ? '是' : '否'}`
      ],
      impact: ['上架后进入款式库，可被推荐系统小流量测试。'],
      rollbackSupported: true
    }
  }

  return null
}

function slotMetrics(style: (typeof writeState.styles)[number], extra: Record<string, any> = {}) {
  return {
    trendLabel: style.metrics.trendLabel,
    hotScore: style.metrics.hotScore,
    confirmRate: style.metrics.exposure ? Number((style.metrics.confirm / style.metrics.exposure).toFixed(3)) : 0,
    wantRate: style.metrics.tryonSuccess ? Number((style.metrics.want / style.metrics.tryonSuccess).toFixed(3)) : 0,
    tryonRate: style.metrics.exposure ? Number((style.metrics.tryonSuccess / style.metrics.exposure).toFixed(3)) : 0,
    exposure: style.metrics.exposure,
    confirm: style.metrics.confirm,
    want: style.metrics.want,
    sampleStatus: style.metrics.sampleStatus,
    ...extra
  }
}

function buildAvoidChecks(style: (typeof writeState.styles)[number], usedStyles: Array<(typeof writeState.styles)[number]> = []) {
  const usedColors = new Set(usedStyles.flatMap((item) => item.tags.color))
  const usedCrafts = new Set(usedStyles.flatMap((item) => item.tags.craft))
  const usedStylesTag = new Set(usedStyles.flatMap((item) => item.tags.style))
  return [
    style.metrics.sampleStatus === 'low_sample' ? 'low_sample' : 'sample_ok',
    style.metrics.trendLabel === 'ColdDown' ? 'ColdDown' : 'not_cold',
    style.tags.color.some((color) => usedColors.has(color)) ? 'duplicate_color' : 'different_color',
    style.tags.craft.some((craft) => usedCrafts.has(craft)) ? 'duplicate_craft' : 'different_craft',
    style.tags.style.some((tag) => usedStylesTag.has(tag)) ? 'duplicate_style' : 'different_style',
    style.makeable ? 'makeable' : 'unmakeable'
  ]
}

function pickFirst(
  pool: Array<(typeof writeState.styles)[number]>,
  used: Set<string>,
  fallback?: Array<(typeof writeState.styles)[number]>
) {
  const source = [...pool, ...(fallback || writeState.styles)]
  const style = source.find((item) => item.status === 'published' && item.makeable && !used.has(item.id))
  if (style) {
    used.add(style.id)
    return style
  }
  const unusedFallback = writeState.styles.find((item) => item.status === 'published' && item.makeable && !used.has(item.id))
  if (unusedFallback) {
    used.add(unusedFallback.id)
    return unusedFallback
  }
  return writeState.styles.find((item) => item.status === 'published' && item.makeable) || writeState.styles[0]
}

function scoreDiversity(recommendations: FeedMixSlotRecommendation[]) {
  const colors = new Set<string>()
  const crafts = new Set<string>()
  const styles = new Set<string>()
  recommendations.forEach((slot) => {
    const style = findStyle(slot.styleId)
    style.tags.color.forEach((value) => colors.add(value))
    style.tags.craft.forEach((value) => crafts.add(value))
    style.tags.style.forEach((value) => styles.add(value))
  })
  return Math.min(100, colors.size * 8 + crafts.size * 7 + styles.size * 6)
}

export function normalizeRecommendedFeedSlots(inputSlots?: Array<any>) {
  const source = Array.isArray(inputSlots) && inputSlots.length ? inputSlots : buildFeedMix().slots
  return source.map((slot: FeedMixSlotRecommendation) => {
    const style = findStyle(slot.styleId)
    return {
      slotId: slot.slotId || `new-home-${slot.position}`,
      sectionId: 'home_feed',
      position: slot.position,
      visibleType: slot.visibleType,
      styleId: style.id,
      styleName: style.name,
      exposure: style.metrics.exposure,
      click: style.metrics.view,
      tryon: style.metrics.tryonSuccess,
      want: style.metrics.want,
      confirm: style.metrics.confirm,
      conversionRate: style.metrics.exposure ? Number((style.metrics.confirm / style.metrics.exposure).toFixed(4)) : 0,
      reason: `${slot.slot} ${slot.slotName} · ${slot.reason}`
    }
  })
}

export function buildFeedMix(): FeedMixRecommendation {
  const published = writeState.styles.filter((style) => style.status === 'published' && style.makeable)
  const hot = published.filter((style) => style.metrics.trendLabel === 'HotUp').sort((a, b) => b.metrics.hotScore - a.metrics.hotScore)
  const stable = published.filter((style) => style.metrics.trendLabel === 'Stable').sort((a, b) => b.metrics.confirm - a.metrics.confirm)
  const potential = published
    .filter((style) => style.metrics.trendLabel === 'Potential' || (style.metrics.exposure < 700 && style.metrics.want >= 20))
    .sort((a, b) => (b.metrics.want / Math.max(b.metrics.tryonSuccess, 1)) - (a.metrics.want / Math.max(a.metrics.tryonSuccess, 1)))
  const untested = published.filter((style) => style.metrics.trendLabel === 'Untested' || style.metrics.sampleStatus === 'low_sample')
  const visualStrong = published.filter((style) => ['猫眼', '手绘'].some((tag) => style.tags.craft.includes(tag)) || ['绿色', '荧光黄', '银色'].some((color) => style.tags.color.includes(color)))
  const longTail = published.filter((style) => ['酷飒', '复古', '法式'].some((tag) => style.tags.style.includes(tag)) || style.tags.length.includes('长甲'))
  const used = new Set<string>()
  const recommendations: FeedMixSlotRecommendation[] = []

  const pushSlot = (
    rule: FeedSlotRule,
    style: (typeof writeState.styles)[number],
    strategyType: FeedStrategyType,
    reason: string,
    extraMetrics: Record<string, any> = {}
  ) => {
    recommendations.push({
      slot: rule.slot,
      slotName: rule.slotName,
      styleId: style.id,
      styleName: style.name,
      reason,
      strategyType,
      metricsUsed: slotMetrics(style, extraMetrics),
      avoidReasonChecked: buildAvoidChecks(style, recommendations.map((item) => findStyle(item.styleId))),
      visibleType: recommendations.length < 4 ? 'full_visible' : 'half_visible',
      position: recommendations.length + 1,
      slotId: `new-home-${recommendations.length + 1}`
    })
  }

  const p1 = pickFirst(hot, used, stable)
  pushSlot(feedSlotRules[0], p1, 'hot_conversion', 'P1 抢注意力和成交，优先高热度高确认款。')

  const p2 = pickFirst(stable.filter((style) => style.metrics.want >= 40), used, hot)
  pushSlot(feedSlotRules[1], p2, 'stable_conversion', 'P2 稳住转化，优先高想要率和高确认率款。')

  const p3 = pickFirst(potential, used, stable)
  pushSlot(feedSlotRules[2], p3, 'potential_activation', 'P3 激活低曝光高转化潜力款。')

  const p4Pool = published.filter((style) => !used.has(style.id)).sort((a, b) => {
    const aDiff = buildAvoidChecks(a, recommendations.map((item) => findStyle(item.styleId))).filter((item) => item.startsWith('different_')).length
    const bDiff = buildAvoidChecks(b, recommendations.map((item) => findStyle(item.styleId))).filter((item) => item.startsWith('different_')).length
    return bDiff - aDiff
  })
  const p4 = pickFirst(p4Pool, used)
  pushSlot(feedSlotRules[3], p4, 'style_diversity', 'P4 给首屏做风格补位，避免前 3 款过于相似。')

  const p5 = pickFirst(visualStrong.filter((style) => style.metrics.hotScore >= 55), used, hot)
  pushSlot(feedSlotRules[4], p5, 'scroll_attraction', 'P5 用视觉强冲击款吸引用户继续下滑。', {
    visualTags: [...p5.tags.craft, ...p5.tags.color].slice(0, 3)
  })

  const p6 = pickFirst(untested.filter((style) => style.coverImage && style.price && style.makeable), used, potential)
  pushSlot(feedSlotRules[5], p6, 'new_style_test', 'P6 给新品和样本不足款基础曝光。', {
    materialComplete: Boolean(p6.coverImage && p6.price && p6.description)
  })

  const p7 = pickFirst(potential.filter((style) => style.id !== p3.id), used, published.filter((style) => style.metrics.exposure < 600))
  pushSlot(feedSlotRules[6], p7, 'potential_extension', 'P7 扩大潜力款测试池。')

  const p8Pool = longTail.concat(published.filter((style) => !used.has(style.id)))
  const p8 = pickFirst(p8Pool, used)
  pushSlot(feedSlotRules[7], p8, 'long_tail_diversity', 'P8 用长尾和差异化风格兜底，覆盖小众偏好。')

  const diversityScore = scoreDiversity(recommendations)
  const uniqueCount = new Set(recommendations.map((slot) => slot.styleId)).size
  const riskNotes = [
    diversityScore < 70 ? '当前方案仍有一定风格重复风险。' : '当前方案风格分布较均衡。',
    recommendations.some((slot) => slot.metricsUsed.sampleStatus === 'low_sample') ? '包含样本不足款，需关注测试期指标。' : '本轮方案样本状态整体稳定。',
    recommendations.some((slot) => slot.strategyType === 'new_style_test') ? 'P6 作为新品测试位，需观察基础曝光后的点击和试戴。' : '本轮未启用明显新品测试位。',
    uniqueCount < 8 ? `当前可直接上架可制作款不足 8 个，存在 ${8 - uniqueCount} 个坑位复用风险。` : '8 个坑位均已使用不同款式。'
  ]
  const expectedImpact = [
    'P1-P2 负责首屏成交承接。',
    'P3-P4 负责潜力激活和首屏多样性。',
    'P5-P8 负责下滑吸引、新品测试、潜力扩展和长尾覆盖。'
  ]

  return { slots: recommendations, diversityScore, riskNotes, expectedImpact }
}

function buildReplacementPairs(inputSlots?: Array<any>) {
  if (Array.isArray(inputSlots) && inputSlots.length) {
    const replacements = normalizeRecommendedFeedSlots(inputSlots)
    return writeState.feedSlots
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((from, index) => ({
        from,
        to: replacements[index] || from,
        reason: `按策略方案替换 ${index + 1} 号位，执行 ${inputSlots[index]?.slot || `P${index + 1}`} 的坑位职责。`
      }))
  }
  const cold = writeState.feedSlots.filter((slot) => {
    const style = writeState.styles.find((item) => item.id === slot.styleId)
    return style?.metrics.trendLabel === 'ColdDown'
  })
  const replacements = normalizeRecommendedFeedSlots(inputSlots)
  return (cold.length ? cold : [mockFeedSlots[4]]).map((from, index) => ({
    from,
    to: replacements[index + 2] || replacements[index],
    reason: '原款式冷门风险较高，新款式具备更高 hot_score 或低曝光高意向特征。'
  }))
}
