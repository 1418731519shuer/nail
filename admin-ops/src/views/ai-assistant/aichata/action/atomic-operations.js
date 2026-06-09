/**
 * 原子操作定义表（44个）
 * 每条定义描述一个不可分割的操作单元：入参 schema、风险等级、确认策略
 */

export const ATOMIC_OPS = {

  // ── 款式状态 ─────────────────────────────────────────────
  'style.publish': {
    label: '上架款式',
    risk: 'low',
    confirm: 'once',
    params: ['styleId'],
    describe: ({ styleId, name }) => `上架款式「${name || styleId}」`,
    async execute({ styleId }, api) {
      return api.patch(`/api/styles/${styleId}/status`, { status: 'published' })
    }
  },

  'style.unpublish': {
    label: '下架款式',
    risk: 'medium',
    confirm: 'once',
    params: ['styleId'],
    describe: ({ styleId, name }) => `下架款式「${name || styleId}」`,
    async execute({ styleId }, api) {
      return api.patch(`/api/styles/${styleId}/status`, { status: 'unpublished' })
    }
  },

  'style.archive': {
    label: '归档款式',
    risk: 'high',
    confirm: 'double',
    params: ['styleId'],
    describe: ({ styleId, name }) => `归档款式「${name || styleId}」（不可逆）`,
    async execute({ styleId }, api) {
      return api.patch(`/api/styles/${styleId}/status`, { status: 'archived' })
    }
  },

  // ── 批量状态 ────────────────────────────────────────────
  'style.batchPublish': {
    label: '批量上架',
    risk: 'medium',
    confirm: 'once',
    params: ['ids'],
    describe: ({ ids }) => `批量上架 ${ids?.length || 0} 个款式`,
    async execute({ ids }, api) {
      return api.post('/api/styles/batch-status', { ids, status: 'published' })
    }
  },

  'style.batchUnpublish': {
    label: '批量下架',
    risk: 'medium',
    confirm: 'once',
    params: ['ids'],
    describe: ({ ids }) => `批量下架 ${ids?.length || 0} 个款式`,
    async execute({ ids }, api) {
      return api.post('/api/styles/batch-status', { ids, status: 'unpublished' })
    }
  },

  'style.batchArchive': {
    label: '批量归档',
    risk: 'high',
    confirm: 'double',
    params: ['ids'],
    describe: ({ ids }) => `批量归档 ${ids?.length || 0} 个款式（不可逆）`,
    async execute({ ids }, api) {
      return api.post('/api/styles/batch-status', { ids, status: 'archived' })
    }
  },

  'style.batchSetBucket': {
    label: '批量改热度分组',
    risk: 'medium',
    confirm: 'once',
    params: ['ids', 'bucket'],
    describe: ({ ids, bucket }) => `将 ${ids?.length || 0} 个款式分组改为 ${bucket}`,
    async execute({ ids, bucket }, api) {
      const allowed = ['hot', 'potential', 'cold', 'stable']
      if (!allowed.includes(bucket)) throw new Error(`bucket 必须是 ${allowed.join('/')}`)
      const results = []
      for (const id of ids) {
        results.push(await api.patch(`/api/styles/${id}`, { recommend_bucket: bucket }))
      }
      return { ok: true, affected: results.length }
    }
  },

  'style.batchSetPromoted': {
    label: '批量设主推标记',
    risk: 'low',
    confirm: 'once',
    params: ['ids', 'isPromoted'],
    describe: ({ ids, isPromoted }) => `批量${isPromoted ? '设置' : '取消'} ${ids?.length || 0} 个款式的主推标记`,
    async execute({ ids, isPromoted }, api) {
      const results = []
      for (const id of ids) {
        results.push(await api.patch(`/api/styles/${id}`, { is_promoted: isPromoted ? 1 : 0 }))
      }
      return { ok: true, affected: results.length }
    }
  },

  // ── 款式信息（单条修改）────────────────────────────────
  'style.setPrice': {
    label: '修改价格',
    risk: 'low',
    confirm: 'once',
    params: ['styleId', 'price'],
    describe: ({ name, styleId, price }) => `将「${name || styleId}」价格改为 ¥${price}`,
    async execute({ styleId, price }, api) {
      return api.patch(`/api/styles/${styleId}`, { price: Number(price) })
    }
  },

  'style.setDescription': {
    label: '修改描述文案',
    risk: 'low',
    confirm: 'once',
    params: ['styleId', 'description'],
    describe: ({ name, styleId }) => `修改「${name || styleId}」的描述文案`,
    async execute({ styleId, description }, api) {
      return api.patch(`/api/styles/${styleId}`, { description })
    }
  },

  'style.setBucket': {
    label: '修改热度分组',
    risk: 'low',
    confirm: 'once',
    params: ['styleId', 'bucket'],
    describe: ({ name, styleId, bucket }) => `将「${name || styleId}」分组改为 ${bucket}`,
    async execute({ styleId, bucket }, api) {
      const allowed = ['hot', 'potential', 'cold', 'stable']
      if (!allowed.includes(bucket)) throw new Error(`bucket 必须是 ${allowed.join('/')}`)
      return api.patch(`/api/styles/${styleId}`, { recommend_bucket: bucket })
    }
  },

  'style.setPromoted': {
    label: '设置主推标记',
    risk: 'low',
    confirm: 'once',
    params: ['styleId', 'isPromoted'],
    describe: ({ name, styleId, isPromoted }) => `${isPromoted ? '设置' : '取消'}「${name || styleId}」主推标记`,
    async execute({ styleId, isPromoted }, api) {
      return api.patch(`/api/styles/${styleId}`, { is_promoted: isPromoted ? 1 : 0 })
    }
  },

  'style.setCategory': {
    label: '修改分类',
    risk: 'low',
    confirm: 'once',
    params: ['styleId', 'category'],
    describe: ({ name, styleId, category }) => `将「${name || styleId}」分类改为「${category}」`,
    async execute({ styleId, category }, api) {
      return api.patch(`/api/styles/${styleId}`, { category })
    }
  },

  'style.setTags': {
    label: '修改标签',
    risk: 'low',
    confirm: 'once',
    params: ['styleId', 'tagField', 'tags'],
    describe: ({ name, styleId, tagField }) => `修改「${name || styleId}」的 ${tagField} 标签`,
    async execute({ styleId, tagField, tags }, api) {
      const allowed = ['tags_style', 'tags_color', 'tags_season', 'tags_shape']
      if (!allowed.includes(tagField)) throw new Error(`tagField 必须是 ${allowed.join('/')}`)
      return api.patch(`/api/styles/${styleId}`, { [tagField]: JSON.stringify(tags) })
    }
  },

  // ── 推荐位 ──────────────────────────────────────────────

  // 按预设策略生成完整一轮（8坑整批 upsert，事务保证）
  'recommend.generate': {
    label: 'AI生成推荐位',
    risk: 'medium',
    confirm: 'once',
    params: ['strategyId'],
    describe: ({ strategyId, intentText }) =>
      `按「${strategyId}」策略生成本轮推荐位${intentText ? `，偏好词：${intentText}` : ''}`,
    async execute({ strategyId, intentText = '' }, api) {
      return api.post('/api/recommend-slots/generate', { strategyId, intentText })
    }
  },

  // 保存自定义 slot_types 配置后立即生成（保存+生成原子组合）
  'recommend.generateCustom': {
    label: '自定义生成推荐位',
    risk: 'medium',
    confirm: 'once',
    params: ['slotTypes'],
    describe: ({ slotTypes }) => `自定义配置生成：${slotTypes?.join('→') || ''}`,
    async execute({ slotTypes, intentText = '' }, api) {
      await api.put('/api/recommend-strategies/custom', { slotTypes })
      return api.post('/api/recommend-slots/generate', { strategyId: 'custom', intentText })
    }
  },

  // 手动换款：将某款式放入指定坑位（标记 is_manual=1）
  'recommend.set': {
    label: '设置推荐坑位',
    risk: 'medium',
    confirm: 'once',
    params: ['styleId', 'position'],
    describe: ({ styleId, name, position }) => `将「${name || styleId}」放入 P${position} 坑位`,
    async execute({ styleId, position }, api) {
      return api.put(`/api/recommend-slots/${position}`, { styleId })
    }
  },

  // 清空某坑位（style_id 置 null，坑位保留）
  'recommend.clear': {
    label: '清空推荐坑位',
    risk: 'low',
    confirm: 'once',
    params: ['position'],
    describe: ({ position }) => `清空 P${position} 坑位`,
    async execute({ position }, api) {
      return api.delete(`/api/recommend-slots/${position}`)
    }
  },

  // 交换两个坑位的款式（事务保证，不会丢失任何款式）
  // 按坑位编号互换：运营看着页面说"第2位和第5位换一下"
  'recommend.swapPos': {
    label: '按位置交换坑位',
    risk: 'medium',
    confirm: 'once',
    params: ['positionA', 'positionB'],
    describe: ({ positionA, positionB }) => `交换 P${positionA} 与 P${positionB} 的款式`,
    async execute({ positionA, positionB }, api) {
      return api.post('/api/recommend-slots/swap', { positionA, positionB })
    }
  },

  // 按款式ID互换：运营说"把璀璨猫眼和法式渐变换一下"
  // 服务端自动查找各自坑位位置再互换，任一款式不在推荐位则报错
  'recommend.swapStyle': {
    label: '按款式互换坑位',
    risk: 'medium',
    confirm: 'once',
    params: ['styleIdA', 'styleIdB'],
    describe: ({ styleIdA, styleIdB, styleNameA, styleNameB }) =>
      `互换「${styleNameA || styleIdA}」与「${styleNameB || styleIdB}」的坑位`,
    async execute({ styleIdA, styleIdB }, api) {
      return api.post('/api/recommend-slots/swap-by-style', { styleIdA, styleIdB })
    }
  },

  // 清空全部8个坑位（保留 slot_type 和策略配置，等待下次生成）
  'recommend.clearAll': {
    label: '清空全部推荐坑位',
    risk: 'high',
    confirm: 'explicit',
    params: [],
    describe: () => `清空全部8个推荐坑位（保留坑位类型配置，款式全部置空）`,
    async execute(_params, api) {
      return api.delete('/api/recommend-slots')
    }
  },

  // 锁定坑位：AI 重新生成时跳过此坑位
  'recommend.lock': {
    label: '锁定推荐坑位',
    risk: 'low',
    confirm: 'once',
    params: ['position'],
    describe: ({ position }) => `锁定 P${position} 坑位（AI生成时保留当前款式）`,
    async execute({ position }, api) {
      return api.put(`/api/recommend-slots/${position}`, { locked: 1 })
    }
  },

  // 解锁坑位：恢复 AI 可自动替换
  'recommend.unlock': {
    label: '解锁推荐坑位',
    risk: 'low',
    confirm: 'once',
    params: ['position'],
    describe: ({ position }) => `解锁 P${position} 坑位（允许 AI 生成时替换）`,
    async execute({ position }, api) {
      return api.put(`/api/recommend-slots/${position}`, { locked: 0 })
    }
  },

  // 修改坑位类型：改变该坑位下次生成时从哪个候选池取款
  'recommend.setSlotType': {
    label: '修改坑位类型',
    risk: 'low',
    confirm: 'once',
    params: ['position', 'slotType'],
    describe: ({ position, slotType }) => `将 P${position} 坑位类型改为「${slotType}」`,
    async execute({ position, slotType }, api) {
      return api.put(`/api/recommend-slots/${position}`, { slotType })
    }
  },

  // 单槽刷新：保持原 slot_type，从候选池重新抓一个不同的款式（已锁定坑位报错）
  'recommend.refreshSlot': {
    label: '刷新单个坑位',
    risk: 'low',
    confirm: 'once',
    params: ['position'],
    describe: ({ position }) => `刷新 P${position} 坑位（保持坑位类型，重新从候选池选一款）`,
    async execute({ position }, api) {
      return api.post(`/api/recommend-slots/${position}/refresh`, {})
    }
  },

  // 补全空位：只填 style_id=NULL 且未锁定的坑位，已有款式不动
  'recommend.fillEmpty': {
    label: '补全空推荐坑位',
    risk: 'low',
    confirm: 'once',
    params: ['intentText'],
    describe: ({ intentText }) => `补全所有空坑位${intentText ? `（参考偏好：${intentText.slice(0,15)}）` : ''}`,
    async execute({ intentText = '' }, api) {
      return api.post('/api/recommend-slots/fill-empty', { intentText })
    }
  },

  // 批量锁定：一次锁定多个坑位，如"锁定前3位"
  'recommend.batchLock': {
    label: '批量锁定坑位',
    risk: 'low',
    confirm: 'once',
    params: ['positions'],
    describe: ({ positions }) => `批量锁定坑位 ${(positions||[]).map(p=>'P'+p).join('、')}`,
    async execute({ positions }, api) {
      return api.post('/api/recommend-slots/batch-lock', { positions })
    }
  },

  // 批量解锁
  'recommend.batchUnlock': {
    label: '批量解锁坑位',
    risk: 'low',
    confirm: 'once',
    params: ['positions'],
    describe: ({ positions }) => `批量解锁坑位 ${(positions||[]).map(p=>'P'+p).join('、')}`,
    async execute({ positions }, api) {
      return api.post('/api/recommend-slots/batch-unlock', { positions })
    }
  },

  // ── 通用查询（只读）─────────────────────────────────────
  // 核心：支持任意字段筛选/排序/limit
  'query.search': {
    label: '通用查询',
    risk: 'none',
    confirm: 'none',
    params: ['filters', 'sort', 'limit', 'fields'],
    describe: ({ filters, limit }) => `条件查询（${filters?.length || 0} 个过滤条件，返回最多 ${limit || 50} 条）`,
    async execute({ filters = [], sort, limit = 50, fields = [] }, api) {
      return api.post('/api/styles/query', { filters, sort, limit, fields })
    }
  },

  'query.styleDetail': {
    label: '查询款式详情',
    risk: 'none',
    confirm: 'none',
    params: ['styleId'],
    describe: ({ styleId }) => `查询款式 ${styleId} 详情`,
    async execute({ styleId }, api) {
      return api.get(`/api/styles/${styleId}`)
    }
  },

  'query.hotRank': {
    label: '查询热度排行',
    risk: 'none',
    confirm: 'none',
    params: ['limit'],
    describe: ({ limit }) => `查询热度排行 TOP${limit || 10}`,
    async execute({ limit = 10 }, api) {
      return api.get(`/api/styles/hot-rank?limit=${limit}`)
    }
  },

  'query.coldRisk': {
    label: '查询冷门风险',
    risk: 'none',
    confirm: 'none',
    params: ['threshold', 'limit'],
    describe: ({ threshold = 0.6, limit = 10 }) => `查询冷门风险 ≥${threshold} TOP${limit}`,
    async execute({ threshold = 0.6, limit = 10 }, api) {
      return api.get(`/api/styles/cold-risk?threshold=${threshold}&limit=${limit}`)
    }
  },

  'query.recommendSlots': {
    label: '查询推荐位现状',
    risk: 'none',
    confirm: 'none',
    params: [],
    describe: () => '查询 P1-P8 推荐位当前款式及锁定状态',
    async execute(_, api) {
      return api.get('/api/recommend-slots')
    }
  },

  // 查询各候选池 TOP N（已上架款式，按对应分数排序）
  'query.recommendPool': {
    label: '查询推荐候选池',
    risk: 'none',
    confirm: 'none',
    params: ['type', 'limit'],
    describe: ({ type, limit }) => `查询「${type}」候选池 TOP ${limit || 10}`,
    async execute({ type = 'hot', limit = 10 }, api) {
      // 复用 metricsRank，按候选池对应分数排序
      const metricMap = { hot: 'hot_score', potential: 'growth_score', cold: 'cold_risk_score', adaptive: 'tryon_confirm_rate' }
      const metric = metricMap[type] || 'hot_score'
      return api.post('/api/styles/query', {
        filters: [{ field: 'status', op: 'eq', value: 'published' }],
        sort: { field: metric, dir: 'desc' },
        limit,
        fields: ['id', 'name', 'recommend_bucket', metric, 'view_uv', 'tryon_confirm_rate']
      })
    }
  },

  // 查询推荐策略列表
  'query.recommendStrategies': {
    label: '查询推荐策略',
    risk: 'none',
    confirm: 'none',
    params: [],
    describe: () => '查询所有推荐策略及坑位配置',
    async execute(_, api) {
      return api.get('/api/recommend-strategies')
    }
  },

  // 查某款式是否在当前推荐位、在哪个位置
  'query.findStyleInSlots': {
    label: '查款式坑位归属',
    risk: 'none',
    confirm: 'none',
    params: ['styleId'],
    describe: ({ styleId, styleName }) => `查询「${styleName || styleId}」是否在推荐位及所在位置`,
    async execute({ styleId }, api) {
      return api.get(`/api/recommend-slots/find-style/${styleId}`)
    }
  },

  // 查当前锁定状态全览：返回全部8坑位+锁定标志，以及所有锁定的位置列表
  'query.lockedSlots': {
    label: '查询锁定状态',
    risk: 'none',
    confirm: 'none',
    params: [],
    describe: () => '查询全部推荐坑位的锁定状态及当前款式',
    async execute(_, api) {
      return api.get('/api/recommend-slots/locked')
    }
  },

  'query.stats': {
    label: '查询整体统计',
    risk: 'none',
    confirm: 'none',
    params: [],
    describe: () => '查询全库款式数量统计（按状态/分组）',
    async execute(_, api) {
      return api.get('/api/styles/stats')
    }
  },

  'query.metricsRank': {
    label: '按指标排行',
    risk: 'none',
    confirm: 'none',
    params: ['metric', 'limit', 'dir'],
    describe: ({ metric, limit, dir }) => `按 ${metric} ${dir === 'asc' ? '升序' : '降序'} 排行 TOP${limit || 10}`,
    async execute({ metric, limit = 10, dir = 'desc' }, api) {
      const allowed = ['hot_score','cold_risk_score','growth_score','view_uv','tryon_uv',
        'want_uv','confirm_uv','tryon_confirm_rate','xhs_likes','xhs_saves','xhs_comments','xhs_shares','price']
      if (!allowed.includes(metric)) throw new Error(`metric 必须是以下之一: ${allowed.join(', ')}`)
      return api.post('/api/styles/query', {
        filters: [],
        sort: { field: metric, dir },
        limit,
        fields: ['id','name','status','recommend_bucket', metric]
      })
    }
  },

  'query.metrics': {
    label: '查询款式指标',
    risk: 'none',
    confirm: 'none',
    params: ['styleId'],
    describe: ({ styleId, name }) => `查询「${name || styleId}」的完整指标数据`,
    async execute({ styleId }, api) {
      return api.post('/api/styles/query', {
        filters: [{ field: 'id', op: 'eq', value: styleId }],
        fields: ['id','name','hot_score','cold_risk_score','growth_score','view_uv','tryon_uv',
          'want_uv','confirm_uv','tryon_confirm_rate','xhs_likes','xhs_saves','xhs_comments','xhs_shares']
      })
    }
  },

  'query.priceRange': {
    label: '按价格区间查询',
    risk: 'none',
    confirm: 'none',
    params: ['minPrice', 'maxPrice', 'limit'],
    describe: ({ minPrice, maxPrice, limit }) => `查询价格 ¥${minPrice || 0}～¥${maxPrice || '∞'} 的款式（最多${limit || 50}条）`,
    async execute({ minPrice, maxPrice, limit = 50 }, api) {
      const filters = []
      if (minPrice != null) filters.push({ field: 'price', op: 'gte', value: minPrice })
      if (maxPrice != null) filters.push({ field: 'price', op: 'lte', value: maxPrice })
      return api.post('/api/styles/query', { filters, sort: { field: 'price', dir: 'asc' }, limit, fields: ['id', 'name', 'price', 'status', 'recommend_bucket'] })
    }
  },

  'query.lowConversion': {
    label: '查询低转化款式',
    risk: 'none',
    confirm: 'none',
    params: ['threshold', 'limit'],
    describe: ({ threshold = 0.1, limit = 20 }) => `查询试戴转化率 < ${threshold} 的款式（TOP${limit}）`,
    async execute({ threshold = 0.1, limit = 20 }, api) {
      return api.post('/api/styles/query', {
        filters: [
          { field: 'status', op: 'eq', value: 'published' },
          { field: 'tryon_confirm_rate', op: 'lt', value: threshold }
        ],
        sort: { field: 'tryon_confirm_rate', dir: 'asc' },
        limit,
        fields: ['id','name','status','tryon_uv','confirm_uv','tryon_confirm_rate','hot_score']
      })
    }
  },

  'query.byBucket': {
    label: '按热度分组查询',
    risk: 'none',
    confirm: 'none',
    params: ['bucket', 'limit'],
    describe: ({ bucket, limit }) => `查询 ${bucket} 分组的款式（最多${limit || 50}条）`,
    async execute({ bucket, limit = 50 }, api) {
      return api.post('/api/styles/query', {
        filters: [{ field: 'recommend_bucket', op: 'eq', value: bucket }],
        sort: { field: 'hot_score', dir: 'desc' },
        limit
      })
    }
  },

  'query.auditLog': {
    label: '查询审计日志',
    risk: 'none',
    confirm: 'none',
    params: ['limit'],
    describe: ({ limit }) => `查询最近 ${limit || 20} 条操作日志`,
    async execute({ limit = 20 }, api) {
      return api.get(`/api/audit-log?limit=${limit}`)
    }
  }
}

export const RISK_LABEL = { none: '只读', low: '低风险', medium: '中风险', high: '高风险' }
export const RISK_COLOR = { none: '#aaa', low: '#52c41a', medium: '#faad14', high: '#ff4d4f' }
