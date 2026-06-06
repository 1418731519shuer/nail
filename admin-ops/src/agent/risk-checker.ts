import type { RiskLevel } from './atomic-operations'

export type RiskCheckResult = {
  riskLevel: RiskLevel
  needConfirm: boolean
  needSecondConfirm?: boolean
  normalizedAction?: string
  protectedConditions: string[]
}

export function extractProtectedConditions(input: string) {
  const protectedConditions: string[] = []
  if (/猫眼.*(不要|不).*(下架|动|替换)|保留.*猫眼/.test(input)) protectedConditions.push('猫眼不要下架')
  if (/主推.*(不要|不).*(下架|动|替换)|保留.*主推/.test(input)) protectedConditions.push('主推款不要动')
  if (/刚上架|新上架|新品/.test(input) && /(不要|不).*(下架|动|替换)|保留/.test(input)) protectedConditions.push('刚上架款不要动')
  const keepMatch = input.match(/(?:保留|不要动|不要下架)([^，。,.]+)/)
  if (keepMatch?.[1]) protectedConditions.push(keepMatch[0])
  return Array.from(new Set(protectedConditions))
}

export function checkRisk(userInput: string, operationNames: string[] = []): RiskCheckResult {
  const text = userInput.trim()
  const protectedConditions = extractProtectedConditions(text)
  const hasDelete = /删除|删掉|清除/.test(text)
  const batch = /批量|全部|这些|最近|弱势款|冷掉|冷门/.test(text)
  const publish = /上架|发布/.test(text)
  const unpublish = /下架|隐藏|不展示/.test(text) || hasDelete
  const archive = /归档/.test(text)
  const price = /改价|价格|调价/.test(text)
  const replace = /替换|换掉|换成/.test(text)
  const description = /介绍|描述|小红书|文案/.test(text)
  const publishConfig = /发布.*推荐|推荐配置.*发布/.test(text)

  if (hasDelete) {
    return {
      riskLevel: 'critical',
      needConfirm: true,
      needSecondConfirm: true,
      normalizedAction: archive ? 'archive_style' : 'unpublish_style',
      protectedConditions
    }
  }

  if (price || archive || publishConfig || (unpublish && batch) || (publish && batch) || (replace && /推荐位|首页|区块|前\s*8/.test(text))) {
    return { riskLevel: 'critical', needConfirm: true, needSecondConfirm: true, protectedConditions }
  }

  if (publish || unpublish || replace) {
    return { riskLevel: 'high', needConfirm: true, protectedConditions }
  }

  if (description || /标签|封面/.test(text) || operationNames.some((name) => ['preview_update_description', 'preview_update_tags'].includes(name))) {
    return { riskLevel: 'medium', needConfirm: true, protectedConditions }
  }

  return { riskLevel: 'low', needConfirm: false, protectedConditions }
}
