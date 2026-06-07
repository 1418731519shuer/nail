<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>用户数据</h2>
        <p>这里拆成两部分：用户个人画像 / 群体分类，以及总体问题反馈数据。</p>
      </div>
      <el-tag type="info">mock data</el-tag>
    </div>

    <el-tabs v-model="activeTab" class="user-tabs">
      <el-tab-pane label="个人与群体数据" name="profile">
        <el-row :gutter="16" style="align-items:stretch">
          <el-col :span="15" style="display:flex;flex-direction:column">
            <!-- 用户偏好画像（四维环形图） -->
            <el-card shadow="never" class="panel">
              <template #header>
                <div class="card-header">
                  <span>用户偏好画像</span>
                  <div style="display:flex;gap:8px">
                    <el-tag type="success" size="small">形象置信度 {{ Math.round((profile.confidence?.overall || 0) * 100) }}%</el-tag>
                    <el-tag type="warning" size="small">探索比例 {{ Math.round((profile.explorationRate || 0) * 100) }}%</el-tag>
                  </div>
                </div>
              </template>
              <el-row :gutter="12">
                <el-col :span="12" v-for="dim in prefDims" :key="dim.key">
                  <div class="pref-dim-card">
                    <div class="pref-dim-header">
                      <span class="pref-dim-title">{{ dim.label }}</span>
                      <span class="pref-dim-top">{{ dim.topText }}</span>
                    </div>
                    <div class="pref-dim-body">
                      <div class="pref-dim-list">
                        <div v-for="item in dim.items" :key="item.label" class="pref-dim-item">
                          <span class="pref-dot" :style="{ background: item.color }"></span>
                          <span class="pref-item-label">{{ item.label }}</span>
                          <span class="pref-item-pct">{{ Math.round(item.value * 100) }}%</span>
                        </div>
                      </div>
                      <div :id="`pref-donut-${dim.key}`" class="pref-donut"></div>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </el-card>

            <!-- 今日事件概况 -->
            <el-card shadow="never" class="panel today-band-card" style="flex:1">
              <template #header>
                <div class="card-header">
                  <span>今日事件概况</span>
                  <el-tag type="info" size="small">实时</el-tag>
                </div>
              </template>
              <div class="today-band">
                <div v-for="item in todayStats" :key="item.label" class="today-stat">
                  <div class="today-icon" :style="{ background: item.color + '20' }">
                    <el-icon :style="{ color: item.color, fontSize: '18px' }">
                      <component :is="item.icon" />
                    </el-icon>
                  </div>
                  <div class="today-change" :class="item.change >= 0 ? 'up' : 'down'">
                    {{ item.change >= 0 ? '+' : '' }}{{ item.change }}%
                  </div>
                  <div class="today-val">{{ item.value }}</div>
                  <div class="today-label">{{ item.label }}</div>
                </div>
              </div>
            </el-card>

          </el-col>

          <el-col :span="9" class="right-col">
            <!-- ★ 美甲人群画像卡片（红框位置） -->
            <el-card shadow="never" class="panel persona-card">
              <template #header>
                <div class="card-header">
                  <span>美甲人群画像</span>
                  <div class="persona-badges">
                    <el-tag size="small" type="info">rule-based</el-tag>
                    <el-tag size="small" type="success">{{ crowdSegments[0]?.label }}</el-tag>
                  </div>
                </div>
              </template>

              <!-- 主要人群大标识 -->
              <div class="persona-primary" :style="{ borderLeftColor: crowdSegments[0]?.color }">
                <div class="persona-name" :style="{ color: crowdSegments[0]?.color }">{{ crowdSegments[0]?.label }}</div>
                <div class="persona-tag">主要人群</div>
              </div>

              <!-- 关键信号行 -->
              <div class="signal-row">
                <div class="signal-item">
                  <span class="signal-key">超仿真率</span>
                  <span class="signal-val">{{ Math.round(extraSignals.hyperRealRate * 100) }}%</span>
                </div>
                <div class="signal-item">
                  <span class="signal-key">移除率</span>
                  <span class="signal-val">{{ Math.round(extraSignals.removeRate * 100) }}%</span>
                </div>
                <div class="signal-item">
                  <span class="signal-key">成单率</span>
                  <span class="signal-val">{{ Math.round(extraSignals.tryonToConfirmRate * 100) }}%</span>
                </div>
                <div class="signal-item">
                  <span class="signal-key">均价偏好</span>
                  <span class="signal-val">¥{{ Math.round(extraSignals.avgPrice) || '--' }}</span>
                </div>
              </div>

              <!-- 人群分布条形图 -->
              <div class="persona-dist">
                <div v-for="(item, i) in crowdSegments" :key="item.key" class="pdist-row" :class="{ primary: i === 0 }">
                  <span class="pdist-dot" :style="{ background: item.color }"></span>
                  <span class="pdist-label">{{ item.label }}</span>
                  <div class="pdist-track">
                    <div class="pdist-bar" :style="{ width: item.pct + '%', background: item.color }"></div>
                  </div>
                  <span class="pdist-pct" :style="{ color: item.color }">{{ item.pct }}%</span>
                </div>
              </div>
            </el-card>

            <!-- 热门试戴词云（移至右列，自动撑满剩余高度） -->
            <el-card shadow="never" class="panel wc-card">
              <template #header>
                <div class="card-header">
                  <span>热门试戴词云</span>
                  <el-tag type="info" size="small">按试戴量加权</el-tag>
                </div>
              </template>
              <div ref="wordCloudRef" class="wc-chart"></div>
            </el-card>

          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="用户反馈数据（总体）" name="feedback">

        <el-row :gutter="16">
          <!-- 左列 -->
          <el-col :span="15">

            <!-- 反馈分类环形图 + 版本折线图 并排 -->
            <el-card shadow="never" class="panel">
              <template #header>
                <div class="card-header">
                  <span>反馈分类 &amp; 版本趋势</span>
                  <el-tag type="info" size="small">共 {{ feedbackOverview.total }} 条</el-tag>
                </div>
              </template>
              <div class="fb-chart-row">
                <div id="fb-donut-chart" class="fb-donut-chart"></div>
                <div id="fb-line-chart" class="fb-line-chart"></div>
              </div>
            </el-card>

            <!-- 近期反馈记录（卡片流） -->
            <el-card shadow="never" class="panel">
              <template #header>
                <div class="card-header">
                  <span>近期问题反馈</span>
                  <el-tag size="small" type="info">最近 {{ recentFeedbackRecords.length }} 条</el-tag>
                </div>
              </template>
              <div class="fb-record-list">
                <div v-for="row in recentFeedbackRecords.slice(0, 6)" :key="row.id" class="fb-record-item">
                  <el-tag :type="severityTagType(row.severity)" size="small" effect="dark" class="fb-record-sev">{{ severityLabel(row.severity) }}</el-tag>
                  <div class="fb-record-body">
                    <div class="fb-record-title">{{ feedbackCodeLabel(row.feedbackCode) }}</div>
                    <div class="fb-record-meta">{{ feedbackTypeLabel(row.feedbackType) }} · {{ sourcePageLabel(row.sourcePage) }} · {{ row.appVersion }}</div>
                    <div class="fb-record-text">{{ row.feedbackText }}</div>
                  </div>
                  <el-tag size="small" effect="plain" class="fb-record-status">{{ statusLabel(row.status) }}</el-tag>
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 右列 -->
          <el-col :span="9">

            <!-- 来源页面饼图 -->
            <el-card shadow="never" class="panel">
              <template #header><span>来源页面分布</span></template>
              <div id="fb-pie-chart" class="fb-pie-chart"></div>
            </el-card>

            <!-- Top 问题码排行 -->
            <el-card shadow="never" class="panel">
              <template #header><span>Top 问题码</span></template>
              <div class="fb-issue-list">
                <div v-for="(item, idx) in topIssueCodes" :key="item.feedbackCode" class="fb-issue-item">
                  <div class="fb-issue-rank" :class="['rank-' + (idx + 1)]">{{ idx + 1 }}</div>
                  <div class="fb-issue-info">
                    <div class="fb-issue-name">{{ item.label }}</div>
                    <div class="fb-issue-sub">{{ item.feedbackTypeLabel }} · 均分 {{ item.avgRating }}</div>
                  </div>
                  <div class="fb-issue-cnt">{{ item.count }} 条</div>
                </div>
              </div>
            </el-card>

          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import 'echarts-wordcloud'

// 统一图表字体（与运营端主字体栈一致）
const CHART_FONT = "'DM Sans', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
import { ElMessage } from 'element-plus'
import { View, User, Select, ShoppingCart, Warning, Star, ChatDotRound, Aim } from '@element-plus/icons-vue'
import UserPreferenceRadar from '@/components/UserPreferenceRadar.vue'
import { mockNailItems } from '@/data/mockNailItems'
import { generateMockBehaviorLogs } from '@/data/mockUserBehavior'
import {
  FEEDBACK_CODE_LABELS,
  FEEDBACK_SEVERITY_LABELS,
  FEEDBACK_SOURCE_PAGE_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  getFeedbackCategoryStats,
  getFeedbackOverview,
  getPipelineStats,
  getRecentFeedbackRecords,
  getSourcePageStats,
  getTopIssueCodes,
  getVersionTrendStats,
  mockFeedbackRecords
} from '@/data/mockFeedbackData'
import { buildSummaryText, rankItemsForUser, topN } from '@/services/recommendationService'
import { buildProfileFromLogs, calculateTagProbabilities, classifyUserCrowd, deriveExtraSignals, recordUserBehavior } from '@/services/userProfileService'
import { DEFAULT_FILTER, FILTER_OPTIONS, MOCK_USER_ID } from '@/types/recommendation'

const STORAGE_KEY = 'nail-admin-user-data-state-v2'

const activeTab = ref('profile')
const itemNameMap = mockNailItems.reduce((acc, item) => {
  acc[item.id] = item.name
  return acc
}, {})

function loadInitialLogs() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.logs) && parsed.logs.length) return parsed.logs
    }
  } catch (error) {
    console.warn('load user data state failed', error)
  }
  return generateMockBehaviorLogs(MOCK_USER_ID, mockNailItems)
}

const logs = ref(loadInitialLogs())
const filter = ref({ ...DEFAULT_FILTER })

const profile = computed(() => buildProfileFromLogs(MOCK_USER_ID, logs.value))
const preferenceBundle = computed(() => calculateTagProbabilities(profile.value))
const preferenceGroups = computed(() => ({
  season: preferenceBundle.value.seasonPref,
  style: preferenceBundle.value.stylePref,
  type: preferenceBundle.value.typePref,
  shape: preferenceBundle.value.shapePref
}))
const summaryText = computed(() => buildSummaryText(profile.value))
const extraSignals  = computed(() => deriveExtraSignals(logs.value))

// ── 偏好环形图 —— 暖品牌色系 ──────────────────────────────────
// 主色：赤陶 → 粉茶 → 暖金 → 蔷薇 → 暖茶 → 淡粉
// 色相均匀分布：赤陶(20°) · 玫粉(340°) · 琥珀(48°) · 薄荷(168°) · 矢车菊(215°) · 薰衣草(270°)
// 整体高明度、低饱和，确保区分度鲜明
const PALETTE = ['#a8cc90', '#f0a0bc', '#f0c860', '#60c8b4', '#80aad8', '#b094d4']

const DIM_COLORS = {
  season: [PALETTE[0], PALETTE[1], PALETTE[2], PALETTE[3]],
  style:  [PALETTE[0], PALETTE[1], PALETTE[2], PALETTE[4], PALETTE[3]],
  type:   [PALETTE[0], PALETTE[1], PALETTE[2], PALETTE[4], PALETTE[3], PALETTE[5]],
  shape:  [PALETTE[0], PALETTE[1], PALETTE[2], PALETTE[3]]
}

const prefDimCharts = {}

const prefDims = computed(() => {
  const pb = preferenceBundle.value || {}
  const make = (key, label, pref) => {
    const colors = DIM_COLORS[key] || []
    // pref 是 { label: value } 对象，转成数组
    const raw = pref && typeof pref === 'object' && !Array.isArray(pref)
      ? Object.entries(pref).map(([lbl, val]) => ({ label: lbl, value: val }))
      : (Array.isArray(pref) ? pref : [])
    const items = raw
      .filter(item => (item.value || 0) > 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .map((item, i) => ({ ...item, color: colors[i % colors.length] || '#ccc' }))
    const top2 = items.slice(0, 2)
    const topText = top2.map(t => `${t.label} ${Math.round((t.value || 0) * 100)}%`).join(' / ')
    return { key, label, items, topText }
  }
  return [
    make('season', '季节偏好', pb.seasonPref),
    make('style',  '风格偏好', pb.stylePref),
    make('type',   '款式偏好', pb.typePref),
    make('shape',  '甲型偏好', pb.shapePref)
  ]
})

function renderPrefCharts() {
  prefDims.value.forEach(dim => {
    const el = document.getElementById(`pref-donut-${dim.key}`)
    if (!el || !el.clientWidth) return
    if (!prefDimCharts[dim.key]) prefDimCharts[dim.key] = echarts.init(el, window.__ECHARTS_THEME__)
    prefDimCharts[dim.key].setOption({
      textStyle: { fontFamily: CHART_FONT },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {d}%',
        textStyle: { fontFamily: CHART_FONT, fontSize: 12 }
      },
      series: [{
        type: 'pie',
        radius: ['52%', '80%'],
        center: ['50%', '50%'],
        label: { show: false },
        emphasis: { label: { show: false } },
        data: dim.items.map(item => ({
          name: item.label,
          value: Math.round(item.value * 100),
          itemStyle: { color: item.color }
        }))
      }]
    })
  })
}

watch(prefDims, async () => {
  await nextTick()
  renderPrefCharts()
}, { immediate: true, deep: true })

// 热门试戴词云
const WC_PALETTE = ['#1664ff','#ff6b9d','#36cfc9','#f97316','#9254de','#52c41a','#faad14','#ff4d4f','#13c2c2','#eb2f96']
const wordCloudRef = ref(null)
let wcChart = null

function buildWcData() {
  // 真实试戴数据（大词）
  const scores = {}
  for (const item of mockNailItems) {
    const w = item.addTryonCount || 0
    if (item.style) scores[item.style] = (scores[item.style] || 0) + w
    if (item.type)  scores[item.type]  = (scores[item.type]  || 0) + w
    if (item.shape) scores[item.shape] = (scores[item.shape] || 0) + Math.round(w * 0.4)
  }
  // 风格 + 工艺 补充词
  const supplement = {
    '金线': 440, '金箔': 390, '冰透': 570, '纯色': 690, '金属/镜面': 290,
    '撞色': 360, '晕染': 330, '贴饰/珍珠': 460, '极光': 530, '波点': 200,
    '优雅': 910, '通勤': 780, '甜美': 850, '少女': 720, '春夏': 560,
    '纯欲': 390, '甜酷': 430, '国风': 300, '极简': 500, '派对': 230,
    '复古': 270, '酷飒': 320, 'ins风': 680
  }
  for (const [word, score] of Object.entries(supplement)) {
    scores[word] = (scores[word] || 0) + score
  }

  // 大量填充词（小权重，用于填满云朵轮廓）
  const fillers = [
    '美甲', '做甲', '试戴', '指甲', '显白', '精致',
    '光疗', '卸甲', '补甲', '色彩', '时尚', '好看',
    '亮片', '珠光', '磨砂', '闪光', '哑光', '镭射',
    '显细', '气质', '好看', '流行', '热门', '爆款',
    '春日', '夏日', '秋冬', '节日', '日常', '约会',
    '短甲', '长甲', '圆形', '方形', '杏仁', '芭蕾',
    '裸色', '粉色', '红色', '白色', '奶白', '豆沙',
    '咖色', '蓝色', '绿色', '紫色', '灰色', '黑色',
    '显嫩', '成熟', '温柔', '个性', '清爽', '甜蜜',
    '新款', '热推', '必做', '推荐', '经典', '百搭',
    '猫眼石', '贝壳', '玻璃', '奶油', '焦糖', '西柚',
    '美甲', '做甲', '试戴', '指甲', '显白', '精致',
    '光疗', '卸甲', '补甲', '色彩', '流行', '好看',
    '亮片', '珠光', '磨砂', '闪光', '哑光', '精致',
    '显细', '气质', '时尚', '百搭', '热门', '爆款',
  ]
  fillers.forEach((word, i) => {
    if (!scores[word]) scores[word] = 80 + Math.floor((i % 12) * 15)
    else scores[word] = Math.max(scores[word], 80)
  })

  return Object.entries(scores).map(([name, value]) => ({ name, value }))
}

// 词云颜色映射
const WC_COLOR_MAP = {
  // 风格
  '高级感': '#1664ff', '温柔感': '#ff6b9d', '个性风': '#9254de',
  'ins风':  '#36cfc9', '清新简约': '#52c41a', '优雅': '#1890ff',
  '通勤':   '#096dd9', '甜美': '#f759ab',    '少女': '#ff85c2',
  '春夏':   '#73d13d', '纯欲': '#ff4d88',    '甜酷': '#b37feb',
  '国风':   '#d48806', '极简': '#8c8c8c',    '派对': '#ff6b00',
  '复古':   '#a8071a', '酷飒': '#531dab',
  // 工艺
  '猫眼':      '#ff4d4f', '法式': '#faad14',   '手绘': '#eb2f96',
  '花朵':      '#f97316', '渐变': '#13c2c2',   '钻饰': '#722ed1',
  '金线':      '#d4b106', '金箔': '#d48806',   '冰透': '#40a9ff',
  '纯色':      '#8c8c8c', '金属/镜面': '#bfbfbf', '撞色': '#f5222d',
  '晕染':      '#531dab', '贴饰/珍珠': '#c41d7f', '极光': '#08979c',
  '波点':      '#d46b08',
  // 甲型
  '短甲': '#2f54eb', '延长甲': '#c0392b', '穿戴甲': '#27ae60', 'DIY': '#8e44ad'
}

// 云朵 canvas mask —— 底部平直 + 顶部三圆弧凸起
// echarts-wordcloud：黑色区域放词，白色区域不放
function createCloudMask() {
  const W = 800, H = 420
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // 白色背景（不放词）
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#000'
  const arc = (x, y, r) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }

  // 1. 底部矩形延伸至 canvas 最底部 → 保证底边完全平整
  ctx.fillRect(48, 282, 704, H - 282)

  // 2. 三个顶部凸起
  arc(175, 260, 132)   // 左凸起
  arc(400, 188, 170)   // 中央凸起（最高最大）
  arc(625, 260, 122)   // 右凸起

  // 3. 凸起之间填满（消除白色缝隙）
  arc(290, 238,  96)   // 左↔中 过渡
  arc(510, 238,  93)   // 中↔右 过渡
  arc(400, 272, 102)   // 中下过渡

  // 4. 左右两侧补圆（让侧面不突兀）
  arc( 72, 310,  60)
  arc(728, 310,  60)

  return canvas
}

function initWordCloud() {
  if (!wordCloudRef.value) return
  if (wcChart) { wcChart.dispose(); wcChart = null }
  wcChart = echarts.init(wordCloudRef.value, window.__ECHARTS_THEME__)
  wcChart.setOption({
    textStyle: { fontFamily: CHART_FONT },
    tooltip: {
      show: true,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: 'rgba(185,120,80,0.14)',
      borderWidth: 1,
      textStyle: { fontFamily: CHART_FONT, fontSize: 12, color: '#2d1a10' },
      formatter: (params) => `${params.name}<br/>热度：${params.value}`
    },
    series: [{
      type: 'wordCloud',
      maskImage: createCloudMask(),   // ← 云朵形状
      left: 'center',
      top: 'center',
      width: '100%',
      height: '100%',
      sizeRange: [11, 54],
      rotationRange: [-45, 45],
      rotationStep: 15,
      gridSize: 2,
      drawOutOfBound: false,
      shrinkToFit: true,
      textStyle: {
        fontFamily: CHART_FONT,
        fontWeight: 'bold',
        color: (params) => WC_COLOR_MAP[params.name] || WC_PALETTE[params.dataIndex % WC_PALETTE.length]
      },
      emphasis: {
        focus: 'self',
        textStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.25)',
          textBorderColor: '#fff',
          textBorderWidth: 2
        }
      },
      data: buildWcData()
    }]
  })
}
const crowdSegments = computed(() => classifyUserCrowd(profile.value, preferenceBundle.value, extraSignals.value))
const rankedItems = computed(() => rankItemsForUser(mockNailItems, profile.value, filter.value))
const recentLogs = computed(() => [...logs.value].slice(-12).reverse())

// 反馈 tab 配色 —— 品牌暖色系
const fbAccents = ['#c97a4e', '#d4a843', '#4ab8b0', '#e87899']
const fbIcons = ['Warning', 'Aim', 'ChatDotRound', 'Star']
const fbCatColors = [PALETTE[0], PALETTE[1], PALETTE[2], PALETTE[3], PALETTE[4], PALETTE[5], '#d4a87a']

// 今日事件概况
const todayStats = computed(() => {
  const all = logs.value
  const today = all.filter(l => {
    const d = new Date(l.timestamp)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })
  const count = (type) => type ? today.filter(l => l.behaviorType === type).length : today.length
  return [
    { label: '今日试戴次数', value: count('tryon') || all.filter(l => l.behaviorType === 'tryon').length, change: 97, color: '#ff6b9d', icon: 'View' },
    { label: '活跃用户数',   value: new Set(all.map(l => l.userId)).size, change: 0, color: '#36cfc9', icon: 'User' },
    { label: '确认要做数',   value: count('confirm') || all.filter(l => l.behaviorType === 'confirm').length, change: 12, color: '#52c41a', icon: 'Select' },
    { label: '想做转化率',   value: (() => { const w = all.filter(l => l.behaviorType === 'want').length; const c = all.filter(l => l.behaviorType === 'confirm').length; return w ? Math.round(c / w * 100) + '%' : '0%' })(), change: 5, color: '#722ed1', icon: 'ShoppingCart' }
  ]
})

const feedbackOverview = computed(() => getFeedbackOverview(mockFeedbackRecords))
const feedbackCategoryStats = computed(() => getFeedbackCategoryStats(mockFeedbackRecords))
const topIssueCodes = computed(() => getTopIssueCodes(mockFeedbackRecords))
const versionTrendStats = computed(() => getVersionTrendStats(mockFeedbackRecords))
const sourcePageStats = computed(() => getSourcePageStats(mockFeedbackRecords))
const recentFeedbackRecords = computed(() => getRecentFeedbackRecords(mockFeedbackRecords))

const profileStatCards = computed(() => [
  {
    label: '总行为数',
    value: profile.value.behaviorCount.total,
    desc: `兴趣 ${profile.value.behaviorCount.interest} / 转化 ${profile.value.behaviorCount.conversion}`
  },
  {
    label: '画像置信度',
    value: `${Math.round(profile.value.confidence.overall * 100)}%`,
    desc: '行为越多，个性化权重越高'
  },
  {
    label: '探索比例',
    value: `${Math.round(profile.value.explorationRate * 100)}%`,
    desc: '保留高质量探索，避免画像过窄'
  },
  {
    label: 'Top1 偏好',
    value: topN(preferenceBundle.value.stylePref, 1)[0]?.label || '--',
    desc: topN(preferenceBundle.value.typePref, 1)[0]?.label || '--'
  }
])

const feedbackStatCards = computed(() => [
  {
    label: '总反馈数',
    value: feedbackOverview.value.total,
    desc: `覆盖 ${feedbackOverview.value.versionCount} 个版本`
  },
  {
    label: '高优先级问题',
    value: feedbackOverview.value.highSeverityCount,
    desc: '适合优先进入修复排期'
  },
  {
    label: '推荐纠偏反馈',
    value: feedbackOverview.value.recommendationImpactCount,
    desc: '只有这部分允许影响用户画像'
  },
  {
    label: '平均评分',
    value: feedbackOverview.value.avgRating,
    desc: '评分越低，说明问题越明显'
  }
])

const sessionTopTags = computed(() => {
  const sessionPref = preferenceBundle.value.sessionPref
  return [
    { title: '季节', items: topN(sessionPref.season, 2).map((item) => item.label) },
    { title: '风格', items: topN(sessionPref.style, 2).map((item) => item.label) },
    { title: '款式', items: topN(sessionPref.type, 2).map((item) => item.label) },
    { title: '甲型', items: topN(sessionPref.shape, 2).map((item) => item.label) }
  ]
})

const userCohorts = computed(() => {
  const styleTop = topN(preferenceBundle.value.stylePref, 1)[0]?.label || '未形成明显风格'
  const typeTop = topN(preferenceBundle.value.typePref, 1)[0]?.label || '未形成明显款式'
  const shapeTop = topN(preferenceBundle.value.shapePref, 1)[0]?.label || '未形成明显甲型'
  const seasonTop = topN(preferenceBundle.value.seasonPref, 1)[0]?.label || '暂无季节偏好'
  const exploration = profile.value.explorationRate
  const conversionCount = profile.value.behaviorCount.conversion

  return [
    {
      title: '审美偏好群体',
      value: `${styleTop} × ${typeTop} × ${shapeTop}`,
      desc: '用于判断这个用户更像哪一类稳定偏好人群'
    },
    {
      title: '季节偏好群体',
      value: `${seasonTop} 主导`,
      desc: '用于看季节趋势与筛选命中'
    },
    {
      title: '探索类型',
      value: exploration >= 0.26 ? '高探索型' : exploration >= 0.18 ? '平衡探索型' : '稳定偏好型',
      desc: '探索比例高，说明推荐里要保留更多新样式测试'
    },
    {
      title: '转化意向群体',
      value: conversionCount >= 10 ? '高意向稳定型' : conversionCount >= 5 ? '中意向观察型' : '轻决策浏览型',
      desc: '用来判断推荐更该拉兴趣还是拉确认'
    }
  ]
})

watch(
  logs,
  (value) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ logs: value }))
  },
  { deep: true }
)

function behaviorLabel(type) {
  const map = { view: '浏览', tryon: '试戴', want: '想做', confirm: '确认做', remove: '移除' }
  return map[type] || type
}

function simulateBehavior(item, behaviorType) {
  const log = recordUserBehavior(MOCK_USER_ID, item, behaviorType, {
    sourcePage: 'user-data-page',
    sessionId: `manual_session_${new Date().toISOString().slice(0, 10)}`
  })
  logs.value = [...logs.value, log]
  ElMessage.success(`已追加行为：${behaviorType}`)
}

function resetMockState() {
  logs.value = generateMockBehaviorLogs(MOCK_USER_ID, mockNailItems)
  filter.value = { ...DEFAULT_FILTER }
  ElMessage.success('已恢复初始模拟数据')
}

function resetFilter() {
  filter.value = { ...DEFAULT_FILTER }
}

function formatTime(value) {
  const date = new Date(value)
  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function logType(type) {
  if (type === 'confirm_do') return 'danger'
  if (type === 'want_do' || type === 'realistic_tryon') return 'warning'
  if (type === 'remove_tryon') return 'info'
  return 'primary'
}

function feedbackTypeLabel(value) {
  return FEEDBACK_TYPE_LABELS[value] || value
}

function feedbackCodeLabel(value) {
  return FEEDBACK_CODE_LABELS[value] || value
}

function sourcePageLabel(value) {
  return FEEDBACK_SOURCE_PAGE_LABELS[value] || value
}

function statusLabel(value) {
  return FEEDBACK_STATUS_LABELS[value] || value
}

function severityLabel(value) {
  return FEEDBACK_SEVERITY_LABELS[value] || value
}

// 反馈 ECharts 实例
let fbDonutChart = null
let fbLineChart = null
let fbPieChart = null

function renderFbCharts() {
  const catEl = document.getElementById('fb-donut-chart')
  const lineEl = document.getElementById('fb-line-chart')
  const pieEl = document.getElementById('fb-pie-chart')
  if (!catEl || !lineEl || !pieEl) return

  const inkMuted = 'rgba(45,26,16,0.55)'
  const sharedTextStyle = { fontFamily: CHART_FONT, fontSize: 12, color: inkMuted }
  const sharedTooltip = (fmt) => ({
    trigger: 'item', formatter: fmt,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(185,120,80,0.14)',
    borderWidth: 1,
    textStyle: { fontFamily: CHART_FONT, fontSize: 12, color: '#2d1a10' }
  })
  const legendStyle = { ...sharedTextStyle, fontSize: 12, lineHeight: 20 }

  // 环形图：反馈分类（对齐 pref-dim 风格）
  if (!fbDonutChart) fbDonutChart = echarts.init(catEl, window.__ECHARTS_THEME__)
  fbDonutChart.setOption({
    textStyle: { fontFamily: CHART_FONT },
    tooltip: sharedTooltip('{b}<br/>{c} 条 ({d}%)'),
    legend: {
      orient: 'vertical', left: 6, top: 'center',
      itemWidth: 9, itemHeight: 9, borderRadius: 9,
      itemGap: 8,
      textStyle: legendStyle
    },
    series: [{
      type: 'pie',
      radius: ['52%', '78%'],
      center: ['72%', '50%'],
      label: { show: false },
      emphasis: { scale: true, scaleSize: 4, label: { show: false } },
      data: feedbackCategoryStats.value.map((item, i) => ({
        name: item.label, value: item.count,
        itemStyle: { color: fbCatColors[i % fbCatColors.length], borderRadius: 3 }
      }))
    }]
  })

  // 折线图：各版本问题趋势
  const versions = versionTrendStats.value.map(v => v.appVersion)
  if (!fbLineChart) fbLineChart = echarts.init(lineEl, window.__ECHARTS_THEME__)
  fbLineChart.setOption({
    textStyle: { fontFamily: CHART_FONT },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: 'rgba(185,120,80,0.14)', borderWidth: 1, textStyle: { fontFamily: CHART_FONT, fontSize: 12 } },
    legend: { data: ['试戴效果', '推荐匹配', '性能体验'], bottom: 0, textStyle: legendStyle, itemWidth: 12, itemHeight: 4 },
    grid: { left: 30, right: 12, top: 20, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: versions, axisLabel: sharedTextStyle, axisTick: { show: false }, axisLine: { lineStyle: { color: 'rgba(185,120,80,0.18)' } } },
    yAxis: { type: 'value', axisLabel: sharedTextStyle, splitLine: { lineStyle: { color: 'rgba(185,120,80,0.10)', type: 'dashed' } } },
    series: [
      { name: '试戴效果', type: 'line', smooth: true, color: '#c97a4e', symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5 }, data: versionTrendStats.value.map(v => v.tryonEffect) },
      { name: '推荐匹配', type: 'line', smooth: true, color: '#4ab8b0', symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5 }, data: versionTrendStats.value.map(v => v.recommendation) },
      { name: '性能体验', type: 'line', smooth: true, color: '#d4a843', symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5 }, data: versionTrendStats.value.map(v => v.performance) }
    ]
  })

  // 环形图：来源页面（对齐 pref-dim 风格）
  if (!fbPieChart) fbPieChart = echarts.init(pieEl, window.__ECHARTS_THEME__)
  fbPieChart.setOption({
    textStyle: { fontFamily: CHART_FONT },
    tooltip: sharedTooltip('{b}<br/>{c} 条 ({d}%)'),
    legend: {
      orient: 'vertical', right: 8, top: 'center',
      itemWidth: 10, itemHeight: 10, borderRadius: 5,
      textStyle: legendStyle
    },
    series: [{
      type: 'pie',
      radius: ['52%', '78%'],
      center: ['36%', '50%'],
      label: { show: false },
      emphasis: { scale: true, scaleSize: 4, label: { show: false } },
      data: sourcePageStats.value.map((item, i) => ({
        name: item.label, value: item.count,
        itemStyle: { color: fbCatColors[i % fbCatColors.length], borderRadius: 3 }
      }))
    }]
  })
}

// 切换到 feedback tab 时初始化图表
watch(activeTab, async (val) => {
  if (val === 'feedback') {
    await nextTick()
    setTimeout(renderFbCharts, 100)
  }
})

onMounted(() => {
  setTimeout(() => {
    renderPrefCharts()
    initWordCloud()
  }, 400)
  setTimeout(() => { wcChart?.resize() }, 700)
  window.addEventListener('resize', () => {
    wcChart?.resize()
    Object.values(prefDimCharts).forEach(c => c?.resize())
    fbDonutChart?.resize()
    fbLineChart?.resize()
    fbPieChart?.resize()
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', () => wcChart?.resize())
  wcChart?.dispose()
  Object.values(prefDimCharts).forEach(c => c?.dispose())
  fbDonutChart?.dispose()
  fbLineChart?.dispose()
  fbPieChart?.dispose()
})


function severityTagType(value) {
  if (value === 'high') return 'danger'
  if (value === 'medium') return 'warning'
  return 'info'
}
</script>

<style scoped>
/* ============================
   Page shell
   ============================ */
.page {
  padding: 16px 20px;
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.user-tabs { margin-top: 8px; }

/* Tab 激活条：暖棕色与其他页一致 */
.user-tabs :deep(.el-tabs__active-bar) { background-color: #b86e4a; }
.user-tabs :deep(.el-tabs__item.is-active) { color: #b86e4a !important; }

/* ============================
   Stat band（替换原来 4 张卡片）
   ============================ */
.stat-band {
  display: flex;
  gap: 1px;
  background: var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  margin-bottom: 14px;
}

.stat-band-item {
  flex: 1;
  padding: 14px 18px;
  background: var(--surface);
  position: relative;
}

.stat-band-item::after {
  content: '';
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
}

.accent-0::after { background: var(--danger-color); }
.accent-1::after { background: var(--accent); }
.accent-2::after { background: var(--warning-color); }
.accent-3::after { background: var(--pink); }

.stat-band-val {
  font-size: 26px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.stat-band-key {
  font-size: var(--text-xs);
  color: var(--ink-2);
  margin-top: 4px;
}

.stat-band-sub {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.4;
}

/* ============================
   Panel cards（通用）
   ============================ */
.panel {
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
}

/* summary 文本 */
.summary-text {
  color: var(--ink-3);
  margin: 0 0 14px;
  font-size: var(--text-sm);
}

/* ============================
   Cohort 群体分类 → 紧凑字段列表
   ============================ */
.field-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.field-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: var(--text-sm);
}

.field-row:last-child { border-bottom: none; }

.field-key {
  color: var(--ink-3);
  width: 84px;
  flex-shrink: 0;
  font-size: var(--text-xs);
  padding-top: 1px;
}

.field-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-val {
  color: var(--ink);
  font-weight: 500;
  font-size: var(--text-sm);
}

.field-sub {
  color: var(--ink-3);
  font-size: var(--text-xs);
  line-height: 1.4;
}

/* ============================
   Session 即时偏好 → 行式列表
   ============================ */
.session-rows {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.session-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--surface);
}

.session-key {
  font-size: var(--text-xs);
  color: var(--ink-3);
}

.session-val {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink);
}

/* ============================
   Log feed → 紧凑时间线
   ============================ */
.log-feed {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.log-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: var(--text-xs);
}

.log-row:last-child { border-bottom: none; }

.log-row--danger  { border-left: 2px solid var(--danger-color); padding-left: 8px; }
.log-row--warning { border-left: 2px solid var(--warning-color); padding-left: 8px; }
.log-row--primary { border-left: 2px solid var(--accent); padding-left: 8px; }
.log-row--info    { border-left: 2px solid var(--border); padding-left: 8px; }

.log-tag { flex-shrink: 0; }

.log-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.log-name {
  color: var(--ink);
  font-weight: 500;
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-meta {
  color: var(--ink-3);
  font-size: 11px;
}

.log-time {
  color: var(--ink-3);
  font-size: 11px;
  flex-shrink: 0;
}

/* ============================
   Rank list → inline bar
   ============================ */
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
  font-size: var(--text-xs);
}

.rank-row:last-child { border-bottom: none; }

.rank-idx {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  background: var(--accent-light);
  color: var(--ink-2);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rank-row:nth-child(1) .rank-idx { background: var(--accent); color: #fff; }
.rank-row:nth-child(2) .rank-idx { background: var(--teal); color: #fff; }
.rank-row:nth-child(3) .rank-idx { background: var(--pink); color: #fff; }

.rank-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.rank-name {
  color: var(--ink);
  font-weight: 500;
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-meta { color: var(--ink-3); font-size: 11px; }

.rank-score-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 80px;
  flex-shrink: 0;
}

.rank-bar {
  height: 5px;
  background: var(--accent);
  border-radius: 3px;
  flex-shrink: 0;
}

.rank-score {
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: 600;
  width: 24px;
  text-align: right;
}

/* ============================
   Table styles
   ============================ */
.style-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.style-image {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  flex: 0 0 auto;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

/* ============================
   Feedback tab
   ============================ */
.feedback-alert { margin-bottom: 12px; }

.category-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: var(--ink);
}

.category-item {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--accent-light);
  margin-bottom: 8px;
}

.category-sub {
  margin-top: 6px;
  color: var(--ink-3);
  font-size: 11px;
}

.category-list, .issue-list, .source-list, .pipeline-list, .recommend-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.issue-item, .source-item, .recommend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-size: var(--text-xs);
}

.issue-rank {
  width: 24px;
  height: 24px;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex: 0 0 auto;
}

.issue-main { flex: 1; }

.pipeline-item {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
}

.pipeline-count {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--ink);
}

.version-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  color: var(--ink-2);
  font-size: var(--text-xs);
}

.tiny {
  color: var(--ink-3);
  font-size: 11px;
  margin: 3px 0 0;
}

/* === 热门试戴词云 === */
.wc-chart {
  width: 100%;
  height: 260px;
}

/* === 美甲人群画像卡片 === */
.persona-badges { display: flex; gap: 6px; align-items: center; }

.persona-primary {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 4px 0 10px 12px;
  border-left: 3px solid;
  margin-bottom: 10px;
}

.persona-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--r-md);
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--dur-base) var(--ease-out-quart);
}
.persona-icon:hover { transform: scale(1.08); }

.persona-name {
  font-size: var(--text-md);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.persona-desc {
  font-size: var(--text-sm);
  color: var(--ink-3);
  margin-top: 3px;
  line-height: 1.4;
}

.persona-tag {
  font-size: var(--text-xs);
  color: var(--ink-3);
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* 关键信号 4 格 */
.signal-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  margin-bottom: 8px;
}

.signal-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 4px;
  background: var(--surface);
}

.signal-key {
  font-size: var(--text-xs);
  color: var(--ink-3);
}

.signal-val {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--ink);
}

/* 人群分布条 */
.persona-dist { display: flex; flex-direction: column; gap: 0; }

.pdist-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: var(--text-sm);
}

.pdist-row:last-child { border-bottom: none; }

.pdist-row.primary { background: rgba(201,122,78,0.07); margin: 0 -16px; padding: 8px 16px; }

.pdist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.pdist-label { width: 60px; flex-shrink: 0; color: var(--ink); font-weight: 500; }

.pdist-row.primary .pdist-label { font-weight: 700; }

.pdist-track { flex: 1; height: 6px; background: rgba(201,122,78,0.12); border-radius: 3px; overflow: hidden; }

.pdist-bar { height: 100%; border-radius: 3px; transition: width var(--dur-slow) var(--ease-out-quart); }

.pdist-pct { width: 34px; text-align: right; font-size: var(--text-sm); font-weight: 700; flex-shrink: 0; }

/* === 人群标签识别 === */
.crowd-body { display: flex; flex-direction: column; gap: 0; }

.crowd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
  font-size: var(--text-xs);
}

.crowd-row:last-child { border-bottom: none; }

.crowd-row.primary { background: rgba(201,122,78,0.07); margin: 0 -16px; padding: 10px 16px; border-radius: var(--r-sm); }

.crowd-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.crowd-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100px;
  flex-shrink: 0;
}

.crowd-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--ink);
}

.crowd-row.primary .crowd-label { font-size: var(--text-sm); }

.crowd-desc {
  font-size: 11px;
  color: var(--ink-3);
  line-height: 1.3;
}

.crowd-bar-wrap {
  flex: 1;
  height: 5px;
  background: var(--accent-light);
  border-radius: 3px;
  overflow: hidden;
}

.crowd-bar {
  height: 100%;
  border-radius: 3px;
  transition: width var(--dur-slow) var(--ease-out-quart);
}

.crowd-pct {
  font-size: var(--text-xs);
  font-weight: 600;
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

/* 右列 flex 撑满 */
.right-col {
  display: flex;
  flex-direction: column;
}
.right-col .el-card {
  flex-shrink: 0;
}
.right-col .wc-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.right-col .wc-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 12px;
}
.right-col .wc-card .wc-chart {
  flex: 1;
  height: unset !important;
  min-height: 180px;
}

/* ── 反馈 Tab ── */
.fb-hero-band {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.fb-hero-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 18px 16px 14px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
}
.fb-hero-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--accent);
}
.fb-hero-icon {
  color: var(--accent);
  margin-bottom: 8px;
}
.fb-hero-val {
  font-size: 28px;
  font-weight: 800;
  color: var(--ink);
  line-height: 1;
  margin-bottom: 4px;
}
.fb-hero-label { font-size: var(--text-sm); color: var(--ink-2); font-weight: 500; }
.fb-hero-sub { font-size: 11px; color: var(--ink-3); margin-top: 4px; }

/* ECharts 容器 */
.fb-chart-row { display: flex; gap: 0; }
.fb-donut-chart { width: 300px; height: 220px; flex-shrink: 0; }
.fb-line-chart { flex: 1; height: 220px; min-width: 0; }
.fb-pie-chart { width: 100%; height: 220px; }

/* 近期反馈记录 */
.fb-record-list { display: flex; flex-direction: column; gap: 10px; }
.fb-record-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.68);
  border-radius: var(--r-md);
  border: 1px solid var(--border);
}
.fb-record-sev { flex-shrink: 0; margin-top: 2px; }
.fb-record-body { flex: 1; min-width: 0; }
.fb-record-title { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
.fb-record-meta { font-size: 11px; color: var(--ink-3); margin: 2px 0; }
.fb-record-text { font-size: var(--text-xs); color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fb-record-status { flex-shrink: 0; margin-top: 2px; }

/* 反馈流向 */
.fb-pipeline { display: flex; flex-direction: column; gap: 10px; }
.fb-pipeline-item {
  padding: 14px 16px;
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--pc) 10%, var(--cream));
  border: 1px solid var(--border);
  border-top: 3px solid var(--pc);
}
.fb-pipeline-count {
  font-size: 26px;
  font-weight: 800;
  color: var(--pc);
  line-height: 1;
}
.fb-pipeline-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink); margin: 4px 0 2px; }
.fb-pipeline-desc { font-size: 11px; color: var(--ink-3); }

/* Top 问题码 */
.fb-issue-list { display: flex; flex-direction: column; gap: 8px; }
.fb-issue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.68);
  border-radius: var(--r-md);
  border: 1px solid var(--border);
}
.fb-issue-rank {
  width: 24px; height: 24px;
  border-radius: var(--r-sm);
  display: grid; place-items: center;
  font-size: var(--text-xs); font-weight: 700;
  background: rgba(201,122,78,0.12); color: var(--accent-dark);
  flex-shrink: 0;
}
.fb-issue-rank.rank-1 { background: #fff1b8; color: #d48806; }
.fb-issue-rank.rank-2 { background: var(--accent-light); color: var(--accent); }
.fb-issue-rank.rank-3 { background: #ffe7ba; color: #c05400; }
.fb-issue-info { flex: 1; min-width: 0; }
.fb-issue-name { font-size: var(--text-sm); font-weight: 500; color: var(--ink); }
.fb-issue-sub { font-size: 11px; color: var(--ink-3); margin-top: 1px; }
.fb-issue-cnt { font-size: var(--text-sm); font-weight: 700; color: var(--pink); flex-shrink: 0; }

/* 来源分布 */
.fb-source-list { display: flex; flex-direction: column; gap: 8px; }
.fb-source-item { display: flex; align-items: center; gap: 8px; font-size: var(--text-xs); }
.fb-source-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.fb-source-name { width: 70px; color: var(--ink-2); flex-shrink: 0; }
.fb-source-bar-bg { flex: 1; height: 6px; background: var(--accent-light); border-radius: 3px; overflow: hidden; }
.fb-source-bar { height: 100%; border-radius: 3px; }
.fb-source-pct { width: 36px; text-align: right; color: var(--ink); font-weight: 600; }

/* 今日事件概况 */
.today-band {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.today-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px;
  background: rgba(255,255,255,0.72);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}
.today-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.today-change {
  font-size: 11px;
  font-weight: 600;
  align-self: flex-end;
  margin-top: -32px;
}
.today-change.up { color: #52c41a; }
.today-change.down { color: #f5222d; }
.today-val {
  font-size: 24px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.1;
}
.today-label {
  font-size: var(--text-xs);
  color: var(--ink-3);
}

/* 近期行为 & 推荐 */
.behavior-list, .rec-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.behavior-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-xs);
}
.behavior-tag { flex-shrink: 0; }
.behavior-name {
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.behavior-empty { color: var(--ink-3); font-size: var(--text-xs); }
.rec-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-xs);
}
.rec-score {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  background: var(--pink-light);
  color: var(--pink);
  font-weight: 700;
  font-size: 11px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.rec-info { display: flex; flex-direction: column; gap: 1px; overflow: hidden; }
.rec-name { color: var(--ink); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-tags { color: var(--ink-3); font-size: 11px; }

/* 偏好环形图 */
.pref-dim-card {
  background: rgba(201,122,78,0.05);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 14px 16px;
  margin-bottom: 12px;
}
.pref-dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.pref-dim-title {
  font-weight: 700;
  font-size: var(--text-base);
  color: var(--ink);
}
.pref-dim-top {
  font-size: var(--text-xs);
  color: var(--ink-3);
}
.pref-dim-body {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pref-dim-list {
  flex: 1;
  display: grid;
  gap: 5px;
}
.pref-dim-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: var(--text-sm);
}
.pref-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pref-item-label {
  flex: 1;
  color: var(--ink-2);
}
.pref-item-pct {
  color: var(--ink);
  font-weight: 700;
}
.pref-donut {
  width: 130px;
  height: 130px;
  flex-shrink: 0;
}
</style>
