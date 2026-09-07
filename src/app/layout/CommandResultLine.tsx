import { useCommandRuntime } from '@/app/providers/command-runtime'
import { LogLine, Panel } from '@/shared/ui'

const TITLE = 'salida'

export function CommandResultLine() {
  const { lastResult, pendingStep } = useCommandRuntime()

  if (lastResult === null) {
    return null
  }

  const lines = lastResult.lines ?? []

  if (lastResult.message === undefined && lines.length === 0) {
    return null
  }

  const failed = lastResult.status === 'error'

  return (
    // Between questions this is what the player came to read — a catalog of twelve skills
    // lands here — so it takes the leftover height and gives it up rather than pushing the
    // prompt off the console. While a step is open it steps aside: the options are what
    // needs the room, and a five line output squeezed next to a hundred row list is a
    // scrollbar around nothing.
    <Panel
      title={TITLE}
      {...(failed ? { note: 'la arena rechazó algo' } : {})}
      scroll
      grow={pendingStep === null}
    >
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
