import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = new URL('../', import.meta.url)
const tempOutDir = new URL('../node_modules/.agent-flow-test/', import.meta.url)

await build({
  root: fileURLToPath(root),
  logLevel: 'silent',
  build: {
    outDir: fileURLToPath(tempOutDir),
    emptyOutDir: true,
    ssr: 'src/agent/agent-executor.ts',
    rollupOptions: {
      output: {
        entryFileNames: 'agent-executor.mjs'
      }
    }
  }
})

const mod = await import(pathToFileURL(fileURLToPath(new URL('agent-executor.mjs', tempOutDir))).href)

const result = mod.executeAgentRequest('把最近冷掉的款下架，但猫眼不要动。', {
  selectedStyleId: 'style-gradient-003',
  storeId: 'store-001',
  today: '2026-05-29'
})

console.log(JSON.stringify({
  before: {
    intentType: result.plan.intentType,
    riskLevel: result.plan.riskLevel,
    needSecondConfirm: result.plan.needSecondConfirm,
    hasExcludeTag: result.plan.plan.some((item) => item.operation === 'exclude_tag_styles'),
    previewTitle: result.preview?.title,
    approvalStatus: result.approval?.status,
    targets: result.preview?.targets.map((item) => item.targetName)
  }
}, null, 2))

try {
  mod.approveAndExecuteOperation(result.approval.approvalId, '不是确认执行')
} catch (error) {
  console.log(JSON.stringify({ wrongConfirmRejected: error.message.includes('确认执行') }, null, 2))
}

const executed = mod.approveAndExecuteOperation(result.approval.approvalId, '确认执行')
const rows = mod.getAgentStyleRows()
console.log(JSON.stringify({
  after: {
    approvalStatus: executed.approval.status,
    logResult: executed.log.result,
    operationName: executed.log.operationName,
    targets: executed.log.targets.map((item) => item.targetName),
    targetStatuses: executed.log.targets.map((item) => ({
      name: item.targetName,
      status: rows.find((row) => row.id === item.targetId)?.status,
      rawStatus: rows.find((row) => row.id === item.targetId)?.rawStatus
    }))
  }
}, null, 2))

const slotResult = mod.executeAgentRequest('猫眼款 S0244，这款放到位置2', {
  selectedStyleId: 'style-gradient-003',
  storeId: 'store-001',
  today: '2026-05-29'
})
console.log(JSON.stringify({
  slotBefore: {
    intentType: slotResult.plan.intentType,
    riskLevel: slotResult.plan.riskLevel,
    needConfirm: slotResult.plan.needConfirm,
    operations: slotResult.plan.plan.map((item) => item.operation),
    previewTitle: slotResult.preview?.title,
    before: slotResult.preview?.before,
    after: slotResult.preview?.after,
    approvalStatus: slotResult.approval?.status
  }
}, null, 2))

const slotExecuted = mod.approveAndExecuteOperation(slotResult.approval.approvalId)
const recommendRows = mod.getAgentRecommendRows()
console.log(JSON.stringify({
  slotAfter: {
    approvalStatus: slotExecuted.approval.status,
    logResult: slotExecuted.log.result,
    operationName: slotExecuted.log.operationName,
    after: slotExecuted.log.after,
    position2: recommendRows.find((row) => row.position === 2)?.style?.name,
    position5: recommendRows.find((row) => row.position === 5)?.style?.name
  }
}, null, 2))

const unpublishResult = mod.executeAgentRequest('S0244 下架', {
  selectedStyleId: 'style-cat-eye-002',
  storeId: 'store-001',
  today: '2026-05-29'
})
console.log(JSON.stringify({
  unpublishBefore: {
    operations: unpublishResult.plan.plan.map((item) => item.operation),
    previewTitle: unpublishResult.preview?.title,
    approvalStatus: unpublishResult.approval?.status,
    beforeStatus: unpublishResult.preview?.before?.status,
    afterStatus: unpublishResult.preview?.after?.status
  }
}, null, 2))
const unpublishExecuted = mod.approveAndExecuteOperation(unpublishResult.approval.approvalId)
console.log(JSON.stringify({
  unpublishAfter: {
    approvalStatus: unpublishExecuted.approval.status,
    operationName: unpublishExecuted.log.operationName,
    styleStatus: mod.getAgentStyleRows().find((row) => row.styleCode === 'S0244')?.rawStatus
  }
}, null, 2))

const restoreResult = mod.executeAgentRequest('S0244 恢复上架', {
  selectedStyleId: 'style-cat-eye-002',
  storeId: 'store-001',
  today: '2026-05-29'
})
console.log(JSON.stringify({
  restoreBefore: {
    operations: restoreResult.plan.plan.map((item) => item.operation),
    previewTitle: restoreResult.preview?.title,
    approvalStatus: restoreResult.approval?.status,
    beforeStatus: restoreResult.preview?.before?.status,
    afterStatus: restoreResult.preview?.after?.status
  }
}, null, 2))
const restoreExecuted = mod.approveAndExecuteOperation(restoreResult.approval.approvalId)
console.log(JSON.stringify({
  restoreAfter: {
    approvalStatus: restoreExecuted.approval.status,
    operationName: restoreExecuted.log.operationName,
    styleStatus: mod.getAgentStyleRows().find((row) => row.styleCode === 'S0244')?.rawStatus
  }
}, null, 2))
