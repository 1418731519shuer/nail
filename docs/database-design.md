# 美甲 AI 试戴数据库设计

## 设计目标

这套库按“先能埋点统计，后能搜索推荐”来设计。核心原则是：

- 用户必须有稳定 `user_id`，未登录也先生成匿名用户，登录后再绑定微信/手机号。
- 所有关键行为先写原始事件表 `event_logs`，再写业务表，后续统计能回放。
- 款式标签拆成独立表，方便筛选、搜索、推荐和门店偏好画像。
- 高频看板数据按天聚合到统计表，避免每次都扫大表。
- 图片文件仍存在文件夹或对象存储，数据库只存 URL、路径、文件类型和归属关系。

## 登录与用户 ID

### 推荐登录逻辑

1. 用户首次打开网页/小程序。
2. 前端生成或读取 `device_id`，请求后端 `/api/auth/anonymous`。
3. 后端创建 `users` 匿名用户，返回 `user_id`。
4. 用户后续微信登录/手机号登录时，创建 `user_identities`，把身份绑定到同一个 `user_id`。
5. 所有试戴、浏览、聊天、意向、订单都只记录 `user_id`。

### 小程序登录字段

微信小程序后面需要：

- `openid`：同一个小程序内唯一用户 ID。
- `unionid`：同主体多应用打通时使用。
- `session_key`：不要长期明文存，通常只用于解密手机号/用户信息。

## 核心表

### 1. stores 门店表

存门店基础信息。

关键字段：

- `id`
- `name`
- `contact_name`
- `phone`
- `city`
- `status`
- `created_at`

用途：

- 所有数据按门店隔离。
- 看板、款式、订单、偏好画像都挂在 `store_id` 下。

### 2. users 用户表

存顾客主 ID。

关键字段：

- `id`
- `store_id`
- `display_name`
- `phone`
- `is_anonymous`
- `first_seen_at`
- `last_seen_at`

用途：

- AI 试戴总用户数：`COUNT(DISTINCT user_id)`。
- 单款试戴人数：按 `style_id` 去重 `user_id`。
- 用户偏好标签：按用户行为累计。

### 3. user_identities 登录身份表

一个用户可以绑定多种身份。

关键字段：

- `user_id`
- `provider`：`wechat` / `phone` / `anonymous`
- `provider_user_id`：微信 `openid`、手机号 hash、匿名设备 ID
- `union_id`

用途：

- 登录查用户。
- 匿名用户和登录用户合并。

唯一约束：

- `(provider, provider_user_id)` 唯一。

### 4. user_sessions 访问会话表

记录进入、离开和停留时长。

关键字段：

- `id`
- `store_id`
- `user_id`
- `started_at`
- `ended_at`
- `duration_seconds`
- `entry_page`
- `last_page`

生成逻辑：

- 进入页面创建 session。
- 页面关闭、切后台、超过 30 分钟无操作时结束 session。
- 平均停留时长：`AVG(duration_seconds)`。

### 5. nail_styles 款式表

存每个美甲款式。

关键字段：

- `id`
- `store_id`
- `name`
- `description`
- `base_price`
- `status`
- `main_image_url`
- `search_text`
- `created_at`
- `updated_at`

用途：

- 款式展示、筛选、搜索、推荐。
- `search_text` 用于搜索款式名、介绍语、标签。

### 6. style_tags 标签表

存标签字典。

字段：

- `id`
- `store_id`
- `name`：如 `冰透`、`渐变`、`猫眼`
- `level`：`primary` / `secondary` / `scene` / `color` / `shape`
- `sort_order`

用途：

- 一级标签、二级标签、风格标签统一管理。
- 后续可以加“显白”“短甲友好”“通勤”等运营标签。

### 7. nail_style_tags 款式标签关系表

一个款式多个标签。

字段：

- `style_id`
- `tag_id`
- `tag_role`：`primary` / `secondary` / `extra`
- `weight`

例子：

- 第三张图：`冰透 primary` + `渐变 secondary`
- 第四张图：`冰透 primary` + `纯色 secondary`

用途：

- 筛选。
- 推荐。
- 用户偏好加权。

### 8. style_images 款式图片表

一个款式可以多张图片。

字段：

- `style_id`
- `image_url`
- `image_type`：`cover` / `detail` / `reference`
- `sort_order`

用途：

- 首页封面。
- 多图展示。
- 作为豆包试戴的款式参考图。

### 9. uploaded_assets 上传资源表

存用户上传图片和生成结果图的文件记录。

字段：

- `id`
- `store_id`
- `user_id`
- `asset_type`：`user_hand` / `style_reference` / `try_on_result`
- `file_url`
- `file_path`
- `mime_type`
- `file_size`
- `created_at`

用途：

- 三个文件夹对应入库：
  - 用户手图：`user_hand`
  - 用户款式图：`style_reference`
  - 生成效果图：`try_on_result`

### 10. try_on_jobs 试戴任务表

一次生成一行，是 AI 试戴统计的核心表。

字段：

- `id`
- `store_id`
- `user_id`
- `style_id`
- `batch_id`
- `try_on_type`：`catalog` / `custom` / `batch` / `recommend`
- `hand_asset_id`
- `style_asset_id`
- `result_asset_id`
- `status`：`pending` / `running` / `succeeded` / `failed`
- `error_message`
- `started_at`
- `finished_at`

生成逻辑：

- 用户点击生成时创建 `pending/running`。
- 豆包返回成功后写 `result_asset_id` 和 `succeeded`。
- 失败写 `failed`。

指标：

- 今日总试戴次数：统计 `try_on_jobs`。
- AI 试戴总用户数：`COUNT(DISTINCT user_id)`。
- 单款试戴总次数：按 `style_id` 统计。
- 单款试戴人数：按 `style_id` 去重 `user_id`。

### 11. batch_try_on_jobs 批量任务表

一次一键试戴一行。

字段：

- `id`
- `store_id`
- `user_id`
- `hand_asset_id`
- `total_count`
- `success_count`
- `failed_count`
- `status`
- `created_at`
- `finished_at`

用途：

- 一键试戴进度条。
- 批量结果页。
- 每个子任务仍写入 `try_on_jobs`。

### 12. style_exposures 款式曝光表

记录款式被展示。

字段：

- `id`
- `store_id`
- `user_id`
- `session_id`
- `style_id`
- `page`
- `position`
- `exposed_at`

生成逻辑：

- 款式卡片进入视口 50% 以上并停留 0.5 秒，记一次曝光。
- 同一 session 同一款式可以设置 5 分钟内去重，避免滚动刷量。

指标：

- 款式曝光次数：`COUNT(*) GROUP BY style_id`。

### 13. style_intents 意向表

用户把某款设为想做/预约/下单前意向。

字段：

- `id`
- `store_id`
- `user_id`
- `style_id`
- `try_on_job_id`
- `intent_type`：`favorite` / `want_to_do` / `booking` / `order_intent`
- `intent_source`：`card` / `detail` / `tryon_result` / `unknown`
- `created_at`

指标：

- 意向量：统计 `intent_type in ('want_to_do', 'booking', 'order_intent')`。

### 14. orders 订单表

存成交结果。

字段：

- `id`
- `store_id`
- `user_id`
- `style_id`
- `intent_id`
- `try_on_job_id`
- `source`：`ai_try_on` / `manual` / `walk_in`
- `confirm_source`：`card` / `detail` / `tryon_result` / `want_list` / `unknown`
- `amount`
- `status`：`pending` / `paid` / `completed` / `cancelled`
- `ordered_at`

指标：

- 总成交订单数：`COUNT(*) WHERE status in ('paid', 'completed')`。
- AI 试戴成交订单数：`COUNT(*) WHERE source = 'ai_try_on'`。

### 15. daily_store_inputs 商家手动录入表

存无法自动拿到的数据。

字段：

- `store_id`
- `biz_date`
- `walk_in_customer_count`
- `total_order_count`
- `note`

用途：

- 到店顾客数。
- 如果暂时不接收银系统，总成交订单数也可先手动录入。

### 16. event_logs 原始埋点表

所有行为都先进这里。

字段：

- `id`
- `store_id`
- `user_id`
- `session_id`
- `event_name`
- `entity_type`
- `entity_id`
- `properties`
- `created_at`

用途：

- 后续补统计。
- 排查数据异常。
- 做漏斗分析。

建议事件：

- `session_start`
- `session_end`
- `style_exposure`
- `try_on_start`
- `try_on_success`
- `try_on_failed`
- `set_intent`
- `order_completed`
- `ai_chat_message`
- `recommend_result_click`

### 17. user_tag_scores 用户偏好分表

存用户对标签的偏好分。

字段：

- `store_id`
- `user_id`
- `tag_id`
- `score`
- `try_on_count`
- `intent_count`
- `order_count`
- `updated_at`

加权建议：

- 曝光：`+0.1`
- 试戴：`+1`
- 收藏/想做：`+3`
- 下单：`+5`
- AI 对话明确说喜欢：`+2`

用途：

- 用户偏好标签。
- 个性化推荐。

### 18. store_tag_scores 门店偏好画像表

存门店维度标签热度。

字段：

- `store_id`
- `tag_id`
- `score`
- `try_on_count`
- `intent_count`
- `order_count`
- `updated_at`

用途：

- 门店偏好画像。
- 指导商家上新。
- 首页款式排序。

### 19. ai_chat_sessions / ai_chat_messages AI 客服对话表

存智能推荐对话和后续记忆。

`ai_chat_sessions`：

- `id`
- `store_id`
- `user_id`
- `started_at`
- `ended_at`
- `summary`

`ai_chat_messages`：

- `id`
- `chat_session_id`
- `role`
- `content`
- `created_at`
- `extracted_tags`

用途：

- 后续 prompt 记忆。
- 从对话里提取用户偏好。
- 做智能推荐。

## 关键指标生成逻辑

### 门店使用效果

- 到店顾客数：来自 `daily_store_inputs.walk_in_customer_count`。
- 今日总试戴次数：`COUNT(*) FROM try_on_jobs WHERE DATE(started_at)=今天`。
- 平均停留时长：`AVG(duration_seconds) FROM user_sessions`。
- 门店活跃天数：`COUNT(DISTINCT DATE(started_at)) FROM try_on_jobs`。
- AI 试戴总用户数：`COUNT(DISTINCT user_id) FROM try_on_jobs`。
- 小程序选款渗透率：`AI试戴用户数 / 到店顾客数`，只作覆盖率证明，默认不上看板。
- 人均试戴次数：`今日试戴次数 / AI试戴用户数`，判断顾客是否愿意多试几款。

### 款式运营

- 单款试戴人数：`COUNT(DISTINCT user_id) FROM try_on_jobs WHERE style_id=?`。
- 单款试戴总次数：`COUNT(*) FROM try_on_jobs WHERE style_id=?`。
- 意向量：`COUNT(*) FROM style_intents WHERE style_id=?`。
- 款式曝光次数：`COUNT(*) FROM style_exposures WHERE style_id=?`。
- 试戴热度排名：按 `单款试戴总次数` 排序，进入运营日报看板。
- 意向率：`意向量 / 单款试戴总次数`，用于推荐系统分层。
- 试戴点击率：`单款试戴总次数 / 曝光次数`，点击率低的降低推荐权重。
- 冷门款激活率：`冷门款意向次数 / 冷门款曝光次数`，推荐页第六格可固定冷门款测试。
- 主推款命中率：`主推款成交数 / 主推款试戴数`，判断商家主推是否有效。
- 款式生命周期：从 `nail_styles.listed_at` 开始按天观察试戴、意向、点击率趋势。

推荐分层：

- 高试戴 + 高意向率：爆款。
- 高试戴 + 低意向率：引流款。
- 低试戴 + 高意向率：潜力款。
- 低试戴 + 低意向率：弱势款。

### 成交转化

- 总成交订单数：`COUNT(*) FROM orders WHERE status IN ('paid','completed')`。
- AI 试戴成交订单数：`COUNT(*) FROM orders WHERE source='ai_try_on' AND status IN ('paid','completed')`。
- 平均客单价 AOV：`成交金额 / 成交订单数`，老板录入或订单系统同步。
- AI 试戴顾客客单价：`AI试戴成交金额 / AI试戴订单数`，用于判断 AI 用户价值。

### 顾客偏好

- 用户偏好标签：查 `user_tag_scores`，按 `score DESC` 排序。
- 门店偏好画像：查 `store_tag_scores`，按 `score DESC` 排序。
- 热门颜色偏好：统计 `style_tags.level='color'`，建议标签：裸色、粉色、红色、黑色、白色、蓝色。
- 热门风格偏好：统计 `style_tags.level='style'`，建议标签：通勤、甜酷、法式、猫眼、纯欲、高级感。
- 热门甲型偏好：统计 `style_tags.level='shape'`，建议标签：短甲、方圆、杏仁、长甲。

## 触发逻辑

### 前端触发

| 触发点 | 写入 |
|---|---|
| 打开页面 | `users`、`user_sessions`、`event_logs: session_start` |
| 离开页面/超时 | `user_sessions.ended_at`、`event_logs: session_end` |
| 款式卡片曝光 | `style_exposures`、`event_logs: style_exposure` |
| 点击生成试戴 | `try_on_jobs`、`event_logs: try_on_start` |
| 生成成功 | `uploaded_assets`、`try_on_jobs.status=succeeded`、`event_logs: try_on_success` |
| 生成失败 | `try_on_jobs.status=failed`、`event_logs: try_on_failed` |
| 点击设为意向 | `style_intents`、`event_logs: set_intent` |
| 商家录入成交 | `orders`、`event_logs: order_completed` |
| AI 对话 | `ai_chat_messages`、`event_logs: ai_chat_message` |

### 后端/数据库触发

建议后端服务负责聚合，不强依赖数据库 trigger。原因是后续上云、换数据库、做队列更灵活。

但可以做这些自动逻辑：

- 插入 `try_on_jobs.succeeded` 后，更新 `user_tag_scores` 和 `store_tag_scores`。
- 插入 `style_intents` 后，给相关标签加权。
- 插入 `orders.completed` 后，给相关标签加权。
- 插入 `style_exposures` 后，更新款式每日曝光数。

## 搜索与速度设计

### 款式搜索

搜索维度：

- 款式名
- 描述
- 标签
- 评论关键词
- 适合场景，如通勤、约会、面试

推荐方案：

- 小规模：`nail_styles.search_text LIKE '%关键词%'`。
- 正式版：PostgreSQL `tsvector` + GIN 索引。
- 中文搜索更准：后续接 Meilisearch / Elasticsearch / Typesense。

### 高频索引

必须有索引：

- `try_on_jobs(store_id, started_at)`
- `try_on_jobs(store_id, style_id, started_at)`
- `try_on_jobs(store_id, user_id, started_at)`
- `style_exposures(store_id, style_id, exposed_at)`
- `style_intents(store_id, style_id, created_at)`
- `orders(store_id, source, status, ordered_at)`
- `user_tag_scores(store_id, user_id, score DESC)`
- `store_tag_scores(store_id, score DESC)`

### 统计加速

建议增加每日统计表：

- `style_daily_stats`
- `store_daily_stats`

看板默认查统计表，详情页再查原始表。
