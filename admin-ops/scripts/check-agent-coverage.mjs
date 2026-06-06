import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const agentDir = path.join(root, 'src', 'agent')
const atomicSource = fs.readFileSync(path.join(agentDir, 'atomic-operations.ts'), 'utf8')
const executorSource = [
  'agent-executor.ts',
  'preview-builder.ts',
  'deepseek-tool-contract.ts',
  'tool-planner.ts'
]
  .map((file) => fs.readFileSync(path.join(agentDir, file), 'utf8'))
  .join('\n')

const operationNames = [...atomicSource.matchAll(/^  \['([^']+)'/gm)].map((match) => match[1])
const missing = operationNames.filter((name) => !executorSource.includes(name))

console.log(`Atomic operations registered: ${operationNames.length}`)
if (missing.length) {
  console.error(`Missing executor/contract coverage: ${missing.length}`)
  for (const name of missing) console.error(`- ${name}`)
  process.exit(1)
}

console.log('Coverage OK: every registered operation is represented in executor, preview, planner, or DeepSeek contract.')
