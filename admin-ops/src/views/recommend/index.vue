<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>推荐位管理</h2>
        <p>8 个坑位构成一轮完整推荐，选择策略后 AI 自动填充；手动换款或锁定坑位可覆盖 AI 决策。</p>
      </div>
      <div class="header-actions">
        <el-button :loading="generating" type="primary" @click="generateRound">
          <span v-if="!generating">⚡ AI 生成本轮</span>
          <span v-else>生成中…</span>
        </el-button>
        <el-tag :type="roundStatusType" size="large" effect="plain">{{ roundStatusText }}</el-tag>
      </div>
    </div>

    <!-- 策略选择 -->
    <el-card shadow="never" class="panel">
      <template #header>
        <div class="card-header">
          <span>推荐策略</span>
          <span class="header-hint">策略决定这一轮 8 个坑位中各类型的数量分配</span>
        </div>
      </template>
      <div class="strategy-grid">
        <button
          v-for="s in strategies"
          :key="s.id"
          class="strategy-card"
          :class="{ active: activeStrategyId === s.id }"
          @click="selectStrategy(s.id)"
        >
          <div class="strategy-card__title">{{ s.name }}</div>
          <div class="strategy-tags">
            <span
              v-for="(t, i) in s.slot_types"
              :key="i"
              class="mini-tag"
              :style="{ background: TYPE_COLOR[t] + '22', color: TYPE_COLOR[t], borderColor: TYPE_COLOR[t] + '66' }"
            >{{ TYPE_SHORT[t] }}</span>
          </div>
          <p class="strategy-card__desc">{{ s.description }}</p>
        </button>
      </div>

      <!-- 自定义坑位分配 -->
      <div v-if="activeStrategyId === 'custom'" class="custom-panel">
        <div class="custom-header"><strong>自定义坑位类型</strong><span>为每个位置指定类型，AI 会按类型从库里选款</span></div>
        <div class="custom-grid">
          <div v-for="(type, i) in customSlotTypes" :key="i" class="custom-slot">
            <label>P{{ i + 1 }}</label>
            <el-select v-model="customSlotTypes[i]" size="small">
              <el-option v-for="opt in SLOT_TYPE_OPTS" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>
        </div>
      </div>

      <!-- 用户自适应关键词 -->
      <div class="intent-panel">
        <div>
          <strong>自适应参考词</strong>
          <p>影响「用户自适应」坑位的选款，留空则按试戴转化率选</p>
        </div>
        <el-input v-model="intentText" placeholder="例如：猫眼 短甲 显白 不要显黑" style="max-width:360px" clearable />
      </div>
    </el-card>

    <!-- 8 坑位展示 -->
    <el-card shadow="never" class="panel">
      <template #header>
        <div class="card-header">
          <span>本轮推荐位（8 个坑位）</span>
          <div style="display:flex;gap:8px;align-items:center">
            <el-tag v-for="(t, k) in TYPE_LABEL" :key="k" size="small" effect="plain"
              :style="{ color: TYPE_COLOR[k], borderColor: TYPE_COLOR[k] + '88', background: TYPE_COLOR[k] + '15' }">
              {{ t }}
            </el-tag>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-tip">加载中…</div>
      <div v-else class="slots-grid">
        <div
          v-for="slot in slots"
          :key="slot.position"
          class="slot-card"
          :class="{ 'is-locked': slot.locked, 'is-empty': !slot.style_id }"
          :style="{ '--type-color': TYPE_COLOR[slot.slot_type] || '#999' }"
        >
          <!-- 坑位头部 -->
          <div class="slot-head">
            <div class="slot-pos-row">
              <span class="slot-pos">P{{ slot.position }}</span>
              <span class="slot-type-badge" :style="{ background: TYPE_COLOR[slot.slot_type] + '20', color: TYPE_COLOR[slot.slot_type] }">
                {{ slot.slotTypeLabel }}
              </span>
              <el-tag v-if="slot.locked" size="small" type="warning" effect="plain">🔒 已锁定</el-tag>
              <el-tag v-if="slot.is_manual" size="small" type="info" effect="plain">手动</el-tag>
              <el-tag v-if="slot.styleOffline" size="small" type="danger" effect="plain">⚠️ 已下架</el-tag>
            </div>
            <el-select
              v-model="slot.slot_type"
              size="small"
              style="width:110px"
              @change="(v) => changeSlotType(slot, v)"
            >
              <el-option v-for="opt in SLOT_TYPE_OPTS" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>

          <!-- 款式封面 -->
          <template v-if="slot.style_id">
            <el-image :src="slot.cover_image || ''" class="slot-cover" fit="cover">
              <template #error><div class="cover-fallback">无封面</div></template>
            </el-image>
            <div class="slot-name">{{ slot.name }}</div>
            <div class="slot-reason">{{ slot.reason }}</div>

            <!-- 三维分数 -->
            <div class="score-row">
              <div class="score-item" title="热度分">
                <span class="score-label">热</span>
                <el-progress :percentage="Math.round((slot.hot_score||0)*100)" :stroke-width="6"
                  :show-text="false" color="#ff6b9d" style="flex:1" />
                <span class="score-val">{{ Math.round((slot.hot_score||0)*100) }}</span>
              </div>
              <div class="score-item" title="增长分">
                <span class="score-label">潜</span>
                <el-progress :percentage="Math.round((slot.growth_score||0)*100)" :stroke-width="6"
                  :show-text="false" color="#36cfc9" style="flex:1" />
                <span class="score-val">{{ Math.round((slot.growth_score||0)*100) }}</span>
              </div>
              <div class="score-item" title="冷门风险">
                <span class="score-label">冷</span>
                <el-progress :percentage="Math.round((slot.cold_risk_score||0)*100)" :stroke-width="6"
                  :show-text="false" color="#faad14" style="flex:1" />
                <span class="score-val">{{ Math.round((slot.cold_risk_score||0)*100) }}</span>
              </div>
            </div>

            <!-- 核心指标 -->
            <div class="slot-stats">
              <span><b>{{ slot.view_uv || 0 }}</b><em>浏览</em></span>
              <span><b>{{ slot.tryon_uv || 0 }}</b><em>试戴</em></span>
              <span><b>{{ slot.confirm_uv || 0 }}</b><em>确认</em></span>
              <span><b>{{ slot.tryon_confirm_rate ? (slot.tryon_confirm_rate * 100).toFixed(1) + '%' : '-' }}</b><em>转化</em></span>
            </div>
          </template>
          <div v-else class="slot-empty">暂无款式</div>

          <!-- 操作栏 -->
          <div class="slot-actions">
            <el-button size="small" text @click="openChange(slot)">换款</el-button>
            <el-button size="small" text @click="toggleLock(slot)">{{ slot.locked ? '解锁' : '锁定' }}</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 换款弹窗 -->
    <el-dialog v-model="changeDialog.visible" :title="`P${changeDialog.slot?.position} 换款 · ${changeDialog.slot?.slotTypeLabel || ''}`" width="780px">
      <div class="change-filters">
        <el-input v-model="changeDialog.keyword" placeholder="搜索款式名 / 分类" clearable style="flex:1" />
        <el-select v-model="changeDialog.filterBucket" placeholder="按 Bucket 筛选" clearable style="width:140px">
          <el-option label="热门 (hot)" value="hot" />
          <el-option label="潜力 (potential)" value="potential" />
          <el-option label="冷门 (cold)" value="cold" />
          <el-option label="稳定 (stable)" value="stable" />
        </el-select>
      </div>
      <div class="change-grid">
        <div
          v-for="s in filteredStyles"
          :key="s.id"
          class="change-option"
          :class="{ selected: changeDialog.selectedId === s.id }"
          @click="changeDialog.selectedId = s.id"
        >
          <el-image :src="s.cover_image" class="option-img" fit="cover">
            <template #error><div class="cover-fallback">无</div></template>
          </el-image>
          <div class="option-info">
            <strong>{{ s.name }}</strong>
            <span>热 {{ Math.round((s.hot_score||0)*100) }} · 转化 {{ s.tryon_confirm_rate ? (s.tryon_confirm_rate*100).toFixed(1)+'%' : '-' }}</span>
            <el-tag size="small" effect="plain">{{ s.recommend_bucket }}</el-tag>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="changeDialog.visible = false">取消</el-button>
        <el-button type="primary" :disabled="!changeDialog.selectedId" @click="confirmChange">确认换款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

// ── 常量 ─────────────────────────────────────────────────────────
const TYPE_LABEL = { hot: '热门', potential: '潜力', cold: '冷门观察', adaptive: '用户自适应' }
const TYPE_SHORT = { hot: '热', potential: '潜', cold: '冷', adaptive: '适' }
const TYPE_COLOR = { hot: '#ff6b9d', potential: '#36cfc9', cold: '#faad14', adaptive: '#722ed1' }
const SLOT_TYPE_OPTS = [
  { value: 'hot',      label: '热门' },
  { value: 'potential',label: '潜力' },
  { value: 'cold',     label: '冷门观察' },
  { value: 'adaptive', label: '用户自适应' },
]

// ── 状态 ─────────────────────────────────────────────────────────
const loading = ref(false)
const generating = ref(false)
const slots = ref([])
const strategies = ref([])
const activeStrategyId = ref('hot_first')
const intentText = ref('')
const customSlotTypes = ref(['hot','hot','potential','adaptive','potential','adaptive','cold','adaptive'])
const roundStatusText = ref('尚未生成')
const roundStatusType = ref('info')

// 自定义下拉变化时，同步到 strategies 列表里的 custom 条目，让策略卡 mini-tag 实时更新
watch(customSlotTypes, (val) => {
  const custom = strategies.value.find(s => s.id === 'custom')
  if (custom) custom.slot_types = [...val]
}, { deep: true })

// 换款弹窗
const changeDialog = ref({ visible: false, slot: null, keyword: '', filterBucket: '', selectedId: null })
const allStyles = ref([])

// ── 计算 ─────────────────────────────────────────────────────────
const filteredStyles = computed(() => {
  const kw = changeDialog.value.keyword.toLowerCase()
  const bk = changeDialog.value.filterBucket
  return allStyles.value.filter(s => {
    if (bk && s.recommend_bucket !== bk) return false
    if (kw && !`${s.name}${s.category}`.toLowerCase().includes(kw)) return false
    return true
  }).slice(0, 48)
})

// ── API ──────────────────────────────────────────────────────────
async function fetchSlots() {
  loading.value = true
  try {
    const r = await fetch('/api/recommend-slots')
    const d = await r.json()
    slots.value = d.slots
    strategies.value = d.strategies
    // 把服务器保存的 custom 配置同步回本地下拉
    const savedCustom = d.strategies.find(s => s.id === 'custom')
    if (savedCustom?.slot_types?.length === 8) customSlotTypes.value = [...savedCustom.slot_types]
    const cur = d.slots[0]?.strategy_id
    if (cur) activeStrategyId.value = cur
    roundStatusText.value = '已加载，' + (d.slots.filter(s => s.style_id).length) + '/8 坑位已填充'
    roundStatusType.value = 'success'
  } finally {
    loading.value = false
  }
}

async function fetchAllStyles() {
  // 推荐位候选来源：只取已上架款式，不设上限（和 v_pool_* 候选池保持一致）
  const r = await fetch('/api/styles?limit=9999&status=published')
  const d = await r.json()
  allStyles.value = d.rows || []
}

async function generateRound() {
  generating.value = true
  roundStatusText.value = '生成中…'
  roundStatusType.value = 'warning'
  try {
    // 自定义策略先保存坑位配置到 DB，再生成
    if (activeStrategyId.value === 'custom') {
      const saveR = await fetch('/api/recommend-strategies/custom', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotTypes: customSlotTypes.value })
      })
      const saveD = await saveR.json()
      if (!saveD.ok) throw new Error(saveD.error || '保存自定义配置失败')
    }
    const r = await fetch('/api/recommend-slots/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategyId: activeStrategyId.value, intentText: intentText.value })
    })
    const d = await r.json()
    if (!d.ok) throw new Error(d.error)
    await fetchSlots()
    const locked = d.generated.filter(g => g.locked).length
    ElMessage.success(`本轮已生成${locked ? `，${locked} 个锁定坑位已跳过` : ''}`)
    roundStatusText.value = '已生成 · ' + strategies.value.find(s => s.id === body.strategyId)?.name
    roundStatusType.value = 'success'
  } catch (e) {
    ElMessage.error(e.message || '生成失败')
    roundStatusType.value = 'danger'
  } finally {
    generating.value = false
  }
}

async function changeSlotType(slot, newType) {
  await fetch(`/api/recommend-slots/${slot.position}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotType: newType })
  })
  slot.slotTypeLabel = TYPE_LABEL[newType] || newType
  slot.slot_type = newType
  ElMessage.success(`P${slot.position} 坑位类型已改为「${TYPE_LABEL[newType]}」`)
}

async function toggleLock(slot) {
  const newLocked = slot.locked ? 0 : 1
  await fetch(`/api/recommend-slots/${slot.position}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locked: newLocked })
  })
  slot.locked = newLocked
  ElMessage.success(newLocked ? `P${slot.position} 已锁定，AI 生成时跳过` : `P${slot.position} 已解锁`)
}

function selectStrategy(id) {
  activeStrategyId.value = id
  roundStatusText.value = `策略已切换：${strategies.value.find(s=>s.id===id)?.name}，点「AI 生成本轮」应用`
  roundStatusType.value = 'warning'
}

// 换款
function openChange(slot) {
  changeDialog.value = { visible: true, slot, keyword: '', filterBucket: slot.slot_type === 'cold' ? 'cold' : '', selectedId: slot.style_id }
}

async function confirmChange() {
  const { slot, selectedId } = changeDialog.value
  if (!selectedId) return
  await fetch(`/api/recommend-slots/${slot.position}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ styleId: selectedId, reason: '运营手动调整' })
  })
  await fetchSlots()
  changeDialog.value.visible = false
  ElMessage.success(`P${slot.position} 款式已更换`)
}

function onAgentStateChanged() {
  fetchSlots()
}

onMounted(() => {
  fetchSlots()
  fetchAllStyles()
  window.addEventListener('agent-state-changed', onAgentStateChanged)
})

onUnmounted(() => {
  window.removeEventListener('agent-state-changed', onAgentStateChanged)
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.page-header h2 { margin: 0 0 4px; }
.page-header p, .strategy-card__desc { color: #777; font-size: 13px; margin: 0; }
.header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.panel { margin-bottom: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.header-hint { color: #aaa; font-size: 12px; }

/* 策略选择 */
.strategy-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 0;
}
.strategy-card {
  padding: 12px;
  border: 1.5px solid #e4e7ed;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.strategy-card:hover { border-color: #ff6b9d66; background: #fff8fb; }
.strategy-card.active { border-color: #ff6b9d; background: #fff5f8; }
.strategy-card__title { font-weight: 600; font-size: 14px; margin-bottom: 8px; }
.strategy-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.mini-tag { padding: 1px 6px; border-radius: 10px; border: 1px solid; font-size: 11px; font-weight: 600; }

/* 自定义 & 意图 */
.custom-panel, .intent-panel {
  margin-top: 14px;
  padding: 12px 14px;
  background: #faf7fb;
  border-radius: 8px;
}
.custom-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
.custom-header span { color: #888; font-size: 12px; }
.custom-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; }
.custom-slot { display: grid; gap: 6px; text-align: center; }
.custom-slot label { font-size: 12px; color: #888; }
.intent-panel { display: flex; align-items: center; gap: 14px; }
.intent-panel > div { flex-shrink: 0; }
.intent-panel strong { display: block; margin-bottom: 4px; }
.intent-panel p { margin: 0; color: #aaa; font-size: 12px; }

/* 坑位网格 */
.slots-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.loading-tip { padding: 40px; text-align: center; color: #aaa; }

.slot-card {
  border: 1.5px solid #e4e7ed;
  border-radius: 10px;
  padding: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: border-color .15s;
  border-top: 3px solid var(--type-color);
}
.slot-card.is-locked { background: #fffcf0; }
.slot-card.is-empty { border-style: dashed; }

.slot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 10px;
}
.slot-pos-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.slot-pos {
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--type-color);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.slot-type-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.slot-cover { width: 100%; height: 130px; border-radius: 8px; display: block; }
.cover-fallback { width: 100%; height: 130px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 12px; border-radius: 8px; }
.slot-name { font-size: 14px; font-weight: 600; margin: 8px 0 4px; line-height: 1.3; }
.slot-reason { font-size: 12px; color: #888; margin-bottom: 10px; min-height: 32px; }

.score-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.score-item { display: flex; align-items: center; gap: 6px; }
.score-label { font-size: 11px; color: #aaa; width: 14px; flex-shrink: 0; }
.score-val { font-size: 12px; color: #555; width: 24px; text-align: right; flex-shrink: 0; }

.slot-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
  background: #f7f8fa;
  border-radius: 6px;
  margin-bottom: 10px;
  text-align: center;
}
.slot-stats span { display: flex; flex-direction: column; gap: 2px; }
.slot-stats b { font-size: 13px; color: #303133; }
.slot-stats em { font-size: 11px; color: #aaa; font-style: normal; }
.slot-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 13px; padding: 30px 0; }

.slot-actions {
  display: flex;
  gap: 4px;
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
  margin-top: auto;
}

/* 换款弹窗 */
.change-filters { display: flex; gap: 10px; margin-bottom: 12px; }
.change-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
}
.change-option {
  border: 1.5px solid #e4e7ed;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: border-color .15s;
}
.change-option:hover { border-color: #ff6b9d66; }
.change-option.selected { border-color: #ff6b9d; background: #fff5f8; }
.option-img { width: 100%; height: 80px; border-radius: 6px; display: block; margin-bottom: 6px; }
.option-info { display: flex; flex-direction: column; gap: 3px; }
.option-info strong { font-size: 12px; line-height: 1.3; }
.option-info span { font-size: 11px; color: #888; }
</style>
