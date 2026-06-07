<template>
  <div class="page">
    <div class="page-header">
      <h2>运营日报</h2>
      <p>汇总用户端埋点、AI 试戴、想要做和确认要做数据，用于每天看门店使用效果。</p>
    </div>

    <el-row :gutter="16" class="stat-row">
      <el-col :span="6" v-for="item in statCards" :key="item.label">
        <el-card shadow="never" class="stat-card">
          <div class="stat-top">
            <div class="stat-icon" :style="{ background: item.color }">
              <el-icon><component :is="item.icon" /></el-icon>
            </div>
            <span :class="['stat-trend', item.trend >= 0 ? 'up' : 'down']">{{ item.trend >= 0 ? '+' : '' }}{{ item.trend }}%</span>
          </div>
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="card-header">
              <span>热门款式 TOP 5</span>
              <el-button text type="primary" @click="router.push('/trending')">查看全部</el-button>
            </div>
          </template>
          <div class="top5-list">
            <el-popover
              v-for="(row, index) in hotStyles.slice(0, 5)"
              :key="row.id"
              :visible="activePopover === row.id"
              placement="right"
              :width="220"
              trigger="manual"
            >
              <template #reference>
                <div
                  class="top5-item"
                  @mousedown="startLongPress(row.id)"
                  @mouseup="cancelLongPress"
                  @mouseleave="cancelLongPress"
                  @touchstart.prevent="startLongPress(row.id)"
                  @touchend="cancelLongPress"
                >
                  <span class="top5-rank" :class="index < 3 ? 'top3' : ''">{{ index + 1 }}</span>
                  <el-image :src="row.image" class="top5-img" fit="cover" />
                  <div class="top5-info">
                    <div class="top5-name">{{ row.name }}</div>
                    <div class="top5-tags">
                      <el-tag v-for="tag in row.tags.slice(0, 2)" :key="tag" size="small">{{ tag }}</el-tag>
                    </div>
                  </div>
                  <el-progress :percentage="Math.min(row.hotIndex, 100)" :stroke-width="6" :show-text="false" class="top5-bar" />
                </div>
              </template>
              <div class="popover-metrics">
                <div class="popover-row"><span>试戴次数</span><strong>{{ row.tryOnCount }}</strong></div>
                <div class="popover-row"><span>想要做</span><strong>{{ row.wantCount }}</strong></div>
                <div class="popover-row"><span>确认要做</span><strong>{{ row.confirmCount }}</strong></div>
                <div class="popover-row"><span>确认率</span><strong>{{ row.confirmRate }}%</strong></div>
                <div class="popover-row"><span>热门分</span><strong>{{ row.hotIndex }}</strong></div>
              </div>
            </el-popover>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never" class="panel">
          <template #header>运营建议</template>
          <div v-for="item in suggestions" :key="item.title" class="suggestion" :class="item.priority">
            <strong>{{ item.title }}</strong>
            <p>{{ item.content }}</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="panel">
      <template #header>
        <div class="card-header">
          <span>试戴与冷热趋势</span>
          <el-tag type="info" size="small">7 日窗口</el-tag>
        </div>
      </template>
      <p class="range-note">{{ rangeText }}</p>
      <div ref="trendChartRef" class="chart"></div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { fetchOpsData } from '@/api/opsData'

const router = useRouter()
const trendChartRef = ref(null)
const ops = ref(null)
let chart = null
const activePopover = ref(null)
let longPressTimer = null

function startLongPress(id) {
  longPressTimer = setTimeout(() => { activePopover.value = id }, 500)
}
function cancelLongPress() {
  clearTimeout(longPressTimer)
  setTimeout(() => { activePopover.value = null }, 200)
}

const todayStats = computed(() => ops.value?.todayStats || {})
const hotStyles = computed(() => ops.value?.hotStyles || [])
const suggestions = computed(() => ops.value?.suggestions || [])
const activities = computed(() => ops.value?.activities || [])
const rangeText = computed(() => {
  const range = ops.value?.trendSnapshot?.dateRange || {}
  return range.startDate ? `当前分析基于 ${range.startDate} 到 ${range.endDate} 的 120 天同源模拟数据。` : '当前分析基于已生成的模拟数据。'
})

const statCards = computed(() => [
  { label: '今日总试戴次数', value: todayStats.value.tryOnCount || 0, trend: todayStats.value.tryOnTrend || 0, icon: 'View', color: 'linear-gradient(135deg,#ff6b9d,#ff8e53)' },
  { label: 'AI 试戴用户数', value: todayStats.value.userCount || 0, trend: todayStats.value.userTrend || 0, icon: 'User', color: 'linear-gradient(135deg,#1890ff,#36cfc9)' },
  { label: '确认要做数量', value: todayStats.value.confirmCount || 0, trend: todayStats.value.confirmTrend || 0, icon: 'CircleCheck', color: 'linear-gradient(135deg,#52c41a,#73d13d)' },
  { label: '人均试戴/成交', value: todayStats.value.avgTryPerOrder || 0, trend: todayStats.value.avgTryTrend || 0, icon: 'DataAnalysis', color: 'linear-gradient(135deg,#722ed1,#9254de)' }
])

function initChart() {
  if (!trendChartRef.value || !ops.value) return
  if (chart) chart.dispose()

  const data = ops.value.trendData || { dates: [], hotTrend: [], coldTrend: [] }
  chart = echarts.init(trendChartRef.value, window.__ECHARTS_THEME__)
  chart.setOption({
    color: ['#ff6b9d', '#1890ff'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#eef0f4',
      borderWidth: 1,
      textStyle: { color: '#333' }
    },
    legend: {
      data: ['热门确认', '冷门风险'],
      bottom: 0,
      icon: 'roundRect'
    },
    grid: {
      left: 36,
      right: 24,
      top: 24,
      bottom: 48,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.dates,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e7e9ef' } },
      axisLabel: { color: '#888' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } },
      axisLabel: { color: '#888' }
    },
    series: [
      {
        name: '热门确认',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: data.hotTrend,
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.18,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,107,157,0.35)' },
            { offset: 1, color: 'rgba(255,107,157,0.03)' }
          ])
        }
      },
      {
        name: '冷门风险',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: data.coldTrend,
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.14,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(24,144,255,0.28)' },
            { offset: 1, color: 'rgba(24,144,255,0.03)' }
          ])
        }
      }
    ]
  })
}

function resizeChart() {
  chart?.resize()
}

onMounted(async () => {
  ops.value = await fetchOpsData()
  await nextTick()
  initChart()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 18px;
}
.page-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
}
.page-header p {
  margin: 0;
  color: #777;
}
.stat-row,
.panel {
  margin-bottom: 16px;
}
.stat-card {
  border-radius: 8px;
}
.stat-top,
.card-header,
.style-info,
.activity {
  display: flex;
  align-items: center;
}
.stat-top,
.card-header {
  justify-content: space-between;
}
.stat-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #fff;
}
.stat-value {
  margin-top: 14px;
  font-size: 28px;
  font-weight: 700;
}
.stat-label,
.activity span {
  color: #888;
  font-size: 13px;
}
.stat-trend.up {
  color: #52c41a;
}
.stat-trend.down {
  color: #f5222d;
}
.chart {
  height: 300px;
}
.top5-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.top5-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.top5-rank {
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: #eee;
  color: #888;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.top5-rank.top3 {
  background: linear-gradient(135deg, #ff6b9d, #ff8e53);
  color: #fff;
}
.top5-img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  flex-shrink: 0;
}
.top5-info {
  flex: 1;
  min-width: 0;
}
.top5-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.top5-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.top5-item {
  cursor: pointer;
  user-select: none;
}
.top5-item:active {
  opacity: 0.75;
}
.popover-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.popover-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #555;
}
.popover-row strong {
  color: #2d1a10;
  font-weight: 700;
}
.top5-bar {
  width: 80px;
  flex-shrink: 0;
}
.range-note {
  margin: 0 0 12px;
  color: #777;
  font-size: 13px;
}
.rank {
  width: 26px;
  height: 26px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #ff6b9d;
  font-weight: 700;
}
.style-info {
  gap: 12px;
}
.style-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
}
.style-name {
  font-weight: 600;
  margin-bottom: 4px;
}
.suggestion {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: #f7f8fa;
  border-left: 3px solid #909399;
}
.suggestion.high {
  border-left-color: #ff6b9d;
}
.suggestion.medium {
  border-left-color: #fa8c16;
}
.suggestion p {
  margin: 6px 0 0;
  color: #666;
  line-height: 1.5;
}
.activity {
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}
</style>
