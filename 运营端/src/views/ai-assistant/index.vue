<template>
  <div class="ai-assistant-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>AI运营助手</h2>
      <p>智能分析运营数据，生成专业建议，辅助决策</p>
    </div>

    <el-row :gutter="20">
      <!-- 左侧：快捷问题 -->
      <el-col :span="8">
        <el-card class="quick-questions-card">
          <template #header>
            <span>快捷问题</span>
          </template>
          <div class="quick-questions">
            <div 
              v-for="question in quickQuestions" 
              :key="question.id"
              class="question-item"
              @click="askQuestion(question)"
            >
              <el-icon :size="20" :color="question.color">
                <component :is="question.icon" />
              </el-icon>
              <span>{{ question.text }}</span>
            </div>
          </div>
        </el-card>

        <!-- 使用说明 -->
        <el-card class="tips-card">
          <template #header>
            <span>使用说明</span>
          </template>
          <div class="tips-content">
            <p>AI运营助手可以帮您：</p>
            <ul>
              <li>分析今日运营数据</li>
              <li>发现爆款和潜力款</li>
              <li>预警冷门款式</li>
              <li>生成运营建议</li>
              <li>调整推荐位策略</li>
            </ul>
            <el-alert 
              type="warning" 
              :closable="false"
              show-icon
            >
              <template #title>
                AI建议仅供参考，实际操作需商家确认
              </template>
            </el-alert>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：对话区域 -->
      <el-col :span="16">
        <el-card class="chat-card">
          <template #header>
            <div class="chat-header">
              <span>AI运营助手</span>
              <el-button text @click="clearChat">
                <el-icon><Delete /></el-icon>
                清空对话
              </el-button>
            </div>
          </template>

          <!-- 对话内容 -->
          <div ref="chatContainerRef" class="chat-container">
            <div v-if="chatMessages.length === 0" class="welcome-message">
              <div class="welcome-icon">🤖</div>
              <h3>你好，我是AI运营助手</h3>
              <p>我可以帮你分析今日试戴数据、发现爆款、预警冷门款，并生成运营建议。</p>
              <p>你可以点击左侧快捷问题，或直接输入你想了解的问题。</p>
            </div>

            <div 
              v-for="(msg, index) in chatMessages" 
              :key="index"
              class="message-item"
              :class="msg.role"
            >
              <div class="message-avatar">
                <el-avatar v-if="msg.role === 'user'" :size="32" icon="User" />
                <el-avatar v-else :size="32" style="background: #FF6B9D">AI</el-avatar>
              </div>
              <div class="message-content">
                <div class="message-text" v-html="formatMessage(msg.content)"></div>
                <div v-if="msg.role === 'assistant' && msg.actions" class="message-actions">
                  <el-button 
                    v-for="action in msg.actions" 
                    :key="action.text"
                    :type="action.type"
                    size="small"
                    @click="handleAction(action)"
                  >
                    {{ action.text }}
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 加载中 -->
            <div v-if="isLoading" class="message-item assistant">
              <div class="message-avatar">
                <el-avatar :size="32" style="background: #FF6B9D">AI</el-avatar>
              </div>
              <div class="message-content">
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 输入框 -->
          <div class="chat-input">
            <el-input
              v-model="inputMessage"
              placeholder="请输入你想了解的问题..."
              @keyup.enter="sendMessage"
            >
              <template #append>
                <el-button type="primary" @click="sendMessage" :loading="isLoading">
                  发送
                </el-button>
              </template>
            </el-input>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { todayStats, hotStyles, coldStyles, operationSuggestions } from '@/mock/data'

const chatContainerRef = ref(null)
const inputMessage = ref('')
const isLoading = ref(false)
const chatMessages = ref([])

const quickQuestions = [
  { id: 1, text: '今日运营怎么样？', icon: 'DataAnalysis', color: '#FF6B9D' },
  { id: 2, text: '今天哪些款值得主推？', icon: 'TrendCharts', color: '#FA8C16' },
  { id: 3, text: '哪些款需要提高曝光？', icon: 'Promotion', color: '#1890FF' },
  { id: 4, text: '帮我生成推荐位调整方案', icon: 'Grid', color: '#52C41A' },
  { id: 5, text: '顾客最近喜欢什么风格？', icon: 'User', color: '#722ED1' },
  { id: 6, text: '帮我生成今日运营日报', icon: 'Document', color: '#13C2C2' }
]

// AI回复模板
const aiResponses = {
  '今日运营怎么样？': generateTodayReport,
  '今天哪些款值得主推？': generateHotRecommend,
  '哪些款需要提高曝光？': generateExposureSuggest,
  '帮我生成推荐位调整方案': generateRecommendPlan,
  '顾客最近喜欢什么风格？': generateStylePreference,
  '帮我生成今日运营日报': generateDailyReport
}

function generateTodayReport() {
  return {
    content: `📊 **今日运营数据概览**

**核心指标：**
- 试戴次数：${todayStats.tryOnCount}次（较昨日 +${todayStats.tryOnTrend}%）
- 试戴用户：${todayStats.userCount}人（较昨日 +${todayStats.userTrend}%）
- 确认选择：${todayStats.confirmCount}单（较昨日 +${todayStats.confirmTrend}%）
- 平均试戴/成交：${todayStats.avgTryPerOrder}次

**运营建议：**
1. 今日试戴量增长明显，建议保持当前推荐策略
2. 「法式优雅」表现最佳，可继续主推
3. 「复古格纹」意向率高但曝光不足，建议提高推荐位权重`,
    actions: [
      { text: '查看详细数据', type: 'primary', action: 'viewDetail' },
      { text: '调整推荐策略', type: 'default', action: 'adjustRecommend' }
    ]
  }
}

function generateHotRecommend() {
  const top3 = hotStyles.slice(0, 3)
  return {
    content: `🔥 **今日主推款式建议**

根据试戴量、意向率和爆款指数综合分析：

**TOP 3 主推款：**
1. **${top3[0].name}** - 爆款指数 ${top3[0].hotIndex}，试戴${top3[0].tryOnCount}次
2. **${top3[1].name}** - 爆款指数 ${top3[1].hotIndex}，试戴${top3[1].tryOnCount}次
3. **${top3[2].name}** - 爆款指数 ${top3[2].hotIndex}，试戴${top3[2].tryOnCount}次

**建议操作：**
- 将这3款放在推荐位前3位
- 可考虑搭配限时优惠活动提升转化`,
    actions: [
      { text: '一键设为主推', type: 'primary', action: 'setRecommend' },
      { text: '查看款式详情', type: 'default', action: 'viewStyles' }
    ]
  }
}

function generateExposureSuggest() {
  const potential = coldStyles.filter(s => s.type === 'potential')
  return {
    content: `📈 **需要提高曝光的款式**

根据数据分析，以下款式具有较高潜力：

**潜力款（低试戴 + 高意向）：**
${potential.map(s => `- **${s.name}**：意向率 ${s.confirmRate}%，建议提高曝光`).join('\n')}

**具体建议：**
1. 将潜力款加入推荐位第4-6位
2. 在首页增加"猜你喜欢"入口
3. 针对偏好用户精准推送`,
    actions: [
      { text: '调整推荐位', type: 'primary', action: 'adjustRecommend' },
      { text: '查看冷门榜', type: 'default', action: 'viewCold' }
    ]
  }
}

function generateRecommendPlan() {
  return {
    content: `📋 **推荐位调整方案**

基于当前数据和运营目标，建议如下调整：

**推荐位布局：**
| 位置 | 款式 | 推荐原因 |
|------|------|----------|
| 1 | 法式优雅 | 爆款主推，今日试戴量最高 |
| 2 | 渐变梦幻 | 爆款主推，转化率稳定 |
| 3 | 猫眼美甲 | 上升趋势明显，潜力爆款 |
| 4 | 彩绘星空 | 新品推荐，丰富款式类型 |
| 5 | 纯欲裸色 | 性价比之选，适合日常 |
| 6 | 复古格纹 | 冷门激活款，高意向率待曝光 |

**预期效果：**
- 预计试戴量提升15-20%
- 冷门款激活率提升30%`,
    actions: [
      { text: '应用此方案', type: 'primary', action: 'applyPlan' },
      { text: '手动调整', type: 'default', action: 'manualAdjust' }
    ]
  }
}

function generateStylePreference() {
  return {
    content: `👥 **顾客风格偏好分析**

**颜色偏好 TOP 3：**
1. 粉色系 - 32%
2. 蓝色系 - 25%
3. 红色系 - 20%

**风格偏好 TOP 3：**
1. 法式 - 35%
2. 渐变 - 28%
3. 彩绘 - 22%

**场景偏好：**
- 约会场景：38%
- 职场场景：30%
- 日常场景：20%
- 派对场景：12%

**上新建议：**
- 增加粉色系法式款式
- 开发约会场景专属款式
- 考虑增加猫眼系列（上升趋势明显）`,
    actions: [
      { text: '查看详细画像', type: 'primary', action: 'viewProfile' }
    ]
  }
}

function generateDailyReport() {
  return {
    content: `📄 **今日运营日报**

**一、经营数据**
- 试戴次数：${todayStats.tryOnCount}次 ↑${todayStats.tryOnTrend}%
- 试戴用户：${todayStats.userCount}人 ↑${todayStats.userTrend}%
- 确认选择：${todayStats.confirmCount}单 ↑${todayStats.confirmTrend}%

**二、爆款趋势**
- TOP1：法式优雅（试戴${hotStyles[0].tryOnCount}次）
- TOP2：渐变梦幻（试戴${hotStyles[1].tryOnCount}次）
- TOP3：彩绘星空（试戴${hotStyles[2].tryOnCount}次）

**三、运营建议**
${operationSuggestions.map(s => `- ${s.content}`).join('\n')}

**四、明日计划**
1. 继续主推「法式优雅」
2. 提高「复古格纹」曝光
3. 考虑下架「金属质感」`,
    actions: [
      { text: '导出日报', type: 'primary', action: 'exportReport' },
      { text: '分享给团队', type: 'default', action: 'shareReport' }
    ]
  }
}

function askQuestion(question) {
  inputMessage.value = question.text
  sendMessage()
}

async function sendMessage() {
  if (!inputMessage.value.trim()) return
  
  const userMessage = inputMessage.value.trim()
  chatMessages.value.push({ role: 'user', content: userMessage })
  inputMessage.value = ''
  
  isLoading.value = true
  
  // 滚动到底部
  await nextTick()
  scrollToBottom()
  
  // 模拟AI响应
  setTimeout(() => {
    const response = aiResponses[userMessage] || {
      content: `我理解您的问题是："${userMessage}"。\n\n让我为您分析相关数据...`,
      actions: []
    }
    
    chatMessages.value.push({ 
      role: 'assistant', 
      content: response.content,
      actions: response.actions
    })
    
    isLoading.value = false
    nextTick(() => scrollToBottom())
  }, 1500)
}

function formatMessage(content) {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

function scrollToBottom() {
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

function handleAction(action) {
  ElMessage.success(`执行操作：${action.text}`)
}

function clearChat() {
  chatMessages.value = []
  ElMessage.success('对话已清空')
}
</script>

<style scoped>
.ai-assistant-page {
  padding: 0;
}

.quick-questions-card {
  margin-bottom: 20px;
}

.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #F5F7FA;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.question-item:hover {
  background: #FFF0F5;
  color: #FF6B9D;
}

.tips-card {
  margin-bottom: 20px;
}

.tips-content {
  font-size: 14px;
  color: #666;
}

.tips-content ul {
  margin: 12px 0;
  padding-left: 20px;
}

.tips-content li {
  margin-bottom: 8px;
}

.chat-card {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.chat-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.welcome-message {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome-message h3 {
  font-size: 20px;
  color: #333;
  margin-bottom: 12px;
}

.welcome-message p {
  margin-bottom: 8px;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
}

.message-text {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 14px;
}

.message-item.user .message-text {
  background: #FF6B9D;
  color: #fff;
}

.message-item.assistant .message-text {
  background: #F5F7FA;
  color: #333;
}

.message-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: #F5F7FA;
  border-radius: 12px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #FF6B9D;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

.chat-input {
  padding: 16px 20px;
  border-top: 1px solid #E4E7ED;
}
</style>
