<template>
  <div class="trending-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>爆款库管理</h2>
      <p>自动识别爆款和冷门预警，数据驱动运营决策</p>
    </div>

    <!-- 上部：爆款榜 + 冷门榜 -->
    <el-row :gutter="20" class="top-section">
      <!-- 爆款榜 -->
      <el-col :span="12">
        <el-card class="list-card">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <span class="card-title">🔥 爆款榜</span>
                <el-tag type="danger" size="small">TOP 6</el-tag>
              </div>
              <el-button type="primary" text size="small">
                查看全部 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          
          <!-- 爆款列表 -->
          <div class="style-grid">
            <div 
              v-for="(item, index) in hotStyles" 
              :key="item.id" 
              class="style-card"
            >
              <!-- 排名角标 -->
              <div class="rank-badge" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
              
              <!-- 款式图片 -->
              <el-image :src="item.image" class="style-image" fit="cover" />
              
              <!-- 款式信息 -->
              <div class="style-info">
                <div class="style-name">{{ item.name }}</div>
                <div class="style-tags">
                  <el-tag v-for="tag in item.tags.slice(0, 2)" :key="tag" size="small">{{ tag }}</el-tag>
                </div>
                
                <!-- 数据指标 -->
                <div class="style-metrics">
                  <div class="metric-item">
                    <span class="metric-value">{{ item.tryOnCount.toLocaleString() }}</span>
                    <span class="metric-label">试戴</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value">{{ item.confirmRate }}%</span>
                    <span class="metric-label">意向率</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value hot">{{ item.hotIndex }}</span>
                    <span class="metric-label">指数</span>
                  </div>
                </div>
                
                <!-- 趋势和操作 -->
                <div class="style-footer">
                  <div class="trend-tag" :class="item.trend">
                    <el-icon v-if="item.trend === 'up'"><CaretTop /></el-icon>
                    <el-icon v-else-if="item.trend === 'down'"><CaretBottom /></el-icon>
                    <el-icon v-else><Minus /></el-icon>
                    <span>{{ item.trend === 'up' ? '上升' : item.trend === 'down' ? '下降' : '平稳' }}</span>
                  </div>
                  <el-button type="primary" size="small" @click="setAsRecommend(item)">
                    设为主推
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 冷门榜 -->
      <el-col :span="12">
        <el-card class="list-card">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <span class="card-title">❄️ 冷门榜</span>
                <el-tag type="info" size="small">预警</el-tag>
              </div>
              <el-button type="primary" text size="small">
                查看全部 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          
          <!-- 冷门类型说明 -->
          <div class="cold-legend">
            <div class="legend-item potential">
              <span class="dot"></span>潜力款
            </div>
            <div class="legend-item cold">
              <span class="dot"></span>真冷门
            </div>
            <div class="legend-item traffic">
              <span class="dot"></span>引流款
            </div>
          </div>
          
          <!-- 冷门列表 -->
          <div class="style-grid">
            <div 
              v-for="item in coldStyles" 
              :key="item.id" 
              class="style-card cold-card"
              :class="item.type"
            >
              <!-- 类型标签 -->
              <div class="type-badge" :class="item.type">
                {{ getColdTypeLabel(item.type) }}
              </div>
              
              <!-- 款式图片 -->
              <el-image :src="item.image" class="style-image" fit="cover" />
              
              <!-- 款式信息 -->
              <div class="style-info">
                <div class="style-name">{{ item.name }}</div>
                
                <!-- 数据指标 -->
                <div class="style-metrics">
                  <div class="metric-item">
                    <span class="metric-value">{{ item.tryOnCount }}</span>
                    <span class="metric-label">试戴</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value" :class="item.confirmRate > 20 ? 'high' : ''">{{ item.confirmRate }}%</span>
                    <span class="metric-label">意向率</span>
                  </div>
                </div>
                
                <!-- 运营建议 -->
                <div class="suggestion-box">
                  <el-icon><InfoFilled /></el-icon>
                  <span>{{ item.suggestion }}</span>
                </div>
                
                <!-- 操作按钮 -->
                <el-button 
                  :type="getActionType(item.type)" 
                  size="small"
                  class="action-btn"
                  @click="handleColdAction(item)"
                >
                  {{ getActionText(item.type) }}
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 下部：趋势分析 -->
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="card-title">📈 试戴趋势分析</span>
          </div>
          <el-radio-group v-model="trendRange" size="small">
            <el-radio-button label="7">近7天</el-radio-button>
            <el-radio-button label="30">近30天</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="18">
          <div ref="trendChartRef" class="chart-container"></div>
        </el-col>
        <el-col :span="6">
          <div class="chart-summary">
            <div class="summary-title">数据洞察</div>
            <div class="summary-item">
              <div class="summary-label">爆款总试戴</div>
              <div class="summary-value hot">{{ hotTotalTryOn.toLocaleString() }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">冷门总试戴</div>
              <div class="summary-value cold">{{ coldTotalTryOn.toLocaleString() }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">爆款占比</div>
              <div class="summary-value">{{ hotPercent }}%</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">趋势判断</div>
              <div class="summary-value trend-up">
                <el-icon><CaretTop /></el-icon>
                整体上升
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
      
      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-line hot"></span>
          <span>爆款款式试戴趋势</span>
        </div>
        <div class="legend-item">
          <span class="legend-line cold"></span>
          <span>冷门款式试戴趋势</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { trendData, hotStyles, coldStyles } from '@/mock/data'

const trendRange = ref('7')
const trendChartRef = ref(null)

// 计算统计数据
const hotTotalTryOn = computed(() => hotStyles.reduce((sum, item) => sum + item.tryOnCount, 0))
const coldTotalTryOn = computed(() => coldStyles.reduce((sum, item) => sum + item.tryOnCount, 0))
const hotPercent = computed(() => {
  const total = hotTotalTryOn.value + coldTotalTryOn.value
  return total > 0 ? Math.round(hotTotalTryOn.value / total * 100) : 0
})

// 初始化趋势图
const initTrendChart = () => {
  const chart = echarts.init(trendChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E4E7ED',
      borderWidth: 1,
      textStyle: {
        color: '#333'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.dates,
      axisLine: {
        lineStyle: {
          color: '#E4E7ED'
        }
      },
      axisLabel: {
        color: '#606266'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#E4E7ED',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '爆款款式',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#FF6B9D',
          width: 3
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 157, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 157, 0.05)' }
          ])
        },
        itemStyle: {
          color: '#FF6B9D'
        },
        data: trendData.hotTrend
      },
      {
        name: '冷门款式',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#1890FF',
          width: 3
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
          ])
        },
        itemStyle: {
          color: '#1890FF'
        },
        data: trendData.coldTrend
      }
    ]
  }
  
  chart.setOption(option)
  
  window.addEventListener('resize', () => chart.resize())
}

const getColdTypeLabel = (type) => {
  const map = {
    potential: '潜力款',
    cold: '真冷门',
    traffic: '引流款'
  }
  return map[type] || '未知'
}

const getActionType = (type) => {
  const map = {
    potential: 'success',
    cold: 'danger',
    traffic: 'warning'
  }
  return map[type] || 'default'
}

const getActionText = (type) => {
  const map = {
    potential: '提高曝光',
    cold: '下架',
    traffic: '优化款式'
  }
  return map[type] || '处理'
}

const setAsRecommend = (row) => {
  ElMessage.success(`已将「${row.name}」设为主推款`)
}

const handleColdAction = (row) => {
  const actions = {
    potential: `已提高「${row.name}」的曝光权重`,
    cold: `已下架「${row.name}」`,
    traffic: `请优化「${row.name}」的封面或价格`
  }
  ElMessage.success(actions[row.type])
}

onMounted(() => {
  nextTick(() => {
    initTrendChart()
  })
})
</script>

<style scoped>
.trending-page {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.page-header p {
  font-size: 14px;
  color: #999;
}

/* 上部区域 */
.top-section {
  margin-bottom: 20px;
}

.list-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

/* 冷门类型图例 */
.cold-legend {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px;
  background: #F5F7FA;
  border-radius: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
}

.legend-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-item.potential .dot {
  background: #FA8C16;
}

.legend-item.cold .dot {
  background: #F5222D;
}

.legend-item.traffic .dot {
  background: #1890FF;
}

/* 款式卡片网格 - 3列2行 */
.style-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* 款式卡片 */
.style-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #E4E7ED;
  transition: all 0.3s;
  position: relative;
}

.style-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 排名角标 */
.rank-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  background: #999;
  z-index: 1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #CD7F32 0%, #B8860B 100%);
}

/* 类型标签 */
.type-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  z-index: 1;
}

.type-badge.potential {
  background: linear-gradient(135deg, #FA8C16 0%, #FAAD14 100%);
}

.type-badge.cold {
  background: linear-gradient(135deg, #F5222D 0%, #FF4D4F 100%);
}

.type-badge.traffic {
  background: linear-gradient(135deg, #1890FF 0%, #40A9FF 100%);
}

/* 款式图片 */
.style-image {
  width: 100%;
  height: 140px;
  display: block;
}

/* 款式信息 */
.style-info {
  padding: 10px;
}

.style-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.style-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.style-tags .el-tag {
  background: #FFF0F5;
  color: #FF6B9D;
  border: none;
  font-size: 10px;
}

/* 数据指标 */
.style-metrics {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-top: 1px solid #F0F0F0;
  border-bottom: 1px solid #F0F0F0;
  margin-bottom: 8px;
}

.metric-item {
  text-align: center;
  flex: 1;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: block;
}

.metric-value.hot {
  color: #FF6B9D;
}

.metric-value.high {
  color: #FA8C16;
}

.metric-label {
  font-size: 10px;
  color: #999;
  display: block;
  margin-top: 2px;
}

/* 趋势标签 */
.trend-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.trend-tag.up {
  background: #F6FFED;
  color: #52C41A;
}

.trend-tag.down {
  background: #FFF2F0;
  color: #F5222D;
}

.trend-tag.stable {
  background: #F5F7FA;
  color: #999;
}

/* 底部操作 */
.style-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 运营建议 */
.suggestion-box {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 6px;
  background: #F5F7FA;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 11px;
  color: #666;
  line-height: 1.4;
}

.suggestion-box .el-icon {
  color: #1890FF;
  flex-shrink: 0;
  margin-top: 1px;
}

.action-btn {
  width: 100%;
}

/* 冷门卡片边框 */
.cold-card.potential {
  border-left: 3px solid #FA8C16;
}

.cold-card.cold {
  border-left: 3px solid #F5222D;
}

.cold-card.traffic {
  border-left: 3px solid #1890FF;
}

/* 趋势图表 */
.chart-card {
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
}

.chart-summary {
  padding: 16px;
  background: #F5F7FA;
  border-radius: 8px;
  height: 100%;
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E4E7ED;
}

.summary-item {
  margin-bottom: 16px;
}

.summary-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.summary-value.hot {
  color: #FF6B9D;
}

.summary-value.cold {
  color: #1890FF;
}

.summary-value.trend-up {
  font-size: 14px;
  color: #52C41A;
  display: flex;
  align-items: center;
  gap: 4px;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E4E7ED;
}

.chart-legend .legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.legend-line {
  width: 24px;
  height: 3px;
  border-radius: 2px;
}

.legend-line.hot {
  background: #FF6B9D;
}

.legend-line.cold {
  background: #1890FF;
}
</style>
