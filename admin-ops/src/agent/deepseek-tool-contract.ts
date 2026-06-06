import { atomicOperations } from './atomic-operations'

const planCallableOperations = new Set([
  'get_style_basic_info',
  'search_styles',
  'get_section_styles',
  'get_feed_slot_metrics',
  'get_style_window_metrics',
  'list_hot_candidates',
  'list_potential_candidates',
  'list_cold_candidates',
  'list_replacement_candidates',
  'preview_replace_single_slot',
  'preview_replace_section',
  'preview_feed_mix_change',
  'preview_batch_unpublish',
  'preview_publish_style',
  'preview_unpublish_style',
  'preview_restore_style',
  'preview_update_tags',
  'preview_update_cover_image',
  'preview_price_change',
  'preview_archive_style',
  'preview_update_description',
  'create_approval',
  'approve_operation',
  'execute_approved_operation',
  'write_operation_log'
])

export function buildDeepSeekToolContract() {
  return {
    protocol: 'nail_ops_atomic_tool_plan_v1',
    ruleSummary: [
      'DeepSeek 只负责选择和组合原子操作，不直接生成 SQL，不直接修改数据库。',
      '输出必须是 JSON ToolPlan，不要输出自然语言执行结果。',
      '任何写操作必须先使用 preview_*，再 create_approval。',
      'execute_approved_operation 只能在用户确认后由业务系统调用，DeepSeek 不能直接安排底层 write 操作。',
      '契约会提供完整注册表；category=write 的操作只表示系统能力，不能直接放进 ToolPlan.plan。',
      '用户指定保护条件必须放入 objects.protectedConditions，并加入 exclude_* 操作。',
      '删除需求必须转成 unpublish_style 或 archive_style 的预览确认流程。'
    ],
    outputSchema: {
      intentType: 'query|analysis|generate|execute|report',
      riskLevel: 'low|medium|high|critical',
      needConfirm: 'boolean',
      needSecondConfirm: 'boolean optional',
      userGoal: 'string',
      objects: {
        styleIds: 'string[] optional; can contain style code such as S0244 before system resolves it',
        sectionIds: 'string[] optional',
        filters: 'object optional',
        protectedConditions: 'string[] optional'
      },
      plan: [
        {
          step: 'number',
          operation: 'registered atomic operation name',
          reason: 'why this operation is needed',
          params: 'object'
        }
      ],
      finalResponseType: 'data_answer|analysis_report|generation_result|operation_preview|approval_required|daily_report|weekly_report|anomaly_report|feed_report|selection_report'
    },
    operations: atomicOperations
      .map((operation) => ({
        name: operation.name,
        category: operation.category,
        description: operation.description,
        riskLevel: operation.riskLevel,
        needConfirm: operation.needConfirm,
        needSecondConfirm: operation.needSecondConfirm,
        canExecuteDirectly: operation.canExecuteDirectly,
        callableInPlan: operation.category !== 'write' || planCallableOperations.has(operation.name),
        directWriteForbidden: operation.category === 'write',
        slotRules: operation.slotRules,
        outputSchema: operation.outputSchema,
        usageRule: operation.usageRule
      })),
    writeRouting: {
      update_style_description: 'preview_update_description -> create_approval -> execute_approved_operation',
      update_style_tags: 'preview_update_tags -> create_approval -> execute_approved_operation',
      update_style_cover_image: 'preview_update_cover_image -> create_approval -> execute_approved_operation',
      update_style_price: 'preview_price_change -> create_approval -> execute_approved_operation',
      publish_style: 'preview_publish_style -> create_approval -> execute_approved_operation',
      unpublish_style: 'preview_unpublish_style 或 preview_batch_unpublish -> create_approval -> execute_approved_operation',
      archive_style: 'preview_archive_style -> create_approval -> execute_approved_operation',
      restore_style: 'preview_restore_style -> create_approval -> execute_approved_operation',
      replace_single_slot: 'preview_replace_single_slot -> create_approval -> execute_approved_operation',
      replace_section_styles: 'preview_replace_section -> create_approval -> execute_approved_operation',
      save_recommend_config_draft: 'preview_feed_mix_change -> 人工确认草稿保存策略',
      publish_recommend_config: 'preview_feed_mix_change 或 preview_replace_section -> create_approval -> execute_approved_operation'
    },
    examples: [
      {
        user: '猫眼款 S0244，这款放到位置2',
        plan: {
          intentType: 'execute',
          riskLevel: 'high',
          needConfirm: true,
          userGoal: '猫眼款 S0244 放到首页推荐位 2',
          objects: { styleIds: ['S0244'], sectionIds: ['home_feed'], filters: { targetPosition: 2 } },
          plan: [
            { step: 1, operation: 'search_styles', reason: '用款式编码和猫眼标签定位目标款。', params: { keyword: 'S0244', tag: '猫眼' } },
            { step: 2, operation: 'get_section_styles', reason: '读取首页推荐位当前位置。', params: { sectionId: 'home_feed' } },
            { step: 3, operation: 'preview_replace_single_slot', reason: '预览把目标款放到位置 2 的前后变化。', params: { sectionId: 'home_feed', position: 2, styleId: 'S0244' } },
            { step: 4, operation: 'create_approval', reason: '单个推荐位替换属于高风险写操作，需要人工确认。', params: {} }
          ],
          finalResponseType: 'approval_required'
        }
      }
    ]
  }
}

export function buildDeepSeekPlannerPrompt() {
  return `你是美甲运营端 Tool Planner。你不能直接回答运营建议，必须基于以下原子操作契约输出 JSON ToolPlan。\n\n${JSON.stringify(buildDeepSeekToolContract(), null, 2)}`
}
