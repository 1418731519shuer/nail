<template>
  <div class="ai-chat-page">

    <!-- ── 滚动消息区 ── -->
    <div ref="chatBodyRef" class="chat-body">

      <!-- 欢迎态（无结果时） -->
      <div v-if="!result && !loading" class="chat-welcome">
        <div class="welcome-badge">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"
              fill="currentColor" opacity="0.9"/>
          </svg>
        </div>
        <h2 class="welcome-title">今天想做什么？</h2>
        <p class="welcome-sub">描述你的运营目标，我来拆解执行计划。</p>

        <div class="welcome-chips">
          <button v-for="item in quickQuestions" :key="item" class="welcome-chip" @click="ask(item)">
            {{ item }}
          </button>
        </div>
      </div>

      <!-- 加载态 -->
      <div v-if="loading" class="chat-loading">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <p>正在生成计划…</p>
      </div>

      <!-- 结果区 -->
      <template v-if="result && !loading">
        <!-- 用户消息气泡 -->
        <div class="msg-row user">
          <div class="msg-bubble user">{{ lastInput }}</div>
        </div>

        <!-- AI 回复 -->
        <div class="msg-row assistant">
          <div class="msg-avatar">AI</div>
          <div class="msg-content">

            <!-- 任务计划 -->
            <div class="result-card">
              <div class="result-card-head">
                <span class="result-card-title">任务计划</span>
                <el-tag :type="riskType(result.plan.riskLevel)" size="small">{{ riskName(result.plan.riskLevel) }}</el-tag>
                <el-tag size="small">{{ intentName(result.plan.intentType) }}</el-tag>
              </div>

              <div class="plan-meta-row">
                <span>需要确认：{{ result.plan.needConfirm ? '是' : '否' }}</span>
                <span>二次确认：{{ result.plan.needSecondConfirm ? '是' : '否' }}</span>
              </div>

              <div v-if="protectedConditions.length" class="protected-box">
                🔒 保护条件：{{ protectedConditions.join('、') }}
              </div>

              <ol class="operation-list">
                <li v-for="item in result.plan.plan" :key="item.step">
                  <strong>{{ item.operation }}</strong>
                  <span>{{ item.reason }}</span>
                </li>
              </ol>
            </div>

            <!-- 分析报告 -->
            <div class="result-card">
              <div class="result-card-head">
                <span class="result-card-title">{{ result.analysis.title }}</span>
                <el-tag size="small">{{ responseName(result.plan.finalResponseType) }}</el-tag>
              </div>

              <p class="conclusion">{{ result.analysis.conclusion }}</p>

              <div class="info-columns">
                <div class="info-col">
                  <h4>数据依据</h4>
                  <ul>
                    <li v-for="item in result.analysis.evidence" :key="item">{{ item }}</li>
                  </ul>
                </div>
                <div class="info-col">
                  <h4>推荐动作</h4>
                  <ul>
                    <li v-for="item in result.analysis.actions" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>

              <div class="sample-note">
                <span>样本：{{ result.analysis.sampleStatus }}</span>
                <span>下一步：{{ result.analysis.nextStep }}</span>
              </div>
            </div>

            <!-- 操作预览 -->
            <div v-if="result.preview" class="result-card">
              <div class="result-card-head">
                <span class="result-card-title">操作预览</span>
                <el-button size="small" text @click="previewDialog = true">查看详情</el-button>
              </div>

              <h4>{{ result.preview.title }}</h4>
              <p class="preview-summary">{{ result.preview.summary }}</p>

              <div class="target-list">
                <el-tag v-for="target in result.preview.targets" :key="target.targetId" type="warning" size="small">
                  {{ target.targetName || target.targetId }}
                </el-tag>
              </div>

              <div v-if="result.approval" class="approval-box">
                <div class="approval-meta">
                  <span>确认单 {{ result.approval.approvalId }}</span>
                  <strong>{{ approvalStatusName(result.approval.status) }}</strong>
                </div>
                <div class="approval-actions">
                  <el-input
                    v-if="result.preview.secondConfirmRequired"
                    v-model="confirmText"
                    size="small"
                    placeholder="请输入：确认执行"
                    class="confirm-input"
                  />
                  <el-button @click="rejectCurrent">取消</el-button>
                  <el-button type="danger" @click="approveCurrent">
                    {{ result.preview.secondConfirmRequired ? '确认执行' : '确认' }}
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 报告分段 -->
            <div v-if="reportSections.length" class="result-card">
              <div class="result-card-head">
                <span class="result-card-title">报告分段</span>
                <el-tag type="success" size="small">建议不会自动执行</el-tag>
              </div>
              <div class="report-grid">
                <article v-for="section in reportSections" :key="section.title" class="report-section">
                  <h4>{{ section.title }}</h4>
                  <ul>
                    <li v-for="item in section.items" :key="item">{{ item }}</li>
                  </ul>
                </article>
              </div>
            </div>

          </div>
        </div>
      </template>
    </div>

    <!-- ── 底部输入栏 ── -->
    <div class="chat-input-bar">
      <div class="input-wrap">
        <div class="input-box">
          <!-- textarea -->
          <el-input
            v-model="input"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 5 }"
            placeholder="描述你的运营目标，Ctrl+Enter 发送"
            class="ai-textarea"
            @keydown.ctrl.enter="run"
          />

          <!-- 发送按钮 -->
          <el-button type="primary" :loading="loading" class="send-btn" @click="run">
            <svg v-if="!loading" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </el-button>
        </div>

        <div class="input-meta">

          <span class="input-hint">Ctrl + Enter 发送</span>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewDialog" title="操作预览详情" width="760px">
      <template v-if="result?.preview">
        <div class="preview-detail">
          <p><strong>操作：</strong>{{ result.preview.operationName }}</p>
          <p><strong>风险：</strong>{{ riskName(result.preview.riskLevel) }}</p>
          <p><strong>影响：</strong>{{ result.preview.impact.join('；') }}</p>
          <h4>Before</h4>
          <pre>{{ JSON.stringify(result.preview.before, null, 2) }}</pre>
          <h4>After</h4>
          <pre>{{ JSON.stringify(result.preview.after, null, 2) }}</pre>
          <h4>原因</h4>
          <ul>
            <li v-for="item in result.preview.reasons" :key="item">{{ item }}</li>
          </ul>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { approveAndExecuteOperation, executeAgentRequest, rejectApproval } from '@/agent/agent-executor'
import { useOpsData } from '@/composables/useOpsData'

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

const input = ref('')
const lastInput = ref('')
const loading = ref(false)
const result = ref(null)
const chatHistory = ref([])
const previewDialog = ref(false)
const confirmText = ref('')
const chatBodyRef = ref(null)
const { ensureOpsData } = useOpsData()

const protectedConditions = computed(() => result.value?.plan.objects.protectedConditions || [])
const reportSections = computed(() => result.value?.analysis.reportSections || [])


function ask(text) {
  input.value = text
  run()
}

async function scrollBottom() {
  await nextTick()
  if (chatBodyRef.value) chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
}

async function run() {
  const text = input.value.trim()
  if (!text) return
  lastInput.value = text
  loading.value = true
  result.value = null
  await scrollBottom()
  try {
    const dsResult = await callDeepSeek(text)
    if (dsResult) {
      ElMessage.success('DeepSeek AI 已响应')
      result.value = dsResult
    } else {
      ElMessage.info('DeepSeek 未响应，使用本地规则')
      result.value = executeAgentRequest(text, { today: new Date().toISOString().slice(0, 10) })
    }
    confirmText.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
    await scrollBottom()
  }
}

async function callDeepSeek(text) {
  try {
    const opsData = await ensureOpsData()
    const res = await fetch('/api/ops-deepseek-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.value.slice(-6).map(m => ({ role: m.role, content: m.content })),
        plannerMode: false,
        opsContext: {
          currentPage: '/ai-assistant',
          currentStoreId: 'store-001',
          totals: opsData?.metrics?.totals || {},
          todayStats: opsData?.todayStats || {},
          hotStyles: (opsData?.hotStyles || []).slice(0, 8).map(s => ({ id: s.id, name: s.name, hotIndex: s.hotIndex, confirmRate: s.confirmRate, trend: s.trend })),
          coldStyles: (opsData?.coldStyles || []).slice(0, 8).map(s => ({ id: s.id, name: s.name, coldRisk: s.coldRisk, trend: s.trend })),
          potentialStyles: (opsData?.potentialStyles || []).slice(0, 6).map(s => ({ id: s.id, name: s.name, growthScore: s.growthScore })),
          recommendList: (opsData?.recommendList || []).slice(0, 8).map(s => ({ position: s.position, styleName: s.style?.name, slotType: s.slotType })),
          modelReport: opsData?.modelReport || null
        }
      })
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) { ElMessage.warning('DeepSeek：' + data.error); return null }
    chatHistory.value = [
      ...chatHistory.value.slice(-6),
      { role: 'user', content: text },
      { role: 'assistant', content: typeof data.reply === 'string' ? data.reply : JSON.stringify(data) }
    ]
    // advisor 模式返回 { reply, actions }，包装成页面可渲染的结构
    return executeAgentRequest(text, { today: new Date().toISOString().slice(0, 10) }, data)
  } catch (e) {
    console.error('[DeepSeek] 调用失败:', e?.message || e)
    return null
  }
}

function approveCurrent() {
  if (!result.value?.approval) return
  try {
    const executed = approveAndExecuteOperation(result.value.approval.approvalId, confirmText.value)
    result.value.approval = executed.approval
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
    data_answer: '数据回答', analysis_report: '分析报告', generation_result: '生成结果',
    operation_preview: '操作预览', approval_required: '需要确认', daily_report: '今日报告',
    weekly_report: '周报', anomaly_report: '异常报告', feed_report: '推荐位报告',
    selection_report: '选品报告'
  }[type] || type
}
function approvalStatusName(status) {
  return { pending: '待确认', approved: '已批准', rejected: '已拒绝', executed: '已执行', expired: '已过期' }[status] || status
}

</script>

<style scoped>
/* ── 全高聊天容器 ── */
.ai-chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 62px); /* 减去 header 高度 */
  margin: -22px -24px;        /* 抵消 main-content 的 padding */
  overflow: hidden;
}

/* ── 消息滚动区 ── */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 40px 24px 24px;
  scroll-behavior: smooth;
}

/* ── 欢迎态 ── */
.chat-welcome {
  max-width: 680px;
  margin: 60px auto 0;
  text-align: center;
  animation: fadeUp 380ms cubic-bezier(0.16,1,0.3,1) both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: none; }
}

.welcome-badge {
  width: 52px; height: 52px; border-radius: 16px;
  background: linear-gradient(135deg, #c97a4e, #e09a72);
  color: #fff;
  display: grid; place-items: center;
  margin: 0 auto 20px;
  box-shadow: 0 8px 24px rgba(201,122,78,0.35);
}

.welcome-title {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.03em;
  margin: 0 0 10px;
  text-wrap: balance;
}

.welcome-sub {
  font-size: var(--text-sm);
  color: var(--ink-3);
  margin: 0 0 36px;
}

.welcome-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.welcome-chip {
  padding: 8px 16px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.75);
  color: var(--ink-2);
  font-size: var(--text-sm);
  font-family: inherit;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-out-quart),
    border-color var(--dur-fast) var(--ease-out-quart),
    color var(--dur-fast) var(--ease-out-quart),
    transform var(--dur-fast) var(--ease-out-quart);
}
.welcome-chip:hover {
  background: var(--accent-light);
  border-color: rgba(201,122,78,0.35);
  color: var(--accent-dark);
  transform: translateY(-1px);
}

/* ── 加载动画 ── */
.chat-loading {
  max-width: 680px;
  margin: 40px auto;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--ink-3);
  font-size: var(--text-sm);
}

.loading-dots { display: flex; gap: 5px; }
.loading-dots span {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent);
  animation: dotBounce 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.15s; }
.loading-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes dotBounce {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40%           { opacity: 1;   transform: scale(1.15); }
}

/* ── 消息行 ── */
.msg-row {
  display: flex;
  gap: 12px;
  max-width: 760px;
  margin: 0 auto 20px;
  animation: msgIn 220ms var(--ease-out-quart) both;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
}

.msg-row.user { justify-content: flex-end; }
.msg-row.assistant { align-items: flex-start; }

.msg-bubble.user {
  max-width: 72%;
  padding: 11px 16px;
  border-radius: 18px 18px 4px 18px;
  background: linear-gradient(135deg, #c97a4e, #d4906a);
  color: #fff;
  font-size: var(--text-sm);
  line-height: 1.6;
  box-shadow: 0 4px 16px rgba(201,122,78,0.28);
}

.msg-avatar {
  width: 32px; height: 32px; border-radius: 10px;
  background: linear-gradient(135deg, #c97a4e, #e09a72);
  color: #fff;
  font-size: 11px; font-weight: 800;
  display: grid; place-items: center;
  flex-shrink: 0;
  margin-top: 2px;
  box-shadow: 0 4px 12px rgba(201,122,78,0.3);
}

.msg-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── 结果卡片 ── */
.result-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(12px);
}

.result-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.result-card-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--ink);
  flex: 1;
}

.plan-meta-row {
  display: flex;
  gap: 20px;
  color: var(--ink-3);
  font-size: var(--text-xs);
  margin-bottom: 10px;
}

.protected-box {
  padding: 8px 12px;
  border-radius: var(--r-md);
  background: rgba(212,168,67,0.10);
  border: 1px solid rgba(212,168,67,0.25);
  color: #7a5200;
  font-size: var(--text-xs);
  margin-bottom: 10px;
}

.operation-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.operation-list li {
  padding: 10px 14px;
  background: rgba(201,122,78,0.05);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}
.operation-list strong {
  display: block;
  color: var(--ink);
  font-size: var(--text-sm);
  margin-bottom: 3px;
}
.operation-list span {
  color: var(--ink-3);
  font-size: var(--text-xs);
  line-height: 1.5;
}

.conclusion {
  color: var(--ink-2);
  font-size: var(--text-sm);
  line-height: 1.7;
  margin-bottom: 12px;
}

.info-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 4px;
}
.info-col h4 {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 8px;
}
.info-col ul { margin: 0; padding-left: 16px; }
.info-col li {
  color: var(--ink-2);
  font-size: var(--text-xs);
  line-height: 1.6;
  margin-bottom: 5px;
}

.sample-note {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(201,122,78,0.05);
  border-radius: var(--r-sm);
  color: var(--ink-3);
  font-size: var(--text-xs);
}

.preview-summary {
  color: var(--ink-2);
  font-size: var(--text-sm);
  margin: 6px 0 10px;
  line-height: 1.6;
}

.target-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.approval-box {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: rgba(201,122,78,0.05);
  border: 1px solid var(--border);
}
.approval-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-sm);
  color: var(--ink-2);
  margin-bottom: 10px;
}
.approval-meta strong { color: var(--accent); font-weight: 700; }
.approval-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.confirm-input { max-width: 180px; }

.report-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 4px;
}
.report-section {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: rgba(253,245,238,0.5);
}
.report-section h4 {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}
.report-section ul { margin: 0; padding-left: 14px; }
.report-section li { font-size: var(--text-xs); color: var(--ink-2); margin-bottom: 5px; line-height: 1.5; }

/* ── 底部输入栏 ── */
.chat-input-bar {
  border-top: 1px solid var(--border);
  background: rgba(253,245,238,0.72);
  backdrop-filter: blur(16px) saturate(1.4);
  padding: 14px 24px 18px;
}

.input-wrap {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 输入框整体容器：款式按钮 + textarea + 发送按钮 */
.input-box {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 8px 8px 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  background: rgba(255,255,255,0.88);
  transition: border-color var(--dur-base) var(--ease-out-quart), box-shadow var(--dur-base) var(--ease-out-quart);
}
.input-box:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(201,122,78,0.14);
  background: #fff;
}

.ai-textarea { flex: 1; }
.ai-textarea :deep(.el-textarea__inner) {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none !important;
  font-size: var(--text-sm);
  color: var(--ink);
  line-height: 1.6;
  padding: 6px 4px;
  resize: none;
}

.send-btn {
  width: 42px !important;
  height: 42px !important;
  padding: 0 !important;
  border-radius: var(--r-md) !important;
  flex-shrink: 0;
  display: grid !important;
  place-items: center;
}

.input-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.data-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(201,122,78,0.07);
  color: var(--ink-3);
  border: 1px solid var(--border);
}
.data-chip.accent { background: rgba(201,122,78,0.12); color: var(--accent-dark); border-color: rgba(201,122,78,0.22); }
.data-chip.warm { background: var(--pink-light); color: #b5516a; border-color: rgba(232,120,153,0.25); }

.input-hint {
  font-size: 11px;
  color: var(--ink-3);
  margin-left: auto;
}

/* ── 预览弹窗 ── */
.preview-detail h4 { margin: 14px 0 6px; font-size: var(--text-sm); color: var(--ink); }
.preview-detail p { font-size: var(--text-sm); color: var(--ink-2); margin: 4px 0; }
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
.preview-detail ul { padding-left: 16px; margin: 0; }
.preview-detail li { font-size: var(--text-sm); color: var(--ink-2); margin-bottom: 5px; }
</style>

