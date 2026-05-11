<template>
  <div class="styles-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>款式管理</h2>
      <p>管理门店款式，支持新增、编辑、上下架等操作</p>
    </div>

    <!-- 操作栏 -->
    <el-card class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input 
            v-model="searchKeyword" 
            placeholder="搜索款式名称" 
            style="width: 200px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="filterCategory" placeholder="选择分类" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="法式" value="法式" />
            <el-option label="渐变" value="渐变" />
            <el-option label="彩绘" value="彩绘" />
            <el-option label="猫眼" value="猫眼" />
            <el-option label="纯色" value="纯色" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 100px">
            <el-option label="全部" value="" />
            <el-option label="上架中" value="active" />
            <el-option label="已下架" value="inactive" />
          </el-select>
          <el-divider direction="vertical" />
          <el-select v-model="sortBy" placeholder="排序方式" clearable style="width: 140px">
            <el-option label="默认排序" value="" />
            <el-option label="试戴次数 降序" value="tryOnCount-desc" />
            <el-option label="试戴次数 升序" value="tryOnCount-asc" />
            <el-option label="意向率 降序" value="confirmRate-desc" />
            <el-option label="意向率 升序" value="confirmRate-asc" />
            <el-option label="价格 降序" value="price-desc" />
            <el-option label="价格 升序" value="price-asc" />
          </el-select>
          <el-select v-model="filterTryOnRange" placeholder="试戴次数" clearable style="width: 130px">
            <el-option label="全部" value="" />
            <el-option label="1000次以上" value="1000+" />
            <el-option label="500-1000次" value="500-1000" />
            <el-option label="100-500次" value="100-500" />
            <el-option label="100次以下" value="0-100" />
          </el-select>
          <el-select v-model="filterConfirmRate" placeholder="意向率" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="50%以上" value="50+" />
            <el-option label="30-50%" value="30-50" />
            <el-option label="10-30%" value="10-30" />
            <el-option label="10%以下" value="0-10" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增款式
          </el-button>
          <el-button @click="syncFromTrending">
            <el-icon><Refresh /></el-icon>
            从爆款库同步
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 款式列表 -->
    <el-card class="list-card">
      <el-table :data="filteredStyles" style="width: 100%">
        <el-table-column label="款式信息" min-width="240">
          <template #default="{ row }">
            <div class="style-info">
              <el-image :src="row.image" class="style-image" fit="cover" />
              <div class="style-detail">
                <div class="style-name">
                  {{ row.name }}
                  <el-tag v-if="row.isHot" type="danger" size="small" class="hot-tag">爆款</el-tag>
                  <el-tag v-if="row.isRecommend" type="warning" size="small" class="recommend-tag">主推</el-tag>
                </div>
                <div class="style-meta">
                  <span class="category">{{ row.category }}</span>
                  <span class="price">¥{{ row.price }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <div class="tags-cell">
              <el-tag v-for="tag in row.tags" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="tryOnCount" label="试戴次数" width="100" sortable>
          <template #default="{ row }">
            <span class="count-number">{{ row.tryOnCount.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="confirmRate" label="意向率" width="100" sortable>
          <template #default="{ row }">
            <span class="rate-number">{{ row.confirmRate }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch 
              v-model="row.status" 
              active-value="active"
              inactive-value="inactive"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <el-button type="primary" text size="small" @click="editStyle(row)">
              编辑
            </el-button>
            <el-dropdown trigger="click">
              <el-button type="primary" text size="small">
                更多 <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="toggleRecommend(row)">
                    {{ row.isRecommend ? '取消主推' : '设为主推' }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="toggleCold(row)">
                    设为冷门激活款
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="deleteStyle(row)">
                    <span style="color: #F5222D">删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="styleList.length"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- 新增/编辑款式对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogType === 'add' ? '新增款式' : '编辑款式'"
      width="600px"
    >
      <el-form :model="styleForm" label-width="100px">
        <el-form-item label="款式图片" required>
          <el-upload
            class="style-uploader"
            action="#"
            :show-file-list="false"
            :auto-upload="false"
          >
            <el-image v-if="styleForm.image" :src="styleForm.image" class="uploaded-image" />
            <el-icon v-else class="upload-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="款式名称" required>
          <el-input v-model="styleForm.name" placeholder="请输入款式名称" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="styleForm.category" placeholder="请选择分类">
            <el-option label="法式" value="法式" />
            <el-option label="渐变" value="渐变" />
            <el-option label="彩绘" value="彩绘" />
            <el-option label="猫眼" value="猫眼" />
            <el-option label="纯色" value="纯色" />
            <el-option label="特效" value="特效" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="styleForm.tags" multiple placeholder="请选择标签" style="width: 100%">
            <el-option label="优雅" value="优雅" />
            <el-option label="简约" value="简约" />
            <el-option label="职场" value="职场" />
            <el-option label="约会" value="约会" />
            <el-option label="派对" value="派对" />
            <el-option label="日常" value="日常" />
            <el-option label="高级感" value="高级感" />
            <el-option label="纯欲" value="纯欲" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务价格" required>
          <el-input-number v-model="styleForm.price" :min="0" :precision="0" />
          <span style="margin-left: 8px; color: #999">元</span>
        </el-form-item>
        <el-form-item label="是否主推">
          <el-switch v-model="styleForm.isRecommend" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveStyle">保存</el-button>
      </template>
    </el-dialog>

    <!-- 款式详情抽屉 -->
    <el-drawer v-model="detailDrawer" title="款式详情" size="500px">
      <div v-if="currentStyle" class="detail-content">
        <div class="detail-image">
          <el-image :src="currentStyle.image" fit="cover" />
        </div>
        <div class="detail-info">
          <h3>{{ currentStyle.name }}</h3>
          <div class="info-row">
            <span class="label">分类：</span>
            <span>{{ currentStyle.category }}</span>
          </div>
          <div class="info-row">
            <span class="label">价格：</span>
            <span class="price">¥{{ currentStyle.price }}</span>
          </div>
          <div class="info-row">
            <span class="label">标签：</span>
            <div class="tags">
              <el-tag v-for="tag in currentStyle.tags" :key="tag" size="small">{{ tag }}</el-tag>
            </div>
          </div>
          <div class="info-row">
            <span class="label">状态：</span>
            <el-tag :type="currentStyle.status === 'active' ? 'success' : 'info'">
              {{ currentStyle.status === 'active' ? '上架中' : '已下架' }}
            </el-tag>
          </div>
        </div>
        
        <el-divider>数据表现</el-divider>
        
        <div class="data-cards">
          <div class="data-card">
            <div class="data-value">{{ currentStyle.tryOnCount.toLocaleString() }}</div>
            <div class="data-label">试戴次数</div>
          </div>
          <div class="data-card">
            <div class="data-value">{{ currentStyle.confirmCount }}</div>
            <div class="data-label">意向量</div>
          </div>
          <div class="data-card">
            <div class="data-value">{{ currentStyle.confirmRate }}%</div>
            <div class="data-label">意向率</div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { styleList as mockStyleList } from '@/mock/data'

// 搜索和筛选
const searchKeyword = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const sortBy = ref('')
const filterTryOnRange = ref('')
const filterConfirmRate = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 款式列表
const styleList = ref([...mockStyleList])

// 过滤和排序后的列表
const filteredStyles = computed(() => {
  let result = [...styleList.value]
  
  // 搜索过滤
  if (searchKeyword.value) {
    result = result.filter(item => item.name.includes(searchKeyword.value))
  }
  
  // 分类过滤
  if (filterCategory.value) {
    result = result.filter(item => item.category === filterCategory.value)
  }
  
  // 状态过滤
  if (filterStatus.value) {
    result = result.filter(item => item.status === filterStatus.value)
  }
  
  // 试戴次数过滤
  if (filterTryOnRange.value) {
    result = result.filter(item => {
      switch (filterTryOnRange.value) {
        case '1000+': return item.tryOnCount >= 1000
        case '500-1000': return item.tryOnCount >= 500 && item.tryOnCount < 1000
        case '100-500': return item.tryOnCount >= 100 && item.tryOnCount < 500
        case '0-100': return item.tryOnCount < 100
        default: return true
      }
    })
  }
  
  // 意向率过滤
  if (filterConfirmRate.value) {
    result = result.filter(item => {
      switch (filterConfirmRate.value) {
        case '50+': return item.confirmRate >= 50
        case '30-50': return item.confirmRate >= 30 && item.confirmRate < 50
        case '10-30': return item.confirmRate >= 10 && item.confirmRate < 30
        case '0-10': return item.confirmRate < 10
        default: return true
      }
    })
  }
  
  // 排序
  if (sortBy.value) {
    const [field, order] = sortBy.value.split('-')
    result.sort((a, b) => {
      const aVal = a[field] || 0
      const bVal = b[field] || 0
      return order === 'asc' ? aVal - bVal : bVal - aVal
    })
  }
  
  return result
})

// 对话框
const dialogVisible = ref(false)
const dialogType = ref('add')
const styleForm = ref({
  name: '',
  image: '',
  category: '',
  tags: [],
  price: 128,
  isRecommend: false
})

// 详情抽屉
const detailDrawer = ref(false)
const currentStyle = ref(null)

const showAddDialog = () => {
  dialogType.value = 'add'
  styleForm.value = {
    name: '',
    image: '',
    category: '',
    tags: [],
    price: 128,
    isRecommend: false
  }
  dialogVisible.value = true
}

const editStyle = (row) => {
  dialogType.value = 'edit'
  styleForm.value = { ...row }
  dialogVisible.value = true
}

const saveStyle = () => {
  if (dialogType.value === 'add') {
    const newStyle = {
      ...styleForm.value,
      id: Date.now(),
      status: 'active',
      isHot: false,
      tryOnCount: 0,
      confirmCount: 0,
      confirmRate: 0,
      createTime: new Date().toISOString().split('T')[0]
    }
    styleList.value.unshift(newStyle)
    ElMessage.success('款式添加成功')
  } else {
    const index = styleList.value.findIndex(item => item.id === styleForm.value.id)
    if (index > -1) {
      styleList.value[index] = { ...styleForm.value }
    }
    ElMessage.success('款式更新成功')
  }
  dialogVisible.value = false
}

const viewDetail = (row) => {
  currentStyle.value = row
  detailDrawer.value = true
}

const handleStatusChange = (row) => {
  ElMessage.success(row.status === 'active' ? '款式已上架' : '款式已下架')
}

const toggleRecommend = (row) => {
  row.isRecommend = !row.isRecommend
  ElMessage.success(row.isRecommend ? '已设为主推款' : '已取消主推')
}

const toggleCold = (row) => {
  ElMessage.success(`「${row.name}」已设为冷门激活款`)
}

const deleteStyle = (row) => {
  ElMessageBox.confirm(`确定要删除「${row.name}」吗？`, '提示', {
    type: 'warning'
  }).then(() => {
    const index = styleList.value.findIndex(item => item.id === row.id)
    if (index > -1) {
      styleList.value.splice(index, 1)
    }
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const syncFromTrending = () => {
  ElMessage.success('正在从爆款库同步最新款式...')
}
</script>

<style scoped>
.styles-page {
  padding: 0;
}

.toolbar-card {
  margin-bottom: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  gap: 12px;
}

.list-card {
  margin-bottom: 20px;
}

.style-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.style-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
}

.style-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hot-tag, .recommend-tag {
  font-size: 11px;
}

.style-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.category {
  color: #999;
}

.price {
  color: #FF6B9D;
  font-weight: 500;
}

.tags-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-item {
  background: #F5F7FA;
  color: #666;
  border: none;
}

.count-number {
  font-weight: 500;
}

.rate-number {
  color: #52C41A;
  font-weight: 500;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 上传组件 */
.style-uploader {
  width: 120px;
  height: 120px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.style-uploader:hover {
  border-color: #FF6B9D;
}

.uploaded-image {
  width: 118px;
  height: 118px;
  border-radius: 7px;
}

.upload-icon {
  font-size: 28px;
  color: #999;
}

/* 详情抽屉 */
.detail-content {
  padding: 0 20px;
}

.detail-image {
  margin-bottom: 20px;
}

.detail-image .el-image {
  width: 100%;
  height: 200px;
  border-radius: 8px;
}

.detail-info h3 {
  font-size: 20px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.info-row .label {
  width: 60px;
  color: #999;
}

.info-row .price {
  color: #FF6B9D;
  font-size: 18px;
  font-weight: bold;
}

.info-row .tags {
  display: flex;
  gap: 8px;
}

.data-cards {
  display: flex;
  gap: 16px;
}

.data-card {
  flex: 1;
  text-align: center;
  padding: 20px;
  background: #F5F7FA;
  border-radius: 8px;
}

.data-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.data-label {
  font-size: 13px;
  color: #999;
  margin-top: 8px;
}
</style>
