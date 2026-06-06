-- Metric calculation logic for dashboards and recommendation.
-- Parameters used below:
--   :store_id  target store
--   :biz_date  target date, for example 2026-05-09

-- 1. Store daily stats.
-- Trigger: nightly job, or after daily_store_inputs / orders / try_on_jobs changes.
INSERT INTO store_daily_stats (
  store_id,
  biz_date,
  try_on_count,
  try_on_user_count,
  walk_in_customer_count,
  mini_program_penetration_rate,
  avg_try_on_per_user,
  active_session_count,
  avg_duration_seconds,
  order_count,
  revenue_amount,
  aov,
  ai_order_count,
  ai_revenue_amount,
  ai_aov,
  updated_at
)
SELECT
  s.id AS store_id,
  :biz_date::date AS biz_date,
  COALESCE(t.try_on_count, 0) AS try_on_count,
  COALESCE(t.try_on_user_count, 0) AS try_on_user_count,
  COALESCE(i.walk_in_customer_count, 0) AS walk_in_customer_count,
  CASE
    WHEN COALESCE(i.walk_in_customer_count, 0) = 0 THEN NULL
    ELSE COALESCE(t.try_on_user_count, 0)::numeric / i.walk_in_customer_count
  END AS mini_program_penetration_rate,
  CASE
    WHEN COALESCE(t.try_on_user_count, 0) = 0 THEN NULL
    ELSE COALESCE(t.try_on_count, 0)::numeric / t.try_on_user_count
  END AS avg_try_on_per_user,
  COALESCE(us.active_session_count, 0) AS active_session_count,
  us.avg_duration_seconds,
  COALESCE(o.order_count, 0) AS order_count,
  COALESCE(o.revenue_amount, 0) AS revenue_amount,
  CASE
    WHEN COALESCE(o.order_count, 0) = 0 THEN NULL
    ELSE o.revenue_amount / o.order_count
  END AS aov,
  COALESCE(o.ai_order_count, 0) AS ai_order_count,
  COALESCE(o.ai_revenue_amount, 0) AS ai_revenue_amount,
  CASE
    WHEN COALESCE(o.ai_order_count, 0) = 0 THEN NULL
    ELSE o.ai_revenue_amount / o.ai_order_count
  END AS ai_aov,
  now()
FROM stores s
LEFT JOIN daily_store_inputs i
  ON i.store_id = s.id AND i.biz_date = :biz_date::date
LEFT JOIN (
  SELECT
    store_id,
    COUNT(*) AS try_on_count,
    COUNT(DISTINCT user_id) AS try_on_user_count
  FROM try_on_jobs
  WHERE store_id = :store_id
    AND started_at >= :biz_date::date
    AND started_at < (:biz_date::date + INTERVAL '1 day')
  GROUP BY store_id
) t ON t.store_id = s.id
LEFT JOIN (
  SELECT
    store_id,
    COUNT(*) AS active_session_count,
    AVG(duration_seconds)::integer AS avg_duration_seconds
  FROM user_sessions
  WHERE store_id = :store_id
    AND started_at >= :biz_date::date
    AND started_at < (:biz_date::date + INTERVAL '1 day')
  GROUP BY store_id
) us ON us.store_id = s.id
LEFT JOIN (
  SELECT
    store_id,
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'paid', 'completed')) AS order_count,
    COALESCE(SUM(amount) FILTER (WHERE status IN ('confirmed', 'paid', 'completed')), 0) AS revenue_amount,
    COUNT(*) FILTER (WHERE source = 'ai_try_on' AND status IN ('confirmed', 'paid', 'completed')) AS ai_order_count,
    COALESCE(SUM(amount) FILTER (WHERE source = 'ai_try_on' AND status IN ('confirmed', 'paid', 'completed')), 0) AS ai_revenue_amount
  FROM orders
  WHERE store_id = :store_id
    AND ordered_at >= :biz_date::date
    AND ordered_at < (:biz_date::date + INTERVAL '1 day')
  GROUP BY store_id
) o ON o.store_id = s.id
WHERE s.id = :store_id
ON CONFLICT (store_id, biz_date) DO UPDATE SET
  try_on_count = EXCLUDED.try_on_count,
  try_on_user_count = EXCLUDED.try_on_user_count,
  walk_in_customer_count = EXCLUDED.walk_in_customer_count,
  mini_program_penetration_rate = EXCLUDED.mini_program_penetration_rate,
  avg_try_on_per_user = EXCLUDED.avg_try_on_per_user,
  active_session_count = EXCLUDED.active_session_count,
  avg_duration_seconds = EXCLUDED.avg_duration_seconds,
  order_count = EXCLUDED.order_count,
  revenue_amount = EXCLUDED.revenue_amount,
  aov = EXCLUDED.aov,
  ai_order_count = EXCLUDED.ai_order_count,
  ai_revenue_amount = EXCLUDED.ai_revenue_amount,
  ai_aov = EXCLUDED.ai_aov,
  updated_at = now();

-- 2. Style daily stats.
-- Trigger: nightly job, or after exposure / try-on / intent / order changes.
INSERT INTO style_daily_stats (
  store_id,
  style_id,
  biz_date,
  exposure_count,
  try_on_count,
  try_on_user_count,
  intent_count,
  intent_rate,
  try_on_click_rate,
  cold_style_exposure_count,
  cold_style_intent_count,
  cold_style_activation_rate,
  ai_order_count,
  promoted_order_count,
  promoted_hit_rate,
  updated_at
)
SELECT
  ns.store_id,
  ns.id AS style_id,
  :biz_date::date AS biz_date,
  COALESCE(e.exposure_count, 0) AS exposure_count,
  COALESCE(t.try_on_count, 0) AS try_on_count,
  COALESCE(t.try_on_user_count, 0) AS try_on_user_count,
  COALESCE(si.intent_count, 0) AS intent_count,
  CASE
    WHEN COALESCE(t.try_on_count, 0) = 0 THEN NULL
    ELSE COALESCE(si.intent_count, 0)::numeric / t.try_on_count
  END AS intent_rate,
  CASE
    WHEN COALESCE(e.exposure_count, 0) = 0 THEN NULL
    ELSE COALESCE(t.try_on_count, 0)::numeric / e.exposure_count
  END AS try_on_click_rate,
  CASE WHEN ns.is_cold_start THEN COALESCE(e.exposure_count, 0) ELSE 0 END AS cold_style_exposure_count,
  CASE WHEN ns.is_cold_start THEN COALESCE(si.intent_count, 0) ELSE 0 END AS cold_style_intent_count,
  CASE
    WHEN NOT ns.is_cold_start OR COALESCE(e.exposure_count, 0) = 0 THEN NULL
    ELSE COALESCE(si.intent_count, 0)::numeric / e.exposure_count
  END AS cold_style_activation_rate,
  COALESCE(o.ai_order_count, 0) AS ai_order_count,
  CASE WHEN ns.is_promoted THEN COALESCE(o.order_count, 0) ELSE 0 END AS promoted_order_count,
  CASE
    WHEN NOT ns.is_promoted OR COALESCE(t.try_on_count, 0) = 0 THEN NULL
    ELSE COALESCE(o.order_count, 0)::numeric / t.try_on_count
  END AS promoted_hit_rate,
  now()
FROM nail_styles ns
LEFT JOIN (
  SELECT store_id, style_id, COUNT(*) AS exposure_count
  FROM style_exposures
  WHERE store_id = :store_id
    AND exposed_at >= :biz_date::date
    AND exposed_at < (:biz_date::date + INTERVAL '1 day')
  GROUP BY store_id, style_id
) e ON e.store_id = ns.store_id AND e.style_id = ns.id
LEFT JOIN (
  SELECT store_id, style_id, COUNT(*) AS try_on_count, COUNT(DISTINCT user_id) AS try_on_user_count
  FROM try_on_jobs
  WHERE store_id = :store_id
    AND started_at >= :biz_date::date
    AND started_at < (:biz_date::date + INTERVAL '1 day')
  GROUP BY store_id, style_id
) t ON t.store_id = ns.store_id AND t.style_id = ns.id
LEFT JOIN (
  SELECT store_id, style_id, COUNT(*) AS intent_count
  FROM style_intents
  WHERE store_id = :store_id
    AND created_at >= :biz_date::date
    AND created_at < (:biz_date::date + INTERVAL '1 day')
    AND intent_type IN ('favorite', 'want_to_do', 'booking', 'order_intent')
  GROUP BY store_id, style_id
) si ON si.store_id = ns.store_id AND si.style_id = ns.id
LEFT JOIN (
  SELECT
    store_id,
    style_id,
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'paid', 'completed')) AS order_count,
    COUNT(*) FILTER (WHERE source = 'ai_try_on' AND status IN ('confirmed', 'paid', 'completed')) AS ai_order_count
  FROM orders
  WHERE store_id = :store_id
    AND ordered_at >= :biz_date::date
    AND ordered_at < (:biz_date::date + INTERVAL '1 day')
  GROUP BY store_id, style_id
) o ON o.store_id = ns.store_id AND o.style_id = ns.id
WHERE ns.store_id = :store_id
ON CONFLICT (store_id, style_id, biz_date) DO UPDATE SET
  exposure_count = EXCLUDED.exposure_count,
  try_on_count = EXCLUDED.try_on_count,
  try_on_user_count = EXCLUDED.try_on_user_count,
  intent_count = EXCLUDED.intent_count,
  intent_rate = EXCLUDED.intent_rate,
  try_on_click_rate = EXCLUDED.try_on_click_rate,
  cold_style_exposure_count = EXCLUDED.cold_style_exposure_count,
  cold_style_intent_count = EXCLUDED.cold_style_intent_count,
  cold_style_activation_rate = EXCLUDED.cold_style_activation_rate,
  ai_order_count = EXCLUDED.ai_order_count,
  promoted_order_count = EXCLUDED.promoted_order_count,
  promoted_hit_rate = EXCLUDED.promoted_hit_rate,
  updated_at = now();

-- 3. Try-on heat ranking for operation daily dashboard.
SELECT
  ns.id AS style_id,
  ns.name,
  SUM(sds.try_on_count) AS try_on_count,
  SUM(sds.intent_count) AS intent_count,
  CASE WHEN SUM(sds.try_on_count) = 0 THEN NULL ELSE SUM(sds.intent_count)::numeric / SUM(sds.try_on_count) END AS intent_rate
FROM style_daily_stats sds
JOIN nail_styles ns ON ns.id = sds.style_id
WHERE sds.store_id = :store_id
  AND sds.biz_date BETWEEN (:biz_date::date - INTERVAL '6 days') AND :biz_date::date
GROUP BY ns.id, ns.name
ORDER BY try_on_count DESC, intent_rate DESC
LIMIT 20;

-- 4. Recommendation quadrant.
-- High/low thresholds can be tuned per store. This uses store averages as baseline.
WITH style_7d AS (
  SELECT
    style_id,
    SUM(try_on_count) AS try_on_count,
    SUM(intent_count) AS intent_count,
    CASE WHEN SUM(try_on_count) = 0 THEN 0 ELSE SUM(intent_count)::numeric / SUM(try_on_count) END AS intent_rate
  FROM style_daily_stats
  WHERE store_id = :store_id
    AND biz_date BETWEEN (:biz_date::date - INTERVAL '6 days') AND :biz_date::date
  GROUP BY style_id
),
baseline AS (
  SELECT
    AVG(try_on_count) AS avg_try_on_count,
    AVG(intent_rate) AS avg_intent_rate
  FROM style_7d
)
SELECT
  ns.id AS style_id,
  ns.name,
  s.try_on_count,
  s.intent_rate,
  CASE
    WHEN s.try_on_count >= b.avg_try_on_count AND s.intent_rate >= b.avg_intent_rate THEN '爆款'
    WHEN s.try_on_count >= b.avg_try_on_count AND s.intent_rate < b.avg_intent_rate THEN '引流款'
    WHEN s.try_on_count < b.avg_try_on_count AND s.intent_rate >= b.avg_intent_rate THEN '潜力款'
    ELSE '弱势款'
  END AS style_bucket
FROM style_7d s
CROSS JOIN baseline b
JOIN nail_styles ns ON ns.id = s.style_id
ORDER BY s.try_on_count DESC;

-- 5. Customer preference tags.
-- Color/style/shape tags are all stored in style_tags.level.
SELECT
  st.level,
  st.name,
  SUM(uts.score) AS score,
  SUM(uts.try_on_count) AS try_on_count,
  SUM(uts.intent_count) AS intent_count,
  SUM(uts.order_count) AS order_count
FROM user_tag_scores uts
JOIN style_tags st ON st.id = uts.tag_id
WHERE uts.store_id = :store_id
  AND st.level IN ('color', 'style', 'shape')
GROUP BY st.level, st.name
ORDER BY st.level, score DESC;

-- 6. Style lifecycle.
SELECT
  ns.id AS style_id,
  ns.name,
  ns.listed_at,
  sds.biz_date,
  sds.try_on_count,
  sds.intent_count,
  sds.intent_rate,
  sds.try_on_click_rate
FROM nail_styles ns
JOIN style_daily_stats sds ON sds.style_id = ns.id
WHERE ns.store_id = :store_id
  AND ns.id = :style_id
ORDER BY sds.biz_date;
