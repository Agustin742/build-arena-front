import { CommandListContainer } from '@/app/layout/CommandListContainer'
import { type PendingStep, useCommandRuntime } from '@/app/providers/command-runtime'
import { Panel } from '@/shared/ui'

const COMMANDS_TITLE = 'comandos'
const COMMANDS_NOTE = 'escribí el comando o su número'

/**
 * The list of answers is drawn here and the prompt lives in the shell footer, far away.
 * Without this the heading read "comandos" through the whole wizard, so a step offering
 * the numbers 8 to 15 gave the player no way to tell what was being asked.
 */
function noteFor(step: PendingStep): string {
  const parts = [`paso ${String(step.index)} de ${String(step.total)}`]

  if (!step.arg.required) {
    parts.push('s para saltear')
  }

  parts.push('esc para cancelar')

  return parts.join(' · ')
}

export function CommandPanel() {
  const { pendingStep } = useCommandRuntime()

  if (pendingStep === null) {
    return (
      <Panel title={COMMANDS_TITLE} note={COMMANDS_NOTE}>
        <CommandListContainer />
      </Panel>
    )
  }

  return (
    <Panel
      title={pendingStep.arg.label}
      label={`Opciones: ${pendingStep.arg.label}`}
      note={noteFor(pendingStep)}
    >
      <CommandListContainer />
    </Panel>
  )
}
