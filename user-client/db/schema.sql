-- PostgreSQL-first schema for the nail AI try-on product.
-- For local SQLite prototyping, keep the same table split and replace UUID/JSONB
-- with TEXT columns.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  display_name TEXT,
  phone TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  union_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  device_id TEXT,
  entry_page TEXT,
  last_page TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

CREATE TABLE nail_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'store_upload',
  source_url TEXT,
  image_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'uncategorized',
  color_system TEXT NOT NULL DEFAULT 'unknown',
  craft_type TEXT NOT NULL DEFAULT 'unknown',
  style_tag JSONB NOT NULL DEFAULT '[]'::jsonb,
  scene_tag JSONB NOT NULL DEFAULT '[]'::jsonb,
  nail_length TEXT,
  nail_shape TEXT,
  price_level TEXT NOT NULL DEFAULT 'mid',
  estimated_duration INTEGER,
  difficulty_level TEXT,
  store_can_make BOOLEAN NOT NULL DEFAULT true,
  material_required JSONB NOT NULL DEFAULT '[]'::jsonb,
  base_price NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'active',
  is_cold_start BOOLEAN NOT NULL DEFAULT false,
  is_promoted BOOLEAN NOT NULL DEFAULT false,
  main_image_url TEXT,
  search_text TEXT,
  launch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  listed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  off_shelf_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE style_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, name, level)
);

CREATE TABLE nail_style_tags (
  style_id UUID NOT NULL REFERENCES nail_styles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES style_tags(id) ON DELETE CASCADE,
  tag_role TEXT NOT NULL DEFAULT 'extra',
  weight NUMERIC(8, 2) NOT NULL DEFAULT 1,
  PRIMARY KEY (style_id, tag_id)
);

CREATE TABLE style_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL REFERENCES nail_styles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'detail',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE uploaded_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  asset_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE batch_try_on_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  hand_asset_id UUID REFERENCES uploaded_assets(id),
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE try_on_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  style_id UUID REFERENCES nail_styles(id),
  batch_id UUID REFERENCES batch_try_on_jobs(id),
  try_on_type TEXT NOT NULL,
  model_version TEXT,
  hand_asset_id UUID REFERENCES uploaded_assets(id),
  style_asset_id UUID REFERENCES uploaded_assets(id),
  result_asset_id UUID REFERENCES uploaded_assets(id),
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE user_style_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  session_id UUID REFERENCES user_sessions(id),
  style_id UUID REFERENCES nail_styles(id),
  try_on_job_id UUID REFERENCES try_on_jobs(id),
  event_type TEXT NOT NULL,
  page_source TEXT NOT NULL DEFAULT 'unknown',
  position_index INTEGER,
  keyword TEXT,
  recommend_source TEXT,
  want_source TEXT,
  confirm_source TEXT,
  device_type TEXT,
  is_new_user BOOLEAN,
  visible_ratio NUMERIC(6, 4),
  visible_duration_ms INTEGER,
  result_visible_duration_ms INTEGER,
  is_valid_impression BOOLEAN NOT NULL DEFAULT false,
  is_valid_view BOOLEAN NOT NULL DEFAULT false,
  action_result TEXT,
  tryon_source TEXT,
  generate_status TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE style_exposures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  session_id UUID REFERENCES user_sessions(id),
  style_id UUID NOT NULL REFERENCES nail_styles(id),
  page TEXT,
  position INTEGER,
  exposed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE style_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  style_id UUID NOT NULL REFERENCES nail_styles(id),
  try_on_job_id UUID REFERENCES try_on_jobs(id),
  intent_type TEXT NOT NULL DEFAULT 'want_to_do',
  intent_source TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  style_id UUID REFERENCES nail_styles(id),
  intent_id UUID REFERENCES style_intents(id),
  try_on_job_id UUID REFERENCES try_on_jobs(id),
  source TEXT NOT NULL DEFAULT 'walk_in',
  confirm_source TEXT NOT NULL DEFAULT 'unknown',
  amount NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'pending',
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE daily_store_inputs (
  store_id UUID NOT NULL REFERENCES stores(id),
  biz_date DATE NOT NULL,
  walk_in_customer_count INTEGER NOT NULL DEFAULT 0,
  total_order_count INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, biz_date)
);

CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  session_id UUID REFERENCES user_sessions(id),
  event_name TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_tag_scores (
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID NOT NULL REFERENCES users(id),
  tag_id UUID NOT NULL REFERENCES style_tags(id),
  score NUMERIC(12, 2) NOT NULL DEFAULT 0,
  exposure_count INTEGER NOT NULL DEFAULT 0,
  try_on_count INTEGER NOT NULL DEFAULT 0,
  intent_count INTEGER NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, user_id, tag_id)
);

CREATE TABLE store_tag_scores (
  store_id UUID NOT NULL REFERENCES stores(id),
  tag_id UUID NOT NULL REFERENCES style_tags(id),
  score NUMERIC(14, 2) NOT NULL DEFAULT 0,
  exposure_count INTEGER NOT NULL DEFAULT 0,
  try_on_count INTEGER NOT NULL DEFAULT 0,
  intent_count INTEGER NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, tag_id)
);

CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  summary TEXT
);

CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  extracted_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE style_daily_stats (
  store_id UUID NOT NULL REFERENCES stores(id),
  style_id UUID NOT NULL REFERENCES nail_styles(id),
  biz_date DATE NOT NULL,
  exposure_count INTEGER NOT NULL DEFAULT 0,
  try_on_count INTEGER NOT NULL DEFAULT 0,
  try_on_user_count INTEGER NOT NULL DEFAULT 0,
  intent_count INTEGER NOT NULL DEFAULT 0,
  intent_rate NUMERIC(10, 4),
  try_on_click_rate NUMERIC(10, 4),
  cold_style_exposure_count INTEGER NOT NULL DEFAULT 0,
  cold_style_intent_count INTEGER NOT NULL DEFAULT 0,
  cold_style_activation_rate NUMERIC(10, 4),
  ai_order_count INTEGER NOT NULL DEFAULT 0,
  promoted_order_count INTEGER NOT NULL DEFAULT 0,
  promoted_hit_rate NUMERIC(10, 4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, style_id, biz_date)
);

CREATE TABLE style_daily_metrics (
  store_id UUID NOT NULL REFERENCES stores(id),
  style_id UUID NOT NULL REFERENCES nail_styles(id),
  metric_date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'uncategorized',
  price_level TEXT NOT NULL DEFAULT 'mid',
  card_render_pv INTEGER NOT NULL DEFAULT 0,
  impression_uv INTEGER NOT NULL DEFAULT 0,
  impression_pv INTEGER NOT NULL DEFAULT 0,
  view_uv INTEGER NOT NULL DEFAULT 0,
  view_pv INTEGER NOT NULL DEFAULT 0,
  detail_uv INTEGER NOT NULL DEFAULT 0,
  tryon_uv INTEGER NOT NULL DEFAULT 0,
  tryon_result_uv INTEGER NOT NULL DEFAULT 0,
  want_uv INTEGER NOT NULL DEFAULT 0,
  want_from_card_uv INTEGER NOT NULL DEFAULT 0,
  want_from_detail_uv INTEGER NOT NULL DEFAULT 0,
  want_after_tryon_uv INTEGER NOT NULL DEFAULT 0,
  confirm_uv INTEGER NOT NULL DEFAULT 0,
  confirm_direct_uv INTEGER NOT NULL DEFAULT 0,
  confirm_detail_uv INTEGER NOT NULL DEFAULT 0,
  confirm_after_tryon_uv INTEGER NOT NULL DEFAULT 0,
  confirm_from_want_uv INTEGER NOT NULL DEFAULT 0,
  confirm_done_uv INTEGER NOT NULL DEFAULT 0,
  detail_rate NUMERIC(10, 4),
  tryon_rate NUMERIC(10, 4),
  want_rate NUMERIC(10, 4),
  direct_confirm_rate NUMERIC(10, 4),
  detail_confirm_rate NUMERIC(10, 4),
  tryon_want_rate NUMERIC(10, 4),
  tryon_confirm_rate NUMERIC(10, 4),
  want_to_confirm_rate NUMERIC(10, 4),
  total_confirm_rate NUMERIC(10, 4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, style_id, metric_date)
);

CREATE TABLE style_window_metrics (
  store_id UUID NOT NULL REFERENCES stores(id),
  style_id UUID NOT NULL REFERENCES nail_styles(id),
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  window_size INTEGER NOT NULL DEFAULT 7,
  category TEXT NOT NULL DEFAULT 'uncategorized',
  price_level TEXT NOT NULL DEFAULT 'mid',
  view_7d INTEGER NOT NULL DEFAULT 0,
  detail_7d INTEGER NOT NULL DEFAULT 0,
  tryon_7d INTEGER NOT NULL DEFAULT 0,
  tryon_result_7d INTEGER NOT NULL DEFAULT 0,
  want_7d INTEGER NOT NULL DEFAULT 0,
  confirm_7d INTEGER NOT NULL DEFAULT 0,
  confirm_after_tryon_7d INTEGER NOT NULL DEFAULT 0,
  confirm_from_want_7d INTEGER NOT NULL DEFAULT 0,
  detail_rate_7d NUMERIC(10, 4),
  tryon_rate_7d NUMERIC(10, 4),
  want_rate_7d NUMERIC(10, 4),
  direct_confirm_rate_7d NUMERIC(10, 4),
  tryon_confirm_rate_7d NUMERIC(10, 4),
  want_to_confirm_rate_7d NUMERIC(10, 4),
  total_confirm_rate_7d NUMERIC(10, 4),
  view_growth NUMERIC(12, 4),
  detail_growth NUMERIC(12, 4),
  tryon_growth NUMERIC(12, 4),
  want_growth NUMERIC(12, 4),
  confirm_growth NUMERIC(12, 4),
  tryon_confirm_growth NUMERIC(12, 4),
  detail_rate_pct NUMERIC(10, 4),
  tryon_rate_pct NUMERIC(10, 4),
  want_rate_pct NUMERIC(10, 4),
  direct_confirm_rate_pct NUMERIC(10, 4),
  detail_confirm_rate_pct NUMERIC(10, 4),
  tryon_confirm_rate_pct NUMERIC(10, 4),
  want_to_confirm_rate_pct NUMERIC(10, 4),
  total_confirm_rate_pct NUMERIC(10, 4),
  growth_score_pct NUMERIC(10, 4),
  sample_status TEXT NOT NULL DEFAULT 'insufficient',
  trend_label TEXT NOT NULL DEFAULT 'Untested',
  cold_type TEXT,
  hot_score NUMERIC(12, 4),
  cold_risk_score NUMERIC(12, 4),
  growth_score NUMERIC(12, 4),
  suggestion TEXT,
  reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, style_id, window_start, window_end)
);

CREATE TABLE store_daily_stats (
  store_id UUID NOT NULL REFERENCES stores(id),
  biz_date DATE NOT NULL,
  try_on_count INTEGER NOT NULL DEFAULT 0,
  try_on_user_count INTEGER NOT NULL DEFAULT 0,
  walk_in_customer_count INTEGER NOT NULL DEFAULT 0,
  mini_program_penetration_rate NUMERIC(10, 4),
  avg_try_on_per_user NUMERIC(10, 4),
  active_session_count INTEGER NOT NULL DEFAULT 0,
  avg_duration_seconds INTEGER,
  order_count INTEGER NOT NULL DEFAULT 0,
  revenue_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  aov NUMERIC(10, 2),
  ai_order_count INTEGER NOT NULL DEFAULT 0,
  ai_revenue_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ai_aov NUMERIC(10, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, biz_date)
);

CREATE INDEX idx_users_store_last_seen ON users(store_id, last_seen_at DESC);
CREATE INDEX idx_user_sessions_store_started ON user_sessions(store_id, started_at DESC);
CREATE INDEX idx_nail_styles_store_status ON nail_styles(store_id, status, updated_at DESC);
CREATE INDEX idx_nail_styles_compare_group ON nail_styles(store_id, category, price_level, status);
CREATE INDEX idx_style_tags_store_level ON style_tags(store_id, level, sort_order);
CREATE INDEX idx_try_on_store_time ON try_on_jobs(store_id, started_at DESC);
CREATE INDEX idx_try_on_store_style_time ON try_on_jobs(store_id, style_id, started_at DESC);
CREATE INDEX idx_try_on_store_user_time ON try_on_jobs(store_id, user_id, started_at DESC);
CREATE INDEX idx_user_style_events_store_type_time ON user_style_events(store_id, event_type, event_time DESC);
CREATE INDEX idx_user_style_events_store_style_time ON user_style_events(store_id, style_id, event_time DESC);
CREATE INDEX idx_user_style_events_session_time ON user_style_events(session_id, event_time DESC);
CREATE INDEX idx_exposures_store_style_time ON style_exposures(store_id, style_id, exposed_at DESC);
CREATE INDEX idx_intents_store_style_time ON style_intents(store_id, style_id, created_at DESC);
CREATE INDEX idx_orders_store_source_status_time ON orders(store_id, source, status, ordered_at DESC);
CREATE INDEX idx_event_logs_store_event_time ON event_logs(store_id, event_name, created_at DESC);
CREATE INDEX idx_event_logs_properties_gin ON event_logs USING GIN (properties);
CREATE INDEX idx_user_tag_scores_rank ON user_tag_scores(store_id, user_id, score DESC);
CREATE INDEX idx_store_tag_scores_rank ON store_tag_scores(store_id, score DESC);
CREATE INDEX idx_style_daily_stats_date ON style_daily_stats(store_id, biz_date DESC);
CREATE INDEX idx_style_daily_metrics_date ON style_daily_metrics(store_id, metric_date DESC);
CREATE INDEX idx_style_window_metrics_label ON style_window_metrics(store_id, trend_label, window_end DESC);
CREATE INDEX idx_style_window_metrics_group_score ON style_window_metrics(store_id, category, price_level, hot_score DESC);
CREATE INDEX idx_store_daily_stats_date ON store_daily_stats(store_id, biz_date DESC);
