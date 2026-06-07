/**
 * 共享 opsData 缓存
 *
 * App.vue 侧边栏和 ai-assistant 页面从同一个 ref 读写，
 * 任意一侧刷新后另一侧立即可见最新数据。
 *
 * 用法：
 *   const { ensureOpsData, refreshOpsData, opsData } = useOpsData()
 */
import { ref } from 'vue'
import { fetchOpsData } from '@/api/opsData'

// 模块级单例 —— 所有调用方共享同一份引用
const opsData = ref(null)
let fetchPromise = null

async function ensureOpsData() {
  if (opsData.value) return opsData.value
  // 防止并发重复请求
  if (!fetchPromise) {
    fetchPromise = fetchOpsData()
      .then(data => { opsData.value = data; return data })
      .catch(() => null)
      .finally(() => { fetchPromise = null })
  }
  return fetchPromise
}

async function refreshOpsData() {
  fetchPromise = null
  opsData.value = null
  return ensureOpsData()
}

export function useOpsData() {
  return { opsData, ensureOpsData, refreshOpsData }
}
