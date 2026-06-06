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
let dailyChart = null
let weeklyChart = null
let compareChart = null

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

function buildDailyOption(styleMeta) {
  const daily = styleMeta?.daily || []
  return {
    color: ['#ff6b9d', '#36cfc9', '#faad14', '#722ed1'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['浏览', '试戴成功', '想做', '确认做'], bottom: 0 },
    grid: { left: 36, right: 24, top: 28, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: daily.map((item) => item.date), axisLabel: { color: '#888', showMaxLabel: true, showMinLabel: true } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } } },
    series: [
      { name: '浏览', type: 'line', smooth: true, data: daily.map((item) => item.view_uv) },
      { name: '试戴成功', type: 'line', smooth: true, data: daily.map((item) => item.tryon_result_uv) },
      { name: '想做', type: 'line', smooth: true, data: daily.map((item) => item.want_uv) },
      { name: '确认做', type: 'line', smooth: true, data: daily.map((item) => item.total_confirm_uv) }
    ]
  }
}

function buildWeeklyOption(styleMeta) {
  const weekly = styleMeta?.weekly || []
  return {
    color: ['#ff6b9d', '#f5222d', '#52c41a'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['热度分', '冷门风险', '增长分'], bottom: 0 },
    grid: { left: 36, right: 24, top: 28, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: weekly.map((item) => `W${item.week_idx}`), axisLabel: { color: '#888' } },
    yAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } } },
    series: [
      { name: '热度分', type: 'bar', barWidth: 14, data: weekly.map((item) => item.hot_score) },
      { name: '冷门风险', type: 'line', smooth: true, data: weekly.map((item) => item.cold_risk_score) },
      { name: '增长分', type: 'line', smooth: true, data: weekly.map((item) => item.growth_score) }
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
  if (!dailyChart) dailyChart = echarts.init(dailyChartRef.value)
  if (!weeklyChart) weeklyChart = echarts.init(weeklyChartRef.value)
  dailyChart.setOption(buildDailyOption(selectedStyleTrend.value))
  weeklyChart.setOption(buildWeeklyOption(selectedStyleTrend.value))
}

function renderCompareChart() {
  if (!compareData.value || !compareChartRef.value) return
  if (!compareChart) compareChart = echarts.init(compareChartRef.value)
  compareChart.setOption(buildCompareOption(compareData.value))
}

function clearCompareChart() {
  compareChart?.clear()
}

function resizeCharts() {
  dailyChart?.resize()
  weeklyChart?.resize()
  compareChart?.resize()
}

watch(selectedStyleId, fetchSelectedTrend)
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
.metric-box strong { font-size: 24px; }
.list-item {
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}
.rank {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ff6b9d;
  color: #fff;
  font-weight: 700;
  flex: 0 0 26px;
}
.thumb,
.meta-image {
  width: 54px;
  height: 54px;
  border-radius: 8px;
}
.item-main,
.meta-copy { display: grid; gap: 4px; }
.item-main span,
.meta-copy span,
.meta-copy p,
.compare-summary p { color: #777; }
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
</style>
