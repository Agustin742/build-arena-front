import { useCommandRuntime } from '@/app/providers/command-runtime'
import { LogLine, Panel } from '@/shared/ui'

const TITLE = 'salida'

export function CommandResultLine() {
  const { lastResult } = useCommandRuntime()

  if (lastResult === null) {
    return null
  }

  const lines = lastResult.lines ?? []

  if (lastResult.message === undefined && lines.length === 0) {
    return null
  }

  const failed = lastResult.status === 'error'

  return (
    // The one box that scrolls. A catalog of twelve skills lands here, and it gives up
    // its own height rather than pushing the prompt off the console.
    <Panel title={TITLE} {...(failed ? { note: 'la arena rechazó algo' } : {})} scroll>
      <div role={failed ? 'alert' : 'status'} className="flex flex-col">
        {lastResult.message === undefined ? null : (
          <LogLine marker="»" tone={failed ? 'error' : 'success'}>
            {lastResult.message}
          </LogLine>
        )}

        {lines.map((line, index) => (
          <LogLine key={`${String(index)}-${line}`} tone={failed ? 'error' : 'neutral'}>
            {/* A listing lines its columns up with padding, and HTML collapses runs of
                spaces by default. Without this the catalog arrives as a ragged blob. */}
            <span className="whitespace-pre-wrap">{line}</span>
          </LogLine>
        ))}
      </div>
    </Panel>
  )
}
