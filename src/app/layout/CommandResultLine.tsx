import { useCommandRuntime } from '@/app/providers/command-runtime'
import { LogLine } from '@/shared/ui'

export function CommandResultLine() {
  const { lastResult } = useCommandRuntime()

  if (lastResult?.message === undefined) {
    return null
  }

  const failed = lastResult.status === 'error'

  return (
    <div role={failed ? 'alert' : 'status'} className="flex flex-col">
      <LogLine marker="»" tone={failed ? 'error' : 'success'}>
        {lastResult.message}
      </LogLine>
    </div>
  )
}
