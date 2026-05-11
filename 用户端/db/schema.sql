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
  base_price NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'active',
  is_cold_start BOOLEAN NOT NULL DEFAULT false,
  is_promoted BOOLEAN NOT NULL DEFAULT false,
  main_image_url TEXT,
  search_text TEXT,
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
  hand_asset_id UUID REFERENCES uploaded_assets(id),
  style_asset_id UUID REFERENCES uploaded_assets(id),
  result_asset_id UUID REFERENCES uploaded_assets(id),
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
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
CREATE INDEX idx_style_tags_store_level ON style_tags(store_id, level, sort_order);
CREATE INDEX idx_try_on_store_time ON try_on_jobs(store_id, started_at DESC);
CREATE INDEX idx_try_on_store_style_time ON try_on_jobs(store_id, style_id, started_at DESC);
CREATE INDEX idx_try_on_store_user_time ON try_on_jobs(store_id, user_id, started_at DESC);
CREATE INDEX idx_exposures_store_style_time ON style_exposures(store_id, style_id, exposed_at DESC);
CREATE INDEX idx_intents_store_style_time ON style_intents(store_id, style_id, created_at DESC);
CREATE INDEX idx_orders_store_source_status_time ON orders(store_id, source, status, ordered_at DESC);
CREATE INDEX idx_event_logs_store_event_time ON event_logs(store_id, event_name, created_at DESC);
CREATE INDEX idx_event_logs_properties_gin ON event_logs USING GIN (properties);
CREATE INDEX idx_user_tag_scores_rank ON user_tag_scores(store_id, user_id, score DESC);
CREATE INDEX idx_store_tag_scores_rank ON store_tag_scores(store_id, score DESC);
CREATE INDEX idx_style_daily_stats_date ON style_daily_stats(store_id, biz_date DESC);
CREATE INDEX idx_store_daily_stats_date ON store_daily_stats(store_id, biz_date DESC);
