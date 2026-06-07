<template>
  <div class="page">
    <div class="page-header">
      <h2>款式管理</h2>
      <p>支持手动新增款式，以及上架、下架、恢复上架和归档。高风险操作仍会先预览和确认单。</p>
    </div>

    <el-card shadow="never" class="panel">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索款式名 / 编号 / 分类" clearable style="width: 280px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="status" placeholder="状态" clearable style="width: 160px">
          <el-option label="全部" value="" />
          <el-option label="已上架" value="published" />
          <el-option label="草稿" value="draft" />
          <el-option label="待审核" value="pending_review" />
          <el-option label="已下架" value="unpublished" />
          <el-option label="已归档" value="archived" />
        </el-select>
        <el-button @click="refreshStylesFromAgent">刷新</el-button>
        <el-button @click="openBatchDialog">批量新增</el-button>
        <el-button type="primary" @click="addDialogVisible = true">新增款式</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="panel">
      <el-table :data="filteredStyles" style="width: 100%">
        <el-table-column label="款式信息" min-width="300">
          <template #default="{ row }">
            <div class="style-info">
              <el-image :src="row.image" class="thumb" fit="cover" />
              <div class="style-copy">
                <strong>{{ row.name }}</strong>
                <div class="meta">{{ row.styleCode || row.id }} · {{ row.category }} · {{ row.priceLevel }} · ¥{{ row.price }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="标签" width="240">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags" :key="tag" size="small" class="tag">{{ tag }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="viewCount" label="浏览" sortable width="100" />
        <el-table-column prop="tryOnCount" label="试戴" sortable width="100" />
        <el-table-column prop="wantCount" label="想做" sortable width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.rawStatus)" effect="light">{{ statusLabel(row.rawStatus) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" min-width="320">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button text class="btn-warm" @click="detail = row">详情</el-button>
              <el-button v-if="canPublish(row)" text class="btn-success" @click="openManualPreview('publish', row)">上架</el-button>
              <el-button v-if="canUnpublish(row)" text class="btn-muted" @click="openManualPreview('unpublish', row)">下架</el-button>
              <el-button v-if="canRestore(row)" text class="btn-warm" @click="openManualPreview('restore', row)">恢复上架</el-button>
              <el-button v-if="canArchive(row)" text class="btn-danger" @click="openManualPreview('archive', row)">归档</el-button>
              <el-button text class="btn-warm" @click="detail = row">走势</el-button>
              <el-button text class="btn-promote" @click="togglePromote(row)">
                {{ row.isRecommend ? '取消主推' : '设为主推' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawerVisible" title="款式详情" size="420px">
      <div v-if="detail" class="detail">
        <el-image :src="detail.image" class="detail-image" fit="cover" />
        <h3>{{ detail.name }}</h3>
        <p>{{ detail.styleCode || detail.id }} / {{ detail.category }} / {{ detail.priceLevel }} / ¥{{ detail.price }}</p>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="状态">{{ statusLabel(detail.rawStatus) }}</el-descriptions-item>
          <el-descriptions-item label="浏览">{{ detail.viewCount }}</el-descriptions-item>
          <el-descriptions-item label="试戴">{{ detail.tryOnCount }}</el-descriptions-item>
          <el-descriptions-item label="想做">{{ detail.wantCount }}</el-descriptions-item>
          <el-descriptions-item label="确认">{{ detail.confirmCount }}</el-descriptions-item>
          <el-descriptions-item label="热度分">{{ detail.hotIndex }}</el-descriptions-item>
          <el-descriptions-item label="冷门风险">{{ detail.coldRisk }}</el-descriptions-item>
        </el-descriptions>
        <div class="preview-block asset-block">
          <h4>图片素材位</h4>
          <ul>
            <li><strong>封面图：</strong>{{ detail.image || '未填写' }}</li>
            <li><strong>详情图：</strong>{{ detail.detailImages?.length ? detail.detailImages.join(' / ') : '未填写' }}</li>
            <li><strong>参考图：</strong>{{ detail.referenceImages?.length ? detail.referenceImages.join(' / ') : '未填写' }}</li>
            <li><strong>试戴素材：</strong>{{ detail.tryonAssets?.length ? detail.tryonAssets.join(' / ') : '未填写' }}</li>
          </ul>
        </div>
        <div v-if="detailTrendMeta" class="trend-summary">
          <el-tag type="info">{{ trendRangeText }}</el-tag>
          <el-tag type="success">120 澶</el-tag>
          <el-tag type="warning">周趋势</el-tag>
        </div>
        <el-radio-group v-if="detailTrendMeta" v-model="detailWindowDays" size="small" class="trend-window-group">
          <el-radio-button v-for="days in trendWindowOptions" :key="days" :label="days">{{ days }} 澶</el-radio-button>
        </el-radio-group>
        <div ref="detailDailyChartRef" class="detail-chart large"></div>
        <div ref="detailWeeklyChartRef" class="detail-chart"></div>
      </div>
    </el-drawer>

    <el-dialog v-model="addDialogVisible" title="新增款式" width="720px">
      <el-form :model="newStyleForm" label-width="96px">
        <div class="assistant-align-note">
          <strong>涓庤繍钀ュ姪鎵嬪榻</strong>
          <span>新增款式鏃剁洿鎺ヨˉ榻愭爣棰樸€佷粙缁嶃€佹爣绛惧拰图片素材位嶏紝鍚庣画运营助手鍋氫笂新增垎鏋愩€佷笂鏋堕瑙堝拰鎵归噺琛ユ鏃跺氨鑳藉鐢ㄨ繖涓€濂楀瓧娈点€</span>
        </div>
        <div class="form-grid">
          <el-form-item label="款式编号">
            <el-input v-model="newStyleForm.styleCode" placeholder="渚嬪 S0301锛屼笉濉垯鑷姩鐢熸垚" />
          </el-form-item>
          <el-form-item label="分类">
            <el-input v-model="newStyleForm.category" placeholder="渚嬪 鐚溂 / 娉曞紡 / 鎵嬬粯" />
          </el-form-item>
          <el-form-item label="款式名称">
            <el-input v-model="newStyleForm.name" placeholder="输入款式名称" />
          </el-form-item>
          <el-form-item label="浠锋牸">
            <el-input-number v-model="newStyleForm.price" :min="0" :step="10" style="width: 100%" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="newStyleForm.status" style="width: 100%">
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="pending_review" />
              <el-option label="已上架" value="published" />
            </el-select>
          </el-form-item>
          <el-form-item label="可制作">
            <el-switch v-model="newStyleForm.makeable" />
          </el-form-item>
        </div>

        <el-form-item label="款式介绍">
          <el-input v-model="newStyleForm.description" type="textarea" :rows="3" placeholder="输入款式介绍" />
        </el-form-item>

        <div class="asset-section">
          <div class="asset-section__header">
            <strong>图片素材位</strong>
            <span>这里的封面、详情、参考图和试戴素材位，会和运营助手上新分析、上架预览、批量补欠所用的字段保持一致。</span>
          </div>
        </div>

        <div class="form-grid tags-grid">
          <el-form-item label="封面图">
            <el-input v-model="newStyleForm.coverImage" placeholder="可粘贴图片 URL；不填则自动生成占位图" />
          </el-form-item>
          <el-form-item label="鏉ユ簮">
            <el-select v-model="newStyleForm.source" style="width: 100%">
              <el-option label="手动新增" value="manual" />
              <el-option label="运营助手" value="ai_assistant" />
              <el-option label="鐖彇导入" value="crawled_import" />
            </el-select>
          </el-form-item>
          <el-form-item label="详情图">
            <el-input v-model="newStyleForm.detailImages" type="textarea" :rows="3" placeholder="每行一个图片 URL，作为详情图素材位" />
          </el-form-item>
          <el-form-item label="鍙傝€冨浘">
            <el-input v-model="newStyleForm.referenceImages" type="textarea" :rows="3" placeholder="每行一个图片 URL，作为参考图素材位" />
          </el-form-item>
          <el-form-item label="试戴素材">
            <el-input v-model="newStyleForm.tryonAssets" type="textarea" :rows="3" placeholder="姣忚涓€涓浘鐗?URL锛屼綔涓鸿瘯鎴寸礌鏉愪綅" />
          </el-form-item>
          <el-form-item label="鎵规澶囨敞">
            <el-input v-model="newStyleForm.batchNote" type="textarea" :rows="3" placeholder="方便连续录入多个美甲样式时保留本批次备注" />
          </el-form-item>
        </div>

        <div class="asset-preview-panel">
          <div class="asset-preview-card">
            <div class="asset-preview-card__title">封面预览</div>
            <el-image :src="coverPreview" fit="cover" class="asset-preview-cover">
              <template #error>
                <div class="asset-preview-empty">寰呰ˉ灏侀潰鍥</div>
              </template>
            </el-image>
          </div>
          <div class="asset-preview-card">
            <div class="asset-preview-card__title">褰曞叆妫€鏌</div>
            <ul class="asset-preview-list">
              <li><strong>详情图：</strong>{{ detailPreviewItems.length }} 张</li>
              <li><strong>鍙傝€冨浘锛</strong>{{ referencePreviewItems.length }} 寮</li>
              <li><strong>试戴素材：</strong>{{ tryonPreviewItems.length }} 寮</li>
              <li><strong>鏉ユ簮锛</strong>{{ sourceLabelMap[newStyleForm.source] }}</li>
              <li><strong>批次备注：</strong>{{ newStyleForm.batchNote?.trim() || '未填写' }}</li>
            </ul>
          </div>
        </div>

        <div class="form-grid tags-grid">
          <el-form-item label="颜色标签">
            <el-input v-model="newStyleForm.colorTags" placeholder="多个用 / 分隔" />
          </el-form-item>
          <el-form-item label="风格标签">
            <el-input v-model="newStyleForm.styleTags" placeholder="多个用 / 分隔" />
          </el-form-item>
          <el-form-item label="宸ヨ壓标签">
            <el-input v-model="newStyleForm.craftTags" placeholder="多个用 / 分隔" />
          </el-form-item>
          <el-form-item label="甲型标签">
            <el-input v-model="newStyleForm.lengthTags" placeholder="多个用 / 分隔" />
          </el-form-item>
          <el-form-item label="场景标签">
            <el-input v-model="newStyleForm.sceneTags" placeholder="多个用 / 分隔" />
          </el-form-item>
          <el-form-item label="鏁堟灉标签">
            <el-input v-model="newStyleForm.effectTags" placeholder="多个用 / 分隔" />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="cancelAddStyle">取消</el-button>
        <el-button @click="submitAddStyle(true)">保存并继续新增</el-button>
        <el-button type="primary" @click="submitAddStyle(false)">保存新款式</el-button>
      </template>
    </el-dialog>


    <el-dialog v-model="batchDialogVisible" title="批量新增款式" width="760px">
      <div class="assistant-align-note">
        <strong>和运营助手批量补款对齐</strong>
        <span>支持把 Excel 或表格内容按制表符粘贴进来，一次新增多款。来源、状态、可制作和批次备注会统一套用到本批新款。</span>
      </div>

      <el-form label-width="108px">
        <div class="form-grid">
          <el-form-item label="统一状态">
            <el-select v-model="batchForm.status" style="width: 100%">
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="pending_review" />
              <el-option label="已上架" value="published" />
            </el-select>
          </el-form-item>
          <el-form-item label="统一来源">
            <el-select v-model="batchForm.source" style="width: 100%">
              <el-option label="手动新增" value="manual" />
              <el-option label="运营助手" value="ai_assistant" />
              <el-option label="爬取导入" value="crawled_import" />
            </el-select>
          </el-form-item>
          <el-form-item label="统一可制作">
            <el-switch v-model="batchForm.makeable" />
          </el-form-item>
          <el-form-item label="批次备注">
            <el-input v-model="batchForm.batchNote" placeholder="例如：端午新品第一批 / 门店 A 补款" />
          </el-form-item>
        </div>

        <el-form-item label="批量内容">
          <el-input
            v-model="batchForm.rawText"
            type="textarea"
            :rows="10"
            placeholder="每行一款，支持 Excel 制表符粘贴。列顺序：编号、名称、分类、价格、介绍、封面图、颜色标签、风格标签、工艺标签、甲长标签、场景标签、效果标签、详情图、参考图、试戴素材"
          />
        </el-form-item>
      </el-form>

      <div class="batch-helper">
        <div class="batch-helper__title">批量模板示例</div>
        <pre>{{ batchTemplateExample }}</pre>
      </div>

      <div class="asset-preview-panel">
        <div class="asset-preview-card">
          <div class="asset-preview-card__title">解析结果</div>
          <ul class="asset-preview-list">
            <li><strong>总行数：</strong>{{ batchPreview.totalRows }}</li>
            <li><strong>可新增：</strong>{{ batchPreview.validRows.length }}</li>
            <li><strong>待补全：</strong>{{ batchPreview.invalidRows.length }}</li>
            <li><strong>来源：</strong>{{ sourceLabelMap[batchForm.source] }}</li>
          </ul>
        </div>
        <div class="asset-preview-card">
          <div class="asset-preview-card__title">前 5 条预览</div>
          <ul class="asset-preview-list">
            <li v-for="item in batchPreview.validRows.slice(0, 5)" :key="item.lineNo">
              #{{ item.lineNo }} {{ item.name }} / {{ item.category }} / ￥{{ item.price }}
            </li>
            <li v-if="!batchPreview.validRows.length">还没有可导入的款式</li>
          </ul>
        </div>
      </div>

      <div v-if="batchPreview.invalidRows.length" class="preview-block">
        <h4>待补全行</h4>
        <ul>
          <li v-for="item in batchPreview.invalidRows.slice(0, 8)" :key="item.lineNo">
            第 {{ item.lineNo }} 行：{{ item.reason }}
          </li>
        </ul>
      </div>

      <template #footer>
        <el-button @click="cancelBatchDialog">取消</el-button>
        <el-button type="primary" @click="submitBatchStyles">批量新增</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="previewDialogVisible" :title="previewResult?.preview?.title || '操作预览'" width="720px">
      <div v-if="previewResult?.preview" class="preview-dialog">
        <p class="preview-summary">{{ previewResult.preview.summary }}</p>
        <div class="preview-meta">
          <el-tag :type="riskTagType(previewResult.preview.riskLevel)">{{ riskLabel(previewResult.preview.riskLevel) }}</el-tag>
          <el-tag v-if="previewResult.preview.secondConfirmRequired" type="danger">闇€瑕佷簩娆＄‘璁</el-tag>
        </div>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="操作">{{ previewResult.preview.operationName }}</el-descriptions-item>
          <el-descriptions-item label="瀵硅薄">
            {{ previewResult.preview.targets.map((item) => item.targetName || item.targetId).join(' / ') }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="preview-columns">
          <div class="preview-block">
            <h4>Before</h4>
            <pre>{{ formatJson(previewResult.preview.before) }}</pre>
          </div>
          <div class="preview-block">
            <h4>After</h4>
            <pre>{{ formatJson(previewResult.preview.after) }}</pre>
          </div>
        </div>

        <div class="preview-block">
          <h4>鍘熷洜</h4>
          <ul>
            <li v-for="item in previewResult.preview.reasons" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div class="preview-block">
          <h4>褰卞搷</h4>
          <ul>
            <li v-for="item in previewResult.preview.impact" :key="item">{{ item }}</li>
          </ul>
        </div>

        <el-input
          v-if="previewResult.preview.secondConfirmRequired && previewResult.approval?.status === 'pending'"
          v-model="confirmText"
          placeholder="请输入：确认执行"
        />
      </div>

      <template #footer>
        <el-button @click="cancelPreview">取消</el-button>
        <el-button
          v-if="previewResult?.approval?.status === 'pending'"
          type="primary"
          :loading="approving"
          @click="confirmPreview"
        >
          {{ previewResult?.preview?.secondConfirmRequired ? '确认执行' : '确认' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { approveAndExecuteOperation, executeAgentRequest, rejectApproval } from '@/agent/agent-executor'
import { createMockStyle, getStyleManagementRows, persistAgentState } from '@/agent/mock-data'

const keyword = ref('')
const status = ref('')
const styleList = ref([])
const detail = ref(null)
const drawerVisible = ref(false)
const addDialogVisible = ref(false)
const batchDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const previewResult = ref(null)
const confirmText = ref('')
const approving = ref(false)
const trendSnapshot = ref({ dateRange: {}, styles: [] })
const detailWindowDays = ref(30)
const detailDailyChartRef = ref(null)
const detailWeeklyChartRef = ref(null)
let detailDailyChart = null
let detailWeeklyChart = null
const trendWindowOptions = [7, 14, 30, 120]

const initialStyleForm = () => ({
  styleCode: '',
  name: '',
  description: '',
  category: '',
  price: 168,
  status: 'draft',
  makeable: true,
  source: 'manual',
  coverImage: '',
  detailImages: '',
  referenceImages: '',
  tryonAssets: '',
  batchNote: '',
  colorTags: '',
  styleTags: '',
  craftTags: '',
  lengthTags: '',
  sceneTags: '',
  effectTags: ''
})

const newStyleForm = ref(initialStyleForm())
const initialBatchForm = () => ({
  status: 'draft',
  source: 'manual',
  makeable: true,
  batchNote: '',
  rawText: ''
})
const batchForm = ref(initialBatchForm())
const batchTemplateExample = `S0401\t奶灰细闪猫眼\t猫眼\t168\t上手显白，适合通勤和约会。\thttps://example.com/cover-1.jpg\t奶灰/银闪\t温柔/高级\t猫眼/细闪\t短甲\t通勤/约会\t显白/提气色\thttps://example.com/detail-1.jpg,https://example.com/detail-2.jpg\thttps://example.com/ref-1.jpg\thttps://example.com/tryon-1.jpg
S0402\t香槟法式跳色\t法式\t188\t线条更干净，适合拍照和聚会。\thttps://example.com/cover-2.jpg\t香槟/裸粉\t简约/高级\t法式/跳色\t中短甲\t聚会/拍照\t精致/通透\thttps://example.com/detail-3.jpg\thttps://example.com/ref-2.jpg\thttps://example.com/tryon-2.jpg`

const filteredStyles = computed(() => {
  return styleList.value.filter((item) => {
    const text = `${item.name}${item.styleCode || ''}${item.category}${item.tags.join('')}`
    const keywordMatched = !keyword.value || text.toLowerCase().includes(keyword.value.toLowerCase())
    const statusMatched = !status.value || item.rawStatus === status.value
    return keywordMatched && statusMatched
  })
})

const detailTrendMeta = computed(() => trendSnapshot.value.styles?.find((item) => item.styleId === detail.value?.id) || null)
const trendRangeText = computed(() => {
  const range = trendSnapshot.value.dateRange || {}
  return range.startDate ? `${range.startDate} 到 ${range.endDate}` : '趋势数据准备中...'
})

const coverPreview = computed(() => newStyleForm.value.coverImage.trim() || '')
const detailPreviewItems = computed(() => splitLines(newStyleForm.value.detailImages))
const referencePreviewItems = computed(() => splitLines(newStyleForm.value.referenceImages))
const tryonPreviewItems = computed(() => splitLines(newStyleForm.value.tryonAssets))
const sourceLabelMap = {
  manual: '手动新增',
  ai_assistant: '运营助手',
  crawled_import: '鐖彇导入'
}
const batchPreview = computed(() => parseBatchInput(batchForm.value.rawText))

watch(detail, (value) => {
  drawerVisible.value = Boolean(value)
})

watch(drawerVisible, async (visible) => {
  if (!visible || !detailTrendMeta.value) return
  await nextTick()
  renderDetailCharts()
})

watch(detailWindowDays, async () => {
  if (!drawerVisible.value || !detailTrendMeta.value) return
  await nextTick()
  renderDetailCharts()
})

function splitTags(value) {
  return String(value || '')
    .split(/[\\/,，、；;]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitBatchCell(value) {
  return String(value || '')
    .split(/[，,；;\/]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseBatchInput(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  const validRows = []
  const invalidRows = []

  lines.forEach((line, index) => {
    const cols = line.split('\t').map((item) => item.trim())
    const [styleCode = '', name = '', category = '', price = '', description = '', coverImage = '', colorTags = '', styleTags = '', craftTags = '', lengthTags = '', sceneTags = '', effectTags = '', detailImages = '', referenceImages = '', tryonAssets = ''] = cols

    if (!name || !category || !description) {
      invalidRows.push({
        lineNo: index + 1,
        reason: '名称 / 分类 / 介绍至少需要补齐'
      })
      return
    }

    validRows.push({
      lineNo: index + 1,
      styleCode,
      name,
      category,
      price: Number(price || 0),
      description,
      coverImage,
      colorTags: splitBatchCell(colorTags),
      styleTags: splitBatchCell(styleTags),
      craftTags: splitBatchCell(craftTags),
      lengthTags: splitBatchCell(lengthTags),
      sceneTags: splitBatchCell(sceneTags),
      effectTags: splitBatchCell(effectTags),
      detailImages: splitBatchCell(detailImages),
      referenceImages: splitBatchCell(referenceImages),
      tryonAssets: splitBatchCell(tryonAssets)
    })
  })

  return {
    totalRows: lines.length,
    validRows,
    invalidRows
  }
}

function submitAddStyle(keepOpen = false) {
  if (!newStyleForm.value.name.trim()) {
    ElMessage.warning('璇峰厛濉啓款式名称')
    return
  }
  if (!newStyleForm.value.category.trim()) {
    ElMessage.warning('璇峰厛濉啓分类')
    return
  }
  if (!newStyleForm.value.description.trim()) {
    ElMessage.warning('璇峰厛濉啓款式介绍')
    return
  }

  const created = createMockStyle({
    styleCode: newStyleForm.value.styleCode.trim(),
    name: newStyleForm.value.name.trim(),
    description: newStyleForm.value.description.trim(),
    category: newStyleForm.value.category.trim(),
    price: Number(newStyleForm.value.price || 0),
    status: newStyleForm.value.status,
    makeable: newStyleForm.value.makeable,
    colorTags: splitTags(newStyleForm.value.colorTags),
    styleTags: splitTags(newStyleForm.value.styleTags),
    craftTags: splitTags(newStyleForm.value.craftTags),
    lengthTags: splitTags(newStyleForm.value.lengthTags),
    sceneTags: splitTags(newStyleForm.value.sceneTags),
    effectTags: splitTags(newStyleForm.value.effectTags),
    coverImage: newStyleForm.value.coverImage.trim(),
    detailImages: splitLines(newStyleForm.value.detailImages),
    referenceImages: splitLines(newStyleForm.value.referenceImages),
    tryonAssets: splitLines(newStyleForm.value.tryonAssets),
    crawled: newStyleForm.value.source === 'crawled_import'
  })

  persistAgentState()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agent-state-changed'))
  }

  if (keepOpen) {
    const source = newStyleForm.value.source
    const batchNote = newStyleForm.value.batchNote
    newStyleForm.value = {
      ...initialStyleForm(),
      source,
      batchNote
    }
  } else {
    addDialogVisible.value = false
    newStyleForm.value = initialStyleForm()
  }
  refreshStylesFromAgent()
  ElMessage.success(keepOpen ? `已新增款式：${created.name}，可继续录入下一款` : `已新增款式：${created.name}`)
}

function cancelAddStyle() {
  addDialogVisible.value = false
  newStyleForm.value = initialStyleForm()
}

function openBatchDialog() {
  batchDialogVisible.value = true
}

function cancelBatchDialog() {
  batchDialogVisible.value = false
  batchForm.value = initialBatchForm()
}

function submitBatchStyles() {
  if (!batchPreview.value.validRows.length) {
    ElMessage.warning('璇峰厛绮樿创鍙В鏋愮殑批量新增鍐呭')
    return
  }

  const createdCount = batchPreview.value.validRows.length

  batchPreview.value.validRows.forEach((item) => {
    createMockStyle({
      styleCode: item.styleCode,
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      status: batchForm.value.status,
      makeable: batchForm.value.makeable,
      colorTags: item.colorTags,
      styleTags: item.styleTags,
      craftTags: item.craftTags,
      lengthTags: item.lengthTags,
      sceneTags: item.sceneTags,
      effectTags: item.effectTags,
      coverImage: item.coverImage,
      detailImages: item.detailImages,
      referenceImages: item.referenceImages,
      tryonAssets: item.tryonAssets,
      crawled: batchForm.value.source === 'crawled_import'
    })
  })

  persistAgentState()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agent-state-changed'))
  }

  batchDialogVisible.value = false
  batchForm.value = initialBatchForm()
  refreshStylesFromAgent()
  ElMessage.success(`已批量新增 ${createdCount} 款美甲样式`)
}

function statusLabel(rawStatus) {
  return {
    draft: '草稿',
    pending_review: '待审核',
    published: '已上架',
    unpublished: '已下架',
    archived: '已归档',
    hidden: '闅愯棌'
  }[rawStatus] || rawStatus
}

function statusTagType(rawStatus) {
  return {
    draft: 'info',
    pending_review: 'warning',
    published: 'success',
    unpublished: '',
    archived: 'danger',
    hidden: 'warning'
  }[rawStatus] || 'info'
}

function riskTagType(level) {
  return {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger'
  }[level] || 'info'
}

function riskLabel(level) {
  return {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '极高风险'
  }[level] || level
}

function canPublish(row) {
  return ['draft', 'pending_review'].includes(row.rawStatus)
}

function canUnpublish(row) {
  return row.rawStatus === 'published'
}

function canRestore(row) {
  return row.rawStatus === 'unpublished'
}

function canArchive(row) {
  return row.rawStatus !== 'archived'
}

function togglePromote(row) {
  row.isRecommend = !row.isRecommend
  ElMessage.info('主推开关当前还是页面态，下一步可以补成原子操作和审计日志。')
}

function buildManualPlan(action, row) {
  const base = {
    userGoal: `${action} ${row.styleCode || row.id}`,
    objects: {
      styleIds: [row.styleCode || row.id],
      filters: { targetStatus: row.rawStatus }
    }
  }

  if (action === 'publish') {
    return {
      intentType: 'execute',
      riskLevel: 'high',
      needConfirm: true,
      ...base,
      plan: [
        { step: 1, operation: 'search_styles', reason: '按款式编号定位目标款式。', params: { keyword: row.styleCode || row.id } },
        { step: 2, operation: 'check_style_publish_readiness', reason: '检查上架资料完整度和可制作性。', params: { styleId: row.styleCode || row.id } },
        { step: 3, operation: 'preview_publish_style', reason: '生成上架预览，不直接执行。', params: { styleId: row.styleCode || row.id } },
        { step: 4, operation: 'create_approval', reason: '生成确认单。', params: {} }
      ],
      finalResponseType: 'approval_required'
    }
  }

  if (action === 'restore') {
    return {
      intentType: 'execute',
      riskLevel: 'high',
      needConfirm: true,
      ...base,
      plan: [
        { step: 1, operation: 'search_styles', reason: '按款式编号定位要恢复上架的款式。', params: { keyword: row.styleCode || row.id } },
        { step: 2, operation: 'preview_restore_style', reason: '预览恢复上架后的状态和影响。', params: { styleId: row.styleCode || row.id } },
        { step: 3, operation: 'create_approval', reason: '生成确认单。', params: {} }
      ],
      finalResponseType: 'approval_required'
    }
  }

  if (action === 'archive') {
    return {
      intentType: 'execute',
      riskLevel: 'critical',
      needConfirm: true,
      needSecondConfirm: true,
      ...base,
      plan: [
        { step: 1, operation: 'search_styles', reason: '按款式编号定位要归档的款式。', params: { keyword: row.styleCode || row.id } },
        { step: 2, operation: 'preview_archive_style', reason: '生成归档预览，不物理删除。', params: { styleId: row.styleCode || row.id } },
        { step: 3, operation: 'create_approval', reason: '生成确认单。', params: {} }
      ],
      finalResponseType: 'approval_required'
    }
  }

  return {
    intentType: 'execute',
    riskLevel: 'high',
    needConfirm: true,
    ...base,
    plan: [
      { step: 1, operation: 'search_styles', reason: '按款式编号定位要下架的款式。', params: { keyword: row.styleCode || row.id } },
      { step: 2, operation: 'get_style_window_metrics', reason: '补充查看趋势和风险指标。', params: { styleId: row.styleCode || row.id } },
      { step: 3, operation: 'preview_unpublish_style', reason: '生成单款下架预览，不直接执行。', params: { styleId: row.styleCode || row.id } },
      { step: 4, operation: 'create_approval', reason: '生成确认单。', params: {} }
    ],
    finalResponseType: 'approval_required'
  }
}

function openManualPreview(action, row) {
  const result = executeAgentRequest(
    `${action} ${row.styleCode || row.id}`,
    {
      selectedStyleId: row.id,
      storeId: 'store-001',
      today: '2026-05-29'
    },
    buildManualPlan(action, row)
  )

  previewResult.value = result
  confirmText.value = ''
  previewDialogVisible.value = true
}

async function confirmPreview() {
  if (!previewResult.value?.approval?.approvalId) return
  approving.value = true
  try {
    approveAndExecuteOperation(previewResult.value.approval.approvalId, confirmText.value)
    ElMessage.success('操作已执行，并写入审计日志。')
    previewDialogVisible.value = false
    previewResult.value = null
    confirmText.value = ''
    refreshStylesFromAgent()
  } catch (error) {
    ElMessage.error(error.message || '执行失败')
  } finally {
    approving.value = false
  }
}

function cancelPreview() {
  if (previewResult.value?.approval?.status === 'pending') {
    rejectApproval(previewResult.value.approval.approvalId)
  }
  previewDialogVisible.value = false
  previewResult.value = null
  confirmText.value = ''
}

function sliceTrendWindow(series, windowDays) {
  if (!Array.isArray(series)) return []
  if (!windowDays || windowDays >= series.length) return series
  return series.slice(-windowDays)
}

function formatJson(value) {
  return JSON.stringify(value, null, 2)
}

async function fetchTrendSnapshot() {
  try {
    const response = await fetch('/api/xhs-trend-snapshot')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '鑾峰彇瓒势蹇収澶辫触')
    trendSnapshot.value = data
  } catch (error) {
    console.warn('[styles] trend snapshot unavailable', error)
  }
}

function buildDailyOption() {
  const daily = sliceTrendWindow(detailTrendMeta.value?.daily || [], detailWindowDays.value)
  return {
    color: ['#ff6b9d', '#36cfc9', '#faad14', '#722ed1'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['浏览', '试戴成功', '想做', '确认做'], bottom: 0 },
    grid: { left: 36, right: 24, top: 24, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: daily.map((item) => item.date), axisLabel: { color: '#888', showMaxLabel: true, showMinLabel: true } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } } },
    series: [
      { name: '浏览', type: 'line', smooth: true, data: daily.map((item) => item.view_uv) },
      { name: '试戴鎴愬姛', type: 'line', smooth: true, data: daily.map((item) => item.tryon_result_uv) },
      { name: '想做', type: 'line', smooth: true, data: daily.map((item) => item.want_uv) },
      { name: '确认做', type: 'line', smooth: true, data: daily.map((item) => item.total_confirm_uv) }
    ]
  }
}

function buildWeeklyOption() {
  const weekly = detailTrendMeta.value?.weekly || []
  return {
    color: ['#ff6b9d', '#f5222d', '#52c41a'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['热度分', '冷门风险', '增长分'], bottom: 0 },
    grid: { left: 36, right: 24, top: 24, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: weekly.map((item) => `W${item.week_idx}`), axisLabel: { color: '#888' } },
    yAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } } },
    series: [
      { name: '热度分', type: 'bar', barWidth: 14, data: weekly.map((item) => item.hot_score) },
      { name: '冷门风险', type: 'line', smooth: true, data: weekly.map((item) => item.cold_risk_score) },
      { name: '增长分', type: 'line', smooth: true, data: weekly.map((item) => item.growth_score) }
    ]
  }
}

function renderDetailCharts() {
  if (!detailTrendMeta.value || !detailDailyChartRef.value || !detailWeeklyChartRef.value) return
  if (!detailDailyChart) detailDailyChart = echarts.init(detailDailyChartRef.value, window.__ECHARTS_THEME__)
  if (!detailWeeklyChart) detailWeeklyChart = echarts.init(detailWeeklyChartRef.value, window.__ECHARTS_THEME__)
  detailDailyChart.setOption(buildDailyOption())
  detailWeeklyChart.setOption(buildWeeklyOption())
}

function resizeDetailCharts() {
  detailDailyChart?.resize()
  detailWeeklyChart?.resize()
}

function refreshStylesFromAgent() {
  styleList.value = getStyleManagementRows()
}

onMounted(async () => {
  refreshStylesFromAgent()
  await fetchTrendSnapshot()
  window.addEventListener('agent-state-changed', refreshStylesFromAgent)
  window.addEventListener('resize', resizeDetailCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('agent-state-changed', refreshStylesFromAgent)
  window.removeEventListener('resize', resizeDetailCharts)
  detailDailyChart?.dispose()
  detailWeeklyChart?.dispose()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 18px;
}

.page-header h2 {
  margin: 0 0 6px;
}

.page-header p,
.meta {
  color: #777;
}

.panel {
  margin-bottom: 16px;
}

.assistant-align-note {
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
  display: grid;
  gap: 4px;
}

.assistant-align-note span {
  color: #777;
  line-height: 1.6;
}

.asset-section {
  margin: 10px 0 2px;
}

.asset-section__header {
  display: grid;
  gap: 4px;
}

.asset-section__header span {
  color: #777;
  line-height: 1.6;
}

.toolbar,
.style-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.style-copy {
  display: grid;
  gap: 4px;
}

.thumb {
  width: 58px;
  height: 58px;
  border-radius: 8px;
}

.tag {
  margin: 0 4px 4px 0;
}

.row-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
}

/* 操作按钮 — 高对比度区分 */
.row-actions :deep(.el-button) {
  font-weight: 600 !important;
  font-size: 13px !important;
  padding: 2px 6px !important;
  border-radius: 6px !important;
  transition: background 150ms, color 150ms !important;
}

/* 详情 / 走势 — 中性棕灰 */
.row-actions :deep(.btn-warm) {
  color: rgba(45,26,16,0.5) !important;
}
.row-actions :deep(.btn-warm:hover) {
  color: #2d1a10 !important;
  background: rgba(45,26,16,0.06) !important;
}

/* 上架 — 鲜绿 */
.row-actions :deep(.btn-success) {
  color: #27a869 !important;
}
.row-actions :deep(.btn-success:hover) {
  background: rgba(39,168,105,0.10) !important;
}

/* 下架 — 品牌粉 */
.row-actions :deep(.btn-muted) {
  color: #c05080 !important;
}
.row-actions :deep(.btn-muted:hover) {
  background: rgba(192,80,128,0.10) !important;
}

/* 归档 — 红色警示 */
.row-actions :deep(.btn-danger) {
  color: #d94f3d !important;
}
.row-actions :deep(.btn-danger:hover) {
  background: rgba(217,79,61,0.10) !important;
}

/* 设为/取消主推 — 暗橙 */
.row-actions :deep(.btn-promote) {
  color: #d4781a !important;
  font-size: 12px !important;
}
.row-actions :deep(.btn-promote:hover) {
  background: rgba(212,120,26,0.09) !important;
}

.detail-image {
  width: 100%;
  height: 220px;
  border-radius: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.tags-grid {
  margin-top: 4px;
}

.asset-preview-panel {
  display: grid;
  grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
  gap: 16px;
  margin: 8px 0 4px;
}

.asset-preview-card {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.asset-preview-card__title {
  margin-bottom: 10px;
  font-weight: 600;
}

.asset-preview-cover {
  width: 100%;
  height: 180px;
  border-radius: 8px;
  background: #f3f4f6;
  overflow: hidden;
}

.asset-preview-empty {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #909399;
  font-size: 13px;
}

.asset-preview-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: #606266;
}

.batch-helper {
  margin: 14px 0;
  padding: 12px;
  border: 1px dashed #d9dce3;
  border-radius: 8px;
  background: #fcfcfd;
}

.batch-helper__title {
  margin-bottom: 8px;
  font-weight: 600;
}

.batch-helper pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #606266;
  font-size: 12px;
  line-height: 1.6;
}

.preview-dialog {
  display: grid;
  gap: 14px;
}

.preview-summary {
  margin: 0;
  color: #606266;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.preview-block {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.preview-block h4 {
  margin: 0 0 10px;
}

.preview-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
}

.trend-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0;
}

.detail-chart {
  height: 240px;
  margin-top: 14px;
}

.detail-chart.large {
  height: 320px;
}

.trend-window-group {
  margin: 2px 0 8px;
}

@media (max-width: 900px) {
  .asset-preview-panel,
  .form-grid,
  .preview-columns {
    grid-template-columns: 1fr;
  }
}
</style>



