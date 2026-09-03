import { type Command, type CommandContext, type CommandScope, type VisibleCommand } from './types'

export class DuplicateAliasError extends Error {
  constructor(alias: string, existingId: string, incomingId: string, scope: CommandScope) {
    super(
      `"${alias}" registered by "${incomingId}" collides with "${existingId}" in scope "${scope}"`,
    )
    this.name = 'DuplicateAliasError'
  }
}

export interface CommandRegistry {
  register: (command: Command) => void
  visible: (ctx: CommandContext) => VisibleCommand[]
  get: (id: string) => Command | undefined
}

function identifiersOf(command: Command): readonly string[] {
  return [command.id, ...command.aliases]
}

function intersectingScope(
  a: readonly CommandScope[],
  b: readonly CommandScope[],
): CommandScope | undefined {
  return a.find((scope) => b.includes(scope))
}

function scopesIntersect(a: readonly CommandScope[], b: readonly CommandScope[]): boolean {
  return intersectingScope(a, b) !== undefined
}

export function createCommandRegistry(commands: readonly Command[] = []): CommandRegistry {
  const registered: Command[] = []

  function register(command: Command): void {
    for (const existing of registered) {
      const scope = intersectingScope(existing.scope, command.scope)

      if (scope === undefined) {
        continue
      }

      const existingIdentifiers = identifiersOf(existing)
      const collision = identifiersOf(command).find((identifier) =>
        existingIdentifiers.includes(identifier),
      )

      if (collision !== undefined) {
        throw new DuplicateAliasError(collision, existing.id, command.id, scope)
      }
    }

    registered.push(command)
  }

  function visible(ctx: CommandContext): VisibleCommand[] {
    return registered
      .filter((command) => scopesIntersect(command.scope, ctx.activeScopes))
      .map((command) => ({ command, availability: command.availability(ctx) }))
  }

  function get(id: string): Command | undefined {
    return registered.find((command) => command.id === id)
  }

  commands.forEach(register)

  return { register, visible, get }
}
