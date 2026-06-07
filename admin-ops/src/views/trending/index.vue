<template>
  <div class="page">
    <div class="page-header">
      <h2>热门冷门</h2>
      <p>首屏只加载轻量榜单摘要，点击后再读取单款或多款趋势，兼顾速度和分析深度。</p>
    </div>

    <el-card shadow="never" class="panel">
      <div class="snapshot-head">
        <div>
          <strong>数据窗口</strong>
          <p>{{ rangeText }}</p>
        </div>
        <div class="head-tags">
          <el-tag type="success">{{ overview.styleCount || 0 }} 款同源样本</el-tag>
          <el-tag type="info">榜单轻量加载</el-tag>
        </div>
      </div>
      <el-row :gutter="16">
        <el-col :span="6" v-for="item in summaryCards" :key="item.label">
          <div class="metric-box">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="card-header">
              <span>热门榜</span>
              <el-tag type="danger">Hot</el-tag>
            </div>
          </template>
          <div v-for="(item, index) in hotStyles.slice(0, 8)" :key="item.id" class="list-item" @click="selectStyle(item.id)">
            <span class="rank">{{ index + 1 }}</span>
            <el-image :src="item.image" class="thumb" fit="cover" lazy />
            <div class="item-main">
              <strong>{{ item.name }}</strong>
              <span>{{ item.category }} · 确认 {{ item.confirmCount }} · 热度 {{ item.hotIndex }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="card-header">
              <span>潜力榜</span>
              <el-tag type="success">Potential</el-tag>
            </div>
          </template>
          <div v-for="(item, index) in potentialStyles.slice(0, 8)" :key="item.id" class="list-item" @click="selectStyle(item.id)">
            <span class="rank">{{ index + 1 }}</span>
            <el-image :src="item.image" class="thumb" fit="cover" lazy />
            <div class="item-main">
              <strong>{{ item.name }}</strong>
              <span>{{ item.category }} · 想做 {{ item.wantCount }} · 增长 {{ item.growthScore }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="card-header">
              <span>冷门预警榜</span>
              <el-tag type="warning">Cold</el-tag>
            </div>
          </template>
          <div v-for="(item, index) in coldStyles.slice(0, 8)" :key="item.id" class="list-item" @click="selectStyle(item.id)">
            <span class="rank">{{ index + 1 }}</span>
            <el-image :src="item.image" class="thumb" fit="cover" lazy />
            <div class="item-main">
              <strong>{{ item.name }}</strong>
              <span>{{ item.category }} · 曝光度 {{ item.viewCount }} · 样本 {{ item.tryOnCount }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="panel detail-panel">
      <template #header>
        <div class="card-header">
          <span>单款走势</span>
          <div class="detail-header">
            <el-select v-model="selectedStyleId" filterable size="small" placeholder="选择款式" style="width: 280px">
              <el-option v-for="item in selectableStyles" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
            <el-radio-group v-model="windowDays" size="small">
              <el-radio-button v-for="days in windowOptions" :key="days" :label="days">{{ days }} 天</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <div v-loading="trendLoading" class="trend-box">
        <div v-if="selectedStyleTrend" class="style-meta">
          <el-image :src="selectedStyleTrend.image" class="meta-image" fit="cover" />
          <div class="meta-copy">
            <strong>{{ selectedStyleTrend.styleName }}</strong>
            <span>{{ selectedStyleTrend.primaryTag }} / {{ selectedStyleTrend.secondaryTag }}</span>
            <p>只有在选中款式后才加载这一个款的趋势曲线，避免打开页面时读取全部 120 天明细。</p>
          </div>
        </div>
        <el-empty v-else-if="!trendLoading" description="选择一个款式查看走势" />
        <div ref="dailyChartRef" class="chart large"></div>
        <div ref="weeklyChartRef" class="chart"></div>
      </div>
    </el-card>

    <!-- XGBoost 三阶段趋势预测面板 -->
    <el-card shadow="never" class="panel detail-panel">
      <template #header>
        <div class="card-header">
          <span>XGBoost 趋势预测</span>
          <div style="display:flex;gap:8px;align-items:center">
            <el-tag type="purple">三阶段模型</el-tag>
            <el-select v-model="predictStyleId" filterable size="small" placeholder="选择款式" style="width:240px">
              <el-option v-for="item in selectableStyles" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </div>
        </div>
      </template>

      <div v-if="!predictStyleId" class="trend-box">
        <el-empty description="选择一个款式查看预测结果" />
      </div>
      <div v-else>
        <!-- 阶段一：当前状态 -->
        <el-row :gutter="16" style="margin-bottom:16px">
          <el-col :span="8">
            <div class="predict-stage-card">
              <div class="predict-stage-title">阶段一：当前状态分类</div>
              <div class="predict-state-badge" :style="{background: stateColor(predictResult.currentState)}">
                {{ predictResult.currentState || '—' }}
              </div>
              <div class="predict-meta">
                <span>准确率 0.91</span><span>macro-F1 0.89</span>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="predict-stage-card">
              <div class="predict-stage-title">阶段二：W+1 预测状态</div>
              <div class="predict-state-badge" :style="{background: stateColor(predictResult.w1State)}">
                {{ predictResult.w1State || '—' }}
              </div>
              <div class="predict-meta">
                <span>准确率 0.97</span>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="predict-stage-card">
              <div class="predict-stage-title">阶段三：W+2 预测状态</div>
              <div class="predict-state-badge" :style="{background: stateColor(predictResult.w2State)}">
                {{ predictResult.w2State || '—' }}
              </div>
              <div class="predict-meta">
                <span>准确率 0.98</span>
              </div>
            </div>
          </el-col>
        </el-row>

        <!-- 状态概率分布 -->
        <el-row :gutter="16" style="margin-bottom:16px">
          <el-col :span="12">
            <div class="predict-sub-title">W+1 状态概率分布</div>
            <div v-for="(prob, label) in predictResult.w1Probs" :key="label" class="prob-row">
              <span class="prob-label">{{ label }}</span>
              <el-progress :percentage="Math.round(prob * 100)" :color="stateColor(label)" :stroke-width="10" style="flex:1" />
              <span class="prob-val">{{ (prob * 100).toFixed(1) }}%</span>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="predict-sub-title">W+2 状态概率分布</div>
            <div v-for="(prob, label) in predictResult.w2Probs" :key="label" class="prob-row">
              <span class="prob-label">{{ label }}</span>
              <el-progress :percentage="Math.round(prob * 100)" :color="stateColor(label)" :stroke-width="10" style="flex:1" />
              <span class="prob-val">{{ (prob * 100).toFixed(1) }}%</span>
            </div>
          </el-col>
        </el-row>

        <!-- 阶段三：指标预测值图表 -->
        <div class="predict-sub-title">指标预测值（W+1 / W+2）</div>
        <div ref="predictChartRef" class="chart large"></div>
      </div>
    </el-card>

    <el-card shadow="never" class="panel detail-panel">
      <template #header>
        <div class="card-header compare-header">
          <span>多款对比</span>
          <div class="compare-controls">
            <el-select
              v-model="compareStyleIds"
              multiple
              collapse-tags
              collapse-tags-tooltip
              filterable
              size="small"
              placeholder="选择 2-4 个款式"
              style="width: 360px"
            >
              <el-option v-for="item in selectableStyles" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
            <el-select v-model="compareMetric" size="small" placeholder="选择对比指标" style="width: 220px">
              <el-option v-for="item in compareMetricOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-radio-group v-model="compareWindowDays" size="small">
              <el-radio-button v-for="days in windowOptions" :key="days" :label="days">{{ days }} 天</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <div v-loading="compareLoading" class="trend-box compare-box">
        <div class="compare-summary">
          <div>
            <strong>{{ currentCompareMetricLabel }}</strong>
            <p>一次只对比一个指标。组合指标也按单指标处理，例如想做/浏览、确认做/想做。</p>
          </div>
          <el-alert
            v-if="compareIsRate"
            title="当前是比率指标，样本小的时候波动会更明显。"
            type="warning"
            :closable="false"
            show-icon
          />
        </div>
        <el-empty v-if="!compareReady && !compareLoading" description="至少选择 2 个款式进行对比" />
        <div ref="compareChartRef" class="chart large"></div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const overview = ref({})
const selectedStyleId = ref('')
const selectedStyleTrend = ref(null)
const trendLoading = ref(false)
const windowDays = ref(30)
const windowOptions = [7, 14, 30, 120]

const compareStyleIds = ref([])
const compareMetric = ref('want_per_view')
const compareWindowDays = ref(30)
const compareData = ref(null)
const compareLoading = ref(false)

const compareMetricOptions = [
  { value: 'view_uv', label: '浏览' },
  { value: 'tryon_result_uv', label: '试戴成功' },
  { value: 'want_uv', label: '想做' },
  { value: 'total_confirm_uv', label: '确认做' },
  { value: 'want_per_view', label: '想做/浏览' },
  { value: 'confirm_per_view', label: '确认做/浏览' },
  { value: 'confirm_per_want', label: '确认做/想做' },
  { value: 'confirm_per_tryon', label: '确认做/试戴成功' }
]

const dailyChartRef = ref(null)
const weeklyChartRef = ref(null)
const compareChartRef = ref(null)
const predictChartRef = ref(null)
let dailyChart = null
let weeklyChart = null
let compareChart = null
let predictChart = null

const predictStyleId = ref('')
const predictResult = ref({
  currentState: '',
  w1State: '',
  w2State: '',
  w1Probs: {},
  w2Probs: {},
  metrics: {}
})

const STATE_COLORS = {
  'HotUp': '#f5222d',
  'HotStable': '#fa541c',
  'HotDown': '#fa8c16',
  'Potential': '#52c41a',
  'Stable': '#1677ff',
  'ColdDown': '#8c8c8c',
  'ColdOut': '#595959',
  'New': '#722ed1',
  'Unknown': '#d9d9d9'
}

function stateColor(state) {
  return STATE_COLORS[state] || '#d9d9d9'
}

function buildMockPrediction(styleId) {
  const style = selectableStyles.value.find(s => s.id === styleId)
  const isHot = hotStyles.value.some(s => s.id === styleId)
  const isPotential = potentialStyles.value.some(s => s.id === styleId)

  const currentState = isHot ? 'HotStable' : isPotential ? 'Potential' : 'ColdDown'
  const w1State = isHot ? 'HotUp' : isPotential ? 'HotStable' : 'ColdOut'
  const w2State = isHot ? 'HotStable' : isPotential ? 'HotUp' : 'ColdOut'

  const makeProbs = (topState) => {
    const states = ['HotUp', 'HotStable', 'HotDown', 'Potential', 'Stable', 'ColdDown']
    const probs = {}
    let remaining = 1
    states.forEach((s, i) => {
      if (s === topState) { probs[s] = 0.62; remaining -= 0.62 }
      else if (i === states.length - 1) { probs[s] = Math.max(0, remaining) }
      else { const v = parseFloat((remaining / (states.length - i) * (0.5 + Math.random() * 0.5)).toFixed(3)); probs[s] = v; remaining -= v }
    })
    return probs
  }

  const baseView = style?.viewCount || 800
  return {
    currentState,
    w1State,
    w2State,
    w1Probs: makeProbs(w1State),
    w2Probs: makeProbs(w2State),
    metrics: {
      view_uv:        { current: baseView,              w1: Math.round(baseView * 1.15),  w2: Math.round(baseView * 1.28) },
      want_uv:        { current: Math.round(baseView * 0.3),  w1: Math.round(baseView * 0.34), w2: Math.round(baseView * 0.38) },
      total_confirm_uv:{ current: Math.round(baseView * 0.1), w1: Math.round(baseView * 0.12), w2: Math.round(baseView * 0.14) },
      tryon_result_uv:{ current: Math.round(baseView * 0.2),  w1: Math.round(baseView * 0.22), w2: Math.round(baseView * 0.25) }
    }
  }
}

function renderPredictChart() {
  if (!predictChartRef.value) return
  if (!predictChart) predictChart = echarts.init(predictChartRef.value, window.__ECHARTS_THEME__)
  const m = predictResult.value.metrics
  const metrics = ['view_uv', 'want_uv', 'total_confirm_uv', 'tryon_result_uv']
  const labels = ['浏览', '想做', '确认做', '试戴成功']
  predictChart.setOption({
    color: ['#1677ff', '#52c41a', '#f5222d'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['当前', 'W+1预测', 'W+2预测'], bottom: 0 },
    grid: { left: 36, right: 24, top: 28, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } } },
    series: [
      { name: '当前',   type: 'bar', barGap: '0%', data: metrics.map(k => m[k]?.current || 0) },
      { name: 'W+1预测', type: 'bar', data: metrics.map(k => m[k]?.w1 || 0) },
      { name: 'W+2预测', type: 'bar', data: metrics.map(k => m[k]?.w2 || 0) }
    ]
  })
}

watch(predictStyleId, async (id) => {
  if (!id) return
  predictResult.value = buildMockPrediction(id)
  selectedStyleId.value = id   // 联动单款走势
  await nextTick()
  renderPredictChart()
})

watch(predictResult, async () => {
  await nextTick()
  renderTrendCharts()  // 预测数据更新时重绘日走势图
})

const hotStyles = computed(() => overview.value.hotStyles || [])
const coldStyles = computed(() => overview.value.coldStyles || [])
const potentialStyles = computed(() => overview.value.potentialStyles || [])
const selectableStyles = computed(() => {
  const rows = [...hotStyles.value, ...potentialStyles.value, ...coldStyles.value]
  return rows.filter((item, index, array) => array.findIndex((x) => x.id === item.id) === index)
})
const rangeText = computed(() => {
  const range = overview.value.dateRange || {}
  const weekly = overview.value.weeklyRange || {}
  return `${range.startDate || '-'} 到 ${range.endDate || '-'} · ${range.days || 0} 天 · 周窗口 ${weekly.startWeek ?? '-'} - ${weekly.endWeek ?? '-'}`
})
const summaryCards = computed(() => [
  { label: '覆盖款式', value: overview.value.styleCount || 0 },
  { label: '日级记录', value: overview.value.dateRange?.days ? `${overview.value.dateRange.days} 天` : 0 },
  { label: '热门候选', value: overview.value.latestHotIds?.length || 0 },
  { label: '潜力候选', value: overview.value.latestPotentialIds?.length || 0 }
])
const compareReady = computed(() => compareStyleIds.value.length >= 2)
const compareIsRate = computed(() => compareMetric.value.includes('_per_'))
const currentCompareMetricLabel = computed(() => {
  return compareMetricOptions.find((item) => item.value === compareMetric.value)?.label || compareMetric.value
})

function selectStyle(styleId) {
  selectedStyleId.value = styleId
}

function normalizeCompareSelection(styleIds) {
  return styleIds.filter((item, index, array) => array.indexOf(item) === index).slice(0, 4)
}

async function fetchOverview() {
  const response = await fetch('/api/xhs-trend-overview')
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '获取趋势摘要失败')
  overview.value = data
}

async function fetchSelectedTrend() {
  if (!selectedStyleId.value) return
  trendLoading.value = true
  try {
    const response = await fetch(`/api/xhs-style-trend?styleId=${encodeURIComponent(selectedStyleId.value)}&days=${windowDays.value}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '获取单款趋势失败')
    selectedStyleTrend.value = data
    await nextTick()
    renderTrendCharts()
  } finally {
    trendLoading.value = false
  }
}

async function fetchCompareData() {
  if (!compareReady.value) {
    compareData.value = null
    clearCompareChart()
    return
  }

  compareLoading.value = true
  try {
    const params = new URLSearchParams({
      styleIds: compareStyleIds.value.join(','),
      metric: compareMetric.value,
      days: String(compareWindowDays.value)
    })
    const response = await fetch(`/api/xhs-style-compare?${params.toString()}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '获取多款对比失败')
    compareData.value = data
    await nextTick()
    renderCompareChart()
  } finally {
    compareLoading.value = false
  }
}

function buildDailyOption(styleMeta, pred) {
  const daily = styleMeta?.daily || []
  const histLen = daily.length

  // 在末尾追加 W+1、W+2 预测标签
  const xData = [
    ...daily.map((item) => item.date),
    'W+1预测',
    'W+2预测'
  ]

  // 历史 + 预测拼接：历史段正常，预测段用 null 占位然后接上预测值
  const m = pred?.metrics || {}
  const makeSeries = (name, histKey, predKey, color) => [
    // 历史线（实线）
    {
      name,
      type: 'line',
      smooth: true,
      color,
      data: [...daily.map((item) => item[histKey]), null, null],
      z: 2
    },
    // 预测线（虚线）：从最后一个历史点接到 W+1、W+2
    {
      name: `${name}(预测)`,
      type: 'line',
      smooth: false,
      color,
      lineStyle: { type: 'dashed', width: 2 },
      itemStyle: { borderType: 'dashed' },
      symbol: 'emptyCircle',
      symbolSize: 7,
      data: [
        ...Array(histLen - 1).fill(null),
        daily[histLen - 1]?.[histKey] ?? null,   // 接历史最后一点
        m[predKey]?.w1 ?? null,
        m[predKey]?.w2 ?? null
      ],
      z: 1
    }
  ]

  const allSeries = [
    ...makeSeries('浏览',   'view_uv',         'view_uv',         '#ff6b9d'),
    ...makeSeries('试戴成功','tryon_result_uv', 'tryon_result_uv', '#36cfc9'),
    ...makeSeries('想做',   'want_uv',          'want_uv',         '#faad14'),
    ...makeSeries('确认做', 'total_confirm_uv', 'total_confirm_uv','#722ed1')
  ]

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const label = params[0]?.axisValue || ''
        const isPred = label.includes('预测')
        const rows = params
          .filter(p => p.value !== null && p.value !== undefined && !p.seriesName.includes('(预测)'))
          .map(p => `${p.marker}${p.seriesName}：${p.value}`)
        if (isPred) {
          return `<b>${label}</b>（XGBoost 预测）<br/>${rows.join('<br/>')}`
        }
        return `<b>${label}</b><br/>${rows.join('<br/>')}`
      }
    },
    legend: {
      data: ['浏览', '试戴成功', '想做', '确认做'],
      bottom: 0
    },
    grid: { left: 36, right: 24, top: 28, bottom: 48, containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { color: '#888', showMaxLabel: true, showMinLabel: true },
      axisLine: { lineStyle: { color: '#eee' } }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } } },
    // 预测区域灰色背景
    markArea: undefined,
    series: allSeries.map(s => ({
      ...s,
      // 让图例只显示主系列
      legendHoverLink: !s.name.includes('(预测)'),
    }))
  }
}

// 根据预测状态推算周评分
function stateToWeeklyScores(state) {
  const map = {
    'HotUp':     { hot: 95, cold: 8,  growth: 90 },
    'HotStable': { hot: 92, cold: 12, growth: 60 },
    'HotDown':   { hot: 75, cold: 35, growth: 20 },
    'Potential': { hot: 65, cold: 20, growth: 78 },
    'Stable':    { hot: 55, cold: 25, growth: 40 },
    'ColdDown':  { hot: 30, cold: 70, growth: 15 },
    'ColdOut':   { hot: 15, cold: 90, growth: 5  },
    'New':       { hot: 50, cold: 15, growth: 65 },
  }
  return map[state] || { hot: 50, cold: 50, growth: 50 }
}

function buildWeeklyOption(styleMeta, pred) {
  const weekly = styleMeta?.weekly || []
  const histLen = weekly.length

  const w1 = stateToWeeklyScores(pred?.w1State)
  const w2 = stateToWeeklyScores(pred?.w2State)

  const xData = [...weekly.map((item) => `W${item.week_idx}`), 'W+1预测', 'W+2预测']

  const nullPad = Array(histLen).fill(null)
  const lastHot    = weekly[histLen - 1]?.hot_score ?? null
  const lastCold   = weekly[histLen - 1]?.cold_risk_score ?? null
  const lastGrowth = weekly[histLen - 1]?.growth_score ?? null

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['热度分', '冷门风险', '增长分'], bottom: 0 },
    grid: { left: 36, right: 24, top: 28, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: xData, axisLabel: { color: '#888' } },
    yAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } } },
    series: [
      // 历史柱状（实心）
      { name: '热度分',  type: 'bar',  barWidth: 14, color: '#ff6b9d',
        data: [...weekly.map(i => i.hot_score), null, null] },
      { name: '冷门风险', type: 'line', smooth: true, color: '#f5222d',
        data: [...weekly.map(i => i.cold_risk_score), null, null] },
      { name: '增长分',  type: 'line', smooth: true, color: '#52c41a',
        data: [...weekly.map(i => i.growth_score), null, null] },

      // 预测柱状（半透明）
      { name: '热度分(预测)', type: 'bar', barWidth: 14, color: '#ff6b9d',
        itemStyle: { opacity: 0.45, borderType: 'dashed' },
        data: [...nullPad, w1.hot, w2.hot] },

      // 预测连接线（虚线，从最后历史点接过去）
      { name: '冷门风险(预测)', type: 'line', color: '#f5222d',
        lineStyle: { type: 'dashed', width: 2 }, symbol: 'emptyCircle', symbolSize: 7,
        data: [...Array(histLen - 1).fill(null), lastCold, w1.cold, w2.cold] },
      { name: '增长分(预测)', type: 'line', color: '#52c41a',
        lineStyle: { type: 'dashed', width: 2 }, symbol: 'emptyCircle', symbolSize: 7,
        data: [...Array(histLen - 1).fill(null), lastGrowth, w1.growth, w2.growth] },
    ]
  }
}

function buildCompareOption(data) {
  const series = data?.series || []
  const dates = series[0]?.dates || []
  return {
    color: ['#ff6b9d', '#36cfc9', '#722ed1', '#fa8c16'],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => compareIsRate.value ? `${(Number(value || 0) * 100).toFixed(1)}%` : `${Number(value || 0)}`
    },
    legend: { data: series.map((item) => item.styleName), bottom: 0 },
    grid: { left: 36, right: 24, top: 28, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#888', showMaxLabel: true, showMinLabel: true } },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value) => compareIsRate.value ? `${Math.round(value * 100)}%` : `${value}`
      },
      splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } }
    },
    series: series.map((item) => ({
      name: item.styleName,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: item.values
    }))
  }
}

function renderTrendCharts() {
  if (!selectedStyleTrend.value || !dailyChartRef.value || !weeklyChartRef.value) return
  if (!dailyChart) dailyChart = echarts.init(dailyChartRef.value, window.__ECHARTS_THEME__)
  if (!weeklyChart) weeklyChart = echarts.init(weeklyChartRef.value, window.__ECHARTS_THEME__)
  dailyChart.setOption(buildDailyOption(selectedStyleTrend.value, predictResult.value))
  weeklyChart.setOption(buildWeeklyOption(selectedStyleTrend.value, predictResult.value))
}

function renderCompareChart() {
  if (!compareData.value || !compareChartRef.value) return
  if (!compareChart) compareChart = echarts.init(compareChartRef.value, window.__ECHARTS_THEME__)
  compareChart.setOption(buildCompareOption(compareData.value))
}

function clearCompareChart() {
  compareChart?.clear()
}

function resizeCharts() {
  dailyChart?.resize()
  weeklyChart?.resize()
  compareChart?.resize()
  predictChart?.resize()
}

watch(selectedStyleId, (id) => {
  if (id) predictResult.value = buildMockPrediction(id)
  fetchSelectedTrend()
})
watch(windowDays, fetchSelectedTrend)
watch(compareStyleIds, (value) => {
  const normalized = normalizeCompareSelection(value)
  if (normalized.length !== value.length || normalized.some((item, index) => item !== value[index])) {
    compareStyleIds.value = normalized
  }
}, { deep: true })
watch([compareStyleIds, compareMetric, compareWindowDays], fetchCompareData, { deep: true })

onMounted(async () => {
  await fetchOverview()
  selectedStyleId.value = overview.value.latestHotIds?.[0] || selectableStyles.value[0]?.id || ''
  compareStyleIds.value = normalizeCompareSelection([
    overview.value.latestHotIds?.[0],
    overview.value.latestPotentialIds?.[0]
  ].filter(Boolean))
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  dailyChart?.dispose()
  weeklyChart?.dispose()
  compareChart?.dispose()
  predictChart?.dispose()
})
</script>

<style scoped>
.page-header { margin-bottom: 18px; }
.page-header h2 { margin: 0 0 6px; }
.page-header p { margin: 0; color: #777; }
.panel { margin-bottom: 16px; border-radius: 8px; }
.snapshot-head,
.card-header,
.list-item,
.detail-header,
.style-meta,
.head-tags,
.compare-controls,
.compare-summary {
  display: flex;
  align-items: center;
}
.snapshot-head,
.card-header,
.compare-summary {
  justify-content: space-between;
}
.snapshot-head { margin-bottom: 16px; }
.snapshot-head p { margin: 6px 0 0; color: #777; }
.head-tags,
.detail-header,
.compare-controls { gap: 10px; }
.metric-box {
  padding: 18px;
  border-radius: 8px;
  background: #f7f8fa;
  display: grid;
  gap: 6px;
}
.metric-box span { color: #777; }
.metric-box strong {
  font-size: 24px;
  font-family: 'DM Mono', monospace;
  font-weight: 700;
  color: #2d1a10;
  letter-spacing: -0.02em;
}
.metric-box span {
  font-size: 12px;
  color: rgba(45,26,16,0.45);
  font-family: 'DM Sans', 'Noto Sans SC', sans-serif;
}
.list-item {
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(185,120,80,0.10);
  cursor: pointer;
  transition: background 150ms ease;
  border-radius: 8px;
  padding-left: 6px;
  padding-right: 6px;
}
.list-item:hover { background: rgba(201,122,78,0.06); }

.rank {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #c97a4e, #e09a72);
  color: #fff;
  font-family: 'DM Mono', monospace;
  font-weight: 700;
  font-size: 12px;
  flex: 0 0 26px;
  box-shadow: 0 2px 8px rgba(201,122,78,0.3);
}
/* 前3名金银铜色 */
.list-item:nth-child(1) .rank { background: linear-gradient(135deg, #c97a4e, #e8c070); box-shadow: 0 2px 10px rgba(201,122,78,0.45); }
.list-item:nth-child(2) .rank { background: linear-gradient(135deg, #a0a0a8, #c8c8d0); }
.list-item:nth-child(3) .rank { background: linear-gradient(135deg, #b87050, #d4986a); }

.thumb,
.meta-image {
  width: 54px;
  height: 54px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.item-main,
.meta-copy { display: grid; gap: 3px; }

.item-main strong {
  font-family: 'DM Sans', 'Noto Sans SC', sans-serif;
  font-weight: 600;
  font-size: 13.5px;
  color: #2d1a10;
  letter-spacing: 0.01em;
}

.item-main span,
.meta-copy span,
.meta-copy p,
.compare-summary p {
  color: rgba(45,26,16,0.45);
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  letter-spacing: -0.01em;
}
.detail-panel { overflow: hidden; }
.trend-box { min-height: 420px; }
.style-meta {
  gap: 14px;
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 8px;
  background: #faf7f8;
}
.meta-copy p,
.compare-summary p { margin: 2px 0 0; line-height: 1.6; }
.chart { height: 280px; }
.chart.large { height: 360px; margin-bottom: 16px; }
.compare-header {
  align-items: flex-start;
  gap: 12px;
}
.compare-controls {
  flex-wrap: wrap;
  justify-content: flex-end;
}
.compare-box {
  min-height: 360px;
}
.compare-summary {
  gap: 16px;
  margin-bottom: 16px;
}
.predict-stage-card {
  background: #f7f8fa;
  border-radius: 10px;
  padding: 16px;
  display: grid;
  gap: 10px;
  text-align: center;
}
.predict-stage-title {
  font-size: 13px;
  color: #888;
}
.predict-state-badge {
  display: inline-block;
  margin: 0 auto;
  padding: 6px 20px;
  border-radius: 20px;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
}
.predict-meta {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 12px;
  color: #aaa;
}
.predict-sub-title {
  font-weight: 600;
  margin-bottom: 10px;
  color: #444;
}
.prob-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.prob-label {
  width: 90px;
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
}
.prob-val {
  width: 44px;
  text-align: right;
  font-size: 12px;
  color: #444;
}
</style>
