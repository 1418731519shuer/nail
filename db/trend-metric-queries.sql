-- Trend metric aggregation templates for nail style hot/cold analysis.
-- Parameters:
--   :store_id
--   :biz_date
--
-- This file is PostgreSQL-first and is meant as implementation reference.

-- 1. Aggregate raw events into daily style metrics.
INSERT INTO style_daily_metrics (
  store_id,
  style_id,
  metric_date,
  category,
  price_level,
  card_render_pv,
  impression_uv,
  impression_pv,
  view_uv,
  view_pv,
  detail_uv,
  tryon_uv,
  tryon_result_uv,
  want_uv,
  want_from_card_uv,
  want_from_detail_uv,
  want_after_tryon_uv,
  confirm_uv,
  confirm_direct_uv,
  confirm_detail_uv,
  confirm_after_tryon_uv,
  confirm_from_want_uv,
  confirm_done_uv,
  detail_rate,
  tryon_rate,
  want_rate,
  direct_confirm_rate,
  detail_confirm_rate,
  tryon_want_rate,
  tryon_confirm_rate,
  want_to_confirm_rate,
  total_confirm_rate,
  updated_at
)
WITH style_base AS (
  SELECT id AS style_id, store_id, category, price_level
  FROM nail_styles
  WHERE store_id = :store_id
),
event_base AS (
  SELECT *
  FROM user_style_events
  WHERE store_id = :store_id
    AND event_time >= :biz_date::date
    AND event_time < (:biz_date::date + INTERVAL '1 day')
),
agg AS (
  SELECT
    store_id,
    style_id,
    COUNT(*) FILTER (WHERE event_type = 'style_card_render') AS card_render_pv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'style_impression' AND is_valid_impression) AS impression_uv,
    COUNT(*) FILTER (WHERE event_type = 'style_impression' AND is_valid_impression) AS impression_pv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'style_view') AS view_uv,
    COUNT(*) FILTER (WHERE event_type = 'style_view') AS view_pv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'detail_view') AS detail_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'tryon_click') AS tryon_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'tryon_result_view') AS tryon_result_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'want_click') AS want_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'want_click' AND want_source = 'card') AS want_from_card_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'want_click' AND want_source = 'detail') AS want_from_detail_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'want_click' AND want_source = 'tryon_result') AS want_after_tryon_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'confirm_click') AS confirm_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'confirm_click' AND confirm_source = 'card') AS confirm_direct_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'confirm_click' AND confirm_source = 'detail') AS confirm_detail_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'confirm_click' AND confirm_source = 'tryon_result') AS confirm_after_tryon_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'confirm_click' AND confirm_source = 'want_list') AS confirm_from_want_uv,
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'confirm_done') AS confirm_done_uv
  FROM event_base
  WHERE style_id IS NOT NULL
  GROUP BY store_id, style_id
)
SELECT
  sb.store_id,
  sb.style_id,
  :biz_date::date AS metric_date,
  sb.category,
  sb.price_level,
  COALESCE(a.card_render_pv, 0),
  COALESCE(a.impression_uv, 0),
  COALESCE(a.impression_pv, 0),
  COALESCE(a.view_uv, 0),
  COALESCE(a.view_pv, 0),
  COALESCE(a.detail_uv, 0),
  COALESCE(a.tryon_uv, 0),
  COALESCE(a.tryon_result_uv, 0),
  COALESCE(a.want_uv, 0),
  COALESCE(a.want_from_card_uv, 0),
  COALESCE(a.want_from_detail_uv, 0),
  COALESCE(a.want_after_tryon_uv, 0),
  COALESCE(a.confirm_uv, 0),
  COALESCE(a.confirm_direct_uv, 0),
  COALESCE(a.confirm_detail_uv, 0),
  COALESCE(a.confirm_after_tryon_uv, 0),
  COALESCE(a.confirm_from_want_uv, 0),
  COALESCE(a.confirm_done_uv, 0),
  COALESCE(a.detail_uv, 0)::numeric / NULLIF(COALESCE(a.view_uv, 0), 0),
  COALESCE(a.tryon_uv, 0)::numeric / NULLIF(COALESCE(a.view_uv, 0), 0),
  COALESCE(a.want_uv, 0)::numeric / NULLIF(COALESCE(a.view_uv, 0), 0),
  COALESCE(a.confirm_direct_uv, 0)::numeric / NULLIF(COALESCE(a.view_uv, 0), 0),
  COALESCE(a.confirm_detail_uv, 0)::numeric / NULLIF(COALESCE(a.detail_uv, 0), 0),
  COALESCE(a.want_after_tryon_uv, 0)::numeric / NULLIF(COALESCE(a.tryon_result_uv, 0), 0),
  COALESCE(a.confirm_after_tryon_uv, 0)::numeric / NULLIF(COALESCE(a.tryon_result_uv, 0), 0),
  COALESCE(a.confirm_from_want_uv, 0)::numeric / NULLIF(COALESCE(a.want_uv, 0), 0),
  COALESCE(a.confirm_uv, 0)::numeric / NULLIF(COALESCE(a.view_uv, 0), 0),
  now()
FROM style_base sb
LEFT JOIN agg a ON a.store_id = sb.store_id AND a.style_id = sb.style_id
ON CONFLICT (store_id, style_id, metric_date) DO UPDATE SET
  category = EXCLUDED.category,
  price_level = EXCLUDED.price_level,
  card_render_pv = EXCLUDED.card_render_pv,
  impression_uv = EXCLUDED.impression_uv,
  impression_pv = EXCLUDED.impression_pv,
  view_uv = EXCLUDED.view_uv,
  view_pv = EXCLUDED.view_pv,
  detail_uv = EXCLUDED.detail_uv,
  tryon_uv = EXCLUDED.tryon_uv,
  tryon_result_uv = EXCLUDED.tryon_result_uv,
  want_uv = EXCLUDED.want_uv,
  want_from_card_uv = EXCLUDED.want_from_card_uv,
  want_from_detail_uv = EXCLUDED.want_from_detail_uv,
  want_after_tryon_uv = EXCLUDED.want_after_tryon_uv,
  confirm_uv = EXCLUDED.confirm_uv,
  confirm_direct_uv = EXCLUDED.confirm_direct_uv,
  confirm_detail_uv = EXCLUDED.confirm_detail_uv,
  confirm_after_tryon_uv = EXCLUDED.confirm_after_tryon_uv,
  confirm_from_want_uv = EXCLUDED.confirm_from_want_uv,
  confirm_done_uv = EXCLUDED.confirm_done_uv,
  detail_rate = EXCLUDED.detail_rate,
  tryon_rate = EXCLUDED.tryon_rate,
  want_rate = EXCLUDED.want_rate,
  direct_confirm_rate = EXCLUDED.direct_confirm_rate,
  detail_confirm_rate = EXCLUDED.detail_confirm_rate,
  tryon_want_rate = EXCLUDED.tryon_want_rate,
  tryon_confirm_rate = EXCLUDED.tryon_confirm_rate,
  want_to_confirm_rate = EXCLUDED.want_to_confirm_rate,
  total_confirm_rate = EXCLUDED.total_confirm_rate,
  updated_at = now();

-- 2. Aggregate a 7-day window and calculate hot/cold labels.
INSERT INTO style_window_metrics (
  store_id,
  style_id,
  window_start,
  window_end,
  window_size,
  category,
  price_level,
  view_7d,
  detail_7d,
  tryon_7d,
  tryon_result_7d,
  want_7d,
  confirm_7d,
  confirm_after_tryon_7d,
  confirm_from_want_7d,
  detail_rate_7d,
  tryon_rate_7d,
  want_rate_7d,
  direct_confirm_rate_7d,
  tryon_confirm_rate_7d,
  want_to_confirm_rate_7d,
  total_confirm_rate_7d,
  view_growth,
  detail_growth,
  tryon_growth,
  want_growth,
  confirm_growth,
  tryon_confirm_growth,
  detail_rate_pct,
  tryon_rate_pct,
  want_rate_pct,
  direct_confirm_rate_pct,
  tryon_confirm_rate_pct,
  want_to_confirm_rate_pct,
  total_confirm_rate_pct,
  growth_score_pct,
  sample_status,
  trend_label,
  cold_type,
  hot_score,
  cold_risk_score,
  growth_score,
  suggestion,
  reason,
  updated_at
)
WITH current_window AS (
  SELECT
    store_id,
    style_id,
    MIN(category) AS category,
    MIN(price_level) AS price_level,
    SUM(view_uv) AS view_7d,
    SUM(detail_uv) AS detail_7d,
    SUM(tryon_uv) AS tryon_7d,
    SUM(tryon_result_uv) AS tryon_result_7d,
    SUM(want_uv) AS want_7d,
    SUM(confirm_uv) AS confirm_7d,
    SUM(confirm_direct_uv) AS confirm_direct_7d,
    SUM(confirm_after_tryon_uv) AS confirm_after_tryon_7d,
    SUM(confirm_from_want_uv) AS confirm_from_want_7d
  FROM style_daily_metrics
  WHERE store_id = :store_id
    AND metric_date BETWEEN (:biz_date::date - INTERVAL '6 days') AND :biz_date::date
  GROUP BY store_id, style_id
),
last_window AS (
  SELECT
    store_id,
    style_id,
    SUM(view_uv) AS last_view_7d,
    SUM(detail_uv) AS last_detail_7d,
    SUM(tryon_uv) AS last_tryon_7d,
    SUM(want_uv) AS last_want_7d,
    SUM(confirm_uv) AS last_confirm_7d,
    SUM(confirm_after_tryon_uv) AS last_confirm_after_tryon_7d
  FROM style_daily_metrics
  WHERE store_id = :store_id
    AND metric_date BETWEEN (:biz_date::date - INTERVAL '13 days') AND (:biz_date::date - INTERVAL '7 days')
  GROUP BY store_id, style_id
),
rates AS (
  SELECT
    cw.*,
    cw.detail_7d::numeric / NULLIF(cw.view_7d, 0) AS detail_rate_7d,
    cw.tryon_7d::numeric / NULLIF(cw.view_7d, 0) AS tryon_rate_7d,
    cw.want_7d::numeric / NULLIF(cw.view_7d, 0) AS want_rate_7d,
    cw.confirm_direct_7d::numeric / NULLIF(cw.view_7d, 0) AS direct_confirm_rate_7d,
    cw.confirm_after_tryon_7d::numeric / NULLIF(cw.tryon_result_7d, 0) AS tryon_confirm_rate_7d,
    cw.confirm_from_want_7d::numeric / NULLIF(cw.want_7d, 0) AS want_to_confirm_rate_7d,
    cw.confirm_7d::numeric / NULLIF(cw.view_7d, 0) AS total_confirm_rate_7d,
    (cw.view_7d + 1)::numeric / (COALESCE(lw.last_view_7d, 0) + 1) AS view_growth,
    (cw.detail_7d + 1)::numeric / (COALESCE(lw.last_detail_7d, 0) + 1) AS detail_growth,
    (cw.tryon_7d + 1)::numeric / (COALESCE(lw.last_tryon_7d, 0) + 1) AS tryon_growth,
    (cw.want_7d + 1)::numeric / (COALESCE(lw.last_want_7d, 0) + 1) AS want_growth,
    (cw.confirm_7d + 1)::numeric / (COALESCE(lw.last_confirm_7d, 0) + 1) AS confirm_growth,
    (cw.confirm_after_tryon_7d + 1)::numeric / (COALESCE(lw.last_confirm_after_tryon_7d, 0) + 1) AS tryon_confirm_growth
  FROM current_window cw
  LEFT JOIN last_window lw ON lw.store_id = cw.store_id AND lw.style_id = cw.style_id
),
pct AS (
  SELECT
    r.*,
    PERCENT_RANK() OVER (PARTITION BY store_id, category, price_level ORDER BY COALESCE(detail_rate_7d, 0)) AS detail_rate_pct,
    PERCENT_RANK() OVER (PARTITION BY store_id, category, price_level ORDER BY COALESCE(tryon_rate_7d, 0)) AS tryon_rate_pct,
    PERCENT_RANK() OVER (PARTITION BY store_id, category, price_level ORDER BY COALESCE(want_rate_7d, 0)) AS want_rate_pct,
    PERCENT_RANK() OVER (PARTITION BY store_id, category, price_level ORDER BY COALESCE(direct_confirm_rate_7d, 0)) AS direct_confirm_rate_pct,
    PERCENT_RANK() OVER (PARTITION BY store_id, category, price_level ORDER BY COALESCE(tryon_confirm_rate_7d, 0)) AS tryon_confirm_rate_pct,
    PERCENT_RANK() OVER (PARTITION BY store_id, category, price_level ORDER BY COALESCE(want_to_confirm_rate_7d, 0)) AS want_to_confirm_rate_pct,
    PERCENT_RANK() OVER (PARTITION BY store_id, category, price_level ORDER BY COALESCE(total_confirm_rate_7d, 0)) AS total_confirm_rate_pct,
    PERCENT_RANK() OVER (PARTITION BY store_id, category, price_level ORDER BY COALESCE(confirm_growth, 0)) AS growth_score_pct
  FROM rates r
),
score AS (
  SELECT
    p.*,
    (
      0.15 * COALESCE(want_rate_pct, 0)
      + 0.15 * COALESCE(tryon_rate_pct, 0)
      + 0.25 * COALESCE(tryon_confirm_rate_pct, 0)
      + 0.20 * COALESCE(direct_confirm_rate_pct, 0)
      + 0.15 * COALESCE(want_to_confirm_rate_pct, 0)
      + 0.10 * COALESCE(growth_score_pct, 0)
    ) AS hot_score,
    (
      1
      - (
        0.20 * COALESCE(tryon_rate_pct, 0)
        + 0.25 * COALESCE(tryon_confirm_rate_pct, 0)
        + 0.20 * COALESCE(direct_confirm_rate_pct, 0)
        + 0.20 * COALESCE(want_to_confirm_rate_pct, 0)
        + 0.15 * COALESCE(total_confirm_rate_pct, 0)
      )
    ) AS cold_risk_score,
    (
      0.40 * COALESCE(confirm_growth, 1)
      + 0.30 * COALESCE(tryon_growth, 1)
      + 0.30 * COALESCE(want_growth, 1)
    ) AS growth_score
  FROM pct p
)
SELECT
  store_id,
  style_id,
  (:biz_date::date - INTERVAL '6 days')::date AS window_start,
  :biz_date::date AS window_end,
  7 AS window_size,
  category,
  price_level,
  view_7d,
  detail_7d,
  tryon_7d,
  tryon_result_7d,
  want_7d,
  confirm_7d,
  confirm_after_tryon_7d,
  confirm_from_want_7d,
  detail_rate_7d,
  tryon_rate_7d,
  want_rate_7d,
  direct_confirm_rate_7d,
  tryon_confirm_rate_7d,
  want_to_confirm_rate_7d,
  total_confirm_rate_7d,
  view_growth,
  detail_growth,
  tryon_growth,
  want_growth,
  confirm_growth,
  tryon_confirm_growth,
  detail_rate_pct,
  tryon_rate_pct,
  want_rate_pct,
  direct_confirm_rate_pct,
  NULL::numeric AS detail_confirm_rate_pct,
  tryon_confirm_rate_pct,
  want_to_confirm_rate_pct,
  total_confirm_rate_pct,
  growth_score_pct,
  CASE WHEN view_7d < 100 THEN 'insufficient' ELSE 'sufficient' END AS sample_status,
  CASE
    WHEN view_7d < 100 THEN 'Untested'
    WHEN hot_score >= 0.75 AND confirm_growth >= 1.2 THEN 'HotUp'
    WHEN hot_score >= 0.60 THEN 'Stable'
    WHEN view_7d < 200 AND total_confirm_rate_pct >= 0.70 THEN 'Potential'
    WHEN cold_risk_score >= 0.70 THEN 'ColdDown'
    ELSE 'Stable'
  END AS trend_label,
  CASE
    WHEN view_7d < 100 THEN NULL
    WHEN COALESCE(tryon_rate_pct, 0) < 0.30 AND COALESCE(want_rate_pct, 0) < 0.30 AND COALESCE(direct_confirm_rate_pct, 0) < 0.30 THEN 'Cold_FirstLook'
    WHEN COALESCE(tryon_rate_pct, 0) >= 0.60 AND COALESCE(tryon_confirm_rate_pct, 0) < 0.30 AND COALESCE(want_rate_pct, 0) < 0.30 THEN 'Cold_AfterTryon'
    WHEN COALESCE(want_rate_pct, 0) >= 0.60 AND COALESCE(want_to_confirm_rate_pct, 0) < 0.30 THEN 'Cold_AfterWant'
    WHEN confirm_growth < 0.80 THEN 'ColdDown'
    ELSE NULL
  END AS cold_type,
  hot_score,
  cold_risk_score,
  growth_score,
  CASE
    WHEN view_7d < 100 THEN '样本不足，先增加曝光。'
    WHEN COALESCE(tryon_rate_pct, 0) < 0.30 THEN '第一眼吸引弱，建议换封面或调整标签。'
    WHEN COALESCE(tryon_confirm_rate_pct, 0) < 0.30 AND tryon_7d > 0 THEN '试戴后转化弱，建议检查试戴效果和适配人群。'
    WHEN COALESCE(want_to_confirm_rate_pct, 0) < 0.30 AND want_7d > 0 THEN '候选池转化弱，建议补价格、档期和可做性说明。'
    WHEN hot_score >= 0.75 THEN '可进入热门推荐位或门店主推。'
    ELSE '保持观察。'
  END AS suggestion,
  CASE
    WHEN view_7d < 100 THEN '7日曝光低于样本阈值。'
    WHEN hot_score >= 0.75 THEN '多路径转化分位表现较高。'
    WHEN cold_risk_score >= 0.70 THEN '多个关键转化分位偏低。'
    ELSE '表现接近同类均值。'
  END AS reason,
  now()
FROM score
ON CONFLICT (store_id, style_id, window_start, window_end) DO UPDATE SET
  category = EXCLUDED.category,
  price_level = EXCLUDED.price_level,
  view_7d = EXCLUDED.view_7d,
  detail_7d = EXCLUDED.detail_7d,
  tryon_7d = EXCLUDED.tryon_7d,
  tryon_result_7d = EXCLUDED.tryon_result_7d,
  want_7d = EXCLUDED.want_7d,
  confirm_7d = EXCLUDED.confirm_7d,
  confirm_after_tryon_7d = EXCLUDED.confirm_after_tryon_7d,
  confirm_from_want_7d = EXCLUDED.confirm_from_want_7d,
  detail_rate_7d = EXCLUDED.detail_rate_7d,
  tryon_rate_7d = EXCLUDED.tryon_rate_7d,
  want_rate_7d = EXCLUDED.want_rate_7d,
  direct_confirm_rate_7d = EXCLUDED.direct_confirm_rate_7d,
  tryon_confirm_rate_7d = EXCLUDED.tryon_confirm_rate_7d,
  want_to_confirm_rate_7d = EXCLUDED.want_to_confirm_rate_7d,
  total_confirm_rate_7d = EXCLUDED.total_confirm_rate_7d,
  view_growth = EXCLUDED.view_growth,
  detail_growth = EXCLUDED.detail_growth,
  tryon_growth = EXCLUDED.tryon_growth,
  want_growth = EXCLUDED.want_growth,
  confirm_growth = EXCLUDED.confirm_growth,
  tryon_confirm_growth = EXCLUDED.tryon_confirm_growth,
  sample_status = EXCLUDED.sample_status,
  trend_label = EXCLUDED.trend_label,
  cold_type = EXCLUDED.cold_type,
  hot_score = EXCLUDED.hot_score,
  cold_risk_score = EXCLUDED.cold_risk_score,
  growth_score = EXCLUDED.growth_score,
  suggestion = EXCLUDED.suggestion,
  reason = EXCLUDED.reason,
  updated_at = now();
