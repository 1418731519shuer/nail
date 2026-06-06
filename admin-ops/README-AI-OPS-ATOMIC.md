# 美甲运营端 AI 助手原子操作 README

## 1. 当前状态

当前运营端 AI 助手已经接入一套完整的原子操作体系，核心约束如下：

- AI 不能直接生成 SQL。
- AI 不能直接调用底层写库。
- 所有写操作必须走 `preview_* -> create_approval -> execute_approved_operation`。
- 所有执行结果都会进入审计日志。
- 所有可回滚操作都保留 `before/after` 快照。

当前注册原子操作总数：`131`

当前覆盖状态：

- 原子操作注册表：已完成
- 本地执行器映射：已完成
- DeepSeek 工具契约：已完成
- 前端 AI 抽屉接线：已完成
- 覆盖校验脚本：已完成

校验脚本：

- `admin-ops/scripts/check-agent-coverage.mjs`

## 2. 代码入口

核心文件如下：

- [atomic-operations.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/atomic-operations.ts)：原子操作注册表
- [tool-planner.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/tool-planner.ts)：本地 Tool Planner
- [deepseek-tool-contract.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/deepseek-tool-contract.ts)：发给 DeepSeek 的工具契约
- [risk-checker.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/risk-checker.ts)：风险判断
- [preview-builder.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/preview-builder.ts)：操作预览与推荐流策略
- [approval-manager.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/approval-manager.ts)：确认单状态机
- [audit-logger.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/audit-logger.ts)：审计日志
- [agent-executor.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/agent-executor.ts)：执行器
- [system-prompt.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/system-prompt.ts)：系统 Prompt
- [App.vue](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/App.vue)：运营端 AI 抽屉 UI

## 3. 原子操作总览

### `style_read` 7 个

- `get_style_basic_info`
- `get_style_tags`
- `get_style_status`
- `get_style_images`
- `search_styles`
- `get_styles_by_status`
- `get_crawled_styles`

### `metric_read` 8 个

- `get_style_recent_metrics`
- `get_style_daily_metrics`
- `get_style_window_metrics`
- `get_style_funnel_metrics`
- `get_store_overview_metrics`
- `get_store_tag_preference`
- `get_user_tag_preference`
- `get_hot_color_preferences`

### `behavior_analysis` 43 个

- `get_style_exposure_by_slot`
- `get_valid_impression_count`
- `get_style_click_events`
- `get_style_tryon_events`
- `get_style_intent_events`
- `get_style_confirm_events`
- `get_user_behavior_path`
- `get_session_behavior_path`
- `get_style_source_breakdown`
- `get_filter_usage_stats`
- `get_filter_to_tryon_conversion`
- `get_filter_to_intent_conversion`
- `get_filter_to_confirm_conversion`
- `get_filter_keyword_demand`
- `recommend_filter_tag_adjustment`
- `get_batch_tryon_jobs`
- `get_tryon_basket_add_stats`
- `get_tryon_basket_remove_stats`
- `get_co_tryon_style_pairs`
- `get_batch_tryon_result_conversion`
- `detect_high_add_low_generate_styles`
- `detect_high_generate_low_intent_styles`
- `get_ai_recommend_queries`
- `extract_user_preference_from_chat`
- `get_ai_recommendation_results`
- `get_ai_recommendation_clicks`
- `get_ai_recommendation_conversion`
- `get_unmatched_user_demands`
- `get_common_user_concerns`
- `get_want_list_styles`
- `get_confirmed_styles`
- `get_want_to_confirm_rate`
- `get_confirm_source_breakdown`
- `get_intent_source_breakdown`
- `detect_high_want_low_confirm_styles`
- `detect_direct_confirm_styles`
- `detect_tryon_driven_confirm_styles`
- `get_tryon_generation_success_rate`
- `get_tryon_generation_latency`
- `compare_mock_vs_hyperreal_conversion`
- `get_tryon_result_view_duration`
- `detect_tryon_generation_failures`
- `detect_styles_with_poor_tryon_result`

### `recommendation_analysis` 9 个

- `get_feed_slot_metrics`
- `compare_full_visible_vs_half_visible`
- `get_position_bias_report`
- `detect_over_exposed_styles`
- `detect_under_exposed_potential_styles`
- `detect_feed_style_duplication`
- `get_feed_diversity_score`
- `recommend_feed_mix`
- `get_section_styles`

### `trend_analysis` 18 个

- `classify_style_bucket`
- `classify_trend_label`
- `detect_low_sample`
- `list_hot_candidates`
- `list_potential_candidates`
- `list_cold_candidates`
- `list_replacement_candidates`
- `detect_abnormal_styles`
- `exclude_promoted_styles`
- `exclude_newly_published_styles`
- `exclude_user_protected_styles`
- `exclude_tag_styles`
- `exclude_unmakeable_styles`
- `exclude_low_sample_styles`
- `exclude_duplicate_styles`
- `apply_store_makeability_filter`
- `apply_price_level_filter`
- `apply_style_diversity_filter`

### `content_generation` 5 个

- `generate_style_title`
- `generate_style_description`
- `generate_style_tags`
- `generate_operation_suggestion`
- `generate_operation_report`

### `report_generation` 5 个

- `generate_daily_operation_report`
- `generate_weekly_operation_report`
- `generate_daily_anomaly_report`
- `generate_feed_performance_report`
- `generate_selection_insight_report`

### `preview` 12 个

- `preview_update_description`
- `preview_update_tags`
- `preview_update_cover_image`
- `preview_publish_style`
- `preview_unpublish_style`
- `preview_restore_style`
- `preview_batch_unpublish`
- `preview_replace_single_slot`
- `preview_replace_section`
- `preview_feed_mix_change`
- `preview_price_change`
- `preview_archive_style`

### `approval` 5 个

- `create_approval`
- `get_approval_status`
- `approve_operation`
- `reject_operation`
- `execute_approved_operation`

### `write` 12 个

- `update_style_description`
- `update_style_tags`
- `update_style_cover_image`
- `update_style_price`
- `publish_style`
- `unpublish_style`
- `archive_style`
- `restore_style`
- `replace_single_slot`
- `replace_section_styles`
- `save_recommend_config_draft`
- `publish_recommend_config`

### `audit` 5 个

- `write_operation_log`
- `get_operation_log`
- `get_operation_logs`
- `get_style_change_history`
- `get_recommend_config_history`

### `rollback` 2 个

- `rollback_style_change`
- `rollback_recommend_config`

## 4. DeepSeek 可使用情况

### 4.1 DeepSeek 已接入并可规划使用

DeepSeek 当前拿到的是完整注册表，不是只拿一小部分工具名。

DeepSeek 当前能看到：

- 所有 `131` 个原子操作
- 每个操作的 `category`
- `riskLevel`
- `needConfirm`
- `needSecondConfirm`
- `canExecuteDirectly`
- `usageRule`
- `outputSchema`
- `recommend_feed_mix.slotRules`

### 4.2 DeepSeek 可直接写进 `ToolPlan.plan` 的操作

规则：

- 所有非 `write` 类操作都可以进 `ToolPlan.plan`
- `write` 类操作不会被允许直接进 `ToolPlan.plan`
- `write` 类只作为系统能力对 DeepSeek 可见，用来告诉它应该走哪条预览链路

也就是说：

- 可直接规划调用：`119` 个
- 不能直接规划调用的底层写操作：`12` 个

### 4.3 DeepSeek 不能直接调用的操作

以下操作 DeepSeek 能看见，但不能直接塞进 `ToolPlan.plan`：

- `update_style_description`
- `update_style_tags`
- `update_style_cover_image`
- `update_style_price`
- `publish_style`
- `unpublish_style`
- `archive_style`
- `restore_style`
- `replace_single_slot`
- `replace_section_styles`
- `save_recommend_config_draft`
- `publish_recommend_config`

这些操作必须通过下面的链路间接执行。

## 5. 写操作路由

DeepSeek 当前已经知道这些写操作应该怎么走：

- `update_style_description`
  `preview_update_description -> create_approval -> execute_approved_operation`
- `update_style_tags`
  `preview_update_tags -> create_approval -> execute_approved_operation`
- `update_style_cover_image`
  `preview_update_cover_image -> create_approval -> execute_approved_operation`
- `update_style_price`
  `preview_price_change -> create_approval -> execute_approved_operation`
- `publish_style`
  `preview_publish_style -> create_approval -> execute_approved_operation`
- `unpublish_style`
  `preview_unpublish_style` 或 `preview_batch_unpublish` -> `create_approval` -> `execute_approved_operation`
- `archive_style`
  `preview_archive_style -> create_approval -> execute_approved_operation`
- `restore_style`
  `preview_restore_style -> create_approval -> execute_approved_operation`
- `replace_single_slot`
  `preview_replace_single_slot -> create_approval -> execute_approved_operation`
- `replace_section_styles`
  `preview_replace_section -> create_approval -> execute_approved_operation`
- `save_recommend_config_draft`
  `preview_feed_mix_change -> 人工确认草稿保存策略`
- `publish_recommend_config`
  `preview_feed_mix_change` 或 `preview_replace_section` -> `create_approval` -> `execute_approved_operation`

## 6. `recommend_feed_mix` 的坑位策略

`recommend_feed_mix` 已经不是泛泛的“热门 + 潜力 + 新品 + 多样性”，而是带完整 `P1-P8` 策略。

当前已接入：

- `P1` 主爆款位
- `P2` 稳转化位
- `P3` 潜力激活位
- `P4` 首屏风格补位
- `P5` 下滑吸引位
- `P6` 新品测试位
- `P7` 潜力扩展位
- `P8` 多样性兜底位

当前 `recommend_feed_mix` 会输出：

- `slots`
- `diversityScore`
- `riskNotes`
- `expectedImpact`

当前 `preview_feed_mix_change` 会展示：

- 原推荐流
- 新的 `P1-P8`
- 每个坑位的策略原因
- 多样性分
- 风险提示
- “按该策略生成确认单”入口

## 7. 当前已验证可跑通的能力

已经实测通过的执行链路：

- `猫眼款 S0244，这款放到位置2`
- `S0244 下架`
- `S0244 恢复上架`
- `把最近冷掉的款下架，但猫眼不要动`
- `首页前 8 款怎么排？`
- `按该策略生成确认单`

已经实测通过的系统能力：

- 生成预览
- 创建确认单
- 普通确认
- 二次确认
- 执行写操作
- 写审计日志
- 回滚推荐位配置
- 回滚款式状态

## 8. 目前仍是 Mock 的部分

当前这套系统已经能跑，但底层仍是 Mock 数据驱动，不是真实数据库。

后续接真实数据库时，主要替换点如下：

- [mock-data.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/mock-data.ts)
- [agent-executor.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/agent-executor.ts) 里的 `executeMockOperation`
- `preview-builder` 中依赖 `writeState` 的策略计算
- `audit-logger` 的内存日志存储
- `approval-manager` 的内存确认单存储

建议未来接库时的替换顺序：

1. 先替换读取类操作
2. 再替换报告和推荐分析类
3. 最后替换审批、写操作、审计和回滚

## 9. 如何检查当前接线

常用检查方式：

- 构建检查：`npm run build`
- 覆盖检查：`node scripts/check-agent-coverage.mjs`
- 流程检查：`node scripts/test-agent-flow.mjs`

浏览器手测入口：

- `http://127.0.0.1:3001/recommend`
- 右下角 `AI 运营助手`

建议测试语句：

- `首页前 8 款怎么排？`
- `猫眼款 S0244，这款放到位置2`
- `S0244 下架`
- `S0244 恢复上架`
- `把最近冷掉的款下架，但猫眼不要动`

---

## 2026-05-30 Clean Update

- Atomic operations registered: `179`
- DeepSeek-visible operations: `179`
- Directly plannable non-write operations: `167`
- Indirect-only write operations: `12`
- Coverage check: `node scripts/check-agent-coverage.mjs` passed
- Build check: `npm run build` passed

### Newly wired into the executor

The following groups now return stable mock results from [agent-executor.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/agent-executor.ts), not just registry metadata:

- `data_quality`
  - `check_metric_freshness`
  - `check_event_tracking_health`
  - `check_metric_completeness`
  - `detect_tracking_drop`
  - `validate_metric_time_range`

- `metric_knowledge`
  - `get_metric_definition`
  - `get_metric_formula`
  - `explain_metric_change`
  - `compare_metric_with_baseline`
  - `get_metric_benchmark`

- `report lifecycle`
  - `create_report_draft`
  - `save_report_snapshot`
  - `get_report_history`
  - `get_report_by_id`
  - `export_report`
  - `mark_report_reviewed`

- `task_management`
  - `create_operation_task`
  - `list_operation_tasks`
  - `update_task_status`
  - `assign_task_owner`
  - `convert_report_suggestion_to_task`

- `config_management`
  - `get_homepage_sections`
  - `get_section_slot_rules`
  - `get_section_publish_status`
  - `get_recommend_config_draft`
  - `get_published_recommend_config`
  - `compare_recommend_config_versions`
  - `clone_recommend_config`
  - `validate_recommend_config`

- `experiment`
  - `create_recommendation_experiment`
  - `assign_experiment_traffic`
  - `get_experiment_result`
  - `compare_experiment_variants`
  - `stop_experiment`

- `validation`
  - `check_style_publish_readiness`
  - `check_style_material_completeness`
  - `check_style_image_quality`
  - `check_style_tag_completeness`
  - `check_style_makeability`

- `cover optimization`
  - `detect_cover_weak_styles`
  - `list_cover_optimization_candidates`
  - `generate_cover_optimization_suggestion`

- `price insights`
  - `detect_price_conversion_blockers`
  - `compare_price_level_conversion`
  - `get_price_band_performance`
  - `recommend_price_adjustment`

- `permission`
  - `check_operator_permission`
  - `get_operator_role`

### Still indirect-only

These `write` operations are still visible to DeepSeek but cannot be placed directly in `ToolPlan.plan`:

- `update_style_description`
- `update_style_tags`
- `update_style_cover_image`
- `update_style_price`
- `publish_style`
- `unpublish_style`
- `archive_style`
- `restore_style`
- `replace_single_slot`
- `replace_section_styles`
- `save_recommend_config_draft`
- `publish_recommend_config`

### Mock state added

New mock state now lives in [mock-data.ts](C:/Users/chen/Documents/Codex/2026-05-08/nail-ai-ops-package/admin-ops/src/agent/mock-data.ts):

- `reports`
- `tasks`
- `experiments`
- `recommendConfigDraft`
- `recommendConfigPublished`
- `operators`
- `currentOperatorId`
