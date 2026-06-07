<template>
  <div class="page">
    <div class="page-header">
      <h2>趋势洞察</h2>
      <p>选择单款查看历史走势与 W+1/W+2 预测，或切换多款横向对比关键指标变化。</p>
    </div>

    <el-card shadow="never" class="panel tab-card">
      <el-tabs v-model="activeTab" class="insight-tabs" @tab-change="onTabChange">

        <!-- ── 单款走势 ── -->
        <el-tab-pane label="单款走势" name="single">
          <div class="tab-toolbar">
            <el-select v-model="selectedStyleId" filterable size="small" placeholder="选择款式" style="width: 280px">
              <el-option v-for="item in selectableStyles" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
            <el-radio-group v-model="windowDays" size="small">
              <el-radio-button v-for="days in windowOptions" :key="days" :label="days">{{ days }} 天</el-radio-button>
            </el-radio-group>
          </div>

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
        </el-tab-pane>

        <!-- ── 多款对比 ── -->
        <el-tab-pane label="多款对比" name="compare">
          <div class="tab-toolbar compare-toolbar">
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
            <el-select v-model="compareMetric" size="small" placeholder="选择对比指标" style="width: 200px">
              <el-option v-for="item in compareMetricOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-radio-group v-model="compareWindowDays" size="small">
              <el-radio-button v-for="days in windowOptions" :key="days" :label="days">{{ days }} 天</el-radio-button>
            </el-radio-group>
          </div>

          <div v-loading="compareLoading" class="compare-box">
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
            <div ref="compareChartRef" class="chart compare-chart"></div>
          </div>
        </el-tab-pane>

      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'

const route = useRoute()

const overview = ref({})
const activeTab = ref('single')

async function onTabChange(tab) {
  await nextTick()
  if (tab === 'single') {
    dailyChart?.resize()
    weeklyChart?.resize()
  } else {
    // 先 resize 让容器高度生效，再重绘（带动画）
    compareChart?.resize()
    if (compareReady.value && compareData.value) {
      renderCompareChart()
    } else if (compareReady.value) {
      fetchCompareData()
    }
  }
}

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
let dailyChart = null
let weeklyChart = null
let compareChart = null
let trendRafId = null
let compareRafId = null

const STATE_ORDER = ['HotUp', 'HotStable', 'Potential', 'Stable', 'HotDown', 'ColdDown', 'ColdOut']
function stateRank(s) { return STATE_ORDER.indexOf(s) === -1 ? 99 : STATE_ORDER.indexOf(s) }

function nextState(current) {
  const map = {
    HotUp: ['HotUp', 'HotStable'],
    HotStable: ['HotStable', 'HotDown'],
    HotDown: ['HotDown', 'ColdDown'],
    Potential: ['HotUp', 'HotStable'],
    Stable: ['Stable', 'HotDown'],
    ColdDown: ['ColdDown', 'ColdOut'],
    ColdOut: ['ColdOut', 'ColdOut'],
  }
  return map[current] || ['Stable', 'Stable']
}

const hotStyles = computed(() => overview.value.hotStyles || [])
const coldStyles = computed(() => overview.value.coldStyles || [])
const potentialStyles = computed(() => overview.value.potentialStyles || [])
const selectableStyles = computed(() => {
  const rows = [...hotStyles.value, ...potentialStyles.value, ...coldStyles.value]
  return rows.filter((item, index, array) => array.findIndex((x) => x.id === item.id) === index)
})

const compareReady = computed(() => compareStyleIds.value.length >= 2)
const compareIsRate = computed(() => compareMetric.value.includes('_per_'))
const currentCompareMetricLabel = computed(() => {
  return compareMetricOptions.find((item) => item.value === compareMetric.value)?.label || compareMetric.value
})

const predictResult = ref({ currentState: '', w1State: '', w2State: '', w1Probs: {}, w2Probs: {}, metrics: {} })

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
    currentState, w1State, w2State,
    w1Probs: makeProbs(w1State),
    w2Probs: makeProbs(w2State),
    metrics: {
      view_uv:         { current: baseView,              w1: Math.round(baseView * 1.15),  w2: Math.round(baseView * 1.28) },
      want_uv:         { current: Math.round(baseView * 0.3),  w1: Math.round(baseView * 0.34), w2: Math.round(baseView * 0.38) },
      total_confirm_uv:{ current: Math.round(baseView * 0.1),  w1: Math.round(baseView * 0.12), w2: Math.round(baseView * 0.14) },
      tryon_result_uv: { current: Math.round(baseView * 0.2),  w1: Math.round(baseView * 0.22), w2: Math.round(baseView * 0.25) }
    }
  }
}

function buildDailyOption(styleMeta, pred) {
  const daily = styleMeta?.daily || []
  const histLen = daily.length
  const xData = [...daily.map((item) => item.date), 'W+1预测', 'W+2预测']
  const m = pred?.metrics || {}

  const makeSeries = (name, histKey, predKey, color) => [
    {
      name, type: 'line', smooth: true, color,
      data: [...daily.map((item) => item[histKey]), null, null], z: 2
    },
    {
      name: `${name}(预测)`, type: 'line', smooth: false, color,
      lineStyle: { type: 'dashed', width: 2 },
      itemStyle: { borderType: 'dashed' },
      symbol: 'emptyCircle', symbolSize: 7,
      data: [
        ...Array(histLen - 1).fill(null),
        daily[histLen - 1]?.[histKey] ?? null,
        m[predKey]?.w1 ?? null,
        m[predKey]?.w2 ?? null
      ],
      z: 1
    }
  ]

  const allSeries = [
    ...makeSeries('浏览',    'view_uv',         'view_uv',          '#ff6b9d'),
    ...makeSeries('试戴成功', 'tryon_result_uv', 'tryon_result_uv',  '#36cfc9'),
    ...makeSeries('想做',    'want_uv',          'want_uv',          '#faad14'),
    ...makeSeries('确认做',  'total_confirm_uv', 'total_confirm_uv', '#722ed1')
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
        return isPred
          ? `<b>${label}</b>（XGBoost 预测）<br/>${rows.join('<br/>')}`
          : `<b>${label}</b><br/>${rows.join('<br/>')}`
      }
    },
    legend: { data: ['浏览', '试戴成功', '想做', '确认做'], bottom: 0 },
    grid: { left: 36, right: 24, top: 28, bottom: 48, containLabel: true },
    xAxis: {
      type: 'category', data: xData,
      axisLabel: { color: '#888', showMaxLabel: true, showMinLabel: true },
      axisLine: { lineStyle: { color: '#eee' } }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } } },
    series: allSeries.map(s => ({ ...s, legendHoverLink: !s.name.includes('(预测)') }))
  }
}

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
      { name: '热度分',  type: 'bar',  barWidth: 14, color: '#ff6b9d',
        data: [...weekly.map(i => i.hot_score), null, null] },
      { name: '冷门风险', type: 'line', smooth: true, color: '#f5222d',
        data: [...weekly.map(i => i.cold_risk_score), null, null] },
      { name: '增长分',  type: 'line', smooth: true, color: '#52c41a',
        data: [...weekly.map(i => i.growth_score), null, null] },
      { name: '热度分(预测)', type: 'bar', barWidth: 14, color: '#ff6b9d',
        itemStyle: { opacity: 0.45, borderType: 'dashed' },
        data: [...nullPad, w1.hot, w2.hot] },
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
  const histLen = dates.length
  const xData = [...dates, 'W+1 预测', 'W+2 预测']
  const COLORS = ['#ff6b9d', '#36cfc9', '#722ed1', '#fa8c16']
  const metricKey = compareMetric.value
  const isRate = compareIsRate.value

  const allSeries = series.flatMap((item, i) => {
    const color = COLORS[i % COLORS.length]
    const localStyle = selectableStyles.value.find(s => s.id === item.styleId || s.styleCode === item.styleId)
    const pred = buildMockPrediction(localStyle?.id || item.styleId)
    const predM = pred?.metrics || {}
    const lastVal = item.values[histLen - 1] ?? null
    let w1Val = null, w2Val = null
    if (metricKey.includes('_per_')) {
      const factor = pred.w1State === 'HotUp' ? 1.08 : pred.w1State === 'ColdDown' ? 0.92 : 1.0
      w1Val = lastVal != null ? +(lastVal * factor).toFixed(4) : null
      w2Val = lastVal != null ? +(lastVal * factor * factor).toFixed(4) : null
    } else {
      const rawM = predM[metricKey]
      w1Val = rawM?.w1 ?? null
      w2Val = rawM?.w2 ?? null
    }
    return [
      { name: item.styleName, type: 'line', smooth: true, showSymbol: false, color,
        data: [...item.values, null, null], z: 2 },
      { name: `${item.styleName}(预测)`, type: 'line', smooth: false, showSymbol: true,
        symbol: 'emptyCircle', symbolSize: 6, color,
        lineStyle: { type: 'dashed', width: 2, opacity: 0.7 },
        data: [...Array(histLen - 1).fill(null), lastVal, w1Val, w2Val],
        z: 1, tooltip: { show: true } }
    ]
  })

  const valFmt = (v) => isRate ? `${(Number(v || 0) * 100).toFixed(1)}%` : `${Number(v || 0)}`
  return {
    tooltip: { trigger: 'axis', valueFormatter: valFmt },
    legend: { data: series.map(s => s.styleName), bottom: 0 },
    grid: { left: 36, right: 24, top: 28, bottom: 48, containLabel: true },
    xAxis: {
      type: 'category', data: xData,
      axisLabel: { color: '#888', showMaxLabel: true, showMinLabel: true },
      splitArea: {
        show: true,
        areaStyle: {
          color: [
            'transparent',
            ...Array(histLen - 1).fill('transparent'),
            'rgba(250,219,20,0.06)',
            'rgba(250,219,20,0.10)'
          ]
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v) => isRate ? `${Math.round(v * 100)}%` : `${v}` },
      splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } }
    },
    series: allSeries
  }
}

function renderTrendCharts() {
  if (!selectedStyleTrend.value || !dailyChartRef.value || !weeklyChartRef.value) return
  if (!dailyChart) dailyChart = echarts.init(dailyChartRef.value, window.__ECHARTS_THEME__)
  if (!weeklyChart) weeklyChart = echarts.init(weeklyChartRef.value, window.__ECHARTS_THEME__)

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const dailyOpt  = buildDailyOption(selectedStyleTrend.value, predictResult.value)
  const weeklyOpt = buildWeeklyOption(selectedStyleTrend.value, predictResult.value)

  if (reducedMotion) {
    dailyChart.setOption(dailyOpt, true)
    weeklyChart.setOption(weeklyOpt, true)
    return
  }

  // 日走势：底部归零 → rAF 升起，4条线各错开 60ms
  dailyChart.setOption({
    ...dailyOpt,
    animation: false,
    series: dailyOpt.series.map(s => ({ ...s, data: s.data.map(v => v !== null ? 0 : null) }))
  }, true)

  // 周走势：柱 + 折线归零 → 同步升起，3组各错开 80ms
  weeklyChart.setOption({
    ...weeklyOpt,
    animation: false,
    series: weeklyOpt.series.map(s => ({ ...s, data: s.data.map(v => v !== null ? 0 : null) }))
  }, true)

  // 取消上一次还未执行的 rAF，防止快速切款时乱序
  if (trendRafId) cancelAnimationFrame(trendRafId)
  trendRafId = requestAnimationFrame(() => {
    trendRafId = null
    const STAGGER_DAILY  = 60
    const STAGGER_WEEKLY = 80

    dailyChart?.setOption({
      animationDurationUpdate: 700,
      animationEasingUpdate: 'quarticOut',
      series: dailyOpt.series.map((s, i) => ({
        ...s,
        animationDelay: Math.floor(i / 2) * STAGGER_DAILY
      }))
    })

    weeklyChart?.setOption({
      animationDurationUpdate: 700,
      animationEasingUpdate: 'quarticOut',
      series: weeklyOpt.series.map((s, i) => ({
        ...s,
        animationDelay: Math.floor(i / 2) * STAGGER_WEEKLY
      }))
    })
  })
}

async function renderCompareChart() {
  if (!compareData.value || !compareChartRef.value) return
  await nextTick()
  if (!compareChart) compareChart = echarts.init(compareChartRef.value, window.__ECHARTS_THEME__)
  compareChart.resize()

  const option = buildCompareOption(compareData.value)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reducedMotion) {
    compareChart.setOption(option, true)
    return
  }

  // 第一帧：全部数据归零，无动画（建立底部基准线）
  compareChart.setOption({
    ...option,
    animation: false,
    series: option.series.map(s => ({
      ...s,
      data: s.data.map(v => v !== null ? 0 : null)
    }))
  }, true)

  // 第二帧（rAF）：更新为真实数据
  // ECharts 对 update 做纵向插值 → 曲线从底部升起
  // 用 quarticOut（对应项目的 ease-out-quart）+ 700ms，各系列交错 80ms
  if (compareRafId) cancelAnimationFrame(compareRafId)
  compareRafId = requestAnimationFrame(() => {
    compareRafId = null
    const STAGGER = 80
    compareChart?.setOption({
      animationDurationUpdate: 700,
      animationEasingUpdate: 'quarticOut',
      series: option.series.map((s, i) => ({
        ...s,
        animationDelay: Math.floor(i / 2) * STAGGER
      }))
    })
  })
}

function clearCompareChart() {
  compareChart?.clear()
}

function resizeCharts() {
  dailyChart?.resize()
  weeklyChart?.resize()
  compareChart?.resize()
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
  // 若从热度榜单跳转带了 styleId，优先选中它
  const queryId = route.query.styleId
  selectedStyleId.value = queryId || overview.value.latestHotIds?.[0] || selectableStyles.value[0]?.id || ''
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
})
</script>

<style scoped>
/* ── 页面整体撑满高度 ── */
.page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}
.page-header { margin-bottom: 18px; flex-shrink: 0; }
.page-header h2 { margin: 0 0 6px; font-size: 22px; }
.page-header p { margin: 0; color: #777; }

/* tab-card 撑满剩余空间 */
.panel { margin-bottom: 16px; border-radius: 8px; }
.tab-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.tab-card :deep(.el-card__body) {
  padding-top: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.insight-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.insight-tabs :deep(.el-tabs__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.insight-tabs :deep(.el-tab-pane) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Tab 样式跟 users 页保持一致 */
.insight-tabs :deep(.el-tabs__header) { margin-bottom: 20px; }
.insight-tabs :deep(.el-tabs__item) { font-size: 14px; font-weight: 500; color: #999; }
.insight-tabs :deep(.el-tabs__item.is-active) { color: #b86e4a; font-weight: 600; }
.insight-tabs :deep(.el-tabs__active-bar) { background-color: #b86e4a; }
.insight-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background-color: #f0ece8; }

/* toolbar 控件行 */
.tab-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

/* 单款走势 */
.trend-box { min-height: 420px; }
.style-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 8px;
  background: #faf7f8;
  flex-shrink: 0;
}
.meta-image { width: 54px; height: 54px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.meta-copy { display: grid; gap: 3px; }
.meta-copy strong { font-weight: 600; font-size: 14px; color: #2d1a10; }
.meta-copy span,
.meta-copy p,
.compare-summary p {
  color: rgba(45,26,16,0.45);
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  letter-spacing: -0.01em;
}
.meta-copy p,
.compare-summary p { margin: 2px 0 0; line-height: 1.6; }

.chart { height: 280px; }
.chart.large { height: 360px; margin-bottom: 16px; }

/* 多款对比：box 撑满 tab-pane 剩余，chart 也撑满 box */
.compare-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.compare-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.compare-chart {
  flex: 1;
  min-height: 400px;
}
</style>
