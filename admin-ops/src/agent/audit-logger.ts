export type OperationLog = {
  logId: string
  approvalId?: string
  operatorId?: string
  operationName: string
  riskLevel: string
  targets: any[]
  before: any
  after: any
  reasons: string[]
  result: 'success' | 'failed' | 'partial'
  errorMessage?: string
  rollbackSupported: boolean
  createdAt: string
}

const logs: OperationLog[] = []

export function writeOperationLog(log: Omit<OperationLog, 'logId' | 'createdAt'> & Partial<Pick<OperationLog, 'logId' | 'createdAt'>>) {
  const nextLog: OperationLog = {
    ...log,
    logId: log.logId || `log_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: log.createdAt || new Date().toISOString()
  }
  logs.unshift(nextLog)
  return nextLog
}

export function getOperationLogs(filter: any = {}) {
  return logs.filter((log) => {
    if (filter.operationName && log.operationName !== filter.operationName) return false
    if (filter.approvalId && log.approvalId !== filter.approvalId) return false
    return true
  })
}

export function getOperationLog(logId: string) {
  return logs.find((log) => log.logId === logId)
}

export function getStyleChangeHistory(styleId: string) {
  return logs.filter((log) => {
    return log.targets.some((target: any) => target.targetType === 'style' && target.targetId === styleId)
  })
}

export function getRecommendConfigHistory() {
  return logs.filter((log) => {
    return log.targets.some((target: any) => ['section', 'feed', 'config'].includes(target.targetType))
  })
}
