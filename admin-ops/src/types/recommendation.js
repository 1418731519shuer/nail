/**
 * Shared constants and lightweight type helpers for user personalization.
 */

export const SEASON_OPTIONS = ['春日', '夏日', '秋冬']
export const STYLE_OPTIONS = ['高级感', '个性风', '清新简约', '温柔感', 'ins风']
export const TYPE_OPTIONS = ['法式', '花朵', '渐变', '猫眼', '手绘', '钻饰']
export const SHAPE_OPTIONS = ['穿戴甲', '短甲', '延长甲', 'DIY']
export const FILTER_ALL = '全部'

export const FILTER_OPTIONS = {
  season: [FILTER_ALL, ...SEASON_OPTIONS],
  style: [FILTER_ALL, ...STYLE_OPTIONS],
  type: [FILTER_ALL, ...TYPE_OPTIONS],
  shape: [FILTER_ALL, ...SHAPE_OPTIONS]
}

export const DIMENSION_OPTIONS = {
  season: SEASON_OPTIONS,
  style: STYLE_OPTIONS,
  type: TYPE_OPTIONS,
  shape: SHAPE_OPTIONS
}

export const COMBO_DIMENSIONS = {
  styleType: ['style', 'type'],
  typeShape: ['type', 'shape'],
  styleShape: ['style', 'shape'],
  seasonStyle: ['season', 'style']
}

export const MOCK_USER_ID = 'user_mock_001'

export const BEHAVIOR_WEIGHTS = {
  effective_exposure: 0.5,
  filter_click: 2,
  view_detail: 3,
  add_tryon: 5,
  normal_tryon: 6,
  realistic_tryon: 8,
  want_do: 10,
  confirm_do: 12,
  quick_skip: -0.3,
  multi_exposure_no_click: -0.5,
  remove_tryon: -4
}

export const INTEREST_BEHAVIORS = [
  'effective_exposure',
  'filter_click',
  'view_detail',
  'add_tryon',
  'normal_tryon',
  'realistic_tryon',
  'quick_skip',
  'multi_exposure_no_click',
  'remove_tryon'
]

export const CONVERSION_BEHAVIORS = ['want_do', 'confirm_do']

export const DEFAULT_FILTER = {
  season: FILTER_ALL,
  style: FILTER_ALL,
  type: FILTER_ALL,
  shape: FILTER_ALL
}

export const FEEDBACK_CODE_MAP = {
  tryon_effect: [
    'nail_position_wrong',
    'nail_shape_wrong',
    'style_not_match',
    'color_not_match',
    'pattern_deformed',
    'hand_changed',
    'background_changed',
    'lighting_wrong',
    'result_unrealistic'
  ],
  recommendation: [
    'not_my_style',
    'too_repetitive',
    'wrong_shape',
    'wrong_season',
    'too_fancy',
    'too_plain',
    'want_more_similar'
  ],
  style_content: [
    'wrong_tag',
    'bad_image_quality',
    'description_wrong',
    'comment_irrelevant',
    'style_duplicate'
  ],
  upload_detection: [
    'upload_failed',
    'hand_not_detected',
    'nail_not_detected',
    'nail_mask_wrong',
    'image_too_blurry',
    'angle_not_supported'
  ],
  performance: [
    'generation_too_slow',
    'page_lag',
    'image_load_slow',
    'tryon_failed'
  ],
  ui_experience: [
    'button_unclear',
    'workflow_confusing',
    'filter_hard_to_use',
    'cannot_find_feature'
  ]
}

export const RECOMMENDATION_FEEDBACK_CODES = new Set([
  'not_my_style',
  'too_repetitive',
  'wrong_shape',
  'wrong_season',
  'too_fancy',
  'too_plain',
  'want_more_similar'
])

export const SCORE_FLOOR = -5
export const TAG_ALPHA = 1

export function createZeroMap(options) {
  return options.reduce((acc, item) => {
    acc[item] = 0
    return acc
  }, {})
}

export function createEmptyDimensionScores() {
  return {
    season: createZeroMap(SEASON_OPTIONS),
    style: createZeroMap(STYLE_OPTIONS),
    type: createZeroMap(TYPE_OPTIONS),
    shape: createZeroMap(SHAPE_OPTIONS)
  }
}

export function createEmptyComboScores() {
  return {
    styleType: {},
    typeShape: {},
    styleShape: {},
    seasonStyle: {}
  }
}

export function createItemSnapshot(item) {
  return {
    season: item.season,
    style: item.style,
    type: item.type,
    shape: item.shape
  }
}

export function matchFilter(item, filter = DEFAULT_FILTER) {
  return (
    (!filter.season || filter.season === FILTER_ALL || item.season === filter.season) &&
    (!filter.style || filter.style === FILTER_ALL || item.style === filter.style) &&
    (!filter.type || filter.type === FILTER_ALL || item.type === filter.type) &&
    (!filter.shape || filter.shape === FILTER_ALL || item.shape === filter.shape)
  )
}
