<template>
  <div class="trending-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>爆款库管理</h2>
      <p>自动识别爆款和冷门预警，数据驱动运营决策</p>
    </div>

    <!-- Tab切换 -->
    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 趋势分析 -->
      <el-tab-pane label="趋势分析" name="trend">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>试戴趋势对比</span>
              <el-radio-group v-model="trendRange" size="small">
                <el-radio-button label="7">近7天</el-radio-button>
                <el-radio-button label="30">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
          <div class="trend-legend">
            <div class="legend-item">
              <span class="legend-color hot"></span>
              <span>爆款款式试戴趋势</span>
            </div>
            <div class="legend-item">
              <span class="legend-color cold"></span>
              <span>冷门款式试戴趋势</span>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 爆款榜 -->
      <el-tab-pane label="爆款榜" name="hot">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>🔥 爆款款式排行</span>
              <div class="header-actions">
                <el-alert 
                  title="爆款判定规则：爆款指数 = 0.40 × 试戴热度分 + 0.35 × 确认选择率分 + 0.25 × 试戴点击率分" 
                  type="info" 
                  :closable="false"
                  show-icon
                />
              </div>
            </div>
          </template>
          <el-table :data="hotStyles" style="width: 100%">
            <el-table-column label="排名" width="70" align="center">
              <template #default="{ $index }">
                <span class="rank-badge" :class="'rank-' + ($index + 1)">{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="款式信息" min-width="220">
              <template #default="{ row }">
                <div class="style-info">
                  <el-image :src="row.image" class="style-image" fit="cover" />
                  <div class="style-detail">
                    <div class="style-name">{{ row.name }}</div>
                    <div class="style-tags">
                      <el-tag v-for="tag in row.tags" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="tryOnCount" label="试戴次数" width="120" sortable>
              <template #default="{ row }">
                <span class="count-number">{{ row.tryOnCount.toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="confirmRate" label="意向率" width="100" sortable>
              <template #default="{ row }">
                <span class="rate-number">{{ row.confirmRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="clickRate" label="点击率" width="100" sortable>
              <template #default="{ row }">
                <span>{{ row.clickRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="hotIndex" label="爆款指数" width="150" sortable>
              <template #default="{ row }">
                <div class="index-cell">
                  <el-progress 
                    :percentage="row.hotIndex" 
                    :stroke-width="8" 
                    :show-text="false"
                    :color="row.hotIndex > 80 ? '#FF6B9D' : row.hotIndex > 60 ? '#FA8C16' : '#1890FF'"
                  />
                  <span class="index-value">{{ row.hotIndex }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="趋势" width="80" align="center">
              <template #default="{ row }">
                <div class="trend-icon" :class="row.trend">
                  <el-icon v-if="row.trend === 'up'"><CaretTop /></el-icon>
                  <el-icon v-else-if="row.trend === 'down'"><CaretBottom /></el-icon>
                  <el-icon v-else><Minus /></el-icon>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" text size="small" @click="setAsRecommend(row)">
                  设为主推
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 冷门榜 -->
      <el-tab-pane label="冷门榜" name="cold">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>❄️ 冷门款式预警</span>
            </div>
          </template>
          
          <!-- 分类说明 -->
          <div class="cold-type-legend">
            <div class="type-item potential">
              <el-icon><Star /></el-icon>
              <span>潜力款：低试戴 + 高意向，建议提高曝光</span>
            </div>
            <div class="type-item cold">
              <el-icon><Warning /></el-icon>
              <span>真冷门：低试戴 + 低意向，建议下架/降权</span>
            </div>
            <div class="type-item traffic">
              <el-icon><View /></el-icon>
              <span>引流款：高试戴 + 低意向，建议优化封面/价格</span>
            </div>
          </div>

          <el-table :data="coldStyles" style="width: 100%">
            <el-table-column label="款式信息" min-width="200">
              <template #default="{ row }">
                <div class="style-info">
                  <el-image :src="row.image" class="style-image" fit="cover" />
                  <div class="style-detail">
                    <div class="style-name">{{ row.name }}</div>
                    <el-tag :type="getColdTypeTag(row.type)" size="small">
                      {{ getColdTypeLabel(row.type) }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="tryOnCount" label="试戴次数" width="120" sortable>
              <template #default="{ row }">
                <span class="count-number low">{{ row.tryOnCount }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="confirmCount" label="意向量" width="100" sortable>
              <template #default="{ row }">
                <span>{{ row.confirmCount }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="confirmRate" label="意向率" width="100" sortable>
              <template #default="{ row }">
                <span :class="row.confirmRate > 20 ? 'rate-number high' : ''">{{ row.confirmRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column label="运营建议" min-width="200">
              <template #default="{ row }">
                <div class="suggestion-cell">
                  <el-icon><InfoFilled /></el-icon>
                  <span>{{ row.suggestion }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button 
                  v-if="row.type === 'potential'" 
                  type="success" 
                  size="small"
                  @click="increaseExposure(row)"
                >
                  提高曝光
                </el-button>
                <el-button 
                  v-if="row.type === 'traffic'" 
                  type="warning" 
                  size="small"
                  @click="optimizeStyle(row)"
                >
                  优化款式
                </el-button>
                <el-button 
                  v-if="row.type === 'cold'" 
                  type="danger" 
                  size="small"
                  @click="offlineStyle(row)"
                >
                  下架
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { trendData, hotStyles, coldStyles } from '@/mock/data'

const activeTab = ref('trend')
const trendRange = ref('7')
const trendChartRef = ref(null)

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

const getColdTypeTag = (type) => {
  const map = {
    potential: 'warning',
    cold: 'danger',
    traffic: 'info'
  }
  return map[type] || 'info'
}

const getColdTypeLabel = (type) => {
  const map = {
    potential: '潜力款',
    cold: '真冷门',
    traffic: '引流款'
  }
  return map[type] || '未知'
}

const setAsRecommend = (row) => {
  ElMessage.success(`已将「${row.name}」设为主推款`)
}

const increaseExposure = (row) => {
  ElMessage.success(`已提高「${row.name}」的曝光权重`)
}

const optimizeStyle = (row) => {
  ElMessage.info(`请优化「${row.name}」的封面或价格`)
}

const offlineStyle = (row) => {
  ElMessage.warning(`已下架「${row.name}」`)
}

watch(activeTab, (val) => {
  if (val === 'trend') {
    nextTick(() => {
      initTrendChart()
    })
  }
})

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

.main-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  flex: 1;
  margin-left: 20px;
}

.chart-container {
  height: 350px;
}

.trend-legend {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.legend-color {
  width: 24px;
  height: 4px;
  border-radius: 2px;
}

.legend-color.hot {
  background: #FF6B9D;
}

.legend-color.cold {
  background: #1890FF;
}

/* 排名徽章 */
.rank-badge {
  display: inline-block;
  width: 28px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  border-radius: 50%;
  font-size: 14px;
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

/* 款式信息 */
.style-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.style-image {
  width: 56px;
  height: 56px;
  border-radius: 8px;
}

.style-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
}

.style-tags {
  display: flex;
  gap: 4px;
}

.tag-item {
  background: #FFF0F5;
  color: #FF6B9D;
  border: none;
}

.count-number {
  font-weight: 500;
  color: #333;
}

.count-number.low {
  color: #999;
}

.rate-number {
  color: #52C41A;
  font-weight: 500;
}

.rate-number.high {
  color: #FA8C16;
}

.index-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.index-value {
  font-size: 13px;
  color: #666;
  min-width: 30px;
}

.trend-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.trend-icon.up {
  color: #52C41A;
}

.trend-icon.down {
  color: #F5222D;
}

.trend-icon.stable {
  color: #999;
}

/* 冷门类型说明 */
.cold-type-legend {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px;
  background: #F5F7FA;
  border-radius: 8px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.type-item.potential {
  color: #FA8C16;
}

.type-item.cold {
  color: #F5222D;
}

.type-item.traffic {
  color: #1890FF;
}

.suggestion-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}
</style>
