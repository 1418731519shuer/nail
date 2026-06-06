import { executeAgentRequest } from './agent-executor'

export const agentExampleInputs = [
  '这个款热门不热门？',
  '把最近冷掉的款下架，但猫眼不要动。',
  '首页前 8 款怎么排？',
  '帮我把这个款介绍改得更适合小红书。',
  '生成今日运营报告。',
  '生成本周运营周报。',
  '按今日报告建议执行。'
]

export function runAgentExamples() {
  return agentExampleInputs.map((input) => {
    const result = executeAgentRequest(input, {
      selectedStyleId: 'style-gradient-003',
      storeId: 'store-001',
      today: '2026-05-29'
    })

    return {
      input,
      intentType: result.plan.intentType,
      riskLevel: result.plan.riskLevel,
      needConfirm: result.plan.needConfirm,
      needSecondConfirm: result.plan.needSecondConfirm,
      operations: result.plan.plan.map((item) => item.operation),
      finalResponseType: result.plan.finalResponseType,
      previewTitle: result.preview?.title,
      approvalStatus: result.approval?.status
    }
  })
}
