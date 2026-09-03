import { createContext, use } from 'react'

import { type CommandContext, type CommandRegistry, type PendingCommand } from '@/shared/commands'

export interface CommandRuntime {
  ctx: CommandContext
  registry: CommandRegistry
  pending: PendingCommand | null
  promptError: string | undefined
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
