import { hasOutput } from '@/app/layout/console-focus'
import { useCommandRuntime } from '@/app/providers/command-runtime'
import { LogLine, Panel } from '@/shared/ui'

const TITLE = 'salida'

export function CommandResultLine() {
  const { lastResult } = useCommandRuntime()

  // The same question the layout asks before it focuses this box, so the console never
  // hands the leftover height to an output that prints nothing.
  if (!hasOutput(lastResult)) {
    return null
  }

  const lines = lastResult.lines ?? []
  const failed = lastResult.status === 'error'

  return (
    // A catalog of twelve skills lands here, so the box scrolls. How much room it gets is
    // the layout's call: the leftover height between questions, a capped share while a
    // step is open and the options need the room.
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
