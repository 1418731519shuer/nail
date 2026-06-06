<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <span class="logo-icon">NA</span>
        <span class="logo-text">美甲运营端</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="#1d1e1f"
        text-color="#bfcbd9"
        active-text-color="#ff6b9d"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>运营日报</span>
        </el-menu-item>
        <el-menu-item index="/trending">
          <el-icon><TrendCharts /></el-icon>
          <span>热门冷门</span>
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
        <router-view />
      </el-main>
    </el-container>

    <button class="assistant-fab" type="button" @click="assistantOpen = true" aria-label="打开 AI 运营助手">
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

const route = useRoute()
const activeMenu = computed(() => route.path)
const assistantOpen = ref(false)
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
    const context = {
      selectedStyleId: 'style-gradient-003',
      storeId: 'store-001',
      today: '2026-05-29'
    }
    const deepSeekPlan = await requestDeepSeekToolPlan(text).catch(() => null)
    const result = executeAgentRequest(text, context, deepSeekPlan)
    drawerMessages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: buildAgentDrawerText(result),
      result
    })
    drawerConfirmText.value = ''
  } catch (error) {
    drawerMessages.value.push({ id: Date.now() + 1, role: 'assistant', content: `执行失败：${error.message}` })
  } finally {
    drawerLoading.value = false
    await scrollDrawerBottom()
  }
}

async function requestDeepSeekToolPlan(text) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 10000)
  const response = await fetch('/api/ops-deepseek-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      plannerMode: true,
      message: text,
      operationCatalog: buildDeepSeekToolContract(),
      opsContext: {
        currentPage: route.path,
        currentStoreId: 'store-001'
      }
    })
  }).finally(() => window.clearTimeout(timeoutId))
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'DeepSeek planner failed')
  if (!data.toolPlan) throw new Error('DeepSeek 没有返回 ToolPlan')
  return data.toolPlan
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
}

.sidebar {
  background-color: #1d1e1f;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid #2d2e2f;
}

.logo-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b9d 0%, #ff8e53 100%);
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.sidebar-menu {
  border-right: none;
}

.sidebar-menu .el-menu-item {
  height: 50px;
}

.sidebar-menu .el-menu-item:hover,
.sidebar-menu .el-menu-item.is-active {
  background-color: #2d2e2f !important;
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-left,
.header-right,
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shop-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.notification,
.user-info {
  cursor: pointer;
}

.main-content {
  background-color: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}

.assistant-fab {
  position: fixed;
  right: 22px;
  bottom: 24px;
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  background: linear-gradient(135deg, #ff6b9d, #ff8e53);
  box-shadow: 0 12px 30px rgba(255, 107, 157, 0.34);
  font-weight: 800;
  cursor: pointer;
}

.assistant-fab span {
  font-size: 13px;
}

:deep(.assistant-drawer .el-drawer__body) {
  padding: 0;
}

.drawer-chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.drawer-chat-body {
  flex: 1;
  overflow: auto;
  padding: 18px;
}

.drawer-welcome {
  padding: 18px;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background: #fff7fb;
}

.drawer-welcome p {
  margin: 8px 0 0;
  color: #777;
  line-height: 1.6;
}

.drawer-message {
  display: flex;
  margin-bottom: 12px;
}

.drawer-message.user {
  justify-content: flex-end;
}

.drawer-bubble {
  max-width: 86%;
  padding: 11px 13px;
  border-radius: 8px;
  color: #333;
  background: #f5f7fa;
  line-height: 1.7;
  font-size: 14px;
}

.drawer-plan-card,
.drawer-preview-card,
.drawer-approval-card {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
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
  border: 1px solid #f4d7e1;
  border-radius: 8px;
  background: #fff8fb;
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
  background: #ff6b9d;
}

.drawer-quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 18px 0;
}

.drawer-input-row {
  display: flex;
  gap: 10px;
  padding: 14px 18px 18px;
  border-top: 1px solid #eef0f4;
}
</style>
