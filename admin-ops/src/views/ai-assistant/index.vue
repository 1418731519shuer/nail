<template>
  <div class="ai-chat-page">

    <!-- ── 滚动消息区 ── -->
    <div ref="chatBodyRef" class="chat-body">

      <!-- 欢迎态（无消息时） -->
      <div v-if="!messages.length && !loading" class="chat-welcome">
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

      <!-- 历史消息：所有轮次累积显示 -->
      <template v-for="msg in messages" :key="msg.id">
        <!-- 模式切换通知 -->
        <div v-if="msg.role === 'system-notice'" class="msg-notice">{{ msg.text }}</div>

        <!-- 用户气泡 -->
        <div v-if="msg.role === 'user'" class="msg-row user">
          <div class="msg-bubble user">{{ msg.text }}</div>
        </div>

        <!-- AI 回复 -->
        <div v-else class="msg-row assistant">
          <div class="msg-avatar">AI</div>
          <div class="msg-content">
            <!-- 文字回复 -->
            <div class="result-card reply-card">
              <p class="reply-text" v-html="formatReply(msg.reply || '')"></p>
            </div>
            <!-- Action 模式：操作确认卡 -->
            <div v-if="msg.ops && msg.ops.length > 0" class="result-card action-card">
              <div class="action-card-head">
                <span class="action-card-title">执行计划 · {{ msg.ops.length }} 步</span>
                <span v-if="msg.executed" class="action-done-badge">已执行</span>
              </div>
              <ul class="action-op-list">
                <li v-for="(op, i) in msg.ops" :key="i" :class="['action-op-item', isReadOp(op.opId) ? 'op-read' : 'op-write']">
                  <span class="op-step">{{ i + 1 }}</span>
                  <span class="op-type-badge">{{ isReadOp(op.opId) ? '查询' : '写入' }}</span>
                  <span class="op-id">{{ op.opId }}</span>
                  <span class="op-name">{{ describeOpParams(op) }}</span>
                  <span v-if="op.resultRef" class="op-ref-badge">→ {{ op.resultRef }}</span>
                  <span v-if="op.condition" class="op-cond-badge">
                    如果 {{ op.condition.$ref }}.{{ op.condition.path }} {{ op.condition.op }} {{ op.condition.value }}
                  </span>
                  <span class="op-reason">{{ op.reason }}</span>
                </li>
              </ul>
              <div v-if="!msg.executed" class="action-card-footer">
                <el-button size="small" @click="cancelOps(msg)">取消</el-button>
                <el-button size="small" type="primary" :loading="msg.executing" @click="confirmOps(msg)">确认执行</el-button>
              </div>
              <div v-if="msg.execResults" class="action-results">
                <div v-for="(r, i) in msg.execResults" :key="i" :class="['exec-result', r.skipped ? 'skipped' : r.ok ? 'ok' : 'fail']">
                  <span>{{ r.skipped ? '–' : r.ok ? '✓' : '✗' }}</span>
                  <span>{{ r.opId }}</span>
                  <span>{{ r.skipped ? '条件不满足，已跳过' : describeExecResult(r) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 加载态（追加在消息列末尾） -->
      <div v-if="loading" class="chat-loading">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <p>正在生成回复…</p>
      </div>
    </div>

    <!-- ── 底部输入栏 ── -->
    <div class="chat-input-bar">
      <!-- 模式切换 -->
      <div class="mode-bar">
        <button
          v-for="m in modes" :key="m.key"
          class="mode-btn"
          :class="{ active: currentMode === m.key }"
          :title="m.desc"
          @click="switchMode(m.key)"
        >
          <span class="mode-en">{{ m.en }}</span>
          <span class="mode-zh">{{ m.zh }}</span>
        </button>
      </div>

      <div class="input-wrap">
        <div class="input-box">
          <el-input
            v-model="input"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 5 }"
            :placeholder="currentModeConfig.placeholder"
            class="ai-textarea"
            @keydown.ctrl.enter="run"
          />
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


  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useOpsData } from '@/composables/useOpsData'

// ── 三种模式 ──────────────────────────────────────────────
const modes = [
  {
    key: 'chat',
    en: 'Chat',
    zh: '对话',
    icon: '💬',
    desc: '自由问答，聊创意、问趋势、随便说',
    placeholder: '随便聊点什么，比如：最近流行什么风格？',
    systemHint: '你现在处于自由对话模式。用户可能聊美甲趋势、风格灵感、随便提问，不需要强制引导到数据或操作。轻松、自然地回答即可，不用输出结构化分析。'
  },
  {
    key: 'insight',
    en: 'Insight',
    zh: '洞察',
    icon: '📊',
    desc: '深度分析数据：热度、冷门、趋势、报告',
    placeholder: '问数据，比如：最近哪些款冷门风险高？',
    systemHint: '你现在处于数据洞察模式。用户希望看到基于真实运营数据的深度分析。必须引用具体指标（hot_score、cold_risk_score、试戴量、确认率等），给出有数据支撑的结论。可以生成分析报告、趋势判断、异常预警。'
  },
  {
    key: 'action',
    en: 'Action',
    zh: '执行',
    icon: '⚡',
    desc: '直接操作：上下架、改推荐位、批量执行',
    placeholder: '说要做什么，比如：把冷门款下架，猫眼保留',
    systemHint: '你现在处于操作执行模式。用户希望真实执行运营操作。分析完成后，必须明确列出要执行的原子操作（上架/下架/推荐位调整等），说明影响范围和风险等级，并等待用户确认后执行。写操作必须先预览，高风险操作必须二次确认。'
  }
]

const currentMode = ref('chat')
const currentModeConfig = computed(() => modes.find(m => m.key === currentMode.value) || modes[0])

function switchMode(key) {
  if (currentMode.value === key) return
  currentMode.value = key
  // 切换模式时在对话中插入一条系统提示气泡
  if (messages.value.length) {
    const cfg = modes.find(m => m.key === key)
    messages.value.push({
      id: Date.now(),
      role: 'system-notice',
      text: `已切换到 ${cfg.en} ${cfg.zh} 模式 — ${cfg.desc}`
    })
    scrollBottom()
  }
}

const QUICK_QUESTIONS_MAP = {
  chat: [
    '最近流行什么美甲风格？',
    '帮我写一段猫眼款的小红书文案',
    '如何定价才能吸引新客？',
    '春夏季最受欢迎的色系是什么？',
    '新款上架前需要做哪些准备？',
    '怎么拍美甲图才容易上热门？',
  ],
  insight: [
    '哪些款冷门风险最高？',
    '最近 7 天哪些款变热？',
    '潜力款里转化率最好的是哪几个？',
    '生成今日运营日报',
    '推荐位现在的表现怎么样？',
    '哪些款试戴量高但确认率低？',
  ],
  action: [
    '把最近冷掉的款下架，但猫眼不要动。',
    '首页前 8 款怎么排？',
    '爬取到的新款哪些能上架？',
    '帮我把这个款介绍改得更适合小红书。',
    '按今日报告建议执行。',
    '首页推荐位今天表现怎么样？',
  ]
}
const quickQuestions = computed(() => QUICK_QUESTIONS_MAP[currentMode.value] || QUICK_QUESTIONS_MAP.chat)

const input = ref('')
const loading = ref(false)
// 消息数组：所有对话轮次累积存储
const messages = ref([])
// 传给后端的上下文历史（精简版）
const chatHistory = ref([])
const chatBodyRef = ref(null)
const { ensureOpsData, refreshOpsData } = useOpsData()

let msgId = 0
function pushMsg(obj) {
  messages.value.push({ id: ++msgId, ...obj })
}

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
  if (!text || loading.value) return

  // 立即清空输入框、展示用户气泡
  input.value = ''
  pushMsg({ role: 'user', text })
  loading.value = true
  await scrollBottom()

  try {
    const dsData = await callDeepSeek(text)
    const msg = {
      role: 'assistant',
      reply: dsData?.reply || '抱歉，未能获取回复。',
      ops: dsData?.ops?.length ? dsData.ops : null,
      executed: false,
      executing: false,
      execResults: null
    }
    pushMsg(msg)
  } catch (err) {
    ElMessage.error(err.message)
    pushMsg({ role: 'assistant', reply: '请求失败，请稍后重试。' })
  } finally {
    loading.value = false
    await scrollBottom()
  }
}

const READ_OPS = new Set([
  'query.search','query.styleDetail','query.hotRank','query.coldRisk',
  'query.recommendSlots','query.stats','query.metricsRank','query.metrics',
  'query.priceRange','query.lowConversion','query.byBucket','query.auditLog'
])

function isReadOp(opId) {
  return READ_OPS.has(opId)
}

function describeOpParams(op) {
  const p = op.params || {}
  // ids 是 $ref 或数组时，显示引用来源或数量
  if (p.ids) {
    if (p.ids.$ref) return `← ${p.ids.$ref}`
    if (Array.isArray(p.ids)) return `${p.ids.length} 个款式`
  }
  return p.name || p.styleId || (p.filters ? `${p.filters.length}个条件` : '') || ''
}

function describeExecResult(r) {
  if (!r.ok) return r.error || '失败'
  const p = r.resolvedParams || r.params || {}
  // 批量操作显示实际影响数量
  if (p.ids && Array.isArray(p.ids)) return `成功（${p.ids.length} 条）`
  if (r.data?.count != null) return `查询到 ${r.data.count} 条`
  if (r.data?.affected != null) return `影响 ${r.data.affected} 条`
  return p.name || p.styleId || '成功'
}

async function confirmOps(msg) {
  if (!msg.ops?.length || msg.executing) return
  msg.executing = true
  try {
    const { executePlan } = await import('./aichata/action/executor.js')
    // 传递 resultRef 字段，executor 会自动管理结果链
    const results = await executePlan(msg.ops)
    msg.execResults = results
    msg.executed = true
    const failed = results.filter(r => !r.ok)
    if (failed.length === 0) {
      ElMessage.success(`全部 ${results.length} 步执行成功`)
    } else {
      ElMessage.warning(`${results.length - failed.length} 成功，${failed.length} 失败`)
    }
    window.dispatchEvent(new CustomEvent('agent-state-changed'))
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    msg.executing = false
  }
}

function cancelOps(msg) {
  msg.ops = null
  ElMessage.info('已取消操作')
}

async function callDeepSeek(text) {
  try {
    const opsData = await ensureOpsData()
    const res = await fetch('/api/ops-deepseek-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.value.slice(-6),
        mode: currentMode.value,
        modeHint: currentModeConfig.value.systemHint,
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
    // 更新上下文历史
    chatHistory.value = [
      ...chatHistory.value.slice(-6),
      { role: 'user', content: text },
      { role: 'assistant', content: typeof data.reply === 'string' ? data.reply : JSON.stringify(data) }
    ]
    return data
  } catch (e) {
    console.error('[DeepSeek] 调用失败:', e?.message || e)
    return null
  }
}

function formatReply(text) {
  return String(text || '')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

</script>

<style scoped>
.ai-chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 62px);
  margin: -22px -24px;
  overflow: hidden;
}

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
  max-width: 760px;
  margin: 8px auto 20px 56px;
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
.reply-card { padding: 14px 18px; }
.reply-text {
  font-size: var(--text-sm);
  color: var(--ink-2);
  line-height: 1.8;
  margin: 0;
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
  display: flex; flex-direction: column; gap: 8px;
}
.operation-list li {
  padding: 10px 14px;
  background: rgba(201,122,78,0.05);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}
.operation-list strong { display: block; color: var(--ink); font-size: var(--text-sm); margin-bottom: 3px; }
.operation-list span { color: var(--ink-3); font-size: var(--text-xs); line-height: 1.5; }
.conclusion { color: var(--ink-2); font-size: var(--text-sm); line-height: 1.7; margin-bottom: 12px; }
.info-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 4px; }
.info-col h4 { font-size: var(--text-sm); font-weight: 700; color: var(--ink); margin: 0 0 8px; }
.info-col ul { margin: 0; padding-left: 16px; }
.info-col li { color: var(--ink-2); font-size: var(--text-xs); line-height: 1.6; margin-bottom: 5px; }
.sample-note {
  display: flex; gap: 20px; margin-top: 12px;
  padding: 8px 12px;
  background: rgba(201,122,78,0.05);
  border-radius: var(--r-sm);
  color: var(--ink-3); font-size: var(--text-xs);
}
.preview-summary { color: var(--ink-2); font-size: var(--text-sm); margin: 6px 0 10px; line-height: 1.6; }
.target-list { display: flex; flex-wrap: wrap; gap: 6px; }
.approval-box {
  margin-top: 14px; padding: 12px 14px;
  border-radius: var(--r-md);
  background: rgba(201,122,78,0.05);
  border: 1px solid var(--border);
}
.approval-meta {
  display: flex; justify-content: space-between; align-items: center;
  font-size: var(--text-sm); color: var(--ink-2); margin-bottom: 10px;
}
.approval-meta strong { color: var(--accent); font-weight: 700; }
.approval-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.confirm-input { max-width: 180px; }
.report-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 4px; }
.report-section {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: rgba(253,245,238,0.5);
}
.report-section h4 {
  font-size: var(--text-sm); font-weight: 700; color: var(--ink);
  margin: 0 0 8px; padding-bottom: 6px;
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
.input-box {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 8px 8px 8px 14px;
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
  width: 42px !important; height: 42px !important;
  padding: 0 !important;
  border-radius: var(--r-md) !important;
  flex-shrink: 0;
  display: grid !important;
  place-items: center;
}
.input-meta { display: flex; align-items: center; gap: 6px; }
.input-hint { font-size: 11px; color: var(--ink-3); margin-left: auto; }

/* ── 预览弹窗 ── */
.preview-detail h4 { margin: 14px 0 6px; font-size: var(--text-sm); color: var(--ink); }
.preview-detail p { font-size: var(--text-sm); color: var(--ink-2); margin: 4px 0; }
.preview-detail pre {
  max-height: 220px; overflow: auto; padding: 12px;
  border-radius: var(--r-md);
  background: rgba(201,122,78,0.05);
  border: 1px solid var(--border);
  font-size: 12px; color: var(--ink-2);
}
.preview-detail ul { padding-left: 16px; margin: 0; }
.preview-detail li { font-size: var(--text-sm); color: var(--ink-2); margin-bottom: 5px; }

/* ── 模式切换栏 ── */
.mode-bar {
  display: flex;
  gap: 6px;
  padding: 8px 16px 0;
  flex-shrink: 0;
}
.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: transparent;
  cursor: pointer;
  transition: all 180ms ease;
  white-space: nowrap;
  color: var(--ink-2);
}
.mode-btn:hover {
  border-color: #c97a4e;
  background: rgba(201,122,78,0.06);
  color: var(--ink);
}
.mode-btn.active {
  border-color: #c97a4e;
  background: rgba(201,122,78,0.12);
  color: #c97a4e;
  font-weight: 600;
}
.mode-icon { font-size: 15px; line-height: 1; }
.mode-en {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.mode-zh {
  font-size: 12px;
  opacity: 0.75;
}
.mode-desc {
  display: none;
}
.mode-btn.active .mode-desc {
  display: inline;
  font-size: 11px;
  opacity: 0.7;
  margin-left: 2px;
}

/* ── 系统通知气泡 ── */
.msg-notice {
  text-align: center;
  font-size: 12px;
  color: var(--ink-3, #aaa);
  padding: 4px 12px;
  background: rgba(201,122,78,0.07);
  border-radius: 12px;
  width: fit-content;
  margin: 8px auto;
}

/* ── Action 确认卡 ── */
.action-card {
  margin-top: 8px;
  border: 1.5px solid #faad14;
  border-radius: var(--r-lg);
  padding: 14px 16px;
  background: rgba(250,173,20,0.04);
}
.action-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.action-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #d48806;
}
.action-done-badge {
  font-size: 11px;
  background: #52c41a;
  color: #fff;
  padding: 1px 8px;
  border-radius: 10px;
}
.action-op-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.action-op-item {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 6px;
}
.op-read { background: rgba(22,119,255,0.05); border-left: 2px solid #1677ff; }
.op-write { background: rgba(250,173,20,0.07); border-left: 2px solid #faad14; }
.op-step {
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  background: rgba(0,0,0,0.1);
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.op-type-badge {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.op-read .op-type-badge { background: rgba(22,119,255,0.12); color: #1677ff; }
.op-write .op-type-badge { background: rgba(250,173,20,0.18); color: #d48806; }
.op-id {
  font-family: monospace;
  font-size: 11px;
  color: #c97a4e;
  white-space: nowrap;
}
.op-name {
  font-weight: 600;
  color: var(--ink);
}
.op-ref-badge {
  font-size: 10px;
  font-family: monospace;
  color: #1677ff;
  background: rgba(22,119,255,0.08);
  padding: 0 5px;
  border-radius: 4px;
}
.op-cond-badge {
  font-size: 10px;
  font-family: monospace;
  color: #d46b08;
  background: rgba(212,107,8,0.08);
  padding: 0 5px;
  border-radius: 4px;
}
.op-reason {
  color: var(--ink-2);
  font-size: 11px;
  flex: 1;
  min-width: 100px;
}
.action-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.action-results {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.exec-result {
  display: flex;
  gap: 8px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}
.exec-result.ok { background: rgba(82,196,26,0.1); color: #389e0d; }
.exec-result.fail { background: rgba(255,77,79,0.1); color: #cf1322; }
.exec-result.skipped { background: rgba(0,0,0,0.04); color: #8c8c8c; }
</style>
