import { checkRisk, extractProtectedConditions } from './risk-checker'

export type IntentType = 'query' | 'analysis' | 'generate' | 'execute' | 'report'
export type FinalResponseType =
  | 'data_answer'
  | 'analysis_report'
  | 'generation_result'
  | 'operation_preview'
  | 'approval_required'
  | 'daily_report'
  | 'weekly_report'
  | 'anomaly_report'
  | 'feed_report'
  | 'selection_report'

export type AgentContext = {
  selectedStyleId?: string
  storeId?: string
  today?: string
  lastReportActions?: Array<{ operationName: string; params: Record<string, any>; reason: string }>
}

export type ToolPlan = {
  intentType: IntentType
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  needConfirm: boolean
  needSecondConfirm?: boolean
  userGoal: string
  objects: {
    styleIds?: string[]
    sectionIds?: string[]
    dateRange?: {
      startDate?: string
      endDate?: string
      windowDays?: number
    }
    filters?: Record<string, any>
    protectedConditions?: string[]
  }
  plan: Array<{
    step: number
    operation: string
    reason: string
    params: Record<string, any>
  }>
  finalResponseType: FinalResponseType
}

function step(operation: string, reason: string, params: Record<string, any> = {}) {
  return { operation, reason, params }
}

function withSteps(base: Omit<ToolPlan, 'plan'>, steps: ReturnType<typeof step>[]): ToolPlan {
  return { ...base, plan: steps.map((item, index) => ({ step: index + 1, ...item })) }
}

function windowDays(input: string) {
  const match = input.match(/近|最近\s*(\d+)\s*天/)
  return match ? Number(match[1]) : /周|本周|这周/.test(input) ? 7 : 7
}

function base(input: string, context: AgentContext, intentType: IntentType, finalResponseType: FinalResponseType): Omit<ToolPlan, 'plan'> {
  const protectedConditions = extractProtectedConditions(input)
  const risk = checkRisk(input)
  return {
    intentType,
    riskLevel: risk.riskLevel,
    needConfirm: risk.needConfirm,
    needSecondConfirm: risk.needSecondConfirm,
    userGoal: input,
    objects: {
      styleIds: context.selectedStyleId ? [context.selectedStyleId] : undefined,
      sectionIds: /首页|推荐/.test(input) ? ['home_feed'] : undefined,
      dateRange: { windowDays: windowDays(input) },
      filters: {},
      protectedConditions
    },
    finalResponseType
  }
}

function extractStyleCode(input: string) {
  return input.match(/\bS\d{3,6}\b/i)?.[0]?.toUpperCase()
}

function extractTargetPosition(input: string) {
  const match = input.match(/(?:位置|第)\s*(\d+)|放到\s*(\d+)/)
  return match ? Number(match[1] || match[2]) : undefined
}

export function planAtomicOperations(userInput: string, context: AgentContext = {}): ToolPlan {
  const input = userInput.trim()
  const lower = input.toLowerCase()
  const styleCode = extractStyleCode(input)
  const targetPosition = extractTargetPosition(input)

  if ((/放到|放在|移到|调整到/.test(input) && targetPosition) || (/位置|推荐位/.test(input) && styleCode)) {
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({
      ...planBase,
      riskLevel: 'high',
      needConfirm: true,
      needSecondConfirm: false,
      objects: {
        ...planBase.objects,
        styleIds: styleCode ? [styleCode] : planBase.objects.styleIds,
        sectionIds: ['home_feed'],
        filters: { ...planBase.objects.filters, targetPosition, tag: /猫眼/.test(input) ? '猫眼' : undefined }
      }
    }, [
      step('search_styles', '按款式编号和标签定位目标款式。', { keyword: styleCode, tag: /猫眼/.test(input) ? '猫眼' : undefined }),
      step('get_section_styles', '读取首页推荐位当前状态。', { sectionId: 'home_feed' }),
      step('preview_replace_single_slot', `预览将目标款放到位置 ${targetPosition} 的前后变化。`, { sectionId: 'home_feed', position: targetPosition, styleId: styleCode }),
      step('create_approval', '替换单个推荐位属于高风险写操作，需要人工确认。')
    ])
  }

  if (styleCode && /恢复|重新上架|恢复上架|再次上架/.test(input)) {
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({
      ...planBase,
      riskLevel: 'high',
      needConfirm: true,
      objects: {
        ...planBase.objects,
        styleIds: [styleCode],
        filters: { ...planBase.objects.filters, targetStatus: 'published' }
      }
    }, [
      step('search_styles', '按款式编号定位要恢复上架的款式。', { keyword: styleCode }),
      step('get_style_status', '读取当前款式状态，确认是否可恢复。', { styleId: styleCode }),
      step('preview_restore_style', '预览恢复上架后的状态和影响。', { styleId: styleCode }),
      step('create_approval', '恢复上架属于高风险写操作，需要人工确认。')
    ])
  }

  if (styleCode && /下架|隐藏|不展示|删除/.test(input)) {
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({
      ...planBase,
      riskLevel: /删除/.test(input) ? 'critical' : 'high',
      needConfirm: true,
      needSecondConfirm: /删除/.test(input) || undefined,
      objects: {
        ...planBase.objects,
        styleIds: [styleCode],
        filters: { ...planBase.objects.filters, targetStatus: 'unpublished' }
      }
    }, [
      step('search_styles', '按款式编号定位要下架的款式。', { keyword: styleCode }),
      step('get_style_status', '读取当前款式状态。', { styleId: styleCode }),
      step('get_style_funnel_metrics', '读取漏斗指标，作为下架依据。', { styleId: styleCode }),
      step('preview_unpublish_style', '预览单款下架，不物理删除。', { styleId: styleCode }),
      step('create_approval', '单款下架属于高风险写操作，需要人工确认。')
    ])
  }

  if (styleCode && /归档|作废/.test(input)) {
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({
      ...planBase,
      riskLevel: 'critical',
      needConfirm: true,
      needSecondConfirm: true,
      objects: {
        ...planBase.objects,
        styleIds: [styleCode],
        filters: { ...planBase.objects.filters, targetStatus: 'archived' }
      }
    }, [
      step('search_styles', '按款式编号定位要归档的款式。', { keyword: styleCode }),
      step('get_style_status', '读取当前款式状态。', { styleId: styleCode }),
      step('preview_archive_style', '预览归档影响，不物理删除。', { styleId: styleCode }),
      step('create_approval', '归档属于极高风险写操作，需要二次确认。')
    ])
  }

  if (styleCode && /改价|价格|调价/.test(input)) {
    const price = Number(input.match(/(?:改价到|价格改成|调到|到)\s*(\d+)/)?.[1] || input.match(/\b(\d{2,4})\b/)?.[1])
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({
      ...planBase,
      riskLevel: 'critical',
      needConfirm: true,
      needSecondConfirm: true,
      objects: {
        ...planBase.objects,
        styleIds: [styleCode],
        filters: { ...planBase.objects.filters, price }
      }
    }, [
      step('search_styles', '按款式编号定位要改价的款式。', { keyword: styleCode }),
      step('get_style_basic_info', '读取当前价格和基础信息。', { styleId: styleCode }),
      step('preview_price_change', '预览改价前后对比。', { styleId: styleCode, price }),
      step('create_approval', '改价属于极高风险写操作，需要二次确认。')
    ])
  }

  if (styleCode && /标签/.test(input) && /改|更新|设置|加|删/.test(input)) {
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({
      ...planBase,
      riskLevel: 'medium',
      needConfirm: true,
      objects: { ...planBase.objects, styleIds: [styleCode] }
    }, [
      step('search_styles', '按款式编号定位要修改标签的款式。', { keyword: styleCode }),
      step('get_style_tags', '读取当前标签。', { styleId: styleCode }),
      step('generate_style_tags', '根据用户描述生成新标签建议。', { styleId: styleCode, instruction: input }),
      step('preview_update_tags', '预览标签前后变化。', { styleId: styleCode }),
      step('create_approval', '修改标签需要人工确认。')
    ])
  }

  if (styleCode && /封面|主图|图片/.test(input) && /改|换|更新|设置/.test(input)) {
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({
      ...planBase,
      riskLevel: 'medium',
      needConfirm: true,
      objects: { ...planBase.objects, styleIds: [styleCode] }
    }, [
      step('search_styles', '按款式编号定位要修改封面的款式。', { keyword: styleCode }),
      step('get_style_images', '读取当前主图和素材。', { styleId: styleCode }),
      step('preview_update_cover_image', '预览封面图修改。', { styleId: styleCode }),
      step('create_approval', '修改封面需要人工确认。')
    ])
  }

  if (/按.*报告.*执行/.test(input)) {
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({ ...planBase, riskLevel: 'critical', needConfirm: true, needSecondConfirm: true }, [
      step('preview_batch_unpublish', '报告建议中的下架动作必须先拆成独立预览。', { source: 'last_report' }),
      step('preview_replace_section', '报告建议中的推荐位替换必须先预览影响。', { sectionId: 'home_feed' }),
      step('preview_update_description', '报告建议中的介绍优化必须展示前后对比。', {}),
      step('create_approval', '每个写操作都创建确认单，不能按报告自动执行。', {})
    ])
  }

  if (/今日|今天|日报|运营情况|今天分析/.test(input) && /报告|怎么样|情况|分析/.test(input)) {
    return withSteps(base(input, context, 'report', 'daily_report'), [
      step('get_store_overview_metrics', '读取今日门店总览，并默认对比昨日。', { store_id: context.storeId || 'store-001', compare_to: 'yesterday' }),
      step('list_hot_candidates', '找今日热门款。'),
      step('list_potential_candidates', '找今日潜力款。'),
      step('list_cold_candidates', '找今日冷门/弱势款。'),
      step('detect_abnormal_styles', '检测漏斗和推荐异常。'),
      step('get_feed_slot_metrics', '读取首页推荐位表现。'),
      step('get_want_to_confirm_rate', '读取我想做到确认做转化。'),
      step('get_tryon_generation_success_rate', '读取试戴生成成功率。'),
      step('generate_daily_operation_report', '生成今日运营分析报告。', { compare_to: 'yesterday' })
    ])
  }

  if (/周报|本周|这周/.test(input) && /报告|怎么样|表现|分析/.test(input)) {
    return withSteps(base(input, context, 'report', 'weekly_report'), [
      step('get_store_overview_metrics', '读取本周总览并对比上一周。'),
      step('get_style_window_metrics', '读取 7 日窗口指标。', { windowDays: 7 }),
      step('get_store_tag_preference', '分析本周用户偏好变化。'),
      step('get_feed_slot_metrics', '读取推荐位表现。'),
      step('detect_over_exposed_styles', '检测曝光过多但转化不佳。'),
      step('detect_under_exposed_potential_styles', '检测曝光不足潜力款。'),
      step('generate_weekly_operation_report', '生成本周运营周报。', { compare_to_previous_week: true })
    ])
  }

  if (/异常|不对劲|异常款式/.test(input)) {
    return withSteps(base(input, context, 'report', 'anomaly_report'), [
      step('detect_abnormal_styles', '综合检测异常款式。'),
      step('detect_high_want_low_confirm_styles', '检测想做高但确认低。'),
      step('detect_high_generate_low_intent_styles', '检测试戴高但想做低。'),
      step('detect_tryon_generation_failures', '检测试戴生成失败。'),
      step('get_position_bias_report', '排查位置偏差。'),
      step('generate_daily_anomaly_report', '生成今日异常报告。')
    ])
  }

  if (/推荐位|首屏|半露出/.test(input) && /表现|报告|今天/.test(input)) {
    return withSteps(base(input, context, 'report', 'feed_report'), [
      step('get_feed_slot_metrics', '读取推荐坑位指标。'),
      step('compare_full_visible_vs_half_visible', '比较完整露出和半露出。'),
      step('get_position_bias_report', '检查位置偏差。'),
      step('detect_feed_style_duplication', '检查风格重复。'),
      step('detect_over_exposed_styles', '检测过曝款。'),
      step('detect_under_exposed_potential_styles', '检测低曝潜力款。'),
      step('generate_feed_performance_report', '生成推荐位报告。')
    ])
  }

  if (/下周.*上|选品|喜欢什么风格|缺什么款|上什么新款/.test(input)) {
    return withSteps(base(input, context, 'report', 'selection_report'), [
      step('get_store_tag_preference', '读取门店颜色、风格、工艺、甲长偏好。'),
      step('get_ai_recommend_queries', '读取 AI 推荐对话需求。'),
      step('get_unmatched_user_demands', '识别店内覆盖不足方向。'),
      step('get_common_user_concerns', '统计常见顾虑。'),
      step('generate_selection_insight_report', '生成选品分析报告。')
    ])
  }

  if (/首页前\s*8|前\s*8\s*款|怎么排|混排/.test(input)) {
    return withSteps(base(input, context, 'analysis', 'operation_preview'), [
      step('get_feed_slot_metrics', '读取当前前 8 坑位表现。'),
      step('list_hot_candidates', '选择热门/稳定款承接成交。'),
      step('list_potential_candidates', '选择低曝光高转化潜力款。'),
      step('get_store_tag_preference', '结合门店偏好做风格补位。'),
      step('detect_feed_style_duplication', '避免首页风格过于重复。'),
      step('recommend_feed_mix', '生成首屏 4 款 + 半露出 4 款方案。'),
      step('preview_feed_mix_change', '展示推荐流混排预览，不直接替换。')
    ])
  }

  if (/替换|换掉|换成/.test(input) && /首页|推荐|推荐位|弱势/.test(input)) {
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({ ...planBase, riskLevel: 'critical', needConfirm: true, needSecondConfirm: true }, [
      step('get_section_styles', '读取当前推荐区块。', { sectionId: 'home_feed' }),
      step('get_style_window_metrics', '读取区块内款式趋势。'),
      step('list_cold_candidates', '找需要替换的弱势款。'),
      step('list_hot_candidates', '找热门替换候选。'),
      step('list_potential_candidates', '找潜力替换候选。'),
      step('list_replacement_candidates', '生成替换候选，不直接替换。'),
      step('preview_replace_section', '预览推荐位替换影响。'),
      step('create_approval', '高风险推荐位替换需要确认单。')
    ])
  }

  if (/爬取|导入|新款/.test(input) && /上架|适合|能上/.test(input)) {
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({ ...planBase, riskLevel: 'high', needConfirm: true }, [
      step('get_crawled_styles', '读取待审核爬取款。'),
      step('exclude_duplicate_styles', '排除与现有款高度重复。'),
      step('apply_store_makeability_filter', '排除门店不可制作款。'),
      step('get_store_tag_preference', '结合门店偏好画像。'),
      step('get_hot_color_preferences', '补充热门颜色依据。'),
      step('generate_style_title', '生成上架标题。'),
      step('generate_style_description', '生成介绍。'),
      step('generate_style_tags', '生成标签。'),
      step('preview_publish_style', '预览上架资料完整度。'),
      step('create_approval', '上架写操作需要确认。')
    ])
  }

  if (/介绍|描述|小红书|文案/.test(input) && /改|优化|更适合|帮我/.test(input)) {
    const planBase = base(input, context, 'generate', 'approval_required')
    return withSteps({ ...planBase, riskLevel: 'medium', needConfirm: true }, [
      step('get_style_basic_info', '读取原介绍。', { styleId: context.selectedStyleId || 'style-gradient-003' }),
      step('get_style_tags', '读取标签作为文案依据。'),
      step('generate_style_description', '生成更适合小红书的介绍。', { tone: 'xiaohongshu' }),
      step('preview_update_description', '展示原介绍和新介绍。'),
      step('create_approval', '修改介绍需要确认。')
    ])
  }

  if (/下架|删除|隐藏|冷掉|表现差|弱势/.test(input)) {
    const protectedConditions = extractProtectedConditions(input)
    const steps = [
      step('list_cold_candidates', '基于指标列出冷门/弱势候选。'),
      ...(/猫眼/.test(input) ? [step('exclude_tag_styles', '执行保护条件：猫眼不要下架。', { tag: '猫眼' })] : []),
      ...(/主推/.test(input) || protectedConditions.length ? [step('exclude_promoted_styles', '排除主推保护款。')] : []),
      step('exclude_newly_published_styles', '排除刚上架未满 N 天款式。', { minDays: 7 }),
      step('exclude_low_sample_styles', '排除样本不足，避免误判冷门。'),
      step('get_style_funnel_metrics', '补充漏斗数据作为下架原因。'),
      step('preview_batch_unpublish', '生成批量下架预览，不执行。'),
      step('create_approval', '批量下架属于极高风险，创建二次确认单。')
    ]
    const planBase = base(input, context, 'execute', 'approval_required')
    return withSteps({ ...planBase, riskLevel: 'critical', needConfirm: true, needSecondConfirm: true }, steps)
  }

  if (/试戴高|很多人试|不成交|没人确认/.test(input)) {
    return withSteps(base(input, context, 'analysis', 'analysis_report'), [
      step('get_style_funnel_metrics', '读取曝光到确认的完整漏斗。'),
      step('get_tryon_result_view_duration', '查看试戴结果停留时长。'),
      step('get_want_to_confirm_rate', '查看想做转确认。'),
      step('get_confirm_source_breakdown', '拆分确认来源。'),
      step('detect_high_generate_low_intent_styles', '定位试戴高但意向低的款式。')
    ])
  }

  if (/哪些.*变热|哪些.*热门|热门/.test(input) && !/这个|这款/.test(input)) {
    return withSteps(base(input, context, 'analysis', 'analysis_report'), [
      step('list_hot_candidates', '列出近 7 天热门候选。'),
      step('get_style_window_metrics', '读取 hot_score、growth_score、trend_label。'),
      step('get_feed_slot_metrics', '读取位置曝光，避免只看总量。'),
      step('get_position_bias_report', '检查位置偏差。')
    ])
  }

  if (/潜力|曝光少.*值得推|值得推/.test(input)) {
    return withSteps(base(input, context, 'analysis', 'analysis_report'), [
      step('list_potential_candidates', '列出潜力候选。'),
      step('detect_under_exposed_potential_styles', '检测低曝光高转化。'),
      step('exclude_low_sample_styles', '排除样本不足款。'),
      step('apply_style_diversity_filter', '保持风格多样性。')
    ])
  }

  return withSteps(base(input || '这个款热门不热门？', context, lower ? 'analysis' : 'query', 'analysis_report'), [
    step('get_style_basic_info', '读取款式基础信息。', { styleId: context.selectedStyleId || 'style-gradient-003' }),
    step('get_style_window_metrics', '读取近 N 日趋势分。', { windowDays: windowDays(input) }),
    step('get_style_daily_metrics', '读取每日指标序列。'),
    step('get_style_funnel_metrics', '读取转化漏斗。')
  ])
}
