import { createContext, use } from 'react'

import {
  type CommandArg,
  type CommandContext,
  type CommandRegistry,
  type CommandResult,
  type PendingCommand,
} from '@/shared/commands'

/**
 * Which question the console is asking right now, and where it sits in the run. The list
 * of answers is drawn far from the prompt, so it needs to be able to say what it is a
 * list of: a column of numbers under a heading that says "comandos" means nothing.
 */
/** Where a step sits among the ones that share its group, when it declares one. */
export interface StepGroup {
  name: string
  index: number
  total: number
}

export interface PendingStep {
  arg: CommandArg
  index: number
  total: number
  group: StepGroup | null
}

export interface CommandRuntime {
  ctx: CommandContext
  registry: CommandRegistry
  pending: PendingCommand | null
  pendingStep: PendingStep | null
  promptError: string | undefined
  lastResult: CommandResult | null
  selectItem: (id: string) => void
  submitText: (raw: string, typedAtGeneration: number | undefined) => void
  cancelPending: () => void
}

export const CommandRuntimeContext = createContext<CommandRuntime | null>(null)

export function useCommandRuntime(): CommandRuntime {
  const runtime = use(CommandRuntimeContext)

  if (runtime === null) {
    throw new Error('useCommandRuntime must be used within a CommandRuntimeProvider')
  }

  return runtime
}
