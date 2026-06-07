<template>
  <div class="page">
    <div class="page-header">
      <h2>热度榜单</h2>
      <p>首屏只加载轻量榜单摘要，点击后可前往「趋势洞察」查看单款走势与多款对比。</p>
    </div>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="card-header">
              <span>热门榜</span>
              <el-tag type="danger">Hot</el-tag>
            </div>
          </template>
          <div v-for="(item, index) in hotStyles.slice(0, 8)" :key="item.id" class="list-item" @click="goInsight(item.id)">
            <span class="rank">{{ index + 1 }}</span>
            <el-image :src="item.image" class="thumb" fit="cover" lazy />
            <div class="item-main">
              <strong>{{ item.name }}</strong>
              <span>{{ item.category }} · 确认 {{ item.confirmCount }} · 热度 {{ item.hotIndex }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="card-header">
              <span>潜力榜</span>
              <el-tag type="success">Potential</el-tag>
            </div>
          </template>
          <div v-for="(item, index) in potentialStyles.slice(0, 8)" :key="item.id" class="list-item" @click="goInsight(item.id)">
            <span class="rank">{{ index + 1 }}</span>
            <el-image :src="item.image" class="thumb" fit="cover" lazy />
            <div class="item-main">
              <strong>{{ item.name }}</strong>
              <span>{{ item.category }} · 想做 {{ item.wantCount }} · 增长 {{ item.growthScore }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="card-header">
              <span>冷门预警榜</span>
              <el-tag type="warning">Cold</el-tag>
            </div>
          </template>
          <div v-for="(item, index) in coldStyles.slice(0, 8)" :key="item.id" class="list-item" @click="goInsight(item.id)">
            <span class="rank">{{ index + 1 }}</span>
            <el-image :src="item.image" class="thumb" fit="cover" lazy />
            <div class="item-main">
              <strong>{{ item.name }}</strong>
              <span>{{ item.category }} · 曝光度 {{ item.viewCount }} · 样本 {{ item.tryOnCount }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const overview = ref({})

const hotStyles = computed(() => overview.value.hotStyles || [])
const coldStyles = computed(() => overview.value.coldStyles || [])
const potentialStyles = computed(() => overview.value.potentialStyles || [])

function goInsight(styleId) {
  router.push({ path: '/insights', query: { styleId } })
}

async function fetchOverview() {
  const response = await fetch('/api/xhs-trend-overview')
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '获取趋势摘要失败')
  overview.value = data
}

onMounted(fetchOverview)
</script>

<style scoped>
.page-header { margin-bottom: 18px; }
.page-header h2 { margin: 0 0 6px; }
.page-header p { margin: 0; color: #777; }
.panel { margin-bottom: 16px; border-radius: 8px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 6px;
  border-bottom: 1px solid rgba(185,120,80,0.10);
  cursor: pointer;
  transition: background 150ms ease;
  border-radius: 8px;
}
.list-item:hover { background: rgba(201,122,78,0.06); }
.rank {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #c97a4e, #e09a72);
  color: #fff;
  font-family: 'DM Mono', monospace;
  font-weight: 700;
  font-size: 12px;
  flex: 0 0 26px;
  box-shadow: 0 2px 8px rgba(201,122,78,0.3);
}
.list-item:nth-child(1) .rank { background: linear-gradient(135deg, #c97a4e, #e8c070); box-shadow: 0 2px 10px rgba(201,122,78,0.45); }
.list-item:nth-child(2) .rank { background: linear-gradient(135deg, #a0a0a8, #c8c8d0); }
.list-item:nth-child(3) .rank { background: linear-gradient(135deg, #b87050, #d4986a); }
.thumb {
  width: 54px;
  height: 54px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.item-main { display: grid; gap: 3px; }
.item-main strong {
  font-family: 'DM Sans', 'Noto Sans SC', sans-serif;
  font-weight: 600;
  font-size: 13.5px;
  color: #2d1a10;
  letter-spacing: 0.01em;
}
.item-main span {
  color: rgba(45,26,16,0.45);
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  letter-spacing: -0.01em;
}
</style>
