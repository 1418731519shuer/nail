<template>
  <div class="page">
    <div class="page-header">
      <h2>推荐位管理</h2>
      <p>先选策略，再让 AI 自动生成 8 个坑位方案；保存后会排队同步到用户端，等用户端空闲时再生效。</p>
    </div>

    <el-card shadow="never" class="panel">
      <template #header>推荐策略</template>
      <div class="strategy-grid">
        <button
          v-for="item in strategies"
          :key="item.value"
          class="strategy-card"
          :class="{ active: strategy === item.value }"
          @click="selectStrategy(item.value)"
        >
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </button>
      </div>

      <div v-if="strategy === 'custom'" class="custom-panel">
        <div class="custom-header">
          <strong>自定义坑位分类</strong>
          <span>每个位置可手动设为热门、潜力、冷门或个性化。</span>
        </div>
        <div class="custom-grid">
          <div v-for="slot in customSlots" :key="slot.position" class="custom-slot">
            <label>{{ slot.slotName }}</label>
            <el-select v-model="slot.category" size="small">
              <el-option v-for="item in customOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
        </div>
      </div>

      <div class="intent-panel">
        <div>
          <strong>个性化参考</strong>
          <p>会用于“个性化优先”策略和自定义里的个性化坑位。</p>
        </div>
        <el-input
          v-model="intentText"
          type="textarea"
          :rows="2"
          placeholder="例如：短甲显白、预算 200 内、猫眼、不要显黑"
        />
      </div>
    </el-card>

    <el-card shadow="never" class="panel">
      <template #header>
        <div class="card-header">
          <span>推荐位列表</span>
          <div class="header-actions">
            <el-button @click="runAiRecommend">AI 自动推荐</el-button>
            <el-button type="primary" @click="saveStrategy">保存</el-button>
          </div>
        </div>
      </template>

      <div class="status-bar">
        <el-tag size="small" type="info">当前策略：{{ selectedStrategyTitle }}</el-tag>
        <el-tag size="small" :type="syncStatusType">{{ syncStatusText }}</el-tag>
        <span class="status-hint">{{ syncHint }}</span>
      </div>

      <div class="recommend-grid">
        <div v-for="item in recommendList" :key="item.id" class="recommend-card" :class="item.slotType">
          <div class="position-row">
            <div>
              <span class="position">P{{ item.position }}</span>
              <strong class="slot-name">{{ item.slotName || `位置 ${item.position}` }}</strong>
            </div>
            <el-tag size="small" effect="plain">{{ item.strategyLabel || item.userLabel }}</el-tag>
          </div>

          <el-image :src="item.style.image" class="cover" fit="cover" />
          <h3>{{ item.style.name }}</h3>
          <p class="reason">{{ item.reason }}</p>

          <div class="score-block">
            <div>
              <span>热度分</span>
              <strong>{{ item.hotIndex }}</strong>
            </div>
            <el-progress
              :percentage="Math.min(item.hotIndex, 100)"
              :stroke-width="10"
              :show-text="false"
              color="#ff6b9d"
            />
          </div>

          <div class="stats">
            <span><b>{{ item.tryOnCount }}</b> 试戴</span>
            <span><b>{{ item.wantCount }}</b> 想做</span>
            <span><b>{{ item.confirmCount }}</b> 确认</span>
            <span><b>{{ item.confirmRate }}%</b> 确认率</span>
          </div>

          <div class="actions">
            <el-tag :type="item.isAuto ? 'success' : 'warning'" size="small">{{ item.isAuto ? 'AI 推荐' : '手动调整' }}</el-tag>
            <el-button text @click="openTrend(item)">走势</el-button>
            <el-button type="primary" @click="openChange(item)">换款</el-button>
          </div>
        </div>
      </div>

      <div class="risk-notes" v-if="riskNotes.length">
        <strong>策略提醒</strong>
        <ul>
          <li v-for="note in riskNotes" :key="note">{{ note }}</li>
        </ul>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="替换推荐款式" width="760px">
      <el-input v-model="keyword" placeholder="搜索款式名 / 编码 / 分类" clearable style="margin-bottom: 14px" />
      <div class="style-grid">
        <div
          v-for="style in availableStyles"
          :key="style.id"
          class="style-option"
          :class="{ selected: selectedStyleId === style.id }"
          @click="selectedStyleId = style.id"
        >
          <el-image :src="style.image" class="option-image" fit="cover" />
          <strong>{{ style.name }}</strong>
          <span>试戴 {{ style.tryOnCount }} / 想做 {{ style.wantCount }} / 确认 {{ style.confirmCount }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmChange">确认换款</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="trendDialogVisible" title="推荐位走势回放" width="820px">
      <div v-if="trendStyleMeta" class="trend-dialog">
        <div class="trend-dialog__header">
          <div>
            <strong>{{ trendStyleMeta.styleName }}</strong>
            <p>{{ trendRangeText }}</p>
          </div>
          <div class="trend-dialog__tags">
            <el-tag type="info">{{ trendSlotLabel }}</el-tag>
            <el-tag type="success">120 天日线</el-tag>
            <el-tag type="warning">周度趋势</el-tag>
          </div>
        </div>
        <el-radio-group v-model="trendWindowDays" size="small" class="trend-window-group">
          <el-radio-button v-for="days in trendWindowOptions" :key="days" :label="days">{{ days }} 天</el-radio-button>
        </el-radio-group>
        <div ref="trendDailyChartRef" class="trend-chart trend-chart--large"></div>
        <div ref="trendWeeklyChartRef" class="trend-chart"></div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  aiDemandSignals,
  generateRecommendRowsByStrategy,
  getRecommendManagementRows,
  getStyleManagementRows,
  loadRecommendDraftFromServer,
  persistAgentState,
  recommendStrategyOptions,
  saveRecommendDraft,
  writeState
} from '@/agent/mock-data'

const strategy = ref(writeState.recommendConfigDraft?.strategyId || 'hot')
const intentText = ref(writeState.recommendConfigDraft?.intentText || aiDemandSignals.queries.join('，'))
const recommendList = ref([])
const styleList = ref([])
const riskNotes = ref([])
const dialogVisible = ref(false)
const keyword = ref('')
const selectedStyleId = ref(null)
const currentPosition = ref(null)
const syncStatusText = ref('尚未保存到用户端')
const syncStatusType = ref('info')
const syncHint = ref('先运行 AI 自动推荐，再保存。')
const trendSnapshot = ref({ dateRange: {}, styles: [] })
const trendWindowDays = ref(30)
const trendDialogVisible = ref(false)
const trendStyleId = ref('')
const trendSlotLabel = ref('')
const trendDailyChartRef = ref(null)
const trendWeeklyChartRef = ref(null)
let trendDailyChart = null
let trendWeeklyChart = null
const trendWindowOptions = [7, 14, 30, 120]

const customOptions = [
  { value: 'hot', label: '热门' },
  { value: 'potential', label: '潜力' },
  { value: 'cold', label: '冷门' },
  { value: 'personalized', label: '个性化' }
]

const customSlots = ref(
  Array.from({ length: 8 }, (_, index) => ({
    position: index + 1,
    slotName: `P${index + 1}`,
    category: writeState.recommendConfigDraft?.customCategories?.[index] || (index < 2 ? 'hot' : index < 4 ? 'potential' : index === 7 ? 'cold' : 'personalized')
  }))
)

const strategies = recommendStrategyOptions
const strategyTitleMap = Object.fromEntries(strategies.map((item) => [item.value, item.title]))

const selectedStrategyTitle = computed(() => strategies.find((item) => item.value === strategy.value)?.title || '未选择')
const trendRangeText = computed(() => {
  const range = trendSnapshot.value?.dateRange || {}
  if (!range.startDate || !range.endDate) return '120 天走势窗口准备中...'
  return `${range.startDate} ~ ${range.endDate} · ${range.days || 120} 天`
})

const trendStyleMeta = computed(() => {
  return trendSnapshot.value?.styles?.find((item) => item.styleId === trendStyleId.value) || null
})

const availableStyles = computed(() => {
  return styleList.value.filter((item) => {
    if (!keyword.value) return true
    const haystack = `${item.id}${item.styleCode || ''}${item.name}${item.category}${item.tags.join('')}`.toLowerCase()
    return haystack.includes(keyword.value.toLowerCase())
  })
})

function slotPlanForCurrentStrategy() {
  return generateRecommendRowsByStrategy(
    strategy.value,
    strategy.value === 'custom' ? customCategoryValues() : undefined,
    intentText.value
  ).slotPlan
}

function decorateRows(rows) {
  const plan = slotPlanForCurrentStrategy()
  return rows.map((row) => {
    const slotMeta = plan.find((item) => item.position === row.position)
    return {
      ...row,
      slotCategory: row.slotCategory || slotMeta?.category || 'hot',
      slotName: row.slotName || slotMeta?.slotName || `P${row.position}`,
      strategyLabel: slotMeta?.strategyLabel || row.strategyLabel || row.userLabel
    }
  })
}

function customCategoryValues() {
  return customSlots.value.map((item) => item.category)
}

function resolveStrategyTitle(strategyId, fallbackName) {
  return strategyTitleMap[strategyId] || fallbackName || '未命名策略'
}

function refreshFromState() {
  recommendList.value = decorateRows(getRecommendManagementRows())
  styleList.value = getStyleManagementRows()
}

function applyServerConfig(config) {
  if (!config) return
  loadRecommendDraftFromServer(config)
  strategy.value = config.strategyId || 'hot'
  intentText.value = config.intentText || aiDemandSignals.queries.join('，')
  customSlots.value = Array.from({ length: 8 }, (_, index) => ({
    position: index + 1,
    slotName: config.slots?.[index]?.slotName || `P${index + 1}`,
    category: config.customCategories?.[index] || config.slots?.[index]?.category || (index < 2 ? 'hot' : index < 4 ? 'potential' : index === 7 ? 'cold' : 'personalized')
  }))
  refreshFromState()
}

function selectStrategy(nextStrategy) {
  strategy.value = nextStrategy
  syncStatusText.value = '策略已切换，待重新生成'
  syncStatusType.value = 'warning'
  syncHint.value = '点击“AI 自动推荐”生成这套策略的 8 个坑位。'
}

function runAiRecommend() {
  const generated = generateRecommendRowsByStrategy(
    strategy.value,
    strategy.value === 'custom' ? customCategoryValues() : undefined,
    intentText.value
  )
  recommendList.value = decorateRows(generated.rows)
  riskNotes.value = generated.riskNotes
  syncStatusText.value = 'AI 已生成新策略，待保存'
  syncStatusType.value = 'warning'
  syncHint.value = '保存后会把这套策略排队同步到用户端。'
  ElMessage.success('AI 已按当前策略生成推荐位方案')
}

function applyStyleToSlot(slot, style, reason, isAuto = false) {
  slot.style = {
    id: style.id,
    code: style.styleCode,
    name: style.name,
    image: style.image || style.coverImage
  }
  slot.tryOnCount = style.tryOnCount
  slot.wantCount = style.wantCount
  slot.confirmCount = style.confirmCount
  slot.confirmRate = style.confirmRate
  slot.hotIndex = style.hotIndex
  slot.reason = reason
  slot.isAuto = isAuto
}

function openTrend(item) {
  trendStyleId.value = item.style.id
  trendSlotLabel.value = `${item.slotName || `P${item.position}`} · ${item.strategyLabel || item.userLabel || '推荐位'}`
  trendDialogVisible.value = true
}

function openChange(item) {
  currentPosition.value = item.position
  selectedStyleId.value = item.style.id
  dialogVisible.value = true
}

function confirmChange() {
  const style = styleList.value.find((item) => item.id === selectedStyleId.value)
  const target = recommendList.value.find((item) => item.position === currentPosition.value)
  if (!style || !target) return

  const source = recommendList.value.find((item) => item.style.id === style.id)
  const targetSnapshot = {
    style: { ...target.style },
    tryOnCount: target.tryOnCount,
    wantCount: target.wantCount,
    confirmCount: target.confirmCount,
    confirmRate: target.confirmRate,
    hotIndex: target.hotIndex
  }

  applyStyleToSlot(target, style, '运营手动调整', false)

  if (source && source.position !== target.position) {
    const displaced = styleList.value.find((item) => item.id === targetSnapshot.style.id)
    if (displaced) {
      applyStyleToSlot(source, displaced, '运营手动换位', false)
      source.tryOnCount = targetSnapshot.tryOnCount
      source.wantCount = targetSnapshot.wantCount
      source.confirmCount = targetSnapshot.confirmCount
      source.confirmRate = targetSnapshot.confirmRate
      source.hotIndex = targetSnapshot.hotIndex
    }
  }

  dialogVisible.value = false
  syncStatusText.value = '手动调整完成，待保存'
  syncStatusType.value = 'warning'
  syncHint.value = '如果这次换位要同步给用户端，记得点保存。'
  ElMessage.success(source && source.position !== target.position ? '推荐位已完成换位' : '推荐位已替换')
}

async function saveStrategy() {
  saveRecommendDraft(recommendList.value, {
    strategyId: strategy.value,
    customCategories: strategy.value === 'custom' ? customCategoryValues() : [],
    intentText: intentText.value
  })
  persistAgentState()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agent-state-changed'))
  }

  try {
    const response = await fetch('/api/recommend-sync-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        versionId: writeState.recommendConfigDraft.versionId,
        strategyId: strategy.value,
        strategyName: selectedStrategyTitle.value,
        intentText: intentText.value,
        customCategories: strategy.value === 'custom' ? customCategoryValues() : [],
        slots: recommendList.value.map((item) => ({
          position: item.position,
          slotName: item.slotName,
          category: item.slotCategory || 'hot',
          strategyLabel: item.strategyLabel,
          reason: item.reason,
          styleId: item.style.id,
          styleName: item.style.name
        }))
      })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '同步失败')

    if (data.draftConfig) {
      applyServerConfig(data.draftConfig)
    }
    syncStatusText.value = data.userActive ? '已保存，等待用户端会话结束后切换' : '已保存，当前已直接发布到用户端'
    syncStatusType.value = data.userActive ? 'warning' : 'success'
    syncHint.value = data.userActive
      ? '用户端会继续使用旧版本，直到当前会话关闭或心跳超时后才切到新版本。'
      : '当前没有活跃用户会话，服务端已经把这套配置切成生效版本。'
    ElMessage.success('推荐策略已保存到服务端主库，并按会话状态安排发布')
  } catch (error) {
    syncStatusText.value = '已保存到运营端，但用户端同步失败'
    syncStatusType.value = 'danger'
    syncHint.value = error.message || '请检查 user-client API 是否在线。'
    ElMessage.error(syncHint.value)
  }
}

async function fetchSyncState() {
  try {
    const response = await fetch('/api/recommend-sync-state')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '获取同步状态失败')

    const preferredConfig = data.draftConfig || data.pendingConfig || data.publishedConfig || data.effectiveConfig
    if (preferredConfig) {
      applyServerConfig(preferredConfig)
    }

    if (data.rolloutStatus === 'queued_waiting_for_user_exit') {
      syncStatusText.value = '已排队，等待用户端会话结束'
      syncStatusType.value = 'warning'
      syncHint.value = '当前服务端仍保留旧的用户端生效版本，新版本会在用户端关闭或心跳超时后切换。'
      return
    }

    if (data.publishedConfig?.strategyName || data.publishedConfig?.strategyId) {
      const publishedTitle = resolveStrategyTitle(data.publishedConfig?.strategyId, data.publishedConfig?.strategyName)
      syncStatusText.value = `用户端当前版本：${publishedTitle}`
      syncStatusType.value = 'success'
      syncHint.value = data.draftConfig && data.draftConfig.versionId !== data.publishedConfig.versionId
        ? '运营端当前显示的是服务端最新草稿，用户端仍使用已发布版本。'
        : '运营端和用户端当前看到的是同一份已发布配置。'
    }
  } catch {
    syncStatusText.value = '用户端同步状态不可用'
    syncStatusType.value = 'danger'
    syncHint.value = '请确认 user-client 的 4173 API 正在运行。'
  }
}

function sliceTrendWindow(series, windowDays) {
  if (!Array.isArray(series)) return []
  if (!windowDays || windowDays >= series.length) return series
  return series.slice(-windowDays)
}

async function fetchTrendSnapshot() {
  try {
    const response = await fetch('/api/xhs-trend-snapshot')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '获取趋势快照失败')
    trendSnapshot.value = data
  } catch (error) {
    console.warn('[recommend] trend snapshot unavailable', error)
  }
}

function buildTrendDailyOption() {
  const daily = sliceTrendWindow(trendStyleMeta.value?.daily || [], trendWindowDays.value)
  return {
    color: ['#ff6b9d', '#36cfc9', '#faad14', '#722ed1'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['浏览', '试戴成功', '想做', '确认做'], bottom: 0 },
    grid: { left: 36, right: 24, top: 24, bottom: 48, containLabel: true },
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

function buildTrendWeeklyOption() {
  const weekly = trendStyleMeta.value?.weekly || []
  return {
    color: ['#ff6b9d', '#f5222d', '#52c41a'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['热度分', '冷门风险', '增长分'], bottom: 0 },
    grid: { left: 36, right: 24, top: 24, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: weekly.map((item) => `W${item.week_idx}`), axisLabel: { color: '#888' } },
    yAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } } },
    series: [
      { name: '热度分', type: 'bar', barWidth: 14, data: weekly.map((item) => item.hot_score) },
      { name: '冷门风险', type: 'line', smooth: true, data: weekly.map((item) => item.cold_risk_score) },
      { name: '增长分', type: 'line', smooth: true, data: weekly.map((item) => item.growth_score) }
    ]
  }
}

function renderTrendCharts() {
  if (!trendStyleMeta.value || !trendDailyChartRef.value || !trendWeeklyChartRef.value) return
  if (!trendDailyChart) trendDailyChart = echarts.init(trendDailyChartRef.value, window.__ECHARTS_THEME__)
  if (!trendWeeklyChart) trendWeeklyChart = echarts.init(trendWeeklyChartRef.value, window.__ECHARTS_THEME__)
  trendDailyChart.setOption(buildTrendDailyOption())
  trendWeeklyChart.setOption(buildTrendWeeklyOption())
}

function resizeTrendCharts() {
  trendDailyChart?.resize()
  trendWeeklyChart?.resize()
}

watch(trendDialogVisible, async (visible) => {
  if (!visible) return
  await nextTick()
  renderTrendCharts()
})

watch(trendWindowDays, async () => {
  if (!trendDialogVisible.value || !trendStyleMeta.value) return
  await nextTick()
  renderTrendCharts()
})

onMounted(async () => {
  refreshFromState()
  fetchSyncState()
  await fetchTrendSnapshot()
  window.addEventListener('agent-state-changed', refreshFromState)
  window.addEventListener('resize', resizeTrendCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('agent-state-changed', refreshFromState)
  window.removeEventListener('resize', resizeTrendCharts)
  trendDailyChart?.dispose()
  trendWeeklyChart?.dispose()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 18px;
}

.page-header h2 {
  margin: 0 0 6px;
}

.page-header p,
.strategy-card p,
.reason,
.style-option span,
.status-hint,
.custom-header span {
  color: #777;
}

.panel {
  margin-bottom: 16px;
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.strategy-card {
  padding: 14px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.strategy-card.active {
  border-color: #ff6b9d;
  background: #fff5f8;
}

.strategy-card strong {
  display: block;
  margin-bottom: 8px;
}

.custom-panel,
.intent-panel {
  margin-top: 16px;
  padding: 14px;
  border-radius: 8px;
  background: #faf7fb;
}

.custom-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.custom-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.custom-slot {
  display: grid;
  gap: 8px;
}

.card-header,
.header-actions,
.actions,
.position-row,
.status-bar,
.intent-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.status-bar {
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.recommend-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  gap: 14px;
}

.recommend-card,
.style-option {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
}

.recommend-card.peek_half_5,
.recommend-card.peek_half_6,
.recommend-card.peek_half_7,
.recommend-card.peek_half_8 {
  background: linear-gradient(180deg, #fff, #fff8fb);
}

.position {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  background: #ff6b9d;
  color: #fff;
  font-size: 12px;
  margin-right: 8px;
}

.slot-name {
  font-size: 14px;
}

.cover {
  width: 100%;
  height: 132px;
  margin-top: 10px;
  border-radius: 8px;
}

.recommend-card h3 {
  min-height: 42px;
  margin: 10px 0 4px;
  font-size: 16px;
}

.reason {
  min-height: 40px;
  margin: 0 0 10px;
  font-size: 13px;
}

.score-block {
  display: grid;
  gap: 6px;
  margin: 10px 0;
}

.score-block div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  color: #777;
}

.score-block strong {
  color: #ff4f8b;
  font-size: 26px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 12px 0;
  padding: 10px;
  border-radius: 8px;
  background: #f7f8fa;
  font-size: 13px;
}

.stats span {
  display: grid;
  gap: 2px;
  color: #777;
}

.stats b {
  color: #303133;
}

.style-grid {
  max-height: 420px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.style-option {
  display: grid;
  gap: 6px;
  cursor: pointer;
}

.style-option.selected {
  border-color: #ff6b9d;
  background: #fff5f8;
}

.option-image {
  width: 100%;
  height: 96px;
  border-radius: 6px;
}

.risk-notes {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fff8ef;
  color: #8a5a13;
}

.risk-notes ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.trend-dialog {
  display: grid;
  gap: 14px;
}

.trend-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.trend-dialog__header p {
  margin: 6px 0 0;
  color: #777;
}

.trend-dialog__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trend-chart {
  height: 260px;
}

.trend-chart--large {
  height: 320px;
}

.trend-window-group {
  margin: 4px 0 8px;
}
</style>
