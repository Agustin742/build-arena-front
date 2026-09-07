import { CommandListContainer } from '@/app/layout/CommandListContainer'
import { type PendingStep, useCommandRuntime } from '@/app/providers/command-runtime'
import { type ParsedArgs } from '@/shared/commands'
import { LogLine, Panel } from '@/shared/ui'

const COMMANDS_TITLE = 'comandos'
const COMMANDS_NOTE = 'escribí el comando o su número'

/**
 * Where the step sits. A run of four attributes reads as "atributo 1 de 4"; a step that
 * belongs to no set falls back to its place in the whole run.
 */
function positionOf(step: PendingStep): string {
  if (step.group === null) {
    return `paso ${String(step.index)} de ${String(step.total)}`
  }

  return `${step.group.name} ${String(step.group.index)} de ${String(step.group.total)}`
}

function noteFor(step: PendingStep): string {
  const parts = [positionOf(step)]

  if (!step.arg.required) {
    parts.push('s para saltear')
  }

  parts.push('esc para cancelar')

  return parts.join(' · ')
}

/**
 * The sentence that says what is being asked, plus whatever the step computes from the
 * answers so far. The heading names the step; this is what explains it, and without it a
 * column of numbers under the word "Fuerza" means nothing.
 */
function sentenceOf(step: PendingStep, values: ParsedArgs): string | undefined {
  const parts = [step.arg.prompt, step.arg.describe?.(values)].filter(
    (part): part is string => part !== undefined && part !== '',
  )

  return parts.length === 0 ? undefined : parts.join(' · ')
}

export function CommandPanel() {
  const { pendingStep, pending, ctx } = useCommandRuntime()

  if (pendingStep === null) {
    // Inside a menu the heading says which one. A list of four commands under the word
    // "comandos" gives the player no way to tell they stepped into anything.
    const menu = ctx.state.menu

    return (
      <Panel title={menu ?? COMMANDS_TITLE} note={COMMANDS_NOTE} scroll>
        <CommandListContainer />
      </Panel>
    )
  }

  const sentence = sentenceOf(pendingStep, pending?.values ?? {})

  return (
    <Panel
      title={pendingStep.arg.label}
      label={`Opciones: ${pendingStep.arg.label}`}
      note={noteFor(pendingStep)}
      // The sentence goes in the lead, not in the body: a list of a hundred names has to
      // scroll, and a question that scrolls out of sight is a question nobody can answer.
      {...(sentence === undefined ? {} : { lead: <LogLine tone="dim">{sentence}</LogLine> })}
      scroll
    >
      <CommandListContainer />
    </Panel>
  )
}
