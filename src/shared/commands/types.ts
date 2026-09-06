export type CommandScope = 'anonymous' | 'lobby' | 'battle' | 'reaction-window'

export interface CommandOption {
  id: string
  label: string
  hint?: string | undefined
}

export interface CommandArg {
  name: string
  kind: 'text' | 'password' | 'number' | 'pick'
  label: string
  required: boolean
  options?: ((ctx: CommandContext) => CommandOption[]) | undefined
}

export type ParsedArgs = Readonly<Record<string, string>>

export type CommandAvailability = { enabled: true } | { enabled: false; reason: string }

/**
 * `lines` is what a list or a rejection needs: a catalog prints twelve rows, and a build
 * the arena refuses comes back with every violation at once. The console shows them all
 * under the headline instead of the player discovering the problems one at a time.
 */
export type CommandResult =
  | { status: 'ok'; message?: string | undefined; lines?: readonly string[] | undefined }
  | { status: 'error'; message: string; lines?: readonly string[] | undefined }

export interface CommandState {
  isAuthenticated: boolean
  battleId: string | null
  reactionWindowOpen: boolean
}

export interface NumberedItem {
  key: string
  id: string
  label: string
  hint?: string | undefined
  lockedReason?: string | undefined
}

export interface NumberedList {
  readonly generation: number
  readonly items: readonly NumberedItem[]
  lookup: (key: string) => string | undefined
}

export interface CommandContext {
  readonly activeScopes: readonly CommandScope[]
  readonly picks: NumberedList
  readonly state: CommandState
}

export interface Command {
  id: string
  label: string
  hint?: string | undefined
  aliases: readonly string[]
  args: readonly CommandArg[]
  scope: readonly CommandScope[]
  availability: (ctx: CommandContext) => CommandAvailability
  run: (args: ParsedArgs, ctx: CommandContext) => Promise<CommandResult>
}

export interface VisibleCommand {
  command: Command
  availability: CommandAvailability
}
