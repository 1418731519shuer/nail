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
        <el-menu-item index="/insights">
          <el-icon><DataLine /></el-icon>
          <span>趋势洞察</span>
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
      direction="rtl"
      size="440px"
      class="assistant-drawer"
      :with-header="true"
    >
      <template #header>
        <div class="drawer-header-inner">
          <span class="drawer-title">AI 运营助手</span>
          <div class="drawer-mode-bar">
            <button
              v-for="m in drawerModes" :key="m.key"
              class="drawer-mode-btn"
              :class="{ active: drawerMode === m.key }"
              @click="switchDrawerMode(m.key)"
            >
              <span class="dm-en">{{ m.en }}</span>
              <span class="dm-zh">{{ m.zh }}</span>
            </button>
          </div>
        </div>
      </template>

      <div class="drawer-chat">
        <div ref="drawerChatRef" class="drawer-chat-body">
          <div v-if="drawerMessages.length === 0" class="drawer-welcome">
            <strong>{{ drawerModeConfig.welcomeTitle }}</strong>
            <p>{{ drawerModeConfig.welcomeDesc }}</p>
          </div>

          <div v-for="msg in drawerMessages" :key="msg.id" class="drawer-message" :class="msg.role">
            <!-- system-notice -->
            <div v-if="msg.role === 'system-notice'" class="drawer-notice">{{ msg.text }}</div>
            <template v-else>
              <div class="drawer-bubble">
                <div v-html="formatDrawerText(msg.role === 'user' ? msg.text : msg.reply)"></div>

                <!-- Action 模式确认卡 -->
                <template v-if="msg.ops && !msg.executed">
                  <div class="drawer-ops-card">
                    <div class="drawer-ops-head">
                      <strong>执行计划（{{ msg.ops.length }} 步）</strong>
                      <el-tag size="small" type="warning">待确认</el-tag>
                    </div>
                    <ol class="drawer-ops-list">
                      <li v-for="op in msg.ops" :key="op.opId">
                        <b>{{ op.opId }}</b>
                        <span v-if="describeDrawerOp(op)" class="drawer-op-hint"> · {{ describeDrawerOp(op) }}</span>
                        <span class="drawer-op-reason"> — {{ op.reason }}</span>
                      </li>
                    </ol>
                    <div class="drawer-ops-actions">
                      <el-button size="small" @click="cancelDrawerOps(msg)">取消</el-button>
                      <el-button size="small" type="primary" :loading="msg.executing" @click="confirmDrawerOps(msg)">确认执行</el-button>
                    </div>
                  </div>
                </template>

                <!-- 执行结果 -->
                <template v-if="msg.execResults">
                  <div class="drawer-exec-result">
                    <div v-for="(r, i) in msg.execResults" :key="i" class="drawer-exec-row">
                      <span>{{ r.ok ? '✅' : '❌' }}</span>
                      <span>{{ msg.ops?.[i]?.opId }}</span>
                      <span class="drawer-exec-hint">{{ describeDrawerResult(r) }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </div>

        <!-- 快捷问题 -->
        <div class="drawer-quick-list">
          <el-button
            v-for="item in drawerQuickQuestions" :key="item"
            round size="small"
            @click="askDrawer(item)"
          >{{ item }}</el-button>
        </div>

        <div class="drawer-input-row">
          <el-input
            v-model="drawerInput"
            :placeholder="drawerModeConfig.placeholder"
            @keyup.enter="sendDrawer"
          />
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
import { useOpsData } from '@/composables/useOpsData'

const route = useRoute()
const activeMenu = computed(() => route.path)
const assistantOpen = ref(false)
const { ensureOpsData } = useOpsData()

// ── 三模式定义（与主页面保持一致）──────────────────────────────
const drawerModes = [
  {
    key: 'chat',
    en: 'Chat', zh: '对话', icon: '💬',
    placeholder: '随便聊点什么，比如：最近流行什么风格？',
    welcomeTitle: '随便聊点什么。',
    welcomeDesc: '美甲趋势、风格灵感、小红书文案，什么都可以问。',
    systemHint: '你现在处于自由对话模式。用户可能聊美甲趋势、风格灵感、随便提问，不需要强制引导到数据或操作。轻松、自然地回答即可，不用输出结构化分析。'
  },
  {
    key: 'insight',
    en: 'Insight', zh: '洞察', icon: '📊',
    placeholder: '问数据，比如：最近哪些款冷门风险高？',
    welcomeTitle: '数据都在这里。',
    welcomeDesc: '热度、冷门风险、趋势、日报，直接问就行。',
    systemHint: '你现在处于数据洞察模式。用户希望看到基于真实运营数据的深度分析。必须引用具体指标（hot_score、cold_risk_score、试戴量、确认率等），给出有数据支撑的结论。可以生成分析报告、趋势判断、异常预警。'
  },
  {
    key: 'action',
    en: 'Action', zh: '执行', icon: '⚡',
    placeholder: '说要做什么，比如：把冷门款下架，猫眼保留',
    welcomeTitle: '告诉我要做什么。',
    welcomeDesc: '上下架、改推荐位、批量操作，我来帮你执行。',
    systemHint: '你现在处于操作执行模式。用户希望真实执行运营操作。分析完成后，必须明确列出要执行的原子操作（上架/下架/推荐位调整等），说明影响范围和风险等级，并等待用户确认后执行。写操作必须先预览，高风险操作必须二次确认。'
  }
]

const QUICK_MAP = {
  chat:    ['最近流行什么美甲风格？', '帮我写一段猫眼款的小红书文案', '春夏季最受欢迎的色系是什么？'],
  insight: ['哪些款冷门风险最高？', '最近 7 天哪些款变热？', '生成今日运营日报'],
  action:  ['把冷掉的款下架，猫眼保留', '首页前 8 款怎么排？', '帮我刷新推荐位']
}

const drawerMode = ref('chat')
const drawerModeConfig = computed(() => drawerModes.find(m => m.key === drawerMode.value) || drawerModes[0])
const drawerQuickQuestions = computed(() => QUICK_MAP[drawerMode.value] || QUICK_MAP.chat)

function switchDrawerMode(key) {
  if (drawerMode.value === key) return
  drawerMode.value = key
  if (drawerMessages.value.length) {
    const cfg = drawerModes.find(m => m.key === key)
    drawerMessages.value.push({ id: ++dmId, role: 'system-notice', text: `已切换到 ${cfg.en} ${cfg.zh} 模式` })
    scrollDrawerBottom()
  }
}

// ── 消息状态 ────────────────────────────────────────────────
let dmId = 0
const drawerMessages = ref([])
const drawerInput = ref('')
const drawerLoading = ref(false)
const drawerChatRef = ref(null)
const drawerHistory = ref([])  // 传给后端的精简上下文

async function scrollDrawerBottom() {
  await nextTick()
  if (drawerChatRef.value) drawerChatRef.value.scrollTop = drawerChatRef.value.scrollHeight
}

function askDrawer(text) {
  drawerInput.value = text
  sendDrawer()
}

async function sendDrawer() {
  const text = drawerInput.value.trim()
  if (!text || drawerLoading.value) return

  drawerInput.value = ''
  drawerMessages.value.push({ id: ++dmId, role: 'user', text })
  drawerLoading.value = true
  await scrollDrawerBottom()

  try {
    const data = await callDrawerDeepSeek(text)
    const msg = {
      id: ++dmId,
      role: 'assistant',
      reply: data?.reply || '抱歉，未能获取回复。',
      ops: data?.ops?.length ? data.ops : null,
      executed: false,
      executing: false,
      execResults: null
    }
    drawerMessages.value.push(msg)
    // 更新上下文
    drawerHistory.value = [
      ...drawerHistory.value.slice(-6),
      { role: 'user', content: text },
      { role: 'assistant', content: typeof data?.reply === 'string' ? data.reply : JSON.stringify(data) }
    ]
  } catch (err) {
    ElMessage.error(err.message)
    drawerMessages.value.push({ id: ++dmId, role: 'assistant', reply: '请求失败，请稍后重试。' })
  } finally {
    drawerLoading.value = false
    await scrollDrawerBottom()
  }
}

async function callDrawerDeepSeek(text) {
  try {
    const opsData = await ensureOpsData()
    const res = await fetch('/api/ops-deepseek-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: drawerHistory.value.slice(-6),
        mode: drawerMode.value,
        modeHint: drawerModeConfig.value.systemHint,
        plannerMode: false,
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
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) { ElMessage.warning('DeepSeek：' + data.error); return null }
    return data
  } catch (e) {
    console.error('[Drawer DeepSeek]', e?.message || e)
    return null
  }
}

// ── Action 确认卡执行逻辑 ───────────────────────────────────
async function confirmDrawerOps(msg) {
  if (!msg.ops?.length || msg.executing) return
  msg.executing = true
  try {
    const { executePlan } = await import('./views/ai-assistant/aichata/action/executor.js')
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

function cancelDrawerOps(msg) {
  msg.ops = null
  ElMessage.info('已取消操作')
}

// ── 工具函数 ───────────────────────────────────────────────
function formatDrawerText(text) {
  return String(text || '').replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

function describeDrawerOp(op) {
  const p = op.params || {}
  if (p.ids?.$ref) return `← ${p.ids.$ref}`
  if (Array.isArray(p.ids)) return `${p.ids.length} 个款式`
  return p.name || p.styleId || (p.filters ? `${p.filters.length}个条件` : '') || ''
}

function describeDrawerResult(r) {
  if (!r.ok) return r.error || '失败'
  const p = r.resolvedParams || r.params || {}
  if (p.ids && Array.isArray(p.ids)) return `成功（${p.ids.length} 条）`
  if (r.data?.count != null) return `查询到 ${r.data.count} 条`
  if (r.data?.affected != null) return `影响 ${r.data.affected} 条`
  return p.name || p.styleId || '成功'
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
  padding: 14px 20px;
  margin-bottom: 0;
}
/* 隐藏 el-drawer 自带的关闭按钮左边的默认 title slot 空间 */
:deep(.assistant-drawer .el-drawer__header .el-drawer__title) { display: none; }

.drawer-chat {
  height: 100%; display: flex; flex-direction: column;
  background: #fff8f2;
}

/* ── Drawer header 自定义 ── */
.drawer-header-inner {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; gap: 12px;
}
.drawer-title {
  font-size: 15px; font-weight: 800; color: #2d1a10;
  letter-spacing: -0.01em; white-space: nowrap;
}

/* ── 模式切换（header 内嵌） ── */
.drawer-mode-bar {
  display: flex; gap: 2px;
  background: rgba(201,122,78,0.08);
  border-radius: 8px;
  padding: 2px;
}
.drawer-mode-btn {
  border: none; background: transparent; cursor: pointer;
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 6px;
  font-family: inherit;
  color: rgba(45,26,16,0.45);
  transition: background 150ms, color 150ms;
}
.drawer-mode-btn:hover { color: #a85e35; }
.drawer-mode-btn.active {
  background: #fff;
  color: #b86e4a;
  box-shadow: 0 1px 4px rgba(180,100,50,0.12);
}
.dm-en { font-size: 12px; font-weight: 700; letter-spacing: 0.02em; }
.dm-zh { font-size: 11px; opacity: 0.75; }

.drawer-chat-body { flex: 1; overflow: auto; padding: 16px; }

/* system-notice 分隔线 */
.drawer-notice {
  text-align: center; font-size: 11px; color: rgba(45,26,16,0.35);
  padding: 4px 0 8px; letter-spacing: 0.03em;
}

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

/* ── Action 确认卡 ── */
.drawer-ops-card {
  margin-top: 10px; padding: 10px;
  border: 1px solid rgba(201,122,78,0.22);
  border-radius: 12px;
  background: rgba(255,248,242,0.9);
}
.drawer-ops-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-bottom: 8px;
}
.drawer-ops-list {
  margin: 0 0 10px; padding-left: 18px; font-size: 12.5px; color: #4a3020;
}
.drawer-ops-list li { margin-bottom: 4px; line-height: 1.6; }
.drawer-op-hint { color: #a85e35; }
.drawer-op-reason { color: rgba(45,26,16,0.45); font-size: 11.5px; }
.drawer-ops-actions { display: flex; justify-content: flex-end; gap: 8px; }

/* ── 执行结果 ── */
.drawer-exec-result {
  margin-top: 10px; padding: 8px 10px;
  border-radius: 10px;
  background: rgba(240,255,245,0.9);
  border: 1px solid rgba(80,180,100,0.18);
  font-size: 12px;
}
.drawer-exec-row { display: flex; gap: 8px; align-items: center; padding: 2px 0; }
.drawer-exec-hint { color: rgba(45,26,16,0.5); font-size: 11.5px; }

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
