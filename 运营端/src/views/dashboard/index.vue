<template>
  <div class="dashboard-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>运营日报</h2>
      <p>今日经营数据概览，助您快速了解门店运营状况</p>
    </div>

    <!-- 数据卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon tryon">
            <el-icon :size="24"><View /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ todayStats.tryOnCount }}</div>
            <div class="stat-label">今日试戴次数</div>
            <div class="stat-trend up">
              <el-icon><CaretTop /></el-icon>
              较昨日 +{{ todayStats.tryOnTrend }}%
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon user">
            <el-icon :size="24"><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ todayStats.userCount }}</div>
            <div class="stat-label">试戴用户数</div>
            <div class="stat-trend up">
              <el-icon><CaretTop /></el-icon>
              较昨日 +{{ todayStats.userTrend }}%
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon confirm">
            <el-icon :size="24"><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ todayStats.confirmCount }}</div>
            <div class="stat-label">确认选择量</div>
            <div class="stat-trend up">
              <el-icon><CaretTop /></el-icon>
              较昨日 +{{ todayStats.confirmTrend }}%
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon avg">
            <el-icon :size="24"><DataAnalysis /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ todayStats.avgTryPerOrder }}</div>
            <div class="stat-label">平均试戴/成交</div>
            <div class="stat-trend down">
              <el-icon><CaretBottom /></el-icon>
              较昨日 {{ todayStats.avgTryTrend }}%
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 主要内容区 -->
    <el-row :gutter="20" class="main-content">
      <!-- 左侧：趋势图 + 爆款榜 -->
      <el-col :span="16">
        <!-- 趋势图 -->
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>试戴趋势</span>
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button label="week">近7天</el-radio-button>
                <el-radio-button label="month">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>

        <!-- 爆款榜 -->
        <el-card class="hot-list-card">
          <template #header>
            <div class="card-header">
              <span>🔥 热门款式 TOP 5</span>
              <el-button type="primary" text @click="goToTrending">
                查看全部 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="hotStyles" style="width: 100%">
            <el-table-column label="排名" width="60" align="center">
              <template #default="{ $index }">
                <span class="rank-badge" :class="'rank-' + ($index + 1)">{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="款式" width="200">
              <template #default="{ row }">
                <div class="style-info">
                  <el-image :src="row.image" class="style-image" fit="cover" />
                  <div class="style-detail">
                    <div class="style-name">{{ row.name }}</div>
                    <div class="style-tags">
                      <el-tag v-for="tag in row.tags.slice(0, 2)" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="tryOnCount" label="试戴次数" sortable>
              <template #default="{ row }">
                <span class="count-number">{{ row.tryOnCount.toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="confirmRate" label="意向率" sortable>
              <template #default="{ row }">
                <span class="rate-number">{{ row.confirmRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="hotIndex" label="爆款指数" sortable>
              <template #default="{ row }">
                <el-progress :percentage="row.hotIndex" :stroke-width="8" :show-text="false" />
                <span class="index-value">{{ row.hotIndex }}</span>
              </template>
            </el-table-column>
            <el-table-column label="趋势" width="80" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.trend === 'up'" color="#52C41A"><CaretTop /></el-icon>
                <el-icon v-else-if="row.trend === 'down'" color="#F5222D"><CaretBottom /></el-icon>
                <el-icon v-else color="#999"><Minus /></el-icon>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧：运营建议 + 实时动态 -->
      <el-col :span="8">
        <!-- 运营建议 -->
        <el-card class="suggestion-card">
          <template #header>
            <div class="card-header">
              <span>💡 运营建议</span>
            </div>
          </template>
          <div class="suggestion-list">
            <div 
              v-for="item in suggestions" 
              :key="item.type" 
              class="suggestion-item"
              :class="'priority-' + item.priority"
            >
              <div class="suggestion-title">
                <el-icon v-if="item.type === 'hot'" color="#FF6B9D"><TrendCharts /></el-icon>
                <el-icon v-else-if="item.type === 'potential'" color="#FA8C16"><Star /></el-icon>
                <el-icon v-else-if="item.type === 'cold'" color="#1890FF"><Warning /></el-icon>
                <el-icon v-else color="#52C41A"><DataAnalysis /></el-icon>
                <span>{{ item.title }}</span>
              </div>
              <div class="suggestion-content">{{ item.content }}</div>
            </div>
          </div>
        </el-card>

        <!-- 实时动态 -->
        <el-card class="activity-card">
          <template #header>
            <div class="card-header">
              <span>📋 实时动态</span>
            </div>
          </template>
          <div class="activity-list">
            <div v-for="item in activities" :key="item.id" class="activity-item">
              <div class="activity-icon" :class="item.type">
                <el-icon v-if="item.type === 'tryon'"><View /></el-icon>
                <el-icon v-else-if="item.type === 'appointment'"><Calendar /></el-icon>
                <el-icon v-else-if="item.type === 'favorite'"><Star /></el-icon>
                <el-icon v-else><CircleCheck /></el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  <span class="user-name">{{ item.user }}</span>
                  {{ item.content }}
                </div>
                <div class="activity-time">{{ item.time }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { 
  todayStats, 
  trendData, 
  hotStyles, 
  operationSuggestions,
  recentActivities 
} from '@/mock/data'

const router = useRouter()
const trendChartRef = ref(null)
const chartType = ref('week')

// 使用mock数据
const suggestions = operationSuggestions
const activities = recentActivities

// 初始化趋势图
const initTrendChart = () => {
  const chart = echarts.init(trendChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['爆款款式', '冷门款式'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.dates
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '爆款款式',
        type: 'line',
        smooth: true,
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
  
  // 响应式
  window.addEventListener('resize', () => chart.resize())
}

const goToTrending = () => {
  router.push('/trending')
}

onMounted(() => {
  nextTick(() => {
    initTrendChart()
  })
})
</script>

<style scoped>
.dashboard-page {
  padding: 0;
}

/* 数据卡片 */
.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.tryon {
  background: linear-gradient(135deg, #FF6B9D 0%, #FF8E53 100%);
}

.stat-icon.user {
  background: linear-gradient(135deg, #1890FF 0%, #36CFC9 100%);
}

.stat-icon.confirm {
  background: linear-gradient(135deg, #52C41A 0%, #73D13D 100%);
}

.stat-icon.avg {
  background: linear-gradient(135deg, #722ED1 0%, #9254DE 100%);
}

.stat-content .stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-content .stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

.stat-trend {
  font-size: 12px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-trend.up {
  color: #52C41A;
}

.stat-trend.down {
  color: #F5222D;
}

/* 图表卡片 */
.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 300px;
}

/* 爆款榜 */
.hot-list-card {
  margin-bottom: 20px;
}

.rank-badge {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  background: #999;
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

.style-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.style-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
}

.style-name {
  font-weight: 500;
  color: #333;
}

.style-tags {
  margin-top: 4px;
}

.tag-item {
  margin-right: 4px;
}

.count-number {
  font-weight: 500;
  color: #333;
}

.rate-number {
  color: #52C41A;
  font-weight: 500;
}

.index-value {
  font-size: 12px;
  color: #666;
  margin-left: 8px;
}

/* 运营建议 */
.suggestion-card {
  margin-bottom: 20px;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.suggestion-item {
  padding: 12px;
  border-radius: 8px;
  background: #F5F7FA;
}

.suggestion-item.priority-high {
  border-left: 3px solid #FF6B9D;
}

.suggestion-item.priority-medium {
  border-left: 3px solid #FA8C16;
}

.suggestion-item.priority-low {
  border-left: 3px solid #1890FF;
}

.suggestion-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.suggestion-content {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

/* 实时动态 */
.activity-card {
  margin-bottom: 20px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
}

.activity-icon.tryon {
  background: #FF6B9D;
}

.activity-icon.appointment {
  background: #1890FF;
}

.activity-icon.favorite {
  background: #FA8C16;
}

.activity-icon.confirm {
  background: #52C41A;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 13px;
  color: #333;
}

.user-name {
  font-weight: 500;
  color: #FF6B9D;
}

.activity-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
