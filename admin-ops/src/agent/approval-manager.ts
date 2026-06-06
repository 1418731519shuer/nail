import type { OperationPreview } from './preview-builder'

export type Approval = {
  approvalId: string
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired'
  preview: OperationPreview
  createdAt: string
  approvedAt?: string
  rejectedAt?: string
  executedAt?: string
}

const approvals = new Map<string, Approval>()

function id() {
  return `apv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

export function createApproval(preview: OperationPreview): Approval {
  const approval: Approval = {
    approvalId: id(),
    status: 'pending',
    preview,
    createdAt: new Date().toISOString()
  }
  approvals.set(approval.approvalId, approval)
  return approval
}

export function approveOperation(approvalId: string, confirmText?: string): Approval {
  const approval = getApprovalStatus(approvalId)
  if (approval.status !== 'pending') throw new Error(`确认单当前状态为 ${approval.status}，不能确认。`)
  if (approval.preview.secondConfirmRequired && confirmText !== approval.preview.confirmText) {
    throw new Error(`该操作需要输入「${approval.preview.confirmText}」。`)
  }
  approval.status = 'approved'
  approval.approvedAt = new Date().toISOString()
  approvals.set(approvalId, approval)
  return approval
}

export function rejectOperation(approvalId: string): Approval {
  const approval = getApprovalStatus(approvalId)
  if (approval.status === 'executed') throw new Error('已执行的确认单不能拒绝。')
  approval.status = 'rejected'
  approval.rejectedAt = new Date().toISOString()
  approvals.set(approvalId, approval)
  return approval
}

export function markApprovalExecuted(approvalId: string): Approval {
  const approval = getApprovalStatus(approvalId)
  if (approval.status !== 'approved') throw new Error('未 approved 的操作不能执行。')
  approval.status = 'executed'
  approval.executedAt = new Date().toISOString()
  approvals.set(approvalId, approval)
  return approval
}

export function getApprovalStatus(approvalId: string): Approval {
  const approval = approvals.get(approvalId)
  if (!approval) throw new Error('确认单不存在。')
  return approval
}

export function listApprovals() {
  return Array.from(approvals.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
