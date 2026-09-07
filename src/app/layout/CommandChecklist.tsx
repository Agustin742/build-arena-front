import { useCommandRuntime } from '@/app/providers/command-runtime'
import { type CommandArg, type CommandContext, type ParsedArgs } from '@/shared/commands'
import { Panel } from '@/shared/ui'

const MASK = '••••••'

type StepState = 'done' | 'current' | 'ahead'

const MARKER: Record<StepState, string> = {
  done: '✓',
  current: '▸',
  ahead: '·',
}

const LABEL_CLASS: Record<StepState, string> = {
  done: 'text-text-dim',
  current: 'text-accent',
  ahead: 'text-text-dim',
}

function stateOf(arg: CommandArg, values: ParsedArgs, awaiting: string): StepState {
  if (arg.name === awaiting) {
    return 'current'
  }

  return values[arg.name] === undefined ? 'ahead' : 'done'
}

/**
 * The answer as the player saw it, not as it travels. A kit step stores POWER_STRIKE and
 * showed "Golpe potente"; echoing the code back would undo the naming the list just did.
 * Resolved through the very options that produced the answer, so there is no second table
 * to keep in step.
 */
function answerOf(arg: CommandArg, values: ParsedArgs, ctx: CommandContext): string | undefined {
  const value = values[arg.name]

  if (value === undefined) {
    return undefined
  }

  if (arg.kind === 'password') {
    return MASK
  }

  const option = arg.options?.(ctx, values).find((candidate) => candidate.id === value)

  return option?.label ?? value
}

/**
 * Every step of the run at once, with the answers already given. A guided wizard that only
 * ever shows the question in front of you gives no sense of how long it is or of what you
 * already decided, and there is no way back to check.
 */
export function CommandChecklist() {
  const { ctx, pending, registry } = useCommandRuntime()

  if (pending === null) {
    return null
  }

  const command = registry.get(pending.commandId)

  if (command === undefined || command.args.length === 0) {
    return null
  }

  return (
    <Panel title={command.label} label={`Pasos: ${command.label}`} note="lo que falta y lo que ya">
      <ol className="flex flex-col">
        {command.args.map((arg) => {
          const state = stateOf(arg, pending.values, pending.awaiting)
          const answer = answerOf(arg, pending.values, ctx)

          return (
            <li
              key={arg.name}
              data-state={state}
              {...(state === 'current' ? { 'aria-current': 'step' as const } : {})}
              className="flex items-baseline gap-2"
            >
              <span aria-hidden="true" className="min-w-[2ch] text-right text-border-strong">
                {MARKER[state]}
              </span>
              <span className={`min-w-[14ch] ${LABEL_CLASS[state]}`}>{arg.label}</span>
              {answer !== undefined && <span className="text-text">{answer}</span>}
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}
