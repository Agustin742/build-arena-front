import { useCommandRuntime } from '@/app/providers/command-runtime'
import { LogLine } from '@/shared/ui'

export function CommandResultLine() {
  const { lastResult } = useCommandRuntime()

  if (lastResult?.message === undefined) {
    return null
  }

  return (
    <div role="status" className="flex flex-col">
      <LogLine marker="»" tone={lastResult.status === 'ok' ? 'success' : 'error'}>
        {lastResult.message}
      </LogLine>
    </div>
  )
}
