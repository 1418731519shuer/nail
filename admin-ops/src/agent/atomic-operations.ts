export type OperationCategory =
  | 'style_read'
  | 'metric_read'
  | 'data_quality'
  | 'metric_knowledge'
  | 'behavior_analysis'
  | 'trend_analysis'
  | 'recommendation_analysis'
  | 'content_generation'
  | 'report_generation'
  | 'task_management'
  | 'experiment'
  | 'config_management'
  | 'validation'
  | 'permission'
  | 'preview'
  | 'approval'
  | 'write'
  | 'audit'
  | 'rollback'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type AtomicOperation = {
  name: string
  category: OperationCategory
  description: string
  inputSchema: Record<string, any>
  outputSchema: Record<string, any>
  slotRules?: Array<Record<string, any>>
  riskLevel: RiskLevel
  needConfirm: boolean
  needSecondConfirm?: boolean
  canExecuteDirectly: boolean
  allowedRoles?: string[]
  preconditions?: string[]
  postconditions?: string[]
  rollbackSupported?: boolean
  exampleUserQueries: string[]
  usageRule: string
}

const recommendFeedSlotRules = [
  { slot: 'P1', name: '主爆款位', goal: '快速吸引和快速成交', prefer: ['HotUp', 'high_hot_score', 'high_confirm_count', 'high_confirm_rate'], avoid: ['Untested', 'ColdDown', 'low_sample', 'new_style'], metrics: ['click_rate', 'tryon_rate', 'confirm_count', 'confirm_rate'] },
  { slot: 'P2', name: '稳转化位', goal: '保证首屏成交稳定性', prefer: ['Stable', 'high_want_rate', 'high_confirm_rate', 'promoted_style'], avoid: ['high_tryon_low_confirm', 'ColdDown'], metrics: ['want_rate', 'confirm_rate', 'promoted_hit_rate'] },
  { slot: 'P3', name: '潜力激活位', goal: '给低曝光高转化款更多展示机会', prefer: ['Potential', 'low_exposure_high_intent', 'low_exposure_high_confirm'], avoid: ['high_exposure_low_conversion', 'ColdDown'], metrics: ['intent_rate_after_exposure', 'confirm_rate_after_exposure'] },
  { slot: 'P4', name: '首屏风格补位', goal: '避免首屏 4 款风格过于相似', prefer: ['style_diversity', 'different_color', 'different_craft', 'different_style'], avoid: ['duplicate_color', 'duplicate_craft', 'duplicate_style'], metrics: ['click_rate', 'tryon_rate', 'feed_diversity_score'] },
  { slot: 'P5', name: '下滑吸引位', goal: '通过半露出视觉吸引用户继续下滑', prefer: ['visual_strong', 'cat_eye', 'bright_color', 'handpaint', 'festival_style'], avoid: ['weak_cover', 'low_visual_impact'], metrics: ['scroll_continue_rate', 'half_to_full_impression_rate', 'click_rate'] },
  { slot: 'P6', name: '新品测试位', goal: '给新款和样本不足款基础曝光', prefer: ['Untested', 'new_style', 'complete_material', 'review_passed'], avoid: ['incomplete_image', 'incomplete_price', 'unmakeable'], metrics: ['initial_click_rate', 'initial_tryon_rate', 'initial_intent_rate'] },
  { slot: 'P7', name: '潜力扩展位', goal: '继续测试低曝光高转化候补款', prefer: ['Potential', 'low_exposure_high_want', 'low_exposure_high_tryon'], avoid: ['failed_multiple_tests', 'ColdDown'], metrics: ['test_conversion_rate', 'intent_rate', 'confirm_rate'] },
  { slot: 'P8', name: '多样性兜底位', goal: '覆盖小众偏好，保证推荐流丰富度', prefer: ['long_tail_style', 'different_from_previous_slots', 'niche_but_quality'], avoid: ['duplicate_with_previous_slots', 'ColdDown'], metrics: ['long_tail_click_rate', 'niche_intent_rate', 'diversity_score'] }
]

const anyInput = { type: 'object', additionalProperties: true }
const anyOutput = { type: 'object', additionalProperties: true }

function op(
  name: string,
  category: OperationCategory,
  description: string,
  options: Partial<AtomicOperation> = {}
): AtomicOperation {
  const riskLevel = options.riskLevel || 'low'
  return {
    name,
    category,
    description,
    inputSchema: options.inputSchema || anyInput,
    outputSchema: options.outputSchema || anyOutput,
    riskLevel,
    needConfirm: options.needConfirm ?? false,
    needSecondConfirm: options.needSecondConfirm,
    canExecuteDirectly: options.canExecuteDirectly ?? true,
    allowedRoles: options.allowedRoles || ['ops_admin', 'store_operator'],
    preconditions: options.preconditions || [],
    postconditions: options.postconditions || [],
    slotRules: options.slotRules || [],
    rollbackSupported: options.rollbackSupported ?? false,
    exampleUserQueries: options.exampleUserQueries || [],
    usageRule: options.usageRule || '只能通过注册的原子操作调用，不能直接生成 SQL 或绕过业务系统。'
  }
}

const readStyle = [
  ['get_style_basic_info', '获取款式基础信息，包括名称、描述、状态、分类、价格、主图、是否主推、是否冷启动、上架时间、下架时间。'],
  ['get_style_tags', '获取款式标签，包括颜色、风格、工艺、甲长适配、场景、效果标签。'],
  ['get_style_status', '获取款式状态，例如 draft、pending_review、published、hidden、unpublished、archived。'],
  ['get_style_images', '获取款式主图、详情图、参考图、试戴图素材。'],
  ['search_styles', '按关键词、颜色、风格、工艺、甲长、价格、状态搜索款式。'],
  ['get_styles_by_status', '获取草稿、已上架、已下架、待审核、已归档款式。'],
  ['get_crawled_styles', '获取爬取或导入后尚未审核的新款式。']
]

const metricRead = [
  ['get_style_recent_metrics', '获取单款近 N 日核心指标。'],
  ['get_style_daily_metrics', '获取单款每日指标序列。'],
  ['get_style_window_metrics', '获取单款窗口指标。'],
  ['get_style_funnel_metrics', '获取单款转化漏斗。'],
  ['get_store_overview_metrics', '获取门店总览数据。'],
  ['get_store_tag_preference', '获取门店偏好画像。'],
  ['get_user_tag_preference', '获取单个用户偏好画像。'],
  ['get_hot_color_preferences', '获取热门颜色偏好，作为选品或爬取款上架的补充依据。']
]

const dataQuality = [
  ['check_metric_freshness', '检查指标数据是否已更新到指定日期。'],
  ['check_event_tracking_health', '检查曝光、点击、试戴、我想做、确认做等关键埋点是否正常。'],
  ['check_metric_completeness', '检查指定时间范围内指标是否完整。'],
  ['detect_tracking_drop', '检测某类事件是否突然下降，判断是否可能埋点异常。'],
  ['validate_metric_time_range', '校验指标查询时间范围是否合理。']
]

const metricKnowledge = [
  ['get_metric_definition', '获取指标定义和业务含义。'],
  ['get_metric_formula', '获取指标计算公式。'],
  ['explain_metric_change', '解释指标上升或下降的可能原因。'],
  ['compare_metric_with_baseline', '将当前指标与昨日、上周或同类均值对比。'],
  ['get_metric_benchmark', '获取同类款式、同价格带或同工艺的指标基准。']
]

const behavior = [
  ['get_style_exposure_by_slot', '获取某款在不同页面位置的曝光情况。'],
  ['get_valid_impression_count', '获取有效曝光次数和人数。'],
  ['get_style_click_events', '获取款式点击/浏览事件。'],
  ['get_style_tryon_events', '获取款式试戴相关事件。'],
  ['get_style_intent_events', '获取“我想做”相关事件。'],
  ['get_style_confirm_events', '获取“确认要做”相关事件。'],
  ['get_user_behavior_path', '获取单个用户行为路径。'],
  ['get_session_behavior_path', '获取单个 session 的行为路径。'],
  ['get_style_source_breakdown', '获取款式转化来源拆分。']
]

const recommend = [
  ['get_feed_slot_metrics', '获取推荐流各坑位表现。'],
  ['compare_full_visible_vs_half_visible', '比较完整露出 4 款和半露出 4 款的转化表现。'],
  ['get_position_bias_report', '判断某款是否因为长期处在好位置导致看起来热门。'],
  ['detect_over_exposed_styles', '检测曝光过多但转化不佳的款式。'],
  ['detect_under_exposed_potential_styles', '检测曝光不足但转化较好的潜力款。'],
  ['detect_feed_style_duplication', '检测推荐流里颜色、风格、工艺过于重复的问题。'],
  ['get_feed_diversity_score', '计算推荐流多样性分数。'],
  ['recommend_feed_mix', '生成首页 4+4 推荐混排方案，只生成建议，不直接改推荐位。'],
  ['get_section_styles', '获取推荐区块当前款式列表。']
]

const filters = [
  ['get_filter_usage_stats', '统计用户筛选标签使用次数。'],
  ['get_filter_to_tryon_conversion', '分析筛选标签到试戴的转化。'],
  ['get_filter_to_intent_conversion', '分析筛选标签到我想做的转化。'],
  ['get_filter_to_confirm_conversion', '分析筛选标签到确认做的转化。'],
  ['get_filter_keyword_demand', '分析用户主动筛选需求。'],
  ['recommend_filter_tag_adjustment', '建议筛选标签排序、新增、隐藏，只生成建议。']
]

const batchTryon = [
  ['get_batch_tryon_jobs', '查询批量试戴任务。'],
  ['get_tryon_basket_add_stats', '统计款式加入试戴篮次数。'],
  ['get_tryon_basket_remove_stats', '统计款式从试戴篮移除次数。'],
  ['get_co_tryon_style_pairs', '分析经常被一起加入试戴篮的款式组合。'],
  ['get_batch_tryon_result_conversion', '分析一键试戴结果页转化。'],
  ['detect_high_add_low_generate_styles', '检测加入试戴篮多但最终生成少的款式。'],
  ['detect_high_generate_low_intent_styles', '检测生成试戴多但我想做少的款式。']
]

const aiRecommend = [
  ['get_ai_recommend_queries', '查询用户在 AI 推荐页提出的需求。'],
  ['extract_user_preference_from_chat', '从 AI 推荐对话中提取用户偏好。'],
  ['get_ai_recommendation_results', '获取 AI 推荐给用户的款式。'],
  ['get_ai_recommendation_clicks', '获取 AI 推荐结果被点击的数据。'],
  ['get_ai_recommendation_conversion', '分析 AI 推荐带来的转化。'],
  ['get_unmatched_user_demands', '分析用户想要但店内款式库覆盖不足的需求。'],
  ['get_common_user_concerns', '统计用户常见顾虑。']
]

const intent = [
  ['get_want_list_styles', '查询进入“我想做”的款式。'],
  ['get_confirmed_styles', '查询已确认做的款式。'],
  ['get_want_to_confirm_rate', '计算我想做到确认做的转化率。'],
  ['get_confirm_source_breakdown', '拆分确认做来源。'],
  ['get_intent_source_breakdown', '拆分我想做来源。'],
  ['detect_high_want_low_confirm_styles', '检测我想做高但确认做低的款式。'],
  ['detect_direct_confirm_styles', '检测无需试戴也被直接确认的强吸引款。'],
  ['detect_tryon_driven_confirm_styles', '检测试戴后确认率明显提高的款式。']
]

const tryonQuality = [
  ['get_tryon_generation_success_rate', '获取试戴生成成功率。'],
  ['get_tryon_generation_latency', '获取试戴生成耗时。'],
  ['compare_mock_vs_hyperreal_conversion', '比较普通试戴和超仿真试戴的转化效果。'],
  ['get_tryon_result_view_duration', '获取用户查看试戴结果的停留时长。'],
  ['detect_tryon_generation_failures', '检测生成失败率高的款式或任务。'],
  ['detect_styles_with_poor_tryon_result', '检测试戴后表现差的款式。']
]

const trend = [
  ['classify_style_bucket', '将款式分为爆款、引流款、潜力款、弱势款。'],
  ['classify_trend_label', '基于 style_window_metrics 判断趋势标签。'],
  ['detect_low_sample', '检测样本不足。'],
  ['list_hot_candidates', '列出热门候选。'],
  ['list_potential_candidates', '列出潜力候选。'],
  ['list_cold_candidates', '列出冷门/弱势候选。'],
  ['list_replacement_candidates', '为推荐位替换生成候选款式，只生成候选。'],
  ['detect_abnormal_styles', '检测漏斗、生成、推荐位和样式重复异常。']
]

const safetyFilters = [
  ['exclude_promoted_styles', '排除主推款。'],
  ['exclude_newly_published_styles', '排除刚上架未满 N 天的款式。'],
  ['exclude_user_protected_styles', '排除用户明确要求保护的款式。'],
  ['exclude_tag_styles', '排除指定标签款式，例如“猫眼不要下架”。'],
  ['exclude_unmakeable_styles', '排除门店不可制作款式。'],
  ['exclude_low_sample_styles', '排除样本不足款式，避免误判冷门。'],
  ['exclude_duplicate_styles', '排除与已有款高度重复的新款。'],
  ['apply_store_makeability_filter', '应用门店可制作能力过滤。'],
  ['apply_price_level_filter', '应用价格过滤。'],
  ['apply_style_diversity_filter', '应用风格多样性过滤。']
]

const generation = [
  ['generate_style_title', '生成款式标题。'],
  ['generate_style_description', '生成款式介绍。'],
  ['generate_style_tags', '生成颜色、风格、工艺、甲长、效果、场景标签。'],
  ['generate_operation_suggestion', '生成运营建议。'],
  ['generate_operation_report', '生成通用运营报告。']
]

const reports = [
  ['generate_daily_operation_report', '生成今日运营分析报告。'],
  ['generate_weekly_operation_report', '生成本周运营周报。'],
  ['generate_daily_anomaly_report', '生成今日异常报告。'],
  ['generate_feed_performance_report', '生成推荐流表现报告。'],
  ['generate_selection_insight_report', '生成选品分析报告。']
]

const reportLifecycle = [
  ['create_report_draft', '创建运营报告草稿。'],
  ['save_report_snapshot', '保存运营报告快照。'],
  ['get_report_history', '查询历史运营报告。'],
  ['get_report_by_id', '查询指定报告详情。'],
  ['export_report', '导出报告。'],
  ['mark_report_reviewed', '标记报告已查看或已确认。']
]

const taskManagement = [
  ['create_operation_task', '根据运营建议创建待办任务。'],
  ['list_operation_tasks', '查询运营待办任务。'],
  ['update_task_status', '更新待办任务状态。'],
  ['assign_task_owner', '分配任务负责人。'],
  ['convert_report_suggestion_to_task', '将报告中的建议转换为待办任务。']
]

const configManagement = [
  ['get_homepage_sections', '获取首页所有推荐区块及坑位配置。'],
  ['get_section_slot_rules', '获取推荐区块的坑位规则。'],
  ['get_section_publish_status', '获取推荐区块发布状态。'],
  ['get_recommend_config_draft', '获取推荐配置草稿。'],
  ['get_published_recommend_config', '获取当前已发布推荐配置。'],
  ['compare_recommend_config_versions', '比较两个推荐配置版本差异。'],
  ['clone_recommend_config', '复制一份推荐配置作为新草稿。'],
  ['validate_recommend_config', '校验推荐配置是否满足坑位规则、风格多样性和安全约束。']
]

const experiment = [
  ['create_recommendation_experiment', '创建推荐位 A/B 测试实验。'],
  ['assign_experiment_traffic', '为推荐实验分配流量比例。'],
  ['get_experiment_result', '获取推荐实验结果。'],
  ['compare_experiment_variants', '比较实验组和对照组表现。'],
  ['stop_experiment', '停止推荐实验。']
]

const validation = [
  ['check_style_publish_readiness', '检查款式是否满足上架条件。'],
  ['check_style_material_completeness', '检查标题、介绍、价格、标签、图片是否完整。'],
  ['check_style_image_quality', '检查款式图片质量是否满足展示要求。'],
  ['check_style_tag_completeness', '检查款式标签是否完整。'],
  ['check_style_makeability', '检查门店是否可制作该款式。']
]

const coverOptimization = [
  ['detect_cover_weak_styles', '检测曝光高但点击低、疑似封面吸引力弱的款式。'],
  ['list_cover_optimization_candidates', '列出需要优化封面的款式候选。'],
  ['generate_cover_optimization_suggestion', '生成封面图优化建议。']
]

const priceInsights = [
  ['detect_price_conversion_blockers', '检测可能因价格导致确认转化低的款式。'],
  ['compare_price_level_conversion', '比较不同价格档位的转化表现。'],
  ['get_price_band_performance', '获取价格带表现。'],
  ['recommend_price_adjustment', '生成价格调整建议，只建议不执行。']
]

const permission = [
  ['check_operator_permission', '检查当前操作者是否有权限执行指定原子操作。'],
  ['get_operator_role', '获取当前操作者角色。']
]

const previews: Array<[string, string, RiskLevel, boolean?]> = [
  ['preview_update_description', '预览商品介绍修改。', 'medium'],
  ['preview_update_tags', '预览商品标签修改。', 'medium'],
  ['preview_update_cover_image', '预览商品封面修改。', 'medium'],
  ['preview_publish_style', '预览商品上架。', 'high'],
  ['preview_unpublish_style', '预览单款下架。', 'high'],
  ['preview_restore_style', '预览恢复上架。', 'high'],
  ['preview_batch_unpublish', '预览批量下架。', 'critical', true],
  ['preview_replace_single_slot', '预览单个推荐位替换。', 'high'],
  ['preview_replace_section', '预览推荐区块替换。', 'critical', true],
  ['preview_feed_mix_change', '预览推荐流混排调整。', 'medium'],
  ['preview_price_change', '预览价格修改。', 'critical', true],
  ['preview_archive_style', '预览归档款式。', 'critical', true]
]

const approvals = [
  ['create_approval', '创建确认单。'],
  ['get_approval_status', '查看确认单状态。'],
  ['approve_operation', '确认操作。'],
  ['reject_operation', '拒绝操作。'],
  ['execute_approved_operation', '执行 approved 状态确认单。']
]

const writes: Array<[string, string, RiskLevel, boolean?]> = [
  ['update_style_description', '修改商品介绍。', 'medium'],
  ['update_style_tags', '修改商品标签。', 'medium'],
  ['update_style_cover_image', '修改商品封面。', 'medium'],
  ['update_style_price', '修改商品价格。', 'critical', true],
  ['publish_style', '上架款式。', 'high'],
  ['unpublish_style', '下架款式。', 'high'],
  ['archive_style', '归档款式。', 'critical', true],
  ['restore_style', '恢复款式。', 'high'],
  ['replace_single_slot', '替换单个推荐位。', 'high'],
  ['replace_section_styles', '替换推荐区块。', 'critical', true],
  ['save_recommend_config_draft', '保存推荐配置草稿。', 'medium'],
  ['publish_recommend_config', '发布推荐配置。', 'critical', true]
]

const audit = [
  ['write_operation_log', '写入操作日志。'],
  ['get_operation_log', '获取单条操作日志。'],
  ['get_operation_logs', '获取操作日志列表。'],
  ['get_style_change_history', '获取款式变更历史。'],
  ['get_recommend_config_history', '获取推荐配置历史。']
]

const rollback = [
  ['rollback_style_change', '回滚款式变更。'],
  ['rollback_recommend_config', '回滚推荐配置。']
]

export const atomicOperations: AtomicOperation[] = [
  ...readStyle.map(([name, desc]) => op(name, 'style_read', desc)),
  ...metricRead.map(([name, desc]) => op(name, 'metric_read', desc)),
  ...dataQuality.map(([name, desc]) => op(name, 'data_quality', desc, {
    riskLevel: ['detect_tracking_drop'].includes(name) ? 'medium' : 'low',
    usageRule: name === 'validate_metric_time_range'
      ? '所有指标查询和报告生成前建议先校验时间范围，避免跨越不合理窗口。'
      : '用于报告、分析和实验前的数据健康校验，不直接修改业务数据。'
  })),
  ...metricKnowledge.map(([name, desc]) => op(name, 'metric_knowledge', desc, {
    usageRule: '用于解释指标、补充指标知识和对比基准，不直接触发写操作。'
  })),
  ...behavior.map(([name, desc]) => op(name, 'behavior_analysis', desc)),
  ...recommend.map(([name, desc]) => op(name, 'recommendation_analysis', desc, {
    riskLevel: name === 'recommend_feed_mix' ? 'medium' : 'low',
    usageRule: name === 'recommend_feed_mix' ? '只生成推荐混排建议，不直接改推荐位。必须按 P1-P8 逐坑位输出策略、避让项和评估指标。' : undefined,
    slotRules: name === 'recommend_feed_mix' ? recommendFeedSlotRules : undefined,
    outputSchema: name === 'recommend_feed_mix'
      ? {
          type: 'object',
          properties: {
            slots: { type: 'array' },
            diversityScore: { type: 'number' },
            riskNotes: { type: 'array' },
            expectedImpact: { type: 'array' }
          }
        }
      : undefined
  })),
  ...filters.map(([name, desc]) => op(name, 'behavior_analysis', desc, {
    riskLevel: name === 'recommend_filter_tag_adjustment' ? 'medium' : 'low',
    usageRule: name === 'recommend_filter_tag_adjustment' ? '只生成筛选标签建议，不直接改前端配置。' : undefined
  })),
  ...batchTryon.map(([name, desc]) => op(name, 'behavior_analysis', desc)),
  ...aiRecommend.map(([name, desc]) => op(name, 'behavior_analysis', desc)),
  ...intent.map(([name, desc]) => op(name, 'behavior_analysis', desc)),
  ...tryonQuality.map(([name, desc]) => op(name, 'behavior_analysis', desc)),
  ...trend.map(([name, desc]) => op(name, 'trend_analysis', desc, {
    riskLevel: name === 'list_replacement_candidates' ? 'medium' : 'low',
    usageRule: name === 'list_replacement_candidates' ? '只生成候选，不直接替换。' : undefined
  })),
  ...safetyFilters.map(([name, desc]) => op(name, 'trend_analysis', desc)),
  ...generation.map(([name, desc]) => op(name, 'content_generation', desc)),
  ...reports.map(([name, desc]) => op(name, 'report_generation', desc, {
    preconditions: ['建议先调用 check_metric_freshness。', '建议先调用 check_event_tracking_health。'],
    usageRule: '生成报告前应优先检查数据新鲜度和关键埋点健康，避免基于不完整数据输出结论。'
  })),
  ...reportLifecycle.map(([name, desc]) => op(name, 'report_generation', desc, {
    riskLevel: ['export_report', 'mark_report_reviewed'].includes(name) ? 'medium' : 'low',
    usageRule: name === 'export_report'
      ? '导出的是报告产物，不会自动触发运营动作。'
      : '用于报告草稿、快照、历史和查看状态管理，不直接改业务推荐位。'
  })),
  ...taskManagement.map(([name, desc]) => op(name, 'task_management', desc, {
    riskLevel: ['assign_task_owner', 'update_task_status'].includes(name) ? 'medium' : 'low',
    usageRule: name === 'convert_report_suggestion_to_task'
      ? '将报告建议转成待办，不等于自动执行报告建议。'
      : '用于运营待办协作和状态跟踪，不直接修改用户端展示。'
  })),
  ...configManagement.map(([name, desc]) => op(name, 'config_management', desc, {
    riskLevel: ['clone_recommend_config'].includes(name) ? 'medium' : 'low',
    usageRule: name === 'validate_recommend_config'
      ? '用于发布前校验推荐配置是否满足坑位规则、多样性和安全约束。'
      : '用于推荐配置读取、对比、草稿管理和发布状态查询。'
  })),
  ...experiment.map(([name, desc]) => op(name, 'experiment', desc, {
    riskLevel: ['create_recommendation_experiment', 'assign_experiment_traffic', 'stop_experiment'].includes(name) ? 'medium' : 'low',
    usageRule: '推荐实验只创建、分流、分析和停止实验，不直接替换全量推荐位。'
  })),
  ...validation.map(([name, desc]) => op(name, 'validation', desc, {
    usageRule: '用于上架前校验资料、图片、标签和可制作性，不直接执行上架。'
  })),
  ...coverOptimization.map(([name, desc]) => op(name, 'behavior_analysis', desc, {
    riskLevel: name === 'generate_cover_optimization_suggestion' ? 'medium' : 'low',
    usageRule: '只识别封面优化候选并生成建议，不直接替换封面图。'
  })),
  ...priceInsights.map(([name, desc]) => op(name, 'metric_knowledge', desc, {
    riskLevel: name === 'recommend_price_adjustment' ? 'medium' : 'low',
    usageRule: name === 'recommend_price_adjustment'
      ? '只生成价格调整建议，不允许直接改价；改价必须另走 preview_price_change。'
      : '用于分析价格带表现和成交阻力，不直接改价。'
  })),
  ...permission.map(([name, desc]) => op(name, 'permission', desc, {
    riskLevel: 'low',
    usageRule: '所有高风险和极高风险操作应先调用权限检查，再进入预览或执行流程。'
  })),
  ...previews.map(([name, desc, risk, second]) => op(name, 'preview', desc, {
    riskLevel: risk,
    needConfirm: false,
    needSecondConfirm: second,
    rollbackSupported: true,
    preconditions: ['高风险操作建议先调用 check_operator_permission。'],
    usageRule: '只生成操作预览，不执行写库。'
  })),
  ...approvals.map(([name, desc]) => op(name, 'approval', desc, {
    riskLevel: name === 'execute_approved_operation' ? 'high' : 'medium',
    needConfirm: name === 'execute_approved_operation',
    preconditions: ['执行高风险确认单前建议再次调用 check_operator_permission。'],
    usageRule: '确认单状态机操作，执行必须基于 approved 的 approval_id。'
  })),
  ...writes.map(([name, desc, risk, second]) => op(name, 'write', desc, {
    riskLevel: risk,
    needConfirm: true,
    needSecondConfirm: second,
    canExecuteDirectly: false,
    rollbackSupported: true,
    preconditions: ['必须先调用 check_operator_permission。', '必须由 execute_approved_operation 根据 approval_id 间接执行。'],
    postconditions: ['必须调用 write_operation_log。'],
    usageRule: 'AI 不能直接调用写操作，只能通过已批准确认单间接执行。'
  })),
  ...audit.map(([name, desc]) => op(name, 'audit', desc)),
  ...rollback.map(([name, desc]) => op(name, 'rollback', desc, {
    riskLevel: 'high',
    needConfirm: true,
    rollbackSupported: true,
    preconditions: ['建议先调用 check_operator_permission。'],
    usageRule: '回滚前应确认目标日志和 before/after 快照完整，回滚后仍需写入审计日志。'
  }))
]

export const atomicOperationMap = Object.fromEntries(
  atomicOperations.map((operation) => [operation.name, operation])
) as Record<string, AtomicOperation>

export function getAtomicOperation(name: string) {
  return atomicOperationMap[name]
}
