export type CommandScope =
  'anonymous' | 'lobby' | 'battle' | 'reaction-window' | 'builds' | 'friends'

/**
 * The menus the console can step into. A menu replaces the lobby while it is open, so
 * every name here is also a scope: `deriveScopes` hands the menu straight through.
 */
export type CommandMenu = 'builds' | 'friends'

/**
 * Opening and closing a menu. The store lives in the app layer, so a feature that wants a
 * menu asks for this instead of reaching for it — and every feature asks the same way.
 */
export interface MenuControl {
  open: (menu: CommandMenu) => void
  close: () => void
}

export interface CommandOption {
  id: string
  label: string
  hint?: string | undefined
  /**
   * What the player types to choose this option. Defaults to its position in the list.
   * A step that offers the numbers 8 to 15 sets it, so typing 14 means 14 and not the
   * seventh row.
   */
  key?: string | undefined
  /** Shown struck through instead of hidden, so the player learns what unlocks it. */
  lockedReason?: string | undefined
}

export interface CommandArg {
  name: string
  kind: 'text' | 'password' | 'number' | 'pick'
  /** The short name of the step, for the checklist and the input. */
  label: string
  required: boolean
  /**
   * What the step is actually asking, in a sentence. A label names a step; it does not
   * explain it, and a column of numbers under the word "Fuerza" explains nothing.
   */
  prompt?: string | undefined
  /**
   * The set this step belongs to, as a singular noun. Steps sharing one are counted
   * together, so the player reads "atributo 1 de 4" instead of "paso 2 de 10".
   */
  group?: string | undefined
  /**
   * A line that depends on the answers so far: what is left of a budget, what the build
   * looks like at this point. Recomputed every time the step is drawn.
   */
  describe?: ((values: ParsedArgs) => string) | undefined
  /**
   * `values` carries the answers already given to this same command. A guided wizard
   * needs them: the kit can only be filtered by the attributes the player just chose.
   */
  options?: ((ctx: CommandContext, values: ParsedArgs) => CommandOption[]) | undefined
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
  /**
   * Where the console has stepped into, if anywhere. Optional because most of the app
   * never leaves the lobby, and a menu is a convenience, not a place the game knows about.
   */
  menu?: CommandMenu | null | undefined
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
