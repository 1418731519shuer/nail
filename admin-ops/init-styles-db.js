/**
 * 初始化款式数据库
 * 数据来源：
 *   - xhs-style-dataset.enriched.json  （真实图文/标签/postStats）
 *   - xhs-admin-seed.json              （运营字段：status/price/description/metrics）
 *   - xhs_summary.json                 （仿真指标：hot_score/cold_risk/tryon_uv 等）
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, 'styles.db')
const DATA_DIR = path.join(__dirname, '../data/xhs/processed')
const SEED_PATH = path.join(__dirname, 'src/data/xhs-admin-seed.json')
const SIM_PATH = path.join(__dirname, '../user-client/outputs/simulation/xhs_summary.json')

const enriched = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'xhs-style-dataset.enriched.json'), 'utf-8'))
const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
const sim = JSON.parse(fs.readFileSync(SIM_PATH, 'utf-8'))

// 建索引
const seedMap = new Map(seed.map(s => [s.id, s]))
const simHot = new Map((sim.top_hot || []).map(r => [r.style_id, r]))
const simCold = new Map((sim.top_cold || []).map(r => [r.style_id, r]))
const simPot = new Map((sim.top_potential || []).map(r => [r.style_id, r]))

function getSimRow(id) {
  return simHot.get(id) || simCold.get(id) || simPot.get(id) || null
}

const db = new Database(DB_PATH)

db.exec(`PRAGMA foreign_keys = OFF;`)
db.exec(`
  DROP TABLE IF EXISTS styles;
  CREATE TABLE styles (
    id              TEXT PRIMARY KEY,
    style_code      TEXT,
    name            TEXT NOT NULL,
    description     TEXT,
    status          TEXT DEFAULT 'published',
    category        TEXT,
    primary_tag     TEXT,
    secondary_tag   TEXT,
    price           INTEGER DEFAULT 168,
    cover_image     TEXT,
    source_url      TEXT,
    author          TEXT,
    is_promoted     INTEGER DEFAULT 0,
    is_cold_start   INTEGER DEFAULT 0,
    crawled         INTEGER DEFAULT 1,
    makeable        INTEGER DEFAULT 1,
    listed_at       TEXT,
    unpublished_at  TEXT,
    recommend_bucket TEXT,
    hot_score       REAL DEFAULT 0,
    cold_risk_score REAL DEFAULT 0,
    growth_score    REAL DEFAULT 0,
    trend_label     TEXT DEFAULT 'Stable',
    view_uv         INTEGER DEFAULT 0,
    tryon_uv        INTEGER DEFAULT 0,
    want_uv         INTEGER DEFAULT 0,
    confirm_uv      INTEGER DEFAULT 0,
    tryon_confirm_rate REAL DEFAULT 0,
    xhs_likes       INTEGER DEFAULT 0,
    xhs_saves       INTEGER DEFAULT 0,
    xhs_comments    INTEGER DEFAULT 0,
    xhs_shares      INTEGER DEFAULT 0,
    tags_style      TEXT DEFAULT '[]',
    tags_color      TEXT DEFAULT '[]',
    tags_season     TEXT DEFAULT '[]',
    tags_shape      TEXT DEFAULT '[]',
    thumb           TEXT,
    accent          TEXT,
    nail_gradient   TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_status ON styles(status);
  CREATE INDEX IF NOT EXISTS idx_bucket ON styles(recommend_bucket);
  CREATE INDEX IF NOT EXISTS idx_hot ON styles(hot_score DESC);
`)

const insert = db.prepare(`
  INSERT OR REPLACE INTO styles (
    id, style_code, name, description, status, category, primary_tag, secondary_tag,
    price, cover_image, source_url, author, is_promoted, is_cold_start, crawled, makeable,
    listed_at, recommend_bucket, hot_score, cold_risk_score, growth_score, trend_label,
    view_uv, tryon_uv, want_uv, confirm_uv, tryon_confirm_rate,
    xhs_likes, xhs_saves, xhs_comments, xhs_shares,
    tags_style, tags_color, tags_season, tags_shape,
    thumb, accent, nail_gradient
  ) VALUES (
    @id, @style_code, @name, @description, @status, @category, @primary_tag, @secondary_tag,
    @price, @cover_image, @source_url, @author, @is_promoted, @is_cold_start, @crawled, @makeable,
    @listed_at, @recommend_bucket, @hot_score, @cold_risk_score, @growth_score, @trend_label,
    @view_uv, @tryon_uv, @want_uv, @confirm_uv, @tryon_confirm_rate,
    @xhs_likes, @xhs_saves, @xhs_comments, @xhs_shares,
    @tags_style, @tags_color, @tags_season, @tags_shape,
    @thumb, @accent, @nail_gradient
  )
`)

const insertMany = db.transaction((rows) => {
  for (const row of rows) insert.run(row)
})

const rows = enriched.styles.map((e, i) => {
  const s = seedMap.get(e.id) || {}
  const sim = getSimRow(e.id) || {}
  const bucket = e.recommendBucket || 'stable'
  const trendLabel = bucket === 'hot' || bucket === 'stable'
    ? (sim.label || 'Stable')
    : bucket === 'potential' ? 'Potential'
    : bucket === 'cold' ? 'ColdDown' : 'Stable'

  return {
    id: e.id,
    style_code: s.styleCode || `XHS${String(i + 1).padStart(4, '0')}`,
    name: e.name || e.rawTitle || s.name || e.id,
    description: s.description || e.definition || e.rawDescription || '',
    status: s.status || 'published',
    category: e.primaryTag || s.category || '精选',
    primary_tag: e.primaryTag || '',
    secondary_tag: e.secondaryTag || '',
    price: s.price || 168,
    cover_image: e.image || s.coverImage || '',
    source_url: e.postStats?.sourceUrl || '',
    author: e.author || '',
    is_promoted: s.isPromoted ? 1 : 0,
    is_cold_start: s.isColdStart ? 1 : 0,
    crawled: 1,
    makeable: 1,
    listed_at: s.listedAt || '2026-01-01',
    recommend_bucket: bucket,
    hot_score: sim.hot_score || (e.hotScore || 0) / 100,
    cold_risk_score: sim.cold_risk_score || 0,
    growth_score: sim.growth_score || 0,
    trend_label: trendLabel,
    view_uv: sim.view_uv || 0,
    tryon_uv: sim.tryon_uv || 0,
    want_uv: sim.want_uv || 0,
    confirm_uv: sim.total_confirm_uv || 0,
    tryon_confirm_rate: sim.tryon_confirm_rate || 0,
    xhs_likes: Number(e.postStats?.likes || e.likes || 0),
    xhs_saves: Number(e.postStats?.saves || 0),
    xhs_comments: Number(e.postStats?.comments || 0),
    xhs_shares: Number(e.postStats?.shares || 0),
    tags_style: JSON.stringify(e.tagGroups?.['风格'] || []),
    tags_color: JSON.stringify(e.tagGroups?.['款式'] || []),   // 款式类型：猫眼/渐变/法式/钻饰等
    tags_season: JSON.stringify(e.tagGroups?.['季节'] || []),
    tags_shape: JSON.stringify(e.tagGroups?.['甲型'] || []),
    thumb: e.thumb || '',
    accent: e.accent || '',
    nail_gradient: e.nail || ''
  }
})

insertMany(rows)

const count = db.prepare('SELECT COUNT(*) as n FROM styles').get()
console.log(`✓ styles.db 初始化完成，共 ${count.n} 条款式`)
console.log(`  路径: ${DB_PATH}`)

// 输出分布统计
const buckets = db.prepare(`SELECT recommend_bucket, COUNT(*) as n FROM styles GROUP BY recommend_bucket`).all()
console.log('  Bucket 分布:', buckets.map(b => `${b.recommend_bucket}:${b.n}`).join(' '))

db.close()
