<template>
  <div class="recommend-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>推荐位管理</h2>
      <p>管理小程序首页推荐位，AI智能推荐 + 手动调整</p>
    </div>

    <!-- 说明卡片 -->
    <el-card class="info-card">
      <div class="info-content">
        <el-icon :size="20" color="#FF6B9D"><InfoFilled /></el-icon>
        <span>推荐位共6个位置，AI会根据款式表现自动推荐。商家可根据运营目标（快速变现/清冷款）手动调整推荐策略。</span>
      </div>
    </el-card>

    <!-- 推荐策略选择 -->
    <el-card class="strategy-card">
      <template #header>
        <span>推荐策略</span>
      </template>
      <div class="strategy-options">
        <div 
          class="strategy-item" 
          :class="{ active: currentStrategy === 'hot' }"
          @click="currentStrategy = 'hot'"
        >
          <el-icon :size="24"><TrendCharts /></el-icon>
          <div class="strategy-info">
            <div class="strategy-name">快速变现</div>
            <div class="strategy-desc">优先展示爆款，最大化成交</div>
          </div>
        </div>
        <div 
          class="strategy-item" 
          :class="{ active: currentStrategy === 'cold' }"
          @click="currentStrategy = 'cold'"
        >
          <el-icon :size="24"><Refresh /></el-icon>
          <div class="strategy-info">
            <div class="strategy-name">清冷款</div>
            <div class="strategy-desc">激活冷门款，提高曝光</div>
          </div>
        </div>
        <div 
          class="strategy-item" 
          :class="{ active: currentStrategy === 'balance' }"
          @click="currentStrategy = 'balance'"
        >
          <el-icon :size="24"><Grid /></el-icon>
          <div class="strategy-info">
            <div class="strategy-name">均衡策略</div>
            <div class="strategy-desc">爆款+潜力款组合推荐</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 推荐位列表 -->
    <el-card class="recommend-list-card">
      <template #header>
        <div class="card-header">
          <span>推荐位列表</span>
          <div class="header-actions">
            <el-button @click="autoRecommend">
              <el-icon><Refresh /></el-icon>
              AI自动推荐
            </el-button>
            <el-button type="primary" @click="saveRecommend">
              保存设置
            </el-button>
          </div>
        </div>
      </template>

      <div class="recommend-grid">
        <div 
          v-for="item in recommendList" 
          :key="item.id" 
          class="recommend-item"
        >
          <div class="position-badge">位置 {{ item.position }}</div>
          <div class="style-card">
            <el-image :src="item.style.image" class="style-image" fit="cover" />
            <div class="style-info">
              <div class="style-name">{{ item.style.name }}</div>
              <div class="recommend-reason">
                <el-icon><InfoFilled /></el-icon>
                {{ item.reason }}
              </div>
            </div>
          </div>
          <div class="style-stats">
            <div class="stat-item">
              <span class="stat-label">曝光</span>
              <span class="stat-value">{{ item.exposureCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">试戴</span>
              <span class="stat-value">{{ item.tryOnCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">意向率</span>
              <span class="stat-value highlight">{{ item.confirmRate }}%</span>
            </div>
          </div>
          <div class="style-actions">
            <el-tag v-if="item.isAuto" type="success" size="small">AI推荐</el-tag>
            <el-tag v-else type="warning" size="small">手动设置</el-tag>
            <el-button type="primary" text size="small" @click="changeStyle(item)">
              更换
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 更换款式对话框 -->
    <el-dialog v-model="changeDialogVisible" title="更换推荐款式" width="600px">
      <div class="style-selector">
        <el-input 
          v-model="styleSearchKeyword" 
          placeholder="搜索款式" 
          style="margin-bottom: 16px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <div class="style-grid">
          <div 
            v-for="style in availableStyles" 
            :key="style.id"
            class="style-option"
            :class="{ selected: selectedStyleId === style.id }"
            @click="selectedStyleId = style.id"
          >
            <el-image :src="style.image" class="option-image" fit="cover" />
            <div class="option-name">{{ style.name }}</div>
            <div class="option-stats">
              试戴 {{ style.tryOnCount }} | 意向率 {{ style.confirmRate }}%
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="changeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmChange">确认更换</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { recommendList as mockRecommendList, styleList } from '@/mock/data'

const currentStrategy = ref('hot')
const recommendList = ref([...mockRecommendList])
const changeDialogVisible = ref(false)
const styleSearchKeyword = ref('')
const selectedStyleId = ref(null)
const currentPosition = ref(null)

const availableStyles = computed(() => {
  return styleList.filter(item => 
    item.status === 'active' && 
    (!styleSearchKeyword.value || item.name.includes(styleSearchKeyword.value))
  )
})

const autoRecommend = () => {
  ElMessage.success('AI已根据当前策略重新生成推荐')
}

const saveRecommend = () => {
  ElMessage.success('推荐位设置已保存')
}

const changeStyle = (item) => {
  currentPosition.value = item.position
  selectedStyleId.value = item.style.id
  changeDialogVisible.value = true
}

const confirmChange = () => {
  if (!selectedStyleId.value) {
    ElMessage.warning('请选择款式')
    return
  }
  
  const style = styleList.find(s => s.id === selectedStyleId.value)
  const item = recommendList.value.find(r => r.position === currentPosition.value)
  
  if (item && style) {
    item.style = {
      id: style.id,
      name: style.name,
      image: style.image
    }
    item.isAuto = false
    item.reason = '商家手动设置'
  }
  
  changeDialogVisible.value = false
  ElMessage.success('推荐款式已更换')
}
</script>

<style scoped>
.recommend-page {
  padding: 0;
}

.info-card {
  margin-bottom: 20px;
}

.info-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
}

.strategy-card {
  margin-bottom: 20px;
}

.strategy-options {
  display: flex;
  gap: 20px;
}

.strategy-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 2px solid #E4E7ED;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.strategy-item:hover {
  border-color: #FF6B9D;
}

.strategy-item.active {
  border-color: #FF6B9D;
  background: #FFF0F5;
}

.strategy-item.active .el-icon {
  color: #FF6B9D;
}

.strategy-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.strategy-desc {
  font-size: 13px;
  color: #999;
}

.recommend-list-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.recommend-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.recommend-item {
  background: #F5F7FA;
  border-radius: 12px;
  padding: 16px;
  position: relative;
}

.position-badge {
  position: absolute;
  top: -10px;
  left: 16px;
  background: linear-gradient(135deg, #FF6B9D 0%, #FF8E53 100%);
  color: #fff;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

.style-card {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  margin-bottom: 16px;
}

.style-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
}

.style-info {
  flex: 1;
}

.style-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.recommend-reason {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  line-height: 1.5;
}

.style-stats {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #999;
  display: block;
}

.stat-value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.stat-value.highlight {
  color: #52C41A;
}

.style-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 款式选择器 */
.style-selector {
  max-height: 400px;
  overflow-y: auto;
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.style-option {
  border: 2px solid #E4E7ED;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.style-option:hover {
  border-color: #FF6B9D;
}

.style-option.selected {
  border-color: #FF6B9D;
  background: #FFF0F5;
}

.option-image {
  width: 100%;
  height: 100px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.option-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.option-stats {
  font-size: 12px;
  color: #999;
}
</style>
