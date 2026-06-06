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
        <el-row :gutter="16" class="stat-row">
          <el-col :span="6" v-for="item in profileStatCards" :key="item.label">
            <el-card shadow="never" class="stat-card">
              <div class="stat-label">{{ item.label }}</div>
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-desc">{{ item.desc }}</div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="14">
            <UserPreferenceRadar
              :preferences="preferenceGroups"
              :confidence="profile.confidence.overall"
              :exploration-rate="profile.explorationRate"
              :summary-text="summaryText"
            />

            <el-card shadow="never" class="panel">
              <template #header>
                <div class="card-header">
                  <span>用户群体分类</span>
                  <el-tag type="success">cohort tags</el-tag>
                </div>
              </template>

              <div class="cohort-grid">
                <div v-for="item in userCohorts" :key="item.title" class="cohort-card">
                  <div class="cohort-title">{{ item.title }}</div>
                  <strong>{{ item.value }}</strong>
                  <p>{{ item.desc }}</p>
                </div>
              </div>
            </el-card>

            <el-card shadow="never" class="panel">
              <template #header>
                <div class="card-header">
                  <span>筛选与个性化排序</span>
                  <el-space wrap>
                    <el-select v-model="filter.season" size="small" style="width: 110px">
                      <el-option v-for="item in FILTER_OPTIONS.season" :key="item" :label="item" :value="item" />
                    </el-select>
                    <el-select v-model="filter.style" size="small" style="width: 120px">
                      <el-option v-for="item in FILTER_OPTIONS.style" :key="item" :label="item" :value="item" />
                    </el-select>
                    <el-select v-model="filter.type" size="small" style="width: 110px">
                      <el-option v-for="item in FILTER_OPTIONS.type" :key="item" :label="item" :value="item" />
                    </el-select>
                    <el-select v-model="filter.shape" size="small" style="width: 110px">
                      <el-option v-for="item in FILTER_OPTIONS.shape" :key="item" :label="item" :value="item" />
                    </el-select>
                    <el-button size="small" @click="resetFilter">重置</el-button>
                  </el-space>
                </div>
              </template>

              <el-table :data="rankedItems.slice(0, 10)" style="width: 100%">
                <el-table-column label="款式" min-width="260">
                  <template #default="{ row }">
                    <div class="style-cell">
                      <el-image :src="row.image" fit="cover" class="style-image" />
                      <div>
                        <strong>{{ row.name }}</strong>
                        <div class="tag-row">
                          <el-tag size="small">{{ row.season }}</el-tag>
                          <el-tag size="small">{{ row.style }}</el-tag>
                          <el-tag size="small">{{ row.type }}</el-tag>
                          <el-tag size="small">{{ row.shape }}</el-tag>
                        </div>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="personalScore" label="个性化分" width="110" />
                <el-table-column prop="comboScore" label="组合偏好分" width="120" />
                <el-table-column prop="baseScore" label="基础分" width="90" />
                <el-table-column prop="finalScore" label="最终分" width="90" />
                <el-table-column label="模拟行为" width="290">
                  <template #default="{ row }">
                    <el-space wrap>
                      <el-button link type="primary" @click="simulateBehavior(row, 'view_detail')">查看</el-button>
                      <el-button link type="primary" @click="simulateBehavior(row, 'add_tryon')">加试戴</el-button>
                      <el-button link type="primary" @click="simulateBehavior(row, 'normal_tryon')">普通试戴</el-button>
                      <el-button link type="warning" @click="simulateBehavior(row, 'realistic_tryon')">超仿真</el-button>
                      <el-button link type="warning" @click="simulateBehavior(row, 'want_do')">我想做</el-button>
                      <el-button link type="danger" @click="simulateBehavior(row, 'confirm_do')">确认做</el-button>
                      <el-button link type="info" @click="simulateBehavior(row, 'remove_tryon')">移除</el-button>
                    </el-space>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>

          <el-col :span="10">
            <el-card shadow="never" class="panel">
              <template #header>
                <div class="card-header">
                  <span>本次会话即时偏好</span>
                  <el-tag type="info">session profile</el-tag>
                </div>
              </template>
              <div class="session-grid">
                <div v-for="item in sessionTopTags" :key="item.title" class="session-card">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.items.join(' / ') || '当前会话暂无明显偏好' }}</p>
                </div>
              </div>
            </el-card>

            <el-card shadow="never" class="panel">
              <template #header>
                <div class="card-header">
                  <span>模拟行为日志</span>
                  <el-button text type="primary" @click="resetMockState">恢复初始模拟</el-button>
                </div>
              </template>
              <div class="log-list">
                <div v-for="log in recentLogs" :key="log.id" class="log-item">
                  <div class="log-head">
                    <el-tag size="small" :type="logType(log.behaviorType)">{{ log.behaviorType }}</el-tag>
                    <span>{{ formatTime(log.timestamp) }}</span>
                  </div>
                  <strong>{{ itemNameMap[log.itemId] || log.itemId }}</strong>
                  <p>{{ log.itemSnapshot.style }} / {{ log.itemSnapshot.type }} / {{ log.itemSnapshot.shape }}</p>
                </div>
              </div>
            </el-card>

            <el-card shadow="never" class="panel">
              <template #header>
                <span>Top 推荐摘要</span>
              </template>
              <div class="recommend-summary">
                <div v-for="item in rankedItems.slice(0, 5)" :key="item.id" class="recommend-item">
                  <div>
                    <strong>{{ item.name }}</strong>
                    <p>{{ item.style }} / {{ item.type }} / {{ item.shape }}</p>
                  </div>
                  <span>{{ Math.round(item.finalScore * 100) }} 分</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="用户反馈数据（总体）" name="feedback">
        <el-alert
          title="这里展示的是总体问题反馈，不是用户喜好反馈。只有 recommendation 类中的少数反馈可以进入推荐纠偏。"
          type="warning"
          :closable="false"
          class="feedback-alert"
        />

        <el-row :gutter="16" class="stat-row">
          <el-col :span="6" v-for="item in feedbackStatCards" :key="item.label">
            <el-card shadow="never" class="stat-card">
              <div class="stat-label">{{ item.label }}</div>
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-desc">{{ item.desc }}</div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="14">
            <el-card shadow="never" class="panel">
              <template #header>
                <div class="card-header">
                  <span>反馈分类分布</span>
                  <el-tag type="info">{{ feedbackOverview.total }} 条</el-tag>
                </div>
              </template>
              <div class="category-list">
                <div v-for="item in feedbackCategoryStats" :key="item.feedbackType" class="category-item">
                  <div class="category-main">
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.count }} 条 / {{ item.percentage }}%</span>
                  </div>
                  <el-progress :percentage="item.percentage" :stroke-width="10" />
                  <div class="category-sub">高优先级 {{ item.highSeverity }} 条</div>
                </div>
              </div>
            </el-card>

            <el-card shadow="never" class="panel">
              <template #header>
                <span>版本趋势</span>
              </template>
              <el-table :data="versionTrendStats" style="width: 100%">
                <el-table-column prop="appVersion" label="版本" width="90" />
                <el-table-column prop="total" label="总反馈" width="90" />
                <el-table-column prop="tryonEffect" label="试戴效果" width="90" />
                <el-table-column prop="recommendation" label="推荐问题" width="90" />
                <el-table-column prop="styleContent" label="内容问题" width="90" />
                <el-table-column prop="performance" label="性能问题" width="90" />
                <el-table-column label="重点变化" min-width="220">
                  <template #default="{ row }">
                    <div class="version-highlights">
                      <span>位置不准 {{ row.nailPositionWrong }}</span>
                      <span>生成慢 {{ row.generationTooSlow }}</span>
                      <span>太重复 {{ row.tooRepetitive }}</span>
                      <span>错标签 {{ row.wrongTag }}</span>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <el-card shadow="never" class="panel">
              <template #header>
                <span>近期问题反馈记录</span>
              </template>
              <el-table :data="recentFeedbackRecords" style="width: 100%">
                <el-table-column label="时间" width="160">
                  <template #default="{ row }">
                    {{ formatTime(row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="问题" min-width="180">
                  <template #default="{ row }">
                    <div>
                      <strong>{{ feedbackCodeLabel(row.feedbackCode) }}</strong>
                      <p class="tiny">{{ feedbackTypeLabel(row.feedbackType) }} / {{ sourcePageLabel(row.sourcePage) }}</p>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="版本" width="90" prop="appVersion" />
                <el-table-column label="优先级" width="90">
                  <template #default="{ row }">
                    <el-tag :type="severityTagType(row.severity)" size="small">{{ severityLabel(row.severity) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="90">
                  <template #default="{ row }">
                    <el-tag size="small" effect="plain">{{ statusLabel(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="说明" min-width="220" prop="feedbackText" />
              </el-table>
            </el-card>
          </el-col>

          <el-col :span="10">
            <el-card shadow="never" class="panel">
              <template #header>
                <span>三条反馈流向</span>
              </template>
              <div class="pipeline-list">
                <div v-for="item in pipelineStats" :key="item.key" class="pipeline-item">
                  <strong>{{ item.label }}</strong>
                  <div class="pipeline-count">{{ item.count }} 条</div>
                  <p>{{ item.desc }}</p>
                </div>
              </div>
            </el-card>

            <el-card shadow="never" class="panel">
              <template #header>
                <span>Top 问题码</span>
              </template>
              <div class="issue-list">
                <div v-for="(item, index) in topIssueCodes" :key="item.feedbackCode" class="issue-item">
                  <div class="issue-rank">{{ index + 1 }}</div>
                  <div class="issue-main">
                    <strong>{{ item.label }}</strong>
                    <p>{{ item.feedbackTypeLabel }} / 平均评分 {{ item.avgRating }}</p>
                  </div>
                  <span>{{ item.count }} 条</span>
                </div>
              </div>
            </el-card>

            <el-card shadow="never" class="panel">
              <template #header>
                <span>来源页面分布</span>
              </template>
              <div class="source-list">
                <div v-for="item in sourcePageStats" :key="item.sourcePage" class="source-item">
                  <span>{{ item.label }}</span>
                  <span>{{ item.count }} 条 / {{ item.percentage }}%</span>
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
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
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
import { buildProfileFromLogs, calculateTagProbabilities, recordUserBehavior } from '@/services/userProfileService'
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
const rankedItems = computed(() => rankItemsForUser(mockNailItems, profile.value, filter.value))
const recentLogs = computed(() => [...logs.value].slice(-12).reverse())

const feedbackOverview = computed(() => getFeedbackOverview(mockFeedbackRecords))
const feedbackCategoryStats = computed(() => getFeedbackCategoryStats(mockFeedbackRecords))
const topIssueCodes = computed(() => getTopIssueCodes(mockFeedbackRecords))
const versionTrendStats = computed(() => getVersionTrendStats(mockFeedbackRecords))
const sourcePageStats = computed(() => getSourcePageStats(mockFeedbackRecords))
const pipelineStats = computed(() => getPipelineStats(mockFeedbackRecords))
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

function severityTagType(value) {
  if (value === 'high') return 'danger'
  if (value === 'medium') return 'warning'
  return 'info'
}
</script>

<style scoped>
.page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.user-tabs {
  margin-top: 8px;
}

.stat-row {
  margin-bottom: 16px;
}

.stat-card,
.panel {
  border-radius: 14px;
}

.stat-label {
  color: #6b7280;
  font-size: 13px;
}

.stat-value {
  margin: 10px 0 8px;
  font-size: 28px;
  font-weight: 700;
}

.stat-desc {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.style-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.style-image {
  width: 54px;
  height: 54px;
  border-radius: 10px;
  flex: 0 0 auto;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.session-grid,
.cohort-grid {
  display: grid;
  gap: 12px;
}

.session-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cohort-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.session-card,
.cohort-card,
.pipeline-item {
  padding: 14px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fafafa;
}

.cohort-title {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.session-card p,
.cohort-card p,
.pipeline-item p,
.recommend-item p,
.feedback-alert,
.tiny {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.log-list,
.recommend-summary,
.issue-list,
.category-list,
.source-list,
.pipeline-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item,
.recommend-item,
.issue-item,
.category-item,
.source-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
}

.log-head,
.category-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.recommend-item,
.issue-item,
.source-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.issue-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #111827;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  flex: 0 0 auto;
}

.issue-main {
  flex: 1;
}

.pipeline-count {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
}

.category-sub {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

.version-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #606266;
  font-size: 12px;
}

.feedback-alert {
  margin-bottom: 16px;
}
</style>
