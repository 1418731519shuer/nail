# 美甲款式热门/冷门分析字段定版 README

## 1. 目标

先确定字段，再做模拟数据、看板、热门趋势和冷门预警。

本系统的数据拆成 5 张核心表：

```text
1. nail_styles：款式基础属性
2. user_style_events：用户行为事件
3. try_on_jobs：AI 试戴任务
4. style_daily_metrics：每日款式聚合
5. style_window_metrics：7 日窗口热门/冷门判断
```

## 2. 款式基础属性：nail_styles

这张表相当于电商里的商品表，但美甲是服务方案，所以要多记录“门店是否可做、工艺难度、耗时、材料”等字段。

| 字段 | 含义 | 用途 |
| --- | --- | --- |
| `id` | 款式唯一 ID | 主键 |
| `store_id` | 所属门店 | 门店隔离 |
| `name` | 款式名称 | 展示、搜索 |
| `description` | 款式介绍 | 详情页 |
| `source_type` | 来源：门店上传 / 小红书采集 / 设计师上传 | 判断款式来源 |
| `source_url` | 原始来源链接 | 追溯来源 |
| `main_image_url` | 主图 | 款式卡片 |
| `image_list` | 多张详情图 | 详情页 |
| `category` | 大类：法式、猫眼、晕染、冰透等 | 同类比较 |
| `color_system` | 色系：裸色、粉色、黑金、红色等 | 偏好分析 |
| `craft_type` | 工艺：猫眼、钻饰、手绘、渐变等 | 工艺分析 |
| `style_tag` | 标签：显白、通勤、甜酷、短甲友好等 | 推荐与画像 |
| `scene_tag` | 场景：约会、婚礼、春节、日常等 | 场景推荐 |
| `nail_length` | 适合短甲 / 中长甲 / 长甲 | 适配判断 |
| `nail_shape` | 方圆、杏仁、尖形、梯形 | 适配判断 |
| `price_level` | 低价 / 中价 / 高价 | 同价格档比较 |
| `estimated_duration` | 预计制作时长，分钟 | 到店决策 |
| `difficulty_level` | 简单 / 中等 / 复杂 | 门店履约 |
| `store_can_make` | 门店是否可做 | 避免推荐做不了的款 |
| `material_required` | 所需材料 | 门店备料 |
| `base_price` | 基础价格 | 预约成交 |
| `launch_date` | 上架日期 | 生命周期 |
| `status` | active / inactive / pending | 上下架状态 |

最重要的比较维度：

```text
store_id + category + price_level
```

热门和冷门不要全站硬比。猫眼款、法式款、高价钻饰款、低价纯色款应该分组比较。

## 3. 用户行为事件：user_style_events

这张表记录所有用户行为明细，是热门/冷门判断的原始数据。

所有指标都必须先定义“有效事件”，再计算人数、次数和转化率。不要把“卡片被渲染”直接当作浏览。

```text
卡片加载 = 系统渲染了
有效曝光 = 用户屏幕中看到了
有效浏览 = 用户有足够机会看清并做决策
点击行为 = 用户主动表达兴趣
```

核心路径：

```text
浏览款式
├─ 点击详情
├─ 点击想要
├─ 点击试戴
│  ├─ 查看试戴结果
│  ├─ 试戴后想要
│  └─ 试戴后确认要做
└─ 直接确认要做
```

事件类型：

| `event_type` | 含义 | 电商类比 |
| --- | --- | --- |
| `style_view` | 浏览款式卡片 | view_item |
| `detail_view` | 点击详情 | 商品详情页浏览 |
| `want_click` | 点击想要 | add_to_cart / wishlist |
| `tryon_click` | 点击试戴 | virtual try-on |
| `tryon_result_view` | 查看试戴结果 | 试穿结果页浏览 |
| `confirm_click` | 点击确认要做 | buy now / purchase intent |
| `confirm_done` | 门店确认完成 | 最终成交 |

有效事件口径：

| 指标 | 有效事件定义 | 去重口径 | 用途 |
| --- | --- | --- | --- |
| `card_render_pv` | 卡片被前端渲染 | 不去重 | 技术日志，不做转化分母 |
| `impression_uv` | 卡片可见面积 >= 50%，连续 >= 1 秒 | 同一用户同一款式同一天去重 | 推荐位曝光 |
| `view_uv` | 卡片可见面积 >= 70%，连续 >= 2 秒；如果卡片高度超过视口，则按当前视口能达到的最大可见比例兜底 | 同一用户同一款式同一天去重 | 核心转化分母 |
| `detail_uv` | 点击详情，详情页成功打开 | 同一用户同一款式同一天去重 | 深入了解兴趣 |
| `want_uv` | 点击“想要”，接口成功写入 | 同一用户同一款式当前状态去重 | 候选意向 |
| `tryon_uv` | 点击“试戴”，成功发起试戴任务 | 同一用户同一款式同一天去重 | 试戴意愿 |
| `tryon_result_uv` | 试戴结果图成功展示 >= 1 秒 | 同一用户同一款式同一天去重 | 用户实际看到试戴结果 |
| `confirm_uv` | 点击“确认要做”，成功生成确认记录 | 同一用户同一款式当前确认状态去重 | 强意向/预约成交 |
| `confirm_done_uv` | 门店确认用户实际做了该款 | 同一用户同一订单去重 | 最终履约 |

推荐用 `view_uv` 而不是 `card_render_pv` 作为转化率分母。

事件字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 事件 ID |
| `user_id` | 用户 ID，可匿名 |
| `session_id` | 会话 ID |
| `store_id` | 门店 ID |
| `style_id` | 款式 ID |
| `try_on_job_id` | 关联试戴任务 |
| `event_type` | 行为类型 |
| `event_time` | 事件时间 |
| `page_source` | 来源页面 |
| `position_index` | 款式在列表中的位置 |
| `keyword` | 搜索关键词 |
| `recommend_source` | 推荐来源：热门榜、搜索、分类、推荐流等 |
| `want_source` | 想要来源：card / detail / tryon_result |
| `confirm_source` | 确认来源：card / detail / tryon_result / want_list |
| `visible_ratio` | 卡片可见面积比例 |
| `visible_duration_ms` | 连续可见时长 |
| `result_visible_duration_ms` | 试戴结果可见时长 |
| `is_valid_impression` | 是否满足有效曝光 |
| `is_valid_view` | 是否满足有效浏览 |
| `action_result` | success / fail |
| `tryon_source` | 试戴入口 |
| `generate_status` | success / fail |
| `device_type` | 设备类型 |
| `is_new_user` | 是否新用户 |
| `properties` | 扩展字段 |

## 4. 来源字段

来源字段必须单独存，因为产品现在是多入口转化。

### want_source

```text
card：款式卡片想要
detail：详情页想要
tryon_result：试戴结果页想要
```

### confirm_source

```text
card：卡片直接确认
detail：详情页确认
tryon_result：试戴后确认
want_list：想要列表确认
```

没有来源字段，只能知道“确认了”，不知道是第一眼确认、详情后确认、试戴后确认，还是候选池沉淀后确认。冷门预警会失去诊断能力。

## 5. 试戴任务：try_on_jobs

这张表记录 AI 试戴过程，避免把“款式不受欢迎”和“试戴功能失败”混在一起。

| 字段 | 含义 |
| --- | --- |
| `id` | 试戴任务 ID |
| `user_id` | 用户 ID |
| `style_id` | 款式 ID |
| `store_id` | 门店 ID |
| `try_on_type` | normal / hyperreal |
| `model_version` | AI 模型版本 |
| `hand_asset_id` | 用户手图 |
| `style_asset_id` | 款式图 |
| `result_asset_id` | 结果图 |
| `status` | pending / succeeded / failed |
| `error_message` | 失败原因 |
| `duration_ms` | 生成耗时 |
| `started_at` | 开始时间 |
| `finished_at` | 完成时间 |

## 6. 每日聚合：style_daily_metrics

每天每个款式一行，是看板和趋势计算的基础。

| 字段 | 含义 |
| --- | --- |
| `metric_date` | 日期 |
| `style_id` | 款式 ID |
| `store_id` | 门店 ID |
| `category` | 款式大类 |
| `price_level` | 价格档 |
| `view_uv` | 浏览人数 |
| `view_pv` | 浏览次数 |
| `detail_uv` | 详情页人数 |
| `tryon_uv` | 试戴人数 |
| `tryon_result_uv` | 查看试戴结果人数 |
| `want_uv` | 想要人数 |
| `want_from_card_uv` | 卡片想要人数 |
| `want_from_detail_uv` | 详情想要人数 |
| `want_after_tryon_uv` | 试戴后想要人数 |
| `confirm_uv` | 确认要做总人数 |
| `confirm_direct_uv` | 卡片直接确认人数 |
| `confirm_detail_uv` | 详情确认人数 |
| `confirm_after_tryon_uv` | 试戴后确认人数 |
| `confirm_from_want_uv` | 想要列表确认人数 |
| `confirm_done_uv` | 门店最终确认完成人数 |

## 7. 转化率字段

| 字段 | 公式 | 含义 |
| --- | --- | --- |
| `detail_rate` | `detail_uv / view_uv` | 卡片是否吸引用户看详情 |
| `tryon_rate` | `tryon_uv / view_uv` | 用户是否愿意试戴 |
| `want_rate` | `want_uv / view_uv` | 用户是否愿意加入候选 |
| `direct_confirm_rate` | `confirm_direct_uv / view_uv` | 第一眼直接确认能力 |
| `detail_confirm_rate` | `confirm_detail_uv / detail_uv` | 详情页转化能力 |
| `tryon_want_rate` | `want_after_tryon_uv / tryon_result_uv` | 看到试戴结果后是否想要 |
| `tryon_confirm_rate` | `confirm_after_tryon_uv / tryon_result_uv` | 看到试戴结果后是否确认 |
| `tryon_start_to_confirm_rate` | `confirm_after_tryon_uv / tryon_uv` | 整个试戴流程转化能力 |
| `want_to_confirm_rate` | `confirm_from_want_uv / want_uv` | 想要后是否确认 |
| `total_confirm_rate` | `confirm_uv / view_uv` | 总体确认能力 |

最关键的三个指标：

```text
tryon_confirm_rate
tryon_want_rate
total_confirm_rate
```

## 8. 7 日窗口：style_window_metrics

热门/冷门不要只看单日，要看 7 日窗口。

| 字段 | 含义 |
| --- | --- |
| `window_start` | 窗口开始日期 |
| `window_end` | 窗口结束日期 |
| `window_size` | 默认 7 天 |
| `view_7d` | 7 日浏览 |
| `detail_7d` | 7 日详情 |
| `tryon_7d` | 7 日试戴 |
| `want_7d` | 7 日想要 |
| `confirm_7d` | 7 日确认 |
| `confirm_after_tryon_7d` | 7 日试戴后确认 |
| `confirm_from_want_7d` | 7 日想要后确认 |
| `tryon_confirm_rate_7d` | 7 日试戴后确认率 |
| `want_to_confirm_rate_7d` | 7 日想要后确认率 |
| `total_confirm_rate_7d` | 7 日总确认率 |

## 9. 增长字段

当前 7 日窗口和上一个 7 日窗口对比：

```text
view_growth = (view_7d_this + 1) / (view_7d_last + 1)
tryon_growth = (tryon_7d_this + 1) / (tryon_7d_last + 1)
want_growth = (want_7d_this + 1) / (want_7d_last + 1)
confirm_growth = (confirm_7d_this + 1) / (confirm_7d_last + 1)
tryon_confirm_growth = (confirm_after_tryon_7d_this + 1) / (confirm_after_tryon_7d_last + 1)
```

加 `+1` 是为了避免上期为 0 时除零。

## 10. 同类分位字段

热门/冷门要在同类里比较：

```text
store_id + category + price_level
```

如果数据少，先退化成：

```text
store_id + category
```

分位字段：

| 字段 | 含义 |
| --- | --- |
| `detail_rate_pct` | 同类详情率分位 |
| `tryon_rate_pct` | 同类试戴率分位 |
| `want_rate_pct` | 同类想要率分位 |
| `direct_confirm_rate_pct` | 同类直接确认率分位 |
| `tryon_confirm_rate_pct` | 同类试戴后确认率分位 |
| `want_to_confirm_rate_pct` | 同类想要后确认率分位 |
| `total_confirm_rate_pct` | 同类总确认率分位 |
| `growth_score_pct` | 同类增长分位 |

## 11. 热门趋势判断

推荐先用规则，不急着上预测模型。

```text
HotTrendScore =
0.15 * want_rate_pct
+ 0.15 * tryon_rate_pct
+ 0.25 * tryon_confirm_rate_pct
+ 0.20 * direct_confirm_rate_pct
+ 0.15 * want_to_confirm_rate_pct
+ 0.10 * growth_score_pct
```

趋势标签：

| `trend_label` | 判断 |
| --- | --- |
| `HotUp` | 样本充足，hot_score 高，增长高 |
| `Stable` | 样本充足，表现稳定 |
| `Potential` | 曝光低，但确认率或试戴后确认率高 |
| `ColdDown` | 样本充足，多个关键转化低 |
| `Untested` | 样本不足 |

## 12. 冷门预警判断

先判断样本量：

```text
view_7d < 100 或 view_user_7d < 30 -> Untested
```

冷门类型：

| `cold_type` | 判断 | 建议 |
| --- | --- | --- |
| `Cold_FirstLook` | 曝光够，但试戴率、想要率、直接确认率都低 | 换封面、改标签、降推荐 |
| `Cold_Detail` | 详情访问高，但详情确认低 | 检查价格、时长、适配说明 |
| `Cold_AfterTryon` | 试戴率高，但试戴后确认率和想要率低 | 检查试戴效果图和款式适配 |
| `Cold_AfterWant` | 想要率高，但想要转确认低 | 加预约提醒、价格说明、档期提示 |
| `ColdDown` | 连续两个窗口下降 | 降权或下架观察 |

## 13. 最小可用字段版本

如果先做模拟数据，只需要这些字段：

```text
style_id
date
category
price_level
view_uv
detail_uv
tryon_uv
want_uv
want_after_tryon_uv
confirm_direct_uv
confirm_detail_uv
confirm_after_tryon_uv
confirm_from_want_uv
total_confirm_uv
```

计算：

```text
detail_rate
tryon_rate
want_rate
direct_confirm_rate
detail_confirm_rate
tryon_want_rate
tryon_confirm_rate
want_to_confirm_rate
total_confirm_rate
view_growth
tryon_growth
want_growth
confirm_growth
hot_score
cold_risk_score
trend_label
cold_type
```

## 14. 实施顺序

```text
第一步：确定字段
第二步：模拟事件数据
第三步：按日聚合
第四步：按 7 日窗口计算转化率和增长率
第五步：定义 HotUp / ColdDown / Potential / Untested
第六步：再考虑预测未来窗口
```
