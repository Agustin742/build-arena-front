import { useCommandRuntime } from '@/app/providers/command-runtime'
import { LogLine } from '@/shared/ui'

const MASK = '••••••'

export function CommandTranscript() {
  const { pending, registry } = useCommandRuntime()

  if (pending === null) {
    return null
  }

  const command = registry.get(pending.commandId)

  if (command === undefined) {
    return null
  }

  return (
    <div role="log" className="flex flex-col">
      <LogLine marker="»" tone="dim">
        {command.aliases[0] ?? command.id}
      </LogLine>

      {command.args.map((arg) => {
        const value = pending.values[arg.name]

        if (value === undefined) {
          return null
        }

        return (
          <LogLine key={arg.name} marker="»">
            {`${arg.label}: ${arg.kind === 'password' ? MASK : value}`}
          </LogLine>
        )
      })}
    </div>
  )
}
