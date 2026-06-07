<template>
  <div class="ops-agent-page">
    <div class="page-header">
      <h2>AI 运营助手</h2>
      <p>用自然语言驱动运营操作。写操作先预览，再确认，再执行。</p>
    </div>

    <section class="agent-workbench">
      <div class="agent-input-panel">
        <div class="section-title">
          <span>告诉我你想做什么</span>
          <el-tag type="info" size="small">Mock 数据模式</el-tag>
        </div>

        <div class="data-window">
          <span class="data-chip">{{ trendRangeText }}</span>
          <span class="data-chip accent">{{ styleOptions.length }} 款同源样本</span>
          <span v-if="trendStyleMeta" class="data-chip warm">{{ trendStyleMeta.styleName }} · {{ latestTrendLabel }}</span>
        </div>

        <el-input
          v-model="input"
          type="textarea"
          :rows="5"
          placeholder="例如：把最近冷掉的款下架，但猫眼不要动。"
          @keyup.ctrl.enter="run"
          class="ai-input"
        />

        <div class="quick-list">
          <button v-for="item in quickQuestions" :key="item" class="quick-chip" @click="ask(item)">
            {{ item }}
          </button>
        </div>

        <div class="toolbar">
          <el-select v-model="selectedStyleId" placeholder="分析款式" filterable class="style-select">
            <el-option
              v-for="item in styleOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
          <el-button type="primary" :loading="loading" @click="run" class="run-btn">生成计划</el-button>
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
    const dsResult = await callDeepSeek(text)
    if (dsResult) {
      ElMessage.success('DeepSeek AI 已响应')
      result.value = dsResult
    } else {
      ElMessage.info('DeepSeek 未响应，使用本地规则')
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

    // 服务端 plannerMode=true 时返回 { toolPlan: {...} }
    const toolPlan = data.toolPlan || data
    if (!toolPlan?.intentType) return null   // 格式不对则降级

    // 把 AI 回复加入对话历史
    chatHistory.value = [
      ...chatHistory.value.slice(-6),
      { role: 'user', content: text },
      { role: 'assistant', content: JSON.stringify(toolPlan) }
    ]

    // 用 toolPlan 驱动 agentResult
    return executeAgentRequest(text, {
      selectedStyleId: selectedStyleId.value,
      today: new Date().toISOString().slice(0, 10)
    }, toolPlan)
  } catch (e) {
    console.error('[DeepSeek] 调用失败:', e?.message || e)
    ElMessage.warning('[DeepSeek] ' + (e?.message || '请求失败，已降级'))
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
/* ── 页面容器 ── */
.ops-agent-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── 双栏布局 ── */
.agent-workbench,
.analysis-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.88fr) minmax(360px, 1.12fr);
  gap: 16px;
  align-items: start;
}

/* ── 面板卡片：对齐全局 el-card 风格 ── */
.agent-input-panel,
.plan-panel,
.analysis-main,
.side-panel,
.report-panel {
  padding: 20px 22px;
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  background: var(--surface);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow: var(--shadow-md);
  transition: box-shadow var(--dur-base) var(--ease-out-quart);
}
.agent-input-panel:hover,
.plan-panel:hover,
.analysis-main:hover,
.side-panel:hover {
  box-shadow: var(--shadow-lg);
}

/* ── 区块标题 ── */
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.01em;
}

/* ── 数据窗口标签 ── */
.data-window {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.data-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: var(--text-xs);
  font-weight: 500;
  background: rgba(201,122,78,0.07);
  color: var(--ink-2);
  border: 1px solid var(--border);
}
.data-chip.accent { background: rgba(201,122,78,0.12); color: var(--accent-dark); border-color: rgba(201,122,78,0.22); }
.data-chip.warm   { background: var(--pink-light); color: #b5516a; border-color: rgba(232,120,153,0.25); }

/* ── 输入框强化 ── */
.ai-input :deep(.el-textarea__inner) {
  font-size: var(--text-sm);
  line-height: 1.7;
  color: var(--ink);
  background: rgba(253,245,238,0.6);
  border-color: var(--border);
  border-radius: var(--r-md);
  padding: 12px 14px;
  resize: none;
  transition: background var(--dur-base) var(--ease-out-quart), border-color var(--dur-base) var(--ease-out-quart);
}
.ai-input :deep(.el-textarea__inner:focus) {
  background: rgba(255,255,255,0.9);
  border-color: var(--accent);
}

/* ── 快捷问题胶囊 ── */
.quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
  margin-bottom: 2px;
}

.quick-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.72);
  color: var(--ink-2);
  font-size: var(--text-xs);
  font-family: inherit;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-out-quart),
    border-color var(--dur-fast) var(--ease-out-quart),
    color var(--dur-fast) var(--ease-out-quart);
}
.quick-chip:hover {
  background: var(--accent-light);
  border-color: rgba(201,122,78,0.35);
  color: var(--accent-dark);
}

/* ── 底部工具栏 ── */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 16px;
}
.style-select { flex: 1; }

/* ── 任务计划 ── */
.plan-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  color: var(--ink-3);
  font-size: var(--text-sm);
  margin-bottom: 12px;
}
.plan-meta span { display: flex; align-items: center; gap: 4px; }

.protected-box {
  margin: 12px 0;
  padding: 10px 14px;
  border-radius: var(--r-md);
  color: #8a5a00;
  background: rgba(212,168,67,0.10);
  border: 1px solid rgba(212,168,67,0.25);
  font-size: var(--text-sm);
}

.operation-list {
  margin: 14px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.operation-list li { list-style: none; margin: 0; padding: 10px 14px; background: rgba(201,122,78,0.05); border: 1px solid var(--border); border-radius: var(--r-md); }
.operation-list strong { display: block; color: var(--ink); font-size: var(--text-sm); margin-bottom: 3px; }
.operation-list span { color: var(--ink-3); font-size: var(--text-xs); line-height: 1.5; }

/* ── 分析区 ── */
.conclusion {
  color: var(--ink-2);
  line-height: 1.7;
  font-size: var(--text-sm);
  margin-bottom: 4px;
}

.info-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.info-columns h3,
.side-panel h3,
.report-section h3,
.preview-detail h3 {
  margin: 0 0 8px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--ink);
}

ul { margin: 0; padding-left: 16px; }
li { margin-bottom: 6px; line-height: 1.55; color: var(--ink-2); font-size: var(--text-sm); }

.sample-note {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: rgba(201,122,78,0.05);
  border: 1px solid var(--border);
  color: var(--ink-3);
  font-size: var(--text-xs);
}

/* ── 操作预览侧栏 ── */
.side-panel p { color: var(--ink-2); font-size: var(--text-sm); line-height: 1.65; }

.target-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}

.approval-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: var(--r-md);
  background: rgba(201,122,78,0.05);
  border: 1px solid var(--border);
  font-size: var(--text-sm);
  color: var(--ink-2);
}
.approval-box strong { color: var(--accent); font-weight: 700; }

.approval-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

/* ── 报告分段 ── */
.report-panel { margin-top: 0; }

.report-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.report-section {
  min-height: 120px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: rgba(253,245,238,0.5);
}
.report-section h3 { color: var(--ink); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 10px; }

/* ── 预览弹窗 ── */
.preview-detail pre {
  max-height: 220px;
  overflow: auto;
  padding: 12px;
  border-radius: var(--r-md);
  background: rgba(201,122,78,0.05);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--ink-2);
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
