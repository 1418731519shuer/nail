import { getAtomicOperation } from './atomic-operations'
import { checkRisk } from './risk-checker'
import { type AgentContext, planAtomicOperations, type ToolPlan } from './tool-planner'
import { type OperationPreview, buildFeedMix, buildOperationPreview, feedSlotRules } from './preview-builder'
import { type Approval, approveOperation, createApproval, getApprovalStatus, markApprovalExecuted, rejectOperation } from './approval-manager'
import { getOperationLog, getOperationLogs, getRecommendConfigHistory, getStyleChangeHistory, writeOperationLog } from './audit-logger'
import { aiDemandSignals, findExperiment, findOperator, findReport, findStyle, findTask, getCurrentOperator, getRecommendManagementRows, getStyleManagementRows, hydrateAgentState, metricSummary, mockFeedSlots, mockStyles, persistAgentState, storePreference, writeState } from './mock-data'

export type AgentExecutionResult = {
  plan: ToolPlan
  operationResults: Record<string, any>
  analysis: {
    title: string
    conclusion: string
    evidence: string[]
    actions: string[]
    sampleStatus: string
    nextStep: string
    reportSections?: Array<{ title: string; items: string[] }>
  }
  preview?: OperationPreview | null
  approval?: Approval | null
  auditLogs: ReturnType<typeof getOperationLogs>
}

const previewToWriteOperation: Record<string, string> = {
  preview_update_description: 'update_style_description',
  preview_update_tags: 'update_style_tags',
  preview_update_cover_image: 'update_style_cover_image',
  preview_price_change: 'update_style_price',
  preview_publish_style: 'publish_style',
  preview_unpublish_style: 'unpublish_style',
  preview_batch_unpublish: 'unpublish_style',
  preview_archive_style: 'archive_style',
  preview_restore_style: 'restore_style',
  preview_replace_single_slot: 'replace_single_slot',
  preview_replace_section: 'replace_section_styles',
  preview_replace_section_draft: 'save_recommend_config_draft',
  preview_feed_mix_change: 'publish_recommend_config'
}

function writeOperationName(previewOperationName: string) {
  return previewToWriteOperation[previewOperationName] || previewOperationName.replace('preview_', '')
}

function coldCandidates() {
  return writeState.styles.filter((style) => style.status === 'published' && style.metrics.coldRiskScore >= 70 && style.metrics.sampleStatus === 'enough' && !style.isPromoted)
}

function potentialCandidates() {
  return writeState.styles.filter((style) => style.status === 'published' && (style.metrics.trendLabel === 'Potential' || (style.metrics.exposure < 700 && style.metrics.want >= 20)))
}

function hotCandidates() {
  return writeState.styles.filter((style) => style.status === 'published' && ['HotUp', 'Stable'].includes(style.metrics.trendLabel)).sort((a, b) => b.metrics.hotScore - a.metrics.hotScore)
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`
}

function getRange(params: Record<string, any>) {
  return {
    startDate: params.startDate || params.date || '2026-05-29',
    endDate: params.endDate || params.date || '2026-05-29'
  }
}

function hasIncompleteMaterials(style = findStyle()) {
  return !style.name || !style.description || !style.price || !style.coverImage || Object.values(style.tags).some((items) => !items.length)
}

function getPriceBand(style: ReturnType<typeof findStyle>) {
  if (style.price < 160) return 'low'
  if (style.price < 220) return 'mid'
  return 'high'
}

function matchesPermission(pattern: string, operation: string) {
  if (pattern === '*') return true
  if (pattern.endsWith('*')) return operation.startsWith(pattern.slice(0, -1))
  return pattern === operation
}

function canOperatorRun(operation: string, operatorId?: string) {
  const operator = findOperator(operatorId)
  return operator.permissions.some((pattern) => matchesPermission(pattern, operation))
}

function metricCatalog() {
  return {
    exposure: {
      name: '曝光',
      definition: '用户在列表或推荐位中看到款式卡片的次数。',
      formula: 'style_exposures count',
      benchmark: { overallAvg: 980, hotStyleAvg: 1800, lowPriceAvg: 1100 }
    },
    tryon_rate: {
      name: '试戴率',
      definition: '曝光后进入试戴的转化效率。',
      formula: 'tryon_success / exposure',
      benchmark: { overallAvg: 0.14, catEyeAvg: 0.17, midPriceAvg: 0.15 }
    },
    confirm_rate: {
      name: '确认率',
      definition: '曝光后最终确认做的转化效率。',
      formula: 'confirm / exposure',
      benchmark: { overallAvg: 0.021, hotStyleAvg: 0.032, highPriceAvg: 0.018 }
    },
    want_to_confirm_rate: {
      name: '想做到确认率',
      definition: '进入我想做后最终确认做的比例。',
      formula: 'confirm / want',
      benchmark: { overallAvg: 0.38, stableAvg: 0.44, potentialAvg: 0.41 }
    }
  }
}

function buildHomepageSections() {
  return [
    {
      sectionId: 'home_feed',
      sectionName: '首页推荐流',
      slotCount: 8,
      publishStatus: 'published',
      fullVisibleSlots: ['P1', 'P2', 'P3', 'P4'],
      halfVisibleSlots: ['P5', 'P6', 'P7', 'P8']
    }
  ]
}

function buildSectionPublishStatus() {
  return {
    sectionId: 'home_feed',
    status: writeState.recommendConfigPublished?.status || 'published',
    versionId: writeState.recommendConfigPublished?.versionId || 'published-home-20260529',
    publishedAt: writeState.recommendConfigPublished?.publishedAt || '2026-05-29T09:00:00+08:00'
  }
}

function executeMockOperation(operation: string, params: Record<string, any>, context: AgentContext) {
  hydrateAgentState()
  const style = findStyle(params.styleId || context.selectedStyleId || 'style-gradient-003')
  const styles = writeState.styles
  const currentReport = writeState.reports[0] || null

  const readMap: Record<string, any> = {
    get_style_basic_info: style,
    get_style_tags: style.tags,
    get_style_status: { styleId: style.id, status: style.status },
    get_style_images: {
      coverImage: style.coverImage,
      detailImages: style.imageAssets?.detailImages?.length ? style.imageAssets.detailImages : [style.coverImage],
      referenceImages: style.imageAssets?.referenceImages || [],
      tryonAssets: style.imageAssets?.tryonAssets?.length ? style.imageAssets.tryonAssets : [style.coverImage]
    },
    search_styles: styles.filter((item) => {
      const keyword = String(params.keyword || '').toUpperCase()
      const tag = params.tag
      const keywordMatched = !keyword || item.id.toUpperCase().includes(keyword) || item.styleCode === keyword || item.name.includes(keyword)
      const tagMatched = !tag || Object.values(item.tags).flat().includes(tag)
      return keywordMatched && tagMatched
    }),
    get_styles_by_status: styles.filter((item) => item.status === params.status),
    get_crawled_styles: styles.filter((item) => item.crawled),
    get_style_recent_metrics: metricSummary(style),
    get_style_daily_metrics: buildDailySeries(style),
    get_style_window_metrics: styles.map((item) => ({ id: item.id, name: item.name, ...metricSummary(item) })),
    get_style_funnel_metrics: buildFunnel(style),
    get_store_overview_metrics: buildStoreOverview(),
    get_store_tag_preference: storePreference,
    get_hot_color_preferences: storePreference.colors,
    get_user_tag_preference: storePreference,
    check_metric_freshness: { ok: true, isFresh: true, requestedDate: params.date || '2026-05-29', freshThroughDate: '2026-05-29', lagDays: 0 },
    check_event_tracking_health: {
      ok: true,
      status: 'healthy',
      events: [
        { event: 'style_exposure', status: 'healthy', volume: sum('exposure') },
        { event: 'style_click', status: 'healthy', volume: sum('view') },
        { event: 'tryon_success', status: 'healthy', volume: sum('tryonSuccess') },
        { event: 'style_want', status: 'healthy', volume: sum('want') },
        { event: 'style_confirm', status: 'healthy', volume: sum('confirm') }
      ]
    },
    check_metric_completeness: { ok: true, ...getRange(params), completenessRate: 1, missingDates: [] },
    detect_tracking_drop: {
      ok: true,
      eventType: params.eventType || 'style_confirm',
      anomalies: [{ eventType: params.eventType || 'style_confirm', dropRate: 0.12, likelyTrackingIssue: false, note: 'Volume is lower but still within expected variance.' }]
    },
    validate_metric_time_range: { ok: true, valid: true, normalizedRange: { ...getRange(params), windowDays: params.windowDays || 7 }, note: 'Time range is suitable for trend and report analysis.' },
    get_metric_definition: (() => {
      const metricKey = String(params.metric || 'confirm_rate')
      const metric = metricCatalog()[metricKey as keyof ReturnType<typeof metricCatalog>] || metricCatalog().confirm_rate
      return { metric: metricKey, ...metric }
    })(),
    get_metric_formula: (() => {
      const metricKey = String(params.metric || 'confirm_rate')
      const metric = metricCatalog()[metricKey as keyof ReturnType<typeof metricCatalog>] || metricCatalog().confirm_rate
      return { metric: metricKey, formula: metric.formula, definition: metric.definition }
    })(),
    explain_metric_change: { metric: params.metric || 'confirm_rate', direction: params.direction || 'down', reasons: ['Recommendation slot mix shifted.', 'Want-to-confirm conversion is below the 7-day average.', 'Some high-exposure styles have weak cover click-through.'] },
    compare_metric_with_baseline: (() => {
      const current = style.metrics.confirm / Math.max(style.metrics.exposure, 1)
      const baseline = current - 0.004
      return { metric: params.metric || 'confirm_rate', baseline: params.baseline || 'yesterday', currentValue: Number(current.toFixed(4)), baselineValue: Number(baseline.toFixed(4)), delta: Number((current - baseline).toFixed(4)) }
    })(),
    get_metric_benchmark: (() => {
      const band = getPriceBand(style)
      const sameBandStyles = styles.filter((item) => getPriceBand(item) === band)
      return { metric: params.metric || 'confirm_rate', benchmarkType: params.benchmarkType || 'price_band', benchmarkValue: Number(avg(sameBandStyles.map((item) => item.metrics.confirm / Math.max(item.metrics.exposure, 1))).toFixed(4)), sampleSize: sameBandStyles.length }
    })(),
    get_style_exposure_by_slot: writeState.feedSlots.filter((slot) => slot.styleId === style.id),
    get_valid_impression_count: { validImpressions: style.metrics.exposure, users: Math.round(style.metrics.exposure * 0.68) },
    get_style_click_events: { clicks: style.metrics.view, clickRate: rate(style.metrics.view, style.metrics.exposure) },
    get_style_tryon_events: { basketAdd: style.metrics.basketAdd, success: style.metrics.tryonSuccess, generationSuccessRate: style.metrics.generationSuccessRate },
    get_style_intent_events: { want: style.metrics.want, sources: style.metrics.sourceBreakdown },
    get_style_confirm_events: { confirm: style.metrics.confirm, sources: style.metrics.sourceBreakdown },
    get_user_behavior_path: ['exposure', 'click', 'basket_add', 'tryon_success', 'result_view', 'want', 'confirm'],
    get_session_behavior_path: ['catalog', 'tryon', 'batchResults', 'wantList'],
    get_style_source_breakdown: style.metrics.sourceBreakdown,
    get_feed_slot_metrics: writeState.feedSlots,
    compare_full_visible_vs_half_visible: compareVisible(),
    get_position_bias_report: positionBiasReport(),
    detect_over_exposed_styles: styles.filter((item) => item.metrics.exposure > 800 && item.metrics.confirm < 5),
    detect_under_exposed_potential_styles: potentialCandidates(),
    detect_feed_style_duplication: { duplicatedCrafts: ['cat_eye'], risk: 'medium', suggestion: 'Avoid consecutive cat-eye or plain-color styles in the first screen.' },
    get_feed_diversity_score: { score: 78, reason: 'Covers six color families and five craft types, with cat-eye slightly concentrated.' },
    recommend_feed_mix: buildFeedMix(),
    preview_feed_mix_change: buildFeedMix(),
    get_section_styles: writeState.feedSlots,
    get_filter_usage_stats: storePreference,
    get_filter_to_tryon_conversion: storePreference,
    get_filter_to_intent_conversion: storePreference,
    get_filter_to_confirm_conversion: storePreference,
    get_filter_keyword_demand: aiDemandSignals.queries,
    recommend_filter_tag_adjustment: ['Move short nails, nude pink, and cat-eye higher.', 'Hide low-conversion metallic tags.'],
    get_batch_tryon_jobs: [{ id: 'bt-001', styleIds: ['style-french-001', 'style-cat-eye-002'], status: 'succeeded' }],
    get_tryon_basket_add_stats: styles.map((item) => ({ id: item.id, name: item.name, count: item.metrics.basketAdd })),
    get_tryon_basket_remove_stats: [{ styleId: 'style-neon-006', count: 44 }],
    get_co_tryon_style_pairs: [['style-french-001', 'style-ice-004'], ['style-cat-eye-002', 'style-gradient-003']],
    get_batch_tryon_result_conversion: { wantRate: 0.31, confirmRate: 0.12 },
    detect_high_add_low_generate_styles: styles.filter((item) => item.metrics.basketAdd > item.metrics.tryonSuccess * 1.2),
    detect_high_generate_low_intent_styles: styles.filter((item) => item.metrics.tryonSuccess > 80 && item.metrics.want < 15),
    get_ai_recommend_queries: aiDemandSignals.queries,
    extract_user_preference_from_chat: storePreference,
    get_ai_recommendation_results: hotCandidates().slice(0, 4),
    get_ai_recommendation_clicks: { clicks: 128, clickRate: 0.34 },
    get_ai_recommendation_conversion: { tryon: 72, want: 28, confirm: 12 },
    get_unmatched_user_demands: aiDemandSignals.unmatchedDemands,
    get_common_user_concerns: aiDemandSignals.concerns,
    get_want_list_styles: styles.filter((item) => item.metrics.want > 20),
    get_confirmed_styles: styles.filter((item) => item.metrics.confirm > 10),
    get_want_to_confirm_rate: { rate: rate(sum('confirm'), sum('want')), want: sum('want'), confirm: sum('confirm') },
    get_confirm_source_breakdown: aggregateSources(),
    get_intent_source_breakdown: aggregateSources(),
    detect_high_want_low_confirm_styles: styles.filter((item) => item.metrics.want >= 8 && rate(item.metrics.confirm, item.metrics.want) < 0.25),
    detect_direct_confirm_styles: styles.filter((item) => (item.metrics.sourceBreakdown.card || 0) >= 8),
    detect_tryon_driven_confirm_styles: styles.filter((item) => (item.metrics.sourceBreakdown.tryon_result || 0) >= 7),
    get_tryon_generation_success_rate: { rate: avg(styles.map((item) => item.metrics.generationSuccessRate)), lowStyles: styles.filter((item) => item.metrics.generationSuccessRate < 0.9) },
    get_tryon_generation_latency: { avgLatencySec: avg(styles.map((item) => item.metrics.avgLatencySec)) },
    compare_mock_vs_hyperreal_conversion: { mockConfirmRate: 0.11, hyperrealConfirmRate: 0.16 },
    get_tryon_result_view_duration: { styleId: style.id, durationSec: style.metrics.resultViewDurationSec },
    detect_tryon_generation_failures: styles.filter((item) => item.metrics.generationSuccessRate < 0.9),
    detect_styles_with_poor_tryon_result: styles.filter((item) => item.metrics.resultViewDurationSec < 18),
    classify_style_bucket: classifyBucket(style),
    classify_trend_label: style.metrics.trendLabel,
    detect_low_sample: styles.filter((item) => item.metrics.sampleStatus === 'low_sample'),
    list_hot_candidates: hotCandidates(),
    list_potential_candidates: potentialCandidates(),
    list_cold_candidates: coldCandidates(),
    list_replacement_candidates: [...hotCandidates().slice(0, 2), ...potentialCandidates().slice(0, 2)],
    detect_abnormal_styles: detectAbnormal(),
    exclude_promoted_styles: styles.filter((item) => !item.isPromoted),
    exclude_newly_published_styles: styles.filter((item) => daysSince(item.listedAt) >= 7),
    exclude_user_protected_styles: { protectedConditions: context.lastReportActions || [], applied: true },
    exclude_tag_styles: styles.filter((item) => !(params.tag && Object.values(item.tags).flat().includes(params.tag))),
    exclude_unmakeable_styles: styles.filter((item) => item.makeable),
    exclude_low_sample_styles: styles.filter((item) => item.metrics.sampleStatus !== 'low_sample'),
    exclude_duplicate_styles: styles.filter((item) => item.crawled && item.id !== 'style-aurora-009'),
    apply_store_makeability_filter: styles.filter((item) => item.makeable),
    apply_price_level_filter: styles.filter((item) => item.price <= (params.maxPrice || 220)),
    apply_style_diversity_filter: { applied: true, note: 'Keep french, cat-eye, gradient, solid, and blur styles mixed.' },
    generate_style_title: `${style.name} · Everyday Glow`,
    generate_style_description: `${style.name} keeps the hand looking brighter and cleaner, works well for short nails, and fits commute and daily scenes without feeling too loud.`,
    generate_style_tags: style.tags,
    generate_operation_suggestion: buildActions(),
    generate_operation_report: buildGenericReport(),
    generate_daily_operation_report: buildDailyReport(),
    generate_weekly_operation_report: buildWeeklyReport(),
    generate_daily_anomaly_report: buildAnomalyReport(),
    generate_feed_performance_report: buildFeedReport(),
    generate_selection_insight_report: buildSelectionReport(),
    create_report_draft: (() => {
      const report = { reportId: makeId('report'), reportType: params.reportType || 'generic', title: params.title || '运营报告草稿', summary: params.summary || '待补充总结', status: 'draft', dateRange: getRange(params), compareTo: params.compareTo || 'yesterday', sections: params.sections || [], suggestions: params.suggestions || [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      writeState.reports.unshift(report)
      persistAgentState()
      return report
    })(),
    save_report_snapshot: (() => {
      const report = findReport(params.reportId) || currentReport
      if (!report) return { ok: false, error: 'report_not_found' }
      report.updatedAt = new Date().toISOString()
      persistAgentState()
      return { ok: true, reportId: report.reportId, snapshotSavedAt: report.updatedAt }
    })(),
    get_report_history: writeState.reports,
    get_report_by_id: findReport(params.reportId) || null,
    export_report: (() => {
      const report = findReport(params.reportId) || currentReport
      if (!report) return { ok: false, error: 'report_not_found' }
      report.status = 'exported'
      report.updatedAt = new Date().toISOString()
      persistAgentState()
      return { ok: true, reportId: report.reportId, format: params.format || 'pdf', downloadName: `${report.reportId}.${params.format || 'pdf'}` }
    })(),
    mark_report_reviewed: (() => {
      const report = findReport(params.reportId) || currentReport
      if (!report) return { ok: false, error: 'report_not_found' }
      report.status = params.status || 'reviewed'
      report.reviewedAt = new Date().toISOString()
      report.updatedAt = report.reviewedAt
      persistAgentState()
      return report
    })(),
    create_operation_task: (() => {
      const task = { taskId: makeId('task'), title: params.title || '新运营待办', description: params.description || '由 AI 运营建议创建的待办。', source: params.source || 'manual', sourceId: params.sourceId, status: params.status || 'todo', priority: params.priority || 'medium', ownerId: params.ownerId || getCurrentOperator().operatorId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      writeState.tasks.unshift(task)
      persistAgentState()
      return task
    })(),
    list_operation_tasks: writeState.tasks,
    update_task_status: (() => {
      const task = findTask(params.taskId)
      if (!task) return { ok: false, error: 'task_not_found' }
      task.status = params.status || task.status
      task.updatedAt = new Date().toISOString()
      persistAgentState()
      return task
    })(),
    assign_task_owner: (() => {
      const task = findTask(params.taskId)
      if (!task) return { ok: false, error: 'task_not_found' }
      task.ownerId = params.ownerId || task.ownerId
      task.updatedAt = new Date().toISOString()
      persistAgentState()
      return task
    })(),
    convert_report_suggestion_to_task: (() => {
      const report = findReport(params.reportId) || currentReport
      const suggestion = params.suggestion || report?.suggestions?.[0]
      if (!report || !suggestion) return { ok: false, error: 'suggestion_not_found' }
      const task = { taskId: makeId('task'), title: suggestion, description: `来源报告：${report.title}`, source: 'report', sourceId: report.reportId, status: 'todo', priority: 'medium', ownerId: getCurrentOperator().operatorId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      writeState.tasks.unshift(task)
      persistAgentState()
      return task
    })(),
    get_homepage_sections: buildHomepageSections(),
    get_section_slot_rules: feedSlotRules,
    get_section_publish_status: buildSectionPublishStatus(),
    get_recommend_config_draft: writeState.recommendConfigDraft,
    get_published_recommend_config: writeState.recommendConfigPublished,
    compare_recommend_config_versions: {
      fromVersionId: params.fromVersionId || writeState.recommendConfigPublished.versionId,
      toVersionId: params.toVersionId || writeState.recommendConfigDraft.versionId,
      changedSlots: writeState.recommendConfigDraft.sections.filter((slot: any, index: number) => slot.styleId !== writeState.recommendConfigPublished.sections[index]?.styleId).map((slot: any) => ({ position: slot.position, beforeStyleId: writeState.recommendConfigPublished.sections[slot.position - 1]?.styleId, afterStyleId: slot.styleId }))
    },
    clone_recommend_config: (() => {
      const cloned = { versionId: makeId('recommend-draft'), status: 'draft', sections: structuredCloneSafe(writeState.recommendConfigPublished.sections), updatedAt: new Date().toISOString() }
      writeState.recommendConfigDraft = cloned
      persistAgentState()
      return cloned
    })(),
    validate_recommend_config: (() => {
      const slots = writeState.recommendConfigDraft.sections
      const duplicateCount = slots.length - new Set(slots.map((slot: any) => slot.styleId)).size
      const hasUnmakeable = slots.some((slot: any) => !findStyle(slot.styleId).makeable)
      return { ok: duplicateCount === 0 && !hasUnmakeable, duplicateCount, hasUnmakeable, diversityScore: buildFeedMix().diversityScore, ruleChecks: feedSlotRules.map((rule) => ({ slot: rule.slot, slotName: rule.slotName, passed: true })) }
    })(),
    create_recommendation_experiment: (() => {
      const experiment = { experimentId: makeId('exp'), name: params.name || '推荐位实验', sectionId: params.sectionId || 'home_feed', status: 'draft', trafficSplit: { control: 90, variant: 10 }, variants: params.variants || [{ id: 'control', name: '当前配置', slotCount: 8 }, { id: 'variant', name: '实验配置', slotCount: 8 }], result: { clickLift: 0, tryonLift: 0, confirmLift: 0, winner: 'inconclusive' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      writeState.experiments.unshift(experiment)
      persistAgentState()
      return experiment
    })(),
    assign_experiment_traffic: (() => {
      const experiment = findExperiment(params.experimentId)
      if (!experiment) return { ok: false, error: 'experiment_not_found' }
      experiment.trafficSplit = { control: params.control ?? experiment.trafficSplit.control, variant: params.variant ?? experiment.trafficSplit.variant }
      experiment.status = 'running'
      experiment.updatedAt = new Date().toISOString()
      persistAgentState()
      return experiment
    })(),
    get_experiment_result: findExperiment(params.experimentId) || writeState.experiments[0] || null,
    compare_experiment_variants: (() => {
      const experiment = findExperiment(params.experimentId) || writeState.experiments[0]
      if (!experiment) return null
      return { experimentId: experiment.experimentId, control: { clickRate: 0.24, tryonRate: 0.13, confirmRate: 0.021 }, variant: { clickRate: 0.26, tryonRate: 0.145, confirmRate: 0.022 }, winner: experiment.result.winner }
    })(),
    stop_experiment: (() => {
      const experiment = findExperiment(params.experimentId)
      if (!experiment) return { ok: false, error: 'experiment_not_found' }
      experiment.status = 'stopped'
      experiment.updatedAt = new Date().toISOString()
      persistAgentState()
      return experiment
    })(),
    check_style_publish_readiness: (() => {
      const target = style
      const materialsComplete = !hasIncompleteMaterials(target)
      return { styleId: target.id, ready: materialsComplete && target.makeable, materialsComplete, imageQualityPassed: Boolean(target.coverImage), tagComplete: Object.values(target.tags).every((items) => items.length > 0), makeable: target.makeable }
    })(),
    check_style_material_completeness: { styleId: style.id, titleComplete: Boolean(style.name), descriptionComplete: Boolean(style.description), priceComplete: Boolean(style.price), tagsComplete: Object.values(style.tags).every((items) => items.length > 0), imageComplete: Boolean(style.coverImage) },
    check_style_image_quality: { styleId: style.id, passed: Boolean(style.coverImage), score: style.metrics.view > 100 ? 86 : 71, issues: style.metrics.view > 100 ? [] : ['封面视觉吸引力偏弱'] },
    check_style_tag_completeness: { styleId: style.id, complete: Object.values(style.tags).every((items) => items.length > 0), missingGroups: Object.entries(style.tags).filter(([, items]) => !items.length).map(([group]) => group) },
    check_style_makeability: { styleId: style.id, makeable: style.makeable, note: style.makeable ? '门店当前可制作。' : '门店当前不可制作，建议先培训或不发布。' },
    detect_cover_weak_styles: styles.filter((item) => item.metrics.exposure >= 800 && rate(item.metrics.view, item.metrics.exposure) < 0.16),
    list_cover_optimization_candidates: styles.filter((item) => item.metrics.exposure >= 600 && rate(item.metrics.view, item.metrics.exposure) < 0.2).map((item) => ({ styleId: item.id, styleName: item.name, clickRate: rate(item.metrics.view, item.metrics.exposure) })),
    generate_cover_optimization_suggestion: { styleId: style.id, suggestions: ['Increase cover contrast and nail detail.', 'Avoid background colors too close to the nail color.', 'Use the angle where cat-eye or highlight effect is strongest.'] },
    detect_price_conversion_blockers: styles.filter((item) => item.price >= 220 && item.metrics.want >= 8 && rate(item.metrics.confirm, item.metrics.want) < 0.2).map((item) => ({ styleId: item.id, styleName: item.name, price: item.price, wantToConfirmRate: rate(item.metrics.confirm, item.metrics.want) })),
    compare_price_level_conversion: ['low', 'mid', 'high'].map((band) => {
      const bandStyles = styles.filter((item) => getPriceBand(item) === band)
      return { priceBand: band, confirmRate: Number(avg(bandStyles.map((item) => item.metrics.confirm / Math.max(item.metrics.exposure, 1))).toFixed(4)), wantToConfirmRate: Number(avg(bandStyles.map((item) => item.metrics.confirm / Math.max(item.metrics.want, 1))).toFixed(4)), sampleSize: bandStyles.length }
    }),
    get_price_band_performance: (() => {
      const band = params.priceBand || getPriceBand(style)
      const bandStyles = styles.filter((item) => getPriceBand(item) === band)
      return { priceBand: band, exposure: bandStyles.reduce((sum, item) => sum + item.metrics.exposure, 0), tryon: bandStyles.reduce((sum, item) => sum + item.metrics.tryonSuccess, 0), confirm: bandStyles.reduce((sum, item) => sum + item.metrics.confirm, 0), confirmRate: Number(avg(bandStyles.map((item) => item.metrics.confirm / Math.max(item.metrics.exposure, 1))).toFixed(4)) }
    })(),
    recommend_price_adjustment: { styleId: style.id, currentPrice: style.price, suggestion: style.price >= 220 ? '建议先做限时试探性降价或加赠服务，不直接全量改价。' : '当前价格带表现正常，优先优化封面和文案。', executeDirectly: false },
    check_operator_permission: (() => {
      const operationName = String(params.operationName || params.operation || 'preview_unpublish_style')
      const operator = findOperator(params.operatorId)
      return { operatorId: operator.operatorId, role: operator.role, operationName, allowed: canOperatorRun(operationName, operator.operatorId) }
    })(),
    get_operator_role: (() => {
      const operator = findOperator(params.operatorId)
      return { operatorId: operator.operatorId, role: operator.role, permissions: operator.permissions }
    })(),
    create_approval: { ok: true, note: 'Approval is created automatically after preview.' },
    get_approval_status: params.approvalId ? getApprovalStatus(params.approvalId) : null,
    approve_operation: { ok: false, note: 'Use approveAndExecuteOperation instead.' },
    reject_operation: { ok: false, note: 'Use rejectApproval instead.' },
    execute_approved_operation: { ok: false, note: 'Approved operations must execute through approval_id.' },
    write_operation_log: { ok: true, logs: getOperationLogs() },
    get_operation_logs: getOperationLogs(params.filter || {}),
    get_operation_log: params.logId ? getOperationLog(params.logId) : null,
    get_style_change_history: getStyleChangeHistory(params.styleId || style.id),
    get_recommend_config_history: getRecommendConfigHistory(),
    rollback_style_change: () => rollbackStyleChange(params.logId),
    rollback_recommend_config: () => rollbackRecommendConfig(params.logId)
  }

  const result = readMap[operation]
  return typeof result === 'function' ? result() : result ?? { ok: true, operation, params }
}

export function executeAgentRequest(userInput: string, context: AgentContext = {}, externalPlan?: ToolPlan): AgentExecutionResult {
  const plan = externalPlan ? normalizeExternalPlan(externalPlan, userInput) : planAtomicOperations(userInput, context)
  const risk = checkRisk(userInput, plan.plan.map((item) => item.operation))
  plan.riskLevel = risk.riskLevel === 'low' && plan.riskLevel !== 'low' ? plan.riskLevel : risk.riskLevel
  plan.needConfirm = plan.needConfirm || risk.needConfirm
  plan.needSecondConfirm = plan.needSecondConfirm || risk.needSecondConfirm
  plan.objects.protectedConditions = Array.from(new Set([...(plan.objects.protectedConditions || []), ...risk.protectedConditions]))

  const operationResults: Record<string, any> = {}
  for (const item of plan.plan) {
    const operation = getAtomicOperation(item.operation)
    if (operation?.category === 'write') continue
    if (item.operation === 'create_approval') continue
    operationResults[item.operation] = executeMockOperation(item.operation, item.params, context)
  }

  const generated = {
    description: operationResults.generate_style_description,
    title: operationResults.generate_style_title,
    tags: operationResults.generate_style_tags,
    feedMix: operationResults.recommend_feed_mix
  }
  const preview = buildOperationPreview(plan, generated)
  const approval = preview?.approvalRequired ? createApproval(preview) : null
  const analysis = buildAnalysis(plan, operationResults, preview)

  return {
    plan,
    operationResults,
    analysis,
    preview,
    approval,
    auditLogs: getOperationLogs()
  }
}

function normalizeExternalPlan(plan: ToolPlan, userInput: string): ToolPlan {
  const normalized = {
    ...plan,
    userGoal: plan.userGoal || userInput,
    objects: plan.objects || {},
    plan: (plan.plan || []).map((item, index) => ({ ...item, step: item.step || index + 1, params: item.params || {} }))
  }
  for (const item of normalized.plan) {
    const operation = getAtomicOperation(item.operation)
    if (!operation) throw new Error(`DeepSeek returned an unregistered atomic operation: ${item.operation}`)
    if (operation.category === 'write') {
      throw new Error(`DeepSeek cannot call write operation directly: ${item.operation}. Use preview + approval.`)
    }
  }
  return normalized
}

export function approveAndExecuteOperation(approvalId: string, confirmText?: string) {
  approveOperation(approvalId, confirmText)
  const result = executeApprovedOperation(approvalId)
  return { approval: result.approval, log: result.log, logs: getOperationLogs() }
}

export function rejectApproval(approvalId: string) {
  return rejectOperation(approvalId)
}

export function executeApprovedOperation(approvalId: string) {
  const approval = getApprovalStatus(approvalId)
  if (approval.status !== 'approved') throw new Error('Only approved approvals can be executed.')
  const before = structuredCloneSafe(approval.preview.before)
  const after = structuredCloneSafe(approval.preview.after)

  try {
    if (approval.preview.operationName === 'preview_update_description') {
      const style = findStyle(approval.preview.targets[0].targetId)
      style.description = approval.preview.after.description
    }
    if (approval.preview.operationName === 'preview_update_tags') {
      const style = findStyle(approval.preview.targets[0].targetId)
      style.tags = approval.preview.after.tags
    }
    if (approval.preview.operationName === 'preview_update_cover_image') {
      const style = findStyle(approval.preview.targets[0].targetId)
      style.coverImage = approval.preview.after.coverImage
    }
    if (approval.preview.operationName === 'preview_price_change') {
      const style = findStyle(approval.preview.targets[0].targetId)
      style.price = approval.preview.after.price
    }
    if (approval.preview.operationName === 'preview_archive_style') {
      approval.preview.targets.forEach((target) => {
        const style = findStyle(target.targetId)
        style.status = 'archived'
        style.unpublishedAt = new Date().toISOString().slice(0, 10)
      })
    }
    if (approval.preview.operationName === 'preview_unpublish_style' || approval.preview.operationName === 'preview_batch_unpublish') {
      approval.preview.targets.forEach((target) => {
        const style = findStyle(target.targetId)
        style.status = 'unpublished'
        style.unpublishedAt = new Date().toISOString().slice(0, 10)
      })
    }
    if (approval.preview.operationName === 'preview_restore_style') {
      approval.preview.targets.forEach((target) => {
        const style = findStyle(target.targetId)
        style.status = 'published'
        style.listedAt = style.listedAt || new Date().toISOString().slice(0, 10)
        style.unpublishedAt = undefined
      })
    }
    if (approval.preview.operationName === 'preview_publish_style') {
      approval.preview.targets.forEach((target) => {
        const style = findStyle(target.targetId)
        style.status = 'published'
        style.listedAt = new Date().toISOString().slice(0, 10)
      })
    }
    if (approval.preview.operationName === 'preview_replace_section') {
      writeState.feedSlots = approval.preview.after
      writeState.recommendConfigDraft.sections = structuredCloneSafe(approval.preview.after)
    }
    if (approval.preview.operationName === 'preview_feed_mix_change' && approval.preview.approvalRequired) {
      writeState.feedSlots = approval.preview.after
      writeState.recommendConfigPublished.sections = structuredCloneSafe(approval.preview.after)
    }
    if (approval.preview.operationName === 'preview_replace_single_slot') {
      const next = approval.preview.after
      const targetIndex = writeState.feedSlots.findIndex((slot) => slot.position === next.position)
      const sourceIndex = writeState.feedSlots.findIndex((slot) => slot.styleId === next.styleId)
      const targetStyle = findStyle(next.styleId)
      const targetSlotSnapshot = targetIndex >= 0 ? structuredCloneSafe(writeState.feedSlots[targetIndex]) : null
      const sourceSlotSnapshot = sourceIndex >= 0 ? structuredCloneSafe(writeState.feedSlots[sourceIndex]) : null

      const targetPayload = {
        ...(writeState.feedSlots[targetIndex] || {}),
        slotId: next.slotId || `home-${next.position}`,
        sectionId: 'home_feed',
        position: next.position,
        visibleType: next.visibleType,
        styleId: targetStyle.id,
        styleName: targetStyle.name,
        exposure: targetStyle.metrics.exposure,
        click: targetStyle.metrics.view,
        tryon: targetStyle.metrics.tryonSuccess,
        want: targetStyle.metrics.want,
        confirm: targetStyle.metrics.confirm,
        conversionRate: targetStyle.metrics.exposure ? Number((targetStyle.metrics.confirm / targetStyle.metrics.exposure).toFixed(4)) : 0,
        reason: 'AI atomic operation replacement'
      }

      if (targetIndex >= 0) {
        writeState.feedSlots.splice(targetIndex, 1, targetPayload)
      } else {
        writeState.feedSlots.push(targetPayload)
      }

      if (
        sourceIndex >= 0 &&
        targetSlotSnapshot &&
        sourceSlotSnapshot &&
        sourceSlotSnapshot.position !== targetPayload.position
      ) {
        const displacedStyle = findStyle(targetSlotSnapshot.styleId)
        const displacedPayload = {
          ...sourceSlotSnapshot,
          styleId: displacedStyle.id,
          styleName: displacedStyle.name,
          exposure: displacedStyle.metrics.exposure,
          click: displacedStyle.metrics.view,
          tryon: displacedStyle.metrics.tryonSuccess,
          want: displacedStyle.metrics.want,
          confirm: displacedStyle.metrics.confirm,
          conversionRate: displacedStyle.metrics.exposure ? Number((displacedStyle.metrics.confirm / displacedStyle.metrics.exposure).toFixed(4)) : 0,
          reason: 'AI atomic operation swap'
        }
        writeState.feedSlots.splice(sourceIndex, 1, displacedPayload)
      }
    }

    const executed = markApprovalExecuted(approvalId)
    persistAgentState()
    const log = writeOperationLog({
      approvalId,
      operatorId: getCurrentOperator().operatorId,
      operationName: writeOperationName(approval.preview.operationName),
      riskLevel: approval.preview.riskLevel,
      targets: approval.preview.targets,
      before,
      after,
      reasons: approval.preview.reasons,
      result: 'success',
      rollbackSupported: approval.preview.rollbackSupported
    })
    notifyAgentStateChanged()
    return { approval: executed, log }
  } catch (error: any) {
    const log = writeOperationLog({
      approvalId,
      operatorId: getCurrentOperator().operatorId,
      operationName: writeOperationName(approval.preview.operationName),
      riskLevel: approval.preview.riskLevel,
      targets: approval.preview.targets,
      before,
      after,
      reasons: approval.preview.reasons,
      result: 'failed',
      errorMessage: error.message,
      rollbackSupported: approval.preview.rollbackSupported
    })
    throw Object.assign(error, { log })
  }
}

export function getAuditLogs() {
  return getOperationLogs()
}

export function getAgentStyleRows() {
  return getStyleManagementRows()
}

export function getAgentRecommendRows() {
  return getRecommendManagementRows()
}

function rollbackStyleChange(logId?: string) {
  const log = logId ? getOperationLog(logId) : getOperationLogs().find((item) => item.rollbackSupported && item.targets.some((target: any) => target.targetType === 'style'))
  if (!log) return { ok: false, error: 'No rollbackable style operation log found.' }
  if (!log.rollbackSupported) return { ok: false, error: 'This operation does not support rollback.' }

  hydrateAgentState()
  const restoreOne = (snapshot: any) => {
    const targetId = snapshot?.id || snapshot?.targetId || snapshot?.styleId
    if (!targetId) return null
    const style = findStyle(targetId)
    if (snapshot.status !== undefined) style.status = snapshot.status
    if (snapshot.description !== undefined) style.description = snapshot.description
    if (snapshot.coverImage !== undefined) style.coverImage = snapshot.coverImage
    if (snapshot.price !== undefined) style.price = snapshot.price
    if (snapshot.tags !== undefined) style.tags = snapshot.tags
    if (snapshot.currentTags !== undefined) style.tags = snapshot.currentTags
    if (snapshot.listedAt !== undefined) style.listedAt = snapshot.listedAt
    if (snapshot.unpublishedAt !== undefined) style.unpublishedAt = snapshot.unpublishedAt
    return { id: style.id, name: style.name, status: style.status }
  }

  const beforeSnapshots = Array.isArray(log.before) ? log.before : [log.before]
  const restored = beforeSnapshots.map(restoreOne).filter(Boolean)
  persistAgentState()
  const rollbackLog = writeOperationLog({
    approvalId: log.approvalId,
    operatorId: getCurrentOperator().operatorId,
    operationName: 'rollback_style_change',
    riskLevel: 'high',
    targets: log.targets,
    before: log.after,
    after: log.before,
    reasons: [`Rollback from ${log.logId}`],
    result: restored.length ? 'success' : 'failed',
    errorMessage: restored.length ? undefined : 'No style snapshots were restored.',
    rollbackSupported: false
  })
  notifyAgentStateChanged()
  return { ok: Boolean(restored.length), restored, rollbackLog }
}

function rollbackRecommendConfig(logId?: string) {
  const log = logId ? getOperationLog(logId) : getOperationLogs().find((item) => item.rollbackSupported && item.targets.some((target: any) => ['section', 'feed', 'config'].includes(target.targetType)))
  if (!log) return { ok: false, error: 'No rollbackable recommend config log found.' }
  if (!log.rollbackSupported) return { ok: false, error: 'This operation does not support rollback.' }

  hydrateAgentState()
  if (Array.isArray(log.before)) {
    writeState.feedSlots = structuredCloneSafe(log.before)
  } else if (log.before?.position) {
    const index = writeState.feedSlots.findIndex((slot) => slot.position === log.before.position)
    if (index >= 0) writeState.feedSlots.splice(index, 1, { ...writeState.feedSlots[index], ...log.before })
  } else {
    return { ok: false, error: 'Recommend config snapshot is not restorable.' }
  }

  persistAgentState()
  const rollbackLog = writeOperationLog({
    approvalId: log.approvalId,
    operatorId: getCurrentOperator().operatorId,
    operationName: 'rollback_recommend_config',
    riskLevel: 'critical',
    targets: log.targets,
    before: log.after,
    after: log.before,
    reasons: [`Rollback from ${log.logId}`],
    result: 'success',
    rollbackSupported: false
  })
  notifyAgentStateChanged()
  return { ok: true, slots: writeState.feedSlots, rollbackLog }
}

function notifyAgentStateChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('agent-state-changed'))
}

function buildAnalysis(plan: ToolPlan, results: Record<string, any>, preview?: OperationPreview | null) {
  if (plan.finalResponseType === 'daily_report') return reportAnalysis('今日运营报告', results.generate_daily_operation_report)
  if (plan.finalResponseType === 'weekly_report') return reportAnalysis('本周运营周报', results.generate_weekly_operation_report)
  if (plan.finalResponseType === 'anomaly_report') return reportAnalysis('今日异常报告', results.generate_daily_anomaly_report)
  if (plan.finalResponseType === 'feed_report') return reportAnalysis('推荐位报告', results.generate_feed_performance_report)
  if (plan.finalResponseType === 'selection_report') return reportAnalysis('选品报告', results.generate_selection_insight_report)

  if (preview) {
    return {
      title: preview.title,
      conclusion: preview.summary,
      evidence: preview.reasons,
      actions: preview.impact,
      sampleStatus: preview.secondConfirmRequired ? '涉及极高风险，需要二次确认。' : '预览已生成，等待人工确认。',
      nextStep: preview.approvalRequired ? '确认后将通过 approval_id 执行并写入审计日志。' : '这是建议预览，不会自动执行。'
    }
  }

  const current = findStyle(plan.objects.styleIds?.[0] || 'style-gradient-003')
  const hot = hotCandidates()[0]
  const potential = potentialCandidates()[0]
  const cold = coldCandidates()[0]
  return {
    title: plan.userGoal,
    conclusion: buildConclusion(plan, current, hot, potential, cold),
    evidence: [
      `${current.name}: trend_label=${current.metrics.trendLabel}, hot_score=${current.metrics.hotScore}, cold_risk_score=${current.metrics.coldRiskScore}.`,
      `近 7 日曝光 ${current.metrics.exposure}，试戴成功 ${current.metrics.tryonSuccess}，我想做 ${current.metrics.want}，确认 ${current.metrics.confirm}。`,
      `样本状态：${current.metrics.sampleStatus === 'enough' ? '样本足够' : '样本不足，建议继续曝光测试'}。`
    ],
    actions: buildActions(),
    sampleStatus: current.metrics.sampleStatus === 'enough' ? '样本足够' : '样本不足',
    nextStep: '如需执行推荐位替换、上架、下架或文案修改，请先生成操作预览和确认单。'
  }
}

function reportAnalysis(title: string, report: any) {
  return {
    title,
    conclusion: report.summary,
    evidence: report.coreMetrics || [],
    actions: report.actions || [],
    sampleStatus: report.sampleStatus || '样本充足；样本不足处已在发现中标注。',
    nextStep: '报告建议不会自动执行。需要落地时，请逐项生成预览和确认单。',
    reportSections: report.sections
  }
}

function buildConclusion(plan: ToolPlan, style: ReturnType<typeof findStyle>, hot: any, potential: any, cold: any) {
  if (plan.userGoal.includes('热门') || plan.userGoal.includes('变热')) {
    return `${style.name} 当前判断为 ${style.metrics.trendLabel}。已同时检查 hot_score、cold_risk_score、漏斗和样本量，不是只看试戴总量。`
  }
  if (plan.userGoal.includes('潜力')) return `当前更值得补曝光的是 ${potential?.name || '暂无'}，原因是低曝光但意向和确认效率更好。`
  if (plan.userGoal.includes('下架') || plan.userGoal.includes('冷')) return `当前弱势候选是 ${cold?.name || '暂无'}，但任何下架都必须先预览再确认。`
  if (plan.userGoal.includes('首页')) return '首页推荐建议按 2 个热门/稳定 + 2 个潜力 + 1 个新品测试 + 1 个视觉吸引 + 2 个多样性补位来混排。'
  return `${hot?.name || style.name} 是当前更稳的成交承接款，${potential?.name || '潜力款'} 适合继续测试曝光。`
}

function buildDailyReport() {
  return {
    summary: '今天整体稳定，法式和猫眼继续承接成交，渐变款属于低曝光高意向潜力款；金属和荧光款存在冷门或试戴后流失问题。',
    coreMetrics: [`曝光 ${sum('exposure')}`, `试戴成功 ${sum('tryonSuccess')}`, `我想做 ${sum('want')}`, `确认 ${sum('confirm')}`, `试戴生成成功率 ${Math.round(avg(writeState.styles.map((item) => item.metrics.generationSuccessRate)) * 100)}%`],
    actions: ['保留法式优雅月光首页位置。', '增加粉杏薄荷渐变曝光。', '为金属镜面款生成下架预览。', '优化荧光撞色款封面或介绍。'],
    sampleStatus: '水墨晕染短甲刚上架，样本不足，不参与下架判断。',
    sections: [
      { title: '总结', items: ['成交仍由法式、猫眼和奶白纯色贡献。'] },
      { title: '核心指标', items: [`曝光 ${sum('exposure')}`, `确认 ${sum('confirm')}`, 'AOV 约 176 元'] },
      { title: '发现', items: ['金属款曝光高但点击和确认低。', '渐变款曝光少但我想做率高。'] },
      { title: '原因', items: ['首页位置带来部分位置偏差。', '荧光款试戴多但想做少，可能是上手效果或价格阻力。'] },
      { title: '建议动作', items: ['保留首页高转化位。', '替换推荐位需另建确认单。', '下架观察需二次确认。'] },
      { title: '是否需要确认', items: ['报告本身无需确认；执行任何写操作都需要确认。'] }
    ]
  }
}

function buildWeeklyReport() {
  return {
    summary: '本周较上周试戴和确认均上升，短甲通勤、猫眼和渐变保持优势，长甲金属类继续走弱。',
    coreMetrics: ['本周确认 131，环比上周 +12%。', '本周我想做 288，环比上周 +18%。', '首页前 4 款确认占比 63%。'],
    actions: ['下周保留 2 个稳定成交款。', '给粉杏薄荷渐变和水墨晕染短甲增加测试曝光。', '补充低饱和蓝灰短甲与低维护猫眼新款。'],
    sections: [
      { title: '本周整体总结', items: ['成交更集中在通勤和高级感款式。'] },
      { title: '环比上周变化', items: ['确认提升 12%，AI 推荐带来的我想做提升明显。'] },
      { title: '热门款', items: hotCandidates().slice(0, 3).map((item) => item.name) },
      { title: '潜力款', items: potentialCandidates().map((item) => item.name) },
      { title: '弱势款', items: coldCandidates().map((item) => item.name) },
      { title: '用户偏好变化', items: ['裸粉、奶白、短甲继续领先，猫眼预算 200 内需求增加。'] },
      { title: '推荐位表现', items: ['完整露出转化高于半露出，但仍需防止位置偏差。'] },
      { title: '生命周期分析', items: ['刚上架 7 天内款式只做样本观察，不下架。'] },
      { title: '下周计划', items: ['补曝光、优化介绍、预览弱势款下架。'] }
    ]
  }
}

function buildAnomalyReport() {
  return {
    summary: '今天主要异常集中在曝光高点击低、试戴高想做低、生成失败率偏高和首页风格重复。',
    coreMetrics: ['金属镜面款曝光 1180，确认仅 1。', '荧光撞色款试戴 136，我想做仅 9。', '金属镜面生成成功率 88%。'],
    actions: ['为金属镜面款生成下架预览。', '优化荧光撞色款封面和价格说明。', '减少首页连续强工艺款堆叠。'],
    sections: [
      { title: '曝光高但点击低', items: ['金属镜面款。'] },
      { title: '点击高但试戴低', items: ['暂无明显异常。'] },
      { title: '试戴高但想要低', items: ['荧光撞色款。'] },
      { title: '想要高但确认低', items: ['荧光撞色款。'] },
      { title: '生成失败率高', items: ['金属镜面款。'] },
      { title: '推荐位曝光高但转化低', items: ['半露出中的弱势款需要替换预览。'] },
      { title: '首页风格重复', items: ['猫眼和纯色占比略高。'] }
    ]
  }
}

function buildFeedReport() {
  const recommendation = buildFeedMix()
  const slotSections = recommendation.slots.map((slot) => {
    const currentSlot = writeState.feedSlots.find((item) => item.position === slot.position)
    const currentStyle = currentSlot ? findStyle(currentSlot.styleId) : findStyle(slot.styleId)
    const keep = currentStyle.id === slot.styleId
    return {
      title: `${slot.slot} ${slot.slotName}`,
      items: [
        `坑位定位：${slot.reason}`,
        `当前款式：${currentStyle.name}`,
        `曝光 ${currentStyle.metrics.exposure}，点击 ${currentStyle.metrics.view}，试戴 ${currentStyle.metrics.tryonSuccess}，我想做 ${currentStyle.metrics.want}，确认做 ${currentStyle.metrics.confirm}`,
        `转化问题：${currentStyle.metrics.trendLabel === 'ColdDown' ? '高曝光低转化，需要考虑替换。' : currentStyle.metrics.sampleStatus === 'low_sample' ? '样本不足，先观察。' : '当前表现可继续观察。'}`,
        `是否建议保留：${keep ? '建议保留' : '建议替换'}`,
        `是否建议替换：${keep ? '否' : `是，建议替换为 ${slot.styleName}`}`,
        `替换方向：${slot.strategyType}`
      ]
    }
  })
  return {
    summary: 'P1-P4 承担首屏成交和风格控制，P5-P8 承担下滑吸引、新品测试与多样性覆盖。当前建议保留主成交位，优先替换弱势半露出位。',
    coreMetrics: [`首屏确认 ${mockFeedSlots.filter((s) => s.visibleType === 'full_visible').reduce((n, s) => n + s.confirm, 0)}`, `半露出确认 ${mockFeedSlots.filter((s) => s.visibleType === 'half_visible').reduce((n, s) => n + s.confirm, 0)}`],
    actions: recommendation.expectedImpact.concat(['如需落地该策略，请先生成推荐区块替换确认单。']),
    sections: [
      { title: '首屏完整露出 4 款表现', items: mockFeedSlots.slice(0, 4).map((slot) => `${slot.position}. ${slot.styleName} 确认 ${slot.confirm}`) },
      { title: '半露出 4 款表现', items: mockFeedSlots.slice(4, 8).map((slot) => `${slot.position}. ${slot.styleName} 确认 ${slot.confirm}`) },
      { title: '完整露出 vs 半露出', items: [`完整露出确认率 ${compareVisible().fullConfirmRate}，半露出确认率 ${compareVisible().halfConfirmRate}`] },
      { title: '位置偏差', items: ['法式和猫眼长期处在好位置，需要观察换位后表现。'] },
      { title: '风格重复', items: recommendation.riskNotes },
      ...slotSections,
      { title: '替换建议', items: ['替换动作只生成预览，不自动执行。'] }
    ]
  }
}

function buildSelectionReport() {
  return {
    summary: '下周建议补充短甲显白、低维护猫眼、低饱和蓝灰和甜美贴饰款，覆盖 AI 对话中的未满足需求。',
    coreMetrics: ['热门颜色：裸粉、奶白、薄荷绿。', '热门风格：通勤、高级感、甜美。', '热门甲长：短甲、中长甲。'],
    actions: ['补充低饱和蓝灰短甲。', '补充预算 200 内猫眼。', '补充不易长出痕迹的通勤款。'],
    sections: [
      { title: '热门颜色偏好', items: storePreference.colors.map((item) => `${item.name} ${item.score}`) },
      { title: '热门风格偏好', items: storePreference.styles.map((item) => `${item.name} ${item.score}`) },
      { title: '热门工艺偏好', items: storePreference.crafts.map((item) => `${item.name} ${item.score}`) },
      { title: '热门甲长偏好', items: storePreference.lengths.map((item) => `${item.name} ${item.score}`) },
      { title: 'AI 推荐对话需求', items: aiDemandSignals.queries },
      { title: '店内缺失方向', items: aiDemandSignals.unmatchedDemands },
      { title: '建议上新方向', items: ['短甲显白通勤', '低维护猫眼', '甜美贴饰但不幼态'] }
    ]
  }
}

function buildGenericReport() {
  return { summary: '通用运营报告已生成。', coreMetrics: [], actions: buildActions(), sections: [] }
}

function buildActions() {
  return ['保留首页位置', '增加潜力款曝光', '优化商品介绍', '更换主图', '下架观察', '补充短甲显白新款']
}

function buildFunnel(style: ReturnType<typeof findStyle>) {
  return [
    ['曝光', style.metrics.exposure],
    ['点击/浏览', style.metrics.view],
    ['加入试戴', style.metrics.basketAdd],
    ['试戴成功', style.metrics.tryonSuccess],
    ['查看结果', style.metrics.resultView],
    ['我想做', style.metrics.want],
    ['确认做', style.metrics.confirm]
  ].map(([name, value]) => ({ name, value }))
}

function buildDailySeries(style: ReturnType<typeof findStyle>) {
  return Array.from({ length: 7 }, (_, index) => ({
    date: `05-${23 + index}`,
    exposure: Math.round(style.metrics.exposure * (0.08 + index * 0.018)),
    tryon: Math.round(style.metrics.tryonSuccess * (0.08 + index * 0.018)),
    want: Math.round(style.metrics.want * (0.08 + index * 0.018)),
    confirm: Math.round(style.metrics.confirm * (0.08 + index * 0.018))
  }))
}

function buildStoreOverview() {
  return {
    exposureUsers: Math.round(sum('exposure') * 0.68),
    tryonUsers: Math.round(sum('tryonSuccess') * 0.74),
    tryonCount: sum('tryonSuccess'),
    want: sum('want'),
    confirm: sum('confirm'),
    revenue: sum('orders') * 176,
    aov: 176,
    avgTryPerUser: 3.8
  }
}

function detectAbnormal() {
  return {
    highExposureLowClick: writeState.styles.filter((item) => item.metrics.exposure > 800 && rate(item.metrics.view, item.metrics.exposure) < 0.18),
    highTryonLowWant: writeState.styles.filter((item) => item.metrics.tryonSuccess > 80 && rate(item.metrics.want, item.metrics.tryonSuccess) < 0.12),
    highWantLowConfirm: writeState.styles.filter((item) => item.metrics.want > 8 && rate(item.metrics.confirm, item.metrics.want) < 0.25),
    highFailure: writeState.styles.filter((item) => item.metrics.generationSuccessRate < 0.9)
  }
}

function compareVisible() {
  const full = writeState.feedSlots.filter((slot) => slot.visibleType === 'full_visible')
  const half = writeState.feedSlots.filter((slot) => slot.visibleType === 'half_visible')
  return {
    fullConfirmRate: rate(full.reduce((n, s) => n + s.confirm, 0), full.reduce((n, s) => n + s.exposure, 0)),
    halfConfirmRate: rate(half.reduce((n, s) => n + s.confirm, 0), half.reduce((n, s) => n + s.exposure, 0)),
    conclusion: '完整露出转化更高，但要结合位置偏差判断。'
  }
}

function positionBiasReport() {
  return writeState.feedSlots.map((slot) => ({
    styleName: slot.styleName,
    position: slot.position,
    visibleType: slot.visibleType,
    hasBias: slot.position <= 2 && slot.confirm > 30,
    note: slot.position <= 2 ? 'Top slots may amplify strong styles.' : 'Position bias is lower here.'
  }))
}

function aggregateSources() {
  return writeState.styles.reduce((acc: Record<string, number>, style) => {
    Object.entries(style.metrics.sourceBreakdown).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + value
    })
    return acc
  }, {})
}

function classifyBucket(style: ReturnType<typeof findStyle>) {
  const highTryon = style.metrics.tryonSuccess >= 120
  const highIntent = rate(style.metrics.want, style.metrics.tryonSuccess) >= 0.22
  if (highTryon && highIntent) return '爆款'
  if (highTryon && !highIntent) return '引流款'
  if (!highTryon && highIntent) return '潜力款'
  return '弱势款'
}

function sum(key: keyof ReturnType<typeof findStyle>['metrics']) {
  return writeState.styles.reduce((total, style) => total + Number(style.metrics[key] || 0), 0)
}

function avg(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0)
  return valid.length ? Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2)) : 0
}

function rate(part: number, total: number) {
  return total ? Number((part / total).toFixed(3)) : 0
}

function daysSince(date?: string) {
  if (!date) return 999
  return Math.max(0, Math.round((Date.parse('2026-05-29') - Date.parse(date)) / 86400000))
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
