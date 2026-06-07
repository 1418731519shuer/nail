<template>
  <div class="ops-agent-page">
    <div class="page-header">
      <h2>AI 运营助手原子操作系统</h2>
      <p>自然语言会被拆成已注册原子操作。写操作先预览，再确认，再执行并写审计日志。</p>
    </div>

    <section class="agent-workbench">
      <div class="agent-input-panel">
        <div class="section-title">
          <span>运营输入</span>
          <el-tag type="info">Mock 数据模式</el-tag>
        </div>

        <div class="data-window">
          <el-tag type="info">{{ trendRangeText }}</el-tag>
          <el-tag type="success">{{ styleOptions.length }} 款同源样本</el-tag>
          <el-tag v-if="trendStyleMeta" type="warning">
            {{ trendStyleMeta.styleName }} · {{ latestTrendLabel }}
          </el-tag>
        </div>

        <el-input
          v-model="input"
          type="textarea"
          :rows="4"
          placeholder="例如：把最近冷掉的款下架，但猫眼不要动。"
          @keyup.ctrl.enter="run"
        />

        <div class="quick-list">
          <el-button v-for="item in quickQuestions" :key="item" round size="small" @click="ask(item)">
            {{ item }}
          </el-button>
        </div>

        <div class="toolbar">
          <el-select v-model="selectedStyleId" placeholder="分析款式" size="small" filterable>
            <el-option
              v-for="item in styleOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
          <el-button type="primary" :loading="loading" @click="run">生成计划</el-button>
        </div>
      </div>

      <div v-if="result" class="plan-panel">
        <div class="section-title">
          <span>任务计划</span>
          <el-tag :type="riskType(result.plan.riskLevel)">{{ riskName(result.plan.riskLevel) }}</el-tag>
        </div>

        <div class="plan-meta">
          <span>意图：{{ intentName(result.plan.intentType) }}</span>
          <span>需要确认：{{ result.plan.needConfirm ? '是' : '否' }}</span>
          <span>二次确认：{{ result.plan.needSecondConfirm ? '是' : '否' }}</span>
        </div>

        <div v-if="protectedConditions.length" class="protected-box">
          保护条件：{{ protectedConditions.join('、') }}
        </div>

        <ol class="operation-list">
          <li v-for="item in result.plan.plan" :key="item.step">
            <strong>{{ item.operation }}</strong>
            <span>{{ item.reason }}</span>
          </li>
        </ol>
      </div>
    </section>

    <section v-if="result" class="analysis-grid">
      <div class="analysis-main">
        <div class="section-title">
          <span>{{ result.analysis.title }}</span>
          <el-tag>{{ responseName(result.plan.finalResponseType) }}</el-tag>
        </div>

        <p class="conclusion">{{ result.analysis.conclusion }}</p>

        <div class="info-columns">
          <div>
            <h3>数据依据</h3>
            <ul>
              <li v-for="item in result.analysis.evidence" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div>
            <h3>推荐动作</h3>
            <ul>
              <li v-for="item in result.analysis.actions" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>

        <div class="sample-note">
          <span>样本判断：{{ result.analysis.sampleStatus }}</span>
          <span>下一步：{{ result.analysis.nextStep }}</span>
        </div>
      </div>

      <div class="side-panel">
        <div class="section-title">
          <span>操作预览</span>
          <el-button v-if="result.preview" size="small" @click="previewDialog = true">查看详情</el-button>
        </div>

        <template v-if="result.preview">
          <h3>{{ result.preview.title }}</h3>
          <p>{{ result.preview.summary }}</p>

          <div class="target-list">
            <el-tag v-for="target in result.preview.targets" :key="target.targetId" type="warning">
              {{ target.targetName || target.targetId }}
            </el-tag>
          </div>

          <div v-if="result.approval" class="approval-box">
            <span>确认单：{{ result.approval.approvalId }}</span>
            <strong>{{ approvalStatusName(result.approval.status) }}</strong>
          </div>

          <div v-if="result.approval" class="approval-actions">
            <el-input
              v-if="result.preview.secondConfirmRequired"
              v-model="confirmText"
              size="small"
              placeholder="请输入：确认执行"
            />
            <el-button @click="rejectCurrent">取消</el-button>
            <el-button type="danger" @click="approveCurrent">
              {{ result.preview.secondConfirmRequired ? '确认执行' : '确认' }}
            </el-button>
          </div>
        </template>

        <el-empty v-else description="当前任务没有写操作预览" />
      </div>
    </section>

    <section v-if="reportSections.length" class="report-panel">
      <div class="section-title">
        <span>报告分段</span>
        <el-tag type="success">建议不会自动执行</el-tag>
      </div>

      <div class="report-grid">
        <article v-for="section in reportSections" :key="section.title" class="report-section">
          <h3>{{ section.title }}</h3>
          <ul>
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="log-panel">
      <div class="section-title">
        <span>最近 AI 操作日志</span>
        <el-button text @click="refreshLogs">刷新</el-button>
      </div>

      <el-table :data="logs" empty-text="暂无执行日志" size="small">
        <el-table-column prop="createdAt" label="时间" min-width="170" />
        <el-table-column prop="operationName" label="操作" min-width="150" />
        <el-table-column prop="riskLevel" label="风险" width="100" />
        <el-table-column prop="result" label="结果" width="100" />
        <el-table-column label="对象" min-width="220">
          <template #default="{ row }">
            {{ row.targets.map((item) => item.targetName || item.targetId).join('、') }}
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="previewDialog" title="操作预览详情" width="760px">
      <template v-if="result?.preview">
        <div class="preview-detail">
          <p><strong>操作：</strong>{{ result.preview.operationName }}</p>
          <p><strong>风险：</strong>{{ riskName(result.preview.riskLevel) }}</p>
          <p><strong>影响：</strong>{{ result.preview.impact.join('；') }}</p>
          <h3>Before</h3>
          <pre>{{ JSON.stringify(result.preview.before, null, 2) }}</pre>
          <h3>After</h3>
          <pre>{{ JSON.stringify(result.preview.after, null, 2) }}</pre>
          <h3>原因</h3>
          <ul>
            <li v-for="item in result.preview.reasons" :key="item">{{ item }}</li>
          </ul>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { approveAndExecuteOperation, executeAgentRequest, getAuditLogs, rejectApproval } from '@/agent/agent-executor'
import { getStyleManagementRows } from '@/agent/mock-data'

const quickQuestions = [
  '这个款热门不热门？',
  '最近 7 天哪些款变热？',
  '把最近冷掉的款下架，但猫眼不要动。',
  '首页前 8 款怎么排？',
  '爬取到的新款哪些能上架？',
  '帮我把这个款介绍改得更适合小红书。',
  '生成今日运营报告。',
  '生成本周运营周报。',
  '首页推荐位今天表现怎么样？',
  '下周应该上什么新款？',
  '按今日报告建议执行。'
]

const input = ref('生成今日运营报告。')
const selectedStyleId = ref('')
const loading = ref(false)
const result = ref(null)
const logs = ref(getAuditLogs())
const chatHistory = ref([])
const previewDialog = ref(false)
const confirmText = ref('')
const styleOptions = ref([])
const trendOverview = ref({ dateRange: {}, hotStyles: [], coldStyles: [], potentialStyles: [] })

const protectedConditions = computed(() => result.value?.plan.objects.protectedConditions || [])
const reportSections = computed(() => result.value?.analysis.reportSections || [])
const trendRangeText = computed(() => {
  const range = trendOverview.value?.dateRange || {}
  if (!range.startDate || !range.endDate) return '120 天同源模拟窗口准备中...'
  return `${range.startDate} ~ ${range.endDate} · ${range.days || 120} 天`
})

const trendStyleMeta = computed(() => {
  const rows = [
    ...(trendOverview.value?.hotStyles || []),
    ...(trendOverview.value?.coldStyles || []),
    ...(trendOverview.value?.potentialStyles || [])
  ]
  return rows.find((item) => item.id === selectedStyleId.value) || null
})

const latestTrendLabel = computed(() => trendStyleMeta.value?.label || '趋势待观察')

async function bootstrapOptions() {
  styleOptions.value = getStyleManagementRows().slice(0, 80).map((item) => ({ id: item.id, name: item.name }))
  if (!selectedStyleId.value && styleOptions.value.length) {
    selectedStyleId.value = styleOptions.value[0].id
  }

  try {
    const response = await fetch('/api/xhs-trend-overview')
    const data = await response.json()
    if (response.ok) {
      trendOverview.value = data
    }
  } catch (error) {
    console.warn('[ai-assistant] trend overview unavailable', error)
  }
}

function ask(text) {
  input.value = text
  run()
}

async function run() {
  const text = input.value.trim()
  if (!text) return

  loading.value = true
  try {
    // 先尝试调用 DeepSeek 真实 API
    const dsResult = await callDeepSeek(text)
    if (dsResult) {
      result.value = dsResult
    } else {
      // 降级：本地规则引擎
      result.value = executeAgentRequest(text, {
        selectedStyleId: selectedStyleId.value,
        today: new Date().toISOString().slice(0, 10)
      })
    }
    confirmText.value = ''
    logs.value = result.value.auditLogs
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

async function callDeepSeek(text) {
  try {
    const { buildDeepSeekToolContract } = await import('@/agent/deepseek-tool-contract')
    const res = await fetch('/api/ops-deepseek-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.value,
        plannerMode: true,
        operationCatalog: buildDeepSeekToolContract(),
        opsContext: {
          selectedStyleId: selectedStyleId.value,
          today: new Date().toISOString().slice(0, 10),
          storeId: 'nail-store-001'
        }
      })
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) { ElMessage.warning('DeepSeek：' + data.error); return null }

    // 把 AI 回复加入对话历史
    chatHistory.value = [
      ...chatHistory.value.slice(-6),
      { role: 'user', content: text },
      { role: 'assistant', content: JSON.stringify(data) }
    ]

    // 用 AI 返回的 plan 包装成 agentResult 格式
    return executeAgentRequest(text, {
      selectedStyleId: selectedStyleId.value,
      today: new Date().toISOString().slice(0, 10)
    }, data)
  } catch {
    return null
  }
}

function approveCurrent() {
  if (!result.value?.approval) return

  try {
    const executed = approveAndExecuteOperation(result.value.approval.approvalId, confirmText.value)
    result.value.approval = executed.approval
    logs.value = executed.logs
    ElMessage.success('已执行，并写入审计日志')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function rejectCurrent() {
  if (!result.value?.approval) return

  try {
    result.value.approval = rejectApproval(result.value.approval.approvalId)
    ElMessage.info('已取消该确认单')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function refreshLogs() {
  logs.value = getAuditLogs()
}

function riskType(level) {
  return { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' }[level] || 'info'
}

function riskName(level) {
  return { low: '低风险', medium: '中风险', high: '高风险', critical: '极高风险' }[level] || level
}

function intentName(intent) {
  return { query: '查询', analysis: '分析', generate: '生成', execute: '执行', report: '报告' }[intent] || intent
}

function responseName(type) {
  return {
    data_answer: '数据回答',
    analysis_report: '分析报告',
    generation_result: '生成结果',
    operation_preview: '操作预览',
    approval_required: '需要确认',
    daily_report: '今日报告',
    weekly_report: '周报',
    anomaly_report: '异常报告',
    feed_report: '推荐位报告',
    selection_report: '选品报告'
  }[type] || type
}

function approvalStatusName(status) {
  return {
    pending: '待确认',
    approved: '已批准',
    rejected: '已拒绝',
    executed: '已执行',
    expired: '已过期'
  }[status] || status
}

onMounted(async () => {
  await bootstrapOptions()
})
</script>

<style scoped>
.ops-agent-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.agent-workbench,
.analysis-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.88fr) minmax(360px, 1.12fr);
  gap: 16px;
}

.agent-input-panel,
.plan-panel,
.analysis-main,
.side-panel,
.report-panel,
.log-panel {
  padding: 18px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.section-title,
.toolbar,
.plan-meta,
.sample-note,
.approval-box,
.approval-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title {
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 700;
  color: #303133;
}

.quick-list,
.target-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.toolbar {
  justify-content: space-between;
  margin-top: 14px;
}

.plan-meta {
  flex-wrap: wrap;
  color: #606266;
  font-size: 13px;
}

.protected-box {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #8a5a00;
  background: #fff7e6;
}

.operation-list {
  margin: 14px 0 0;
  padding-left: 20px;
}

.operation-list li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.operation-list strong {
  display: block;
  color: #303133;
}

.operation-list span,
.conclusion,
.side-panel p,
.sample-note {
  color: #606266;
  line-height: 1.7;
}

.info-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 16px;
}

.info-columns h3,
.side-panel h3,
.report-section h3,
.preview-detail h3 {
  margin: 0 0 8px;
  font-size: 15px;
  color: #303133;
}

ul {
  margin: 0;
  padding-left: 18px;
}

li {
  margin-bottom: 6px;
  line-height: 1.55;
}

.sample-note {
  flex-direction: column;
  align-items: flex-start;
  margin-top: 14px;
  padding: 12px;
  border-radius: 8px;
  background: #f7f8fa;
}

.approval-box {
  justify-content: space-between;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f5f7fa;
}

.approval-actions {
  justify-content: flex-end;
  margin-top: 12px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.report-section {
  min-height: 130px;
  padding: 14px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fbfcfe;
}

.preview-detail pre {
  max-height: 220px;
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: #f6f8fa;
  font-size: 12px;
}

.data-window {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 12px;
}

@media (max-width: 1080px) {
  .agent-workbench,
  .analysis-grid,
  .info-columns,
  .report-grid {
    grid-template-columns: 1fr;
  }
}
</style>
