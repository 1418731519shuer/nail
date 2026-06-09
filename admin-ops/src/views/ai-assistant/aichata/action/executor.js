/**
 * 原子操作执行器
 * 支持：参数校验 → $ref 结果引用解析 → API 调用 → 结果返回
 */
import { ATOMIC_OPS } from './atomic-operations.js'

const api = {
  async get(path) {
    const r = await fetch(path)
    if (!r.ok) throw new Error(`GET ${path} → ${r.status}`)
    return r.json()
  },
  async patch(path, body) {
    const r = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `PATCH ${path} → ${r.status}`) }
    return r.json()
  },
  async put(path, body) {
    const r = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `PUT ${path} → ${r.status}`) }
    return r.json()
  },
  async post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `POST ${path} → ${r.status}`) }
    return r.json()
  },
  async delete(path) {
    const r = await fetch(path, { method: 'DELETE' })
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `DELETE ${path} → ${r.status}`) }
    return r.json()
  }
}

function notifyPageRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agent-state-changed'))
  }
}

/**
 * 从 resultStore 中按 dotPath 取值，支持 "rows.0.hot_score" 或 "rows[0].hot_score"
 */
function getByPath(obj, dotPath) {
  return dotPath
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .reduce((cur, key) => cur?.[key], obj)
}

/**
 * 评估条件：{ "$ref": "varName", "path": "rows.0.hot_score", "op": "gt"|"lt"|"gte"|"lte"|"eq"|"ne", "value": 100 }
 * 返回 true 表示满足条件（应执行该步），false 表示跳过
 */
function evalCondition(condition, resultStore) {
  if (!condition) return true
  const stored = resultStore[condition.$ref]
  if (stored === undefined) throw new Error(`condition $ref "${condition.$ref}" 未找到，前置查询未执行`)
  const actual = getByPath(stored, condition.path)
  const v = condition.value
  switch (condition.op) {
    case 'gt':  return actual > v
    case 'gte': return actual >= v
    case 'lt':  return actual < v
    case 'lte': return actual <= v
    case 'eq':  return actual == v  // eslint-disable-line eqeqeq
    case 'ne':  return actual != v  // eslint-disable-line eqeqeq
    default: throw new Error(`不支持的条件运算符: ${condition.op}`)
  }
}

/**
 * 解析 params 中的 $ref 引用，将其替换为前一步查询结果中的真实值
 * $ref 格式：{ "$ref": "varName", "path": "rows", "map": "id" }
 */
function resolveParams(params, resultStore) {
  if (!params || typeof params !== 'object') return params
  const resolved = { ...params }
  for (const [key, val] of Object.entries(resolved)) {
    if (val && typeof val === 'object' && val.$ref) {
      const stored = resultStore[val.$ref]
      if (!stored) throw new Error(`$ref "${val.$ref}" 未找到，前置查询步骤可能未执行`)

      // 按 path 取值（支持 rows.0.id 或 rows[0].id 写法）
      let target = stored
      if (val.path) {
        const segs = val.path.replace(/\[(\d+)\]/g, '.$1').split('.')
        for (const seg of segs) target = target?.[seg]
      }

      if (Array.isArray(target)) {
        // 数组：按 map 提取字段列表（用于 ids: [...] 场景）
        resolved[key] = val.map ? target.map(item => item[val.map]) : target
        if (resolved[key].length === 0) throw new Error(`$ref "${val.$ref}" 解析结果为空，前置查询无数据`)
      } else if (target !== null && target !== undefined) {
        // 单值或单对象：按 map 取字段，或直接使用
        resolved[key] = val.map ? target[val.map] : target
        if (resolved[key] === undefined) throw new Error(`$ref "${val.$ref}" path="${val.path}" map="${val.map}" 字段不存在`)
      } else {
        throw new Error(`$ref "${val.$ref}" path="${val.path}" 取值为空`)
      }
    }
  }
  return resolved
}

/**
 * 执行单个原子操作
 */
export async function executeOp(opId, params, resultStore = {}) {
  const op = ATOMIC_OPS[opId]
  if (!op) return { ok: false, error: `未知操作: ${opId}` }
  try {
    const resolvedParams = resolveParams(params, resultStore)
    const data = await op.execute(resolvedParams, api)
    if (op.risk !== 'none') notifyPageRefresh()
    return { ok: true, data, resolvedParams }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/**
 * 批量顺序执行原子操作，支持 $ref 结果链
 * @param {Array<{ opId, params, resultRef? }>} plan
 */
export async function executePlan(plan) {
  const results = []
  const resultStore = {}  // resultRef 名称 → 执行结果

  for (const step of plan) {
    // 条件判断：不满足则标记 skipped，继续下一步（不中断）
    if (step.condition) {
      let condMet = false
      let condError = null
      try {
        condMet = evalCondition(step.condition, resultStore)
      } catch (e) {
        condError = e.message
      }
      if (condError) {
        results.push({ ...step, ok: false, error: condError, skipped: false })
        break
      }
      if (!condMet) {
        results.push({ ...step, ok: true, skipped: true, conditionMet: false, data: null })
        continue  // 条件不满足 → 跳过这步，继续执行后续步骤
      }
    }

    const result = await executeOp(step.opId, step.params, resultStore)
    results.push({ ...step, ...result, skipped: false })

    // 存储查询结果供后续步骤 $ref 引用
    if (result.ok && step.resultRef) {
      resultStore[step.resultRef] = result.data
    }

    if (!result.ok) break  // 出错即停
  }
  return results
}
