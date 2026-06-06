<template>
  <el-card shadow="never" class="profile-card">
    <template #header>
      <div class="card-head">
        <div>
          <strong>用户偏好画像</strong>
          <p>{{ summaryText }}</p>
        </div>
        <div class="meta-badges">
          <el-tag type="success">画像置信度 {{ confidencePercent }}%</el-tag>
          <el-tag type="warning">探索比例 {{ explorationPercent }}%</el-tag>
        </div>
      </div>
    </template>

    <div class="dimension-grid">
      <section v-for="section in sections" :key="section.key" class="dimension-card">
        <div class="dimension-head">
          <div>
            <strong>{{ section.title }}</strong>
            <p>Top 偏好：{{ topText(section.values) }}</p>
          </div>
          <el-tag size="small" type="info">{{ section.values.length }} 个标签</el-tag>
        </div>
        <div class="progress-list">
          <div v-for="entry in section.values" :key="entry.label" class="progress-row">
            <span>{{ entry.label }}</span>
            <el-progress
              :percentage="Math.round(entry.value * 100)"
              :show-text="true"
              :stroke-width="10"
              :color="entry.color"
            />
          </div>
        </div>
      </section>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { topN } from '@/services/recommendationService'

const props = defineProps({
  preferences: {
    type: Object,
    required: true
  },
  confidence: {
    type: Number,
    default: 0
  },
  explorationRate: {
    type: Number,
    default: 0
  },
  summaryText: {
    type: String,
    default: ''
  }
})

const palette = ['#ff6b9d', '#ff8e53', '#36cfc9', '#5b8ff9', '#9254de', '#73d13d']

const sections = computed(() => {
  const mapping = [
    ['season', '季节偏好'],
    ['style', '风格偏好'],
    ['type', '款式偏好'],
    ['shape', '甲型偏好']
  ]

  return mapping.map(([key, title]) => ({
    key,
    title,
    values: Object.entries(props.preferences?.[key] || {}).map(([label, value], index) => ({
      label,
      value,
      color: palette[index % palette.length]
    }))
  }))
})

const confidencePercent = computed(() => Math.round((props.confidence || 0) * 100))
const explorationPercent = computed(() => Math.round((props.explorationRate || 0) * 100))

function topText(values) {
  return topN(
    values.reduce((acc, item) => {
      acc[item.label] = item.value
      return acc
    }, {}),
    2
  )
    .map((item) => `${item.label} ${Math.round(item.value * 100)}%`)
    .join(' / ')
}
</script>

<style scoped>
.card-head,
.dimension-head,
.meta-badges {
  display: flex;
  align-items: center;
}

.card-head,
.dimension-head {
  justify-content: space-between;
  gap: 12px;
}

.card-head p,
.dimension-head p {
  margin: 6px 0 0;
  color: #777;
  line-height: 1.5;
}

.meta-badges {
  gap: 8px;
  flex-wrap: wrap;
}

.dimension-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.dimension-card {
  padding: 14px;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background: #fafbfc;
}

.progress-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.progress-row {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.progress-row span {
  color: #555;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .dimension-grid {
    grid-template-columns: 1fr;
  }
}
</style>
