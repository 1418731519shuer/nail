<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <span class="logo-icon">NA</span>
        <div class="logo-title">
          <span class="logo-text-en">NAIL ART</span>
          <span class="logo-text-cn">美甲运营端</span>
        </div>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="transparent"
        text-color="rgba(52,35,28,0.55)"
        active-text-color="#b86e4a"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>运营日报</span>
        </el-menu-item>
        <el-menu-item index="/trending">
          <el-icon><TrendCharts /></el-icon>
          <span>热度榜单</span>
        </el-menu-item>
        <el-menu-item index="/styles">
          <el-icon><Grid /></el-icon>
          <span>款式管理</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户数据</span>
        </el-menu-item>
        <el-menu-item index="/recommend">
          <el-icon><Promotion /></el-icon>
          <span>推荐位管理</span>
        </el-menu-item>
        <el-menu-item index="/ai-assistant">
          <el-icon><ChatDotRound /></el-icon>
          <span>AI 运营助手</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <span class="shop-name">指尖艺术美甲店</span>
          <el-tag type="success" size="small">已接入用户端 4173</el-tag>
        </div>
        <div class="header-right">
          <el-badge :value="3" class="notification">
            <el-icon :size="20"><Bell /></el-icon>
          </el-badge>
          <el-dropdown>
            <div class="user-info">
              <el-avatar :size="32">店</el-avatar>
              <span class="user-name">管理员</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>门店设置</el-dropdown-item>
                <el-dropdown-item>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>

    <button class="assistant-fab" type="button" @click="assistantOpen = true; ensureOpsData()" aria-label="打开 AI 运营助手">
      <el-icon><ChatDotRound /></el-icon>
      <span>AI</span>
    </button>

    <el-drawer
      v-model="assistantOpen"
      title="AI 运营助手"
      direction="rtl"
      size="420px"
      class="assistant-drawer"
    >
      <div class="drawer-chat">
        <div ref="drawerChatRef" class="drawer-chat-body">
          <div v-if="drawerMessages.length === 0" class="drawer-welcome">
            <strong>我可以帮你快速看运营。</strong>
            <p>比如：把冷掉的款下架但猫眼不要动；首页前 8 款怎么排；生成今日运营报告。</p>
          </div>

          <div v-for="message in drawerMessages" :key="message.id" class="drawer-message" :class="message.role">
            <div class="drawer-bubble">
              <div v-html="formatAssistantText(message.content)"></div>
              <template v-if="message.result">
                <div class="drawer-plan-card">
                  <div class="drawer-plan-head">
                    <strong>任务计划</strong>
                    <el-tag size="small" :type="riskType(message.result.plan.riskLevel)">
                      {{ riskName(message.result.plan.riskLevel) }}
                    </el-tag>
                  </div>
                  <p>
                    意图：{{ intentName(message.result.plan.intentType) }} ·
                    确认：{{ message.result.plan.needConfirm ? '需要' : '不需要' }} ·
                    二次确认：{{ message.result.plan.needSecondConfirm ? '需要' : '不需要' }}
                  </p>
                  <p v-if="message.result.plan.objects.protectedConditions?.length">
                    保护条件：{{ message.result.plan.objects.protectedConditions.join('、') }}
                  </p>
                  <ol>
                    <li v-for="item in message.result.plan.plan" :key="item.step">
                      <b>{{ item.operation }}</b>：{{ item.reason }}
                    </li>
                  </ol>
                </div>

                <div v-if="message.result.preview" class="drawer-preview-card">
                  <div class="drawer-plan-head">
                    <strong>{{ message.result.preview.title }}</strong>
                    <el-tag size="small" type="warning">Preview</el-tag>
                  </div>
                  <p>{{ message.result.preview.summary }}</p>
                  <div v-if="feedPreviewSlots(message.result.preview).length" class="drawer-slot-grid">
                    <div v-for="slot in feedPreviewSlots(message.result.preview)" :key="slot.slot" class="drawer-slot-card">
                      <div class="drawer-slot-head">
                        <strong>{{ slot.slot }}</strong>
                        <span>{{ slot.slotName }}</span>
                      </div>
                      <p>{{ slot.styleName }}</p>
                      <small>{{ strategyTypeName(slot.strategyType) }}</small>
                    </div>
                  </div>
                  <ul>
                    <li v-for="item in message.result.preview.reasons.slice(0, 4)" :key="item">{{ item }}</li>
                  </ul>
                  <p v-if="message.result.preview.after?.diversityScore !== undefined">
                    多样性分：{{ message.result.preview.after.diversityScore }}
                  </p>
                  <ul v-if="message.result.preview.after?.riskNotes?.length">
                    <li v-for="item in message.result.preview.after.riskNotes" :key="item">{{ item }}</li>
                  </ul>
                  <p v-if="message.result.preview.targets.length">
                    对象：{{ message.result.preview.targets.map((item) => item.targetName || item.targetId).join('、') }}
                  </p>
                  <div
                    v-if="message.result.preview.operationName === 'preview_feed_mix_change' && !message.result.approval"
                    class="drawer-approval-actions"
                  >
                    <el-button size="small" type="primary" plain @click="createFeedStrategyApproval(message)">
                      按该策略生成确认单
                    </el-button>
                    <span class="drawer-tip">也可以继续输入自定义调整，比如“P3 换成 S0244”。</span>
                  </div>
                </div>

                <div v-if="message.result.approval" class="drawer-approval-card">
                  <p>确认单：{{ message.result.approval.approvalId }}</p>
                  <p>状态：{{ message.result.approval.status }}</p>
                  <el-input
                    v-if="message.result.preview?.secondConfirmRequired && message.result.approval.status === 'pending'"
                    v-model="drawerConfirmText"
                    size="small"
                    placeholder="请输入：确认执行"
                  />
                  <div v-if="message.result.approval.status === 'pending'" class="drawer-approval-actions">
                    <el-button size="small" @click="rejectDrawerApproval(message)">取消</el-button>
                    <el-button size="small" type="danger" @click="approveDrawerApproval(message)">
                      {{ message.result.preview?.secondConfirmRequired ? '确认执行' : '确认' }}
                    </el-button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="drawer-quick-list">
          <el-button v-for="item in drawerQuickQuestions" :key="item" round size="small" @click="askDrawer(item)">
            {{ item }}
          </el-button>
        </div>

        <div class="drawer-input-row">
          <el-input v-model="drawerInput" placeholder="问一个运营问题" @keyup.enter="sendDrawer" />
          <el-button type="primary" :loading="drawerLoading" @click="sendDrawer">发送</el-button>
        </div>
      </div>
    </el-drawer>
  </el-container>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { approveAndExecuteOperation, executeAgentRequest, rejectApproval } from '@/agent/agent-executor'
import { buildDeepSeekToolContract } from '@/agent/deepseek-tool-contract'
import { fetchOpsData } from '@/api/opsData'

const route = useRoute()
const activeMenu = computed(() => route.path)
const assistantOpen = ref(false)
const opsDataCache = ref(null)

async function ensureOpsData() {
  if (!opsDataCache.value) {
    opsDataCache.value = await fetchOpsData().catch(() => null)
  }
  return opsDataCache.value
}
const drawerMessages = ref([])
const drawerInput = ref('')
const drawerLoading = ref(false)
const drawerChatRef = ref(null)
const drawerConfirmText = ref('')

const drawerQuickQuestions = [
  '生成今日运营报告。',
  '把最近冷掉的款下架，但猫眼不要动。',
  '推荐位怎么排？',
  '哪些款有冷门风险？'
]

function formatAssistantText(text) {
  return String(text || '').replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

async function scrollDrawerBottom() {
  await nextTick()
  if (drawerChatRef.value) drawerChatRef.value.scrollTop = drawerChatRef.value.scrollHeight
}

async function sendDrawer() {
  const text = drawerInput.value.trim()
  if (!text) return

  const pendingMessage = [...drawerMessages.value].reverse().find((message) => {
    return message.role === 'assistant' && message.result?.approval?.status === 'pending'
  })
  if (pendingMessage && /^(确认|确认执行|执行|同意|批准|ok|OK)$/i.test(text)) {
    drawerMessages.value.push({ id: Date.now(), role: 'user', content: text })
    drawerInput.value = ''
    drawerConfirmText.value = text
    approveDrawerApproval(pendingMessage)
    await scrollDrawerBottom()
    return
  }

  drawerMessages.value.push({ id: Date.now(), role: 'user', content: text })
  drawerInput.value = ''
  drawerLoading.value = true
  await scrollDrawerBottom()
  try {
    // 优先用 DeepSeek advisor 回复
    const context = { selectedStyleId: 'style-gradient-003', storeId: 'store-001', today: new Date().toISOString().slice(0,10) }
    const aiData = await requestDeepSeekToolPlan(text).catch(() => null)
    if (aiData?.reply) {
      // DeepSeek 正常回复：先展示 AI 分析文字
      const replyText = [
        aiData.reply,
        aiData.actions?.length ? '\n\n**建议动作：**\n' + aiData.actions.map((a, i) => `${i+1}. ${a}`).join('\n') : ''
      ].join('')
      drawerMessages.value.push({ id: Date.now() + 1, role: 'assistant', content: replyText })
      // 如果是写操作意图，再追加本地原子操作 + approval card
      if (isWriteIntent(text)) {
        const result = executeAgentRequest(text, context, null)
        if (result.preview || result.approval) {
          drawerMessages.value.push({ id: Date.now() + 2, role: 'assistant', content: buildAgentDrawerText(result), result })
        }
      }
    } else {
      // 降级：本地规则
      const result = executeAgentRequest(text, context, null)
      drawerMessages.value.push({ id: Date.now() + 1, role: 'assistant', content: buildAgentDrawerText(result), result })
    }
    drawerConfirmText.value = ''
  } catch (error) {
    drawerMessages.value.push({ id: Date.now() + 1, role: 'assistant', content: `执行失败：${error.message}` })
  } finally {
    drawerLoading.value = false
    await scrollDrawerBottom()
  }
}

async function requestDeepSeekToolPlan(text) {
  const opsData = await ensureOpsData()
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 30000) // 延长到 30s
  const response = await fetch('/api/ops-deepseek-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      plannerMode: false,
      message: text,
      history: drawerMessages.value.slice(-6).map(m => ({ role: m.role, content: m.content })),
      opsContext: {
        currentPage: route.path,
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
  }).finally(() => window.clearTimeout(timeoutId))
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'DeepSeek 请求失败')
  return data  // advisor 模式直接返回 { reply, actions, ... }
}

function askDrawer(text) {
  drawerInput.value = text
  sendDrawer()
}

function buildAgentDrawerText(result) {
  const parts = [
    `**${result.analysis.title}**`,
    result.analysis.conclusion,
    `\n数据依据：\n${result.analysis.evidence.slice(0, 4).map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
    `\n建议动作：\n${result.analysis.actions.slice(0, 4).map((item, index) => `${index + 1}. ${item}`).join('\n')}`
  ]
  if (result.approval) {
    parts.push(`\n已生成确认单 ${result.approval.approvalId}。${result.preview?.secondConfirmRequired ? '这是极高风险操作，需要输入“确认执行”。' : '确认后才会执行。'}`)
  } else if (result.preview) {
    parts.push('\n这是操作预览，不会自动改数据。')
  } else {
    parts.push('\n该任务是只读/报告/分析类，不需要确认。')
  }
  return parts.join('\n')
}

function approveDrawerApproval(message) {
  try {
    const executed = approveAndExecuteOperation(message.result.approval.approvalId, drawerConfirmText.value)
    message.result.approval = executed.approval
    message.content = `${message.content}\n\n已执行：${executed.log.operationName}，并写入审计日志。款式管理页已刷新状态。`
    drawerConfirmText.value = ''
    ElMessage.success('已执行并写入审计日志')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function feedPreviewSlots(preview) {
  return preview?.after?.slots || []
}

function strategyTypeName(type) {
  return {
    hot_conversion: '热门成交',
    stable_conversion: '稳定成交',
    potential_activation: '潜力激活',
    style_diversity: '风格补位',
    scroll_attraction: '下滑吸引',
    new_style_test: '新品测试',
    potential_extension: '潜力扩展',
    long_tail_diversity: '多样性兜底'
  }[type] || type
}

function createFeedStrategyApproval(message) {
  try {
    const slots = message.result.preview?.after?.slots || []
    const result = executeAgentRequest('按推荐策略生成确认单', {
      selectedStyleId: 'style-gradient-003',
      storeId: 'store-001',
      today: '2026-05-29'
    }, {
      intentType: 'execute',
      riskLevel: 'critical',
      needConfirm: true,
      needSecondConfirm: true,
      userGoal: '按 P1-P8 推荐策略替换首页推荐流',
      objects: {
        sectionIds: ['home_feed'],
        filters: { source: 'feed_strategy', slots },
        protectedConditions: []
      },
      plan: [
        { step: 1, operation: 'get_section_styles', reason: '读取当前首页推荐流。', params: { sectionId: 'home_feed' } },
        { step: 2, operation: 'preview_replace_section', reason: '按 P1-P8 策略生成区块替换预览。', params: { sectionId: 'home_feed', slots } },
        { step: 3, operation: 'create_approval', reason: '推荐区块整体替换需要人工确认。', params: {} }
      ],
      finalResponseType: 'approval_required'
    })
    drawerMessages.value.push({
      id: Date.now() + 2,
      role: 'assistant',
      content: buildAgentDrawerText(result),
      result
    })
    scrollDrawerBottom()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function rejectDrawerApproval(message) {
  try {
    message.result.approval = rejectApproval(message.result.approval.approvalId)
    message.content = `${message.content}\n\n已取消该确认单，不会执行写操作。`
    ElMessage.info('已取消确认单')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function isWriteIntent(text) {
  return /下架|上架|归档|恢复|改价|调价|替换|推荐位|执行/.test(text)
}

function riskName(level) {
  return { low: '低风险', medium: '中风险', high: '高风险', critical: '极高风险' }[level] || level
}

function riskType(level) {
  return { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' }[level] || 'info'
}

function intentName(intent) {
  return { query: '查询', analysis: '分析', generate: '生成', execute: '执行', report: '报告' }[intent] || intent
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background: var(--bg-gradient);
  background-attachment: fixed;
}

/* ── 路由动效 ── */
.page-enter-active {
  animation: pageSlideIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.page-leave-active {
  animation: pageSlideOut 180ms cubic-bezier(0.25, 1, 0.5, 1) both;
}
@keyframes pageSlideIn {
  from { opacity: 0; transform: translateY(14px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes pageSlideOut {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-8px); }
}

/* ── 侧边栏 ── */
.sidebar {
  /* 侧边栏用渐变起点色，加毛玻璃 */
  background: rgba(247, 232, 226, 0.45);
  backdrop-filter: blur(20px) saturate(1.6);
  border-right: 1px solid rgba(185,120,80,0.14);
  overflow: hidden;
}

.logo {
  height: 62px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  border-bottom: 1px solid rgba(185,120,80,0.10);
}

.logo-icon {
  width: 32px; height: 32px; border-radius: 10px;
  display: grid; place-items: center;
  color: #fff; font-size: 12px; font-weight: 800;
  background: linear-gradient(135deg, #c97a4e 0%, #e09a72 100%);
  box-shadow: 0 4px 14px rgba(201,122,78,0.42);
  letter-spacing: -0.5px;
  transition: transform 200ms cubic-bezier(0.25,1,0.5,1), box-shadow 200ms;
}
.logo:hover .logo-icon {
  transform: scale(1.08) rotate(-3deg);
  box-shadow: 0 6px 20px rgba(201,122,78,0.52);
}

.logo-title { display: flex; flex-direction: column; gap: 1px; }

/* NAIL ART —— Cinzel 大写，对标 HORSEPOWER 字感 */
.logo-text-en {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #2d1a10;
  line-height: 1.1;
}

/* 美甲运营端 —— 细体小字副标题 */
.logo-text-cn {
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 10px;
  font-weight: 300;
  color: rgba(45,26,16,0.42);
  letter-spacing: 0.1em;
  line-height: 1.3;
}

.sidebar-menu { border-right: none !important; }
.sidebar-menu .el-menu-item {
  height: 46px; border-radius: 12px; margin: 2px 10px;
  font-weight: 600; font-size: 14px;
  transition: background 180ms cubic-bezier(0.25,1,0.5,1),
              color 180ms, padding-left 180ms !important;
}
.sidebar-menu .el-menu-item:hover {
  background: rgba(201,122,78,0.10) !important;
  color: #a85e35 !important;
  padding-left: 26px !important;
}
.sidebar-menu .el-menu-item.is-active {
  background: rgba(201,122,78,0.14) !important;
  color: #a85e35 !important;
  font-weight: 700;
  box-shadow: inset 3px 0 0 #c97a4e;
}

/* ── 顶栏 ── */
.header {
  background: rgba(247, 232, 226, 0.38);
  backdrop-filter: blur(16px) saturate(1.5);
  border-bottom: 1px solid rgba(185,120,80,0.10);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 22px;
}
.header-left, .header-right, .user-info { display: flex; align-items: center; gap: 12px; }
.shop-name { font-size: 15px; font-weight: 700; color: #2d1a10; letter-spacing: -0.01em; }
.notification, .user-info { cursor: pointer; }
.user-info { transition: opacity 150ms; }
.user-info:hover { opacity: 0.75; }

/* ── 主内容 ── */
.main-content {
  background: transparent;
  padding: 22px 24px;
  overflow-y: auto;
}

/* ── AI FAB ── */
.assistant-fab {
  position: fixed; right: 22px; bottom: 24px; z-index: 1000;
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 46px; padding: 0 18px;
  border: 0; border-radius: 14px; color: #fff;
  background: linear-gradient(135deg, #c97a4e 0%, #e09a72 100%);
  box-shadow: 0 12px 32px rgba(201,122,78,0.42), 0 0 0 1px rgba(201,122,78,0.2) inset;
  font-family: inherit; font-weight: 800; cursor: pointer;
  transition: transform 200ms cubic-bezier(0.25,1,0.5,1),
              box-shadow 200ms cubic-bezier(0.25,1,0.5,1);
}
.assistant-fab:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 18px 40px rgba(201,122,78,0.52), 0 0 0 1px rgba(201,122,78,0.2) inset;
}
.assistant-fab:active { transform: scale(0.97); }
.assistant-fab span { font-size: 13px; }

/* FAB 脉动光环 */
.assistant-fab::before {
  content: '';
  position: absolute; inset: -4px;
  border-radius: 18px;
  background: linear-gradient(135deg, #c97a4e, #e09a72);
  opacity: 0;
  z-index: -1;
  animation: fabPulse 2.8s cubic-bezier(0.25,1,0.5,1) infinite;
}
@keyframes fabPulse {
  0%, 100% { opacity: 0; transform: scale(1); }
  50%       { opacity: 0.18; transform: scale(1.12); }
}

:deep(.assistant-drawer .el-drawer__body) { padding: 0; }
:deep(.assistant-drawer .el-drawer__header) {
  background: rgba(255,252,248,0.92);
  border-bottom: 1px solid rgba(185,120,80,0.10);
  color: #2d1a10 !important;
  font-weight: 800 !important;
  font-size: 16px !important;
  letter-spacing: -0.01em;
  padding: 16px 20px;
}

.drawer-chat {
  height: 100%; display: flex; flex-direction: column;
  background: #fff8f2;
}

.drawer-chat-body { flex: 1; overflow: auto; padding: 16px; }

.drawer-welcome {
  padding: 16px; border-radius: 16px;
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(185,120,80,0.12);
  animation: cardIn 320ms cubic-bezier(0.16,1,0.3,1) both;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
.drawer-welcome p { margin: 6px 0 0; color: rgba(45,26,16,0.58); line-height: 1.65; font-size: 13px; }

.drawer-message {
  display: flex; margin-bottom: 10px;
  animation: msgIn 200ms cubic-bezier(0.25,1,0.5,1) both;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
.drawer-message.user { justify-content: flex-end; }

.drawer-bubble {
  max-width: 86%; padding: 10px 14px; border-radius: 14px;
  color: #2d1a10; background: rgba(255,255,255,0.88);
  border: 1px solid rgba(185,120,80,0.10);
  line-height: 1.7; font-size: 13.5px;
  box-shadow: 0 2px 10px rgba(180,100,50,0.06);
}

.drawer-plan-card,
.drawer-preview-card,
.drawer-approval-card {
  margin-top: 10px; padding: 10px;
  border: 1px solid rgba(128,75,45,0.12);
  border-radius: 12px;
  background: rgba(255,255,255,0.8);
}

.drawer-plan-head,
.drawer-approval-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.drawer-plan-card p,
.drawer-preview-card p,
.drawer-approval-card p {
  margin: 6px 0;
  color: #606266;
}

.drawer-plan-card ol,
.drawer-preview-card ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.drawer-plan-card li,
.drawer-preview-card li {
  margin-bottom: 5px;
}

.drawer-approval-actions {
  justify-content: flex-end;
  margin-top: 8px;
}

.drawer-slot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.drawer-slot-card {
  padding: 10px;
  border: 1px solid rgba(213,139,104,0.2);
  border-radius: 10px;
  background: rgba(255,248,242,0.8);
}

.drawer-slot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.drawer-slot-card p,
.drawer-slot-card small {
  margin: 4px 0 0;
  display: block;
}

.drawer-tip {
  color: #909399;
  font-size: 12px;
}

.drawer-message.user .drawer-bubble {
  color: #fff;
  background: linear-gradient(135deg, #d58b68, #e8a882);
  border: none;
}

.drawer-quick-list {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 10px 16px 0;
}

.drawer-input-row {
  display: flex; gap: 10px;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(128,75,45,0.10);
  background: rgba(255,255,255,0.6);
}
</style>
