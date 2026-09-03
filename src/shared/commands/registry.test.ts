import { describe, expect, it } from 'vitest'

import { available, blocked } from './availability'
import { createCommandRegistry, DuplicateAliasError } from './registry'
import {
  type Command,
  type CommandAvailability,
  type CommandContext,
  type CommandScope,
  type NumberedList,
} from './types'

const emptyPicks: NumberedList = { generation: 0, items: [], lookup: () => undefined }

function contextFor(activeScopes: readonly CommandScope[]): CommandContext {
  return {
    activeScopes,
    picks: emptyPicks,
    state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false },
  }
}

function makeCommand(params: {
  id: string
  aliases: readonly string[]
  scope: readonly CommandScope[]
  availability?: (ctx: CommandContext) => CommandAvailability
}): Command {
  return {
    id: params.id,
    label: params.id,
    aliases: params.aliases,
    args: [],
    scope: params.scope,
    availability: params.availability ?? (() => available()),
    run: () => Promise.resolve({ status: 'ok' }),
  }
}

describe('createCommandRegistry', () => {
  it('throws DuplicateAliasError when a new alias collides under an overlapping scope', () => {
    const registry = createCommandRegistry()
    registry.register(makeCommand({ id: 'cmd-a', aliases: ['top'], scope: ['lobby'] }))

    expect(() => {
      registry.register(makeCommand({ id: 'cmd-b', aliases: ['top'], scope: ['lobby'] }))
    }).toThrow(DuplicateAliasError)
  })

  it('allows the same alias to register again under a disjoint scope', () => {
    const registry = createCommandRegistry()
    registry.register(makeCommand({ id: 'cmd-a', aliases: ['attack'], scope: ['battle'] }))

    expect(() => {
      registry.register(makeCommand({ id: 'cmd-b', aliases: ['attack'], scope: ['lobby'] }))
    }).not.toThrow()
  })

  it('throws DuplicateAliasError when a new id collides under an overlapping scope', () => {
    const registry = createCommandRegistry()
    registry.register(makeCommand({ id: 'shared-id', aliases: ['first'], scope: ['lobby'] }))

    expect(() => {
      registry.register(makeCommand({ id: 'shared-id', aliases: ['second'], scope: ['lobby'] }))
    }).toThrow(DuplicateAliasError)
  })

  it('includes a command in visible() only when activeScopes intersects its scope', () => {
    const registry = createCommandRegistry()
    const lobbyOnly = makeCommand({ id: 'lobby-cmd', aliases: ['top'], scope: ['lobby'] })
    registry.register(lobbyOnly)

    expect(registry.visible(contextFor(['lobby']))).toEqual([
      { command: lobbyOnly, availability: { enabled: true } },
    ])
    expect(registry.visible(contextFor(['battle']))).toEqual([])
  })

  it('includes a blocked command paired with its availability result, not omitted', () => {
    const registry = createCommandRegistry()
    const gated = makeCommand({
      id: 'challenge',
      aliases: ['challenge'],
      scope: ['lobby'],
      availability: () => blocked('necesita MAGIC 14'),
    })
    registry.register(gated)

    expect(registry.visible(contextFor(['lobby']))).toEqual([
      { command: gated, availability: { enabled: false, reason: 'necesita MAGIC 14' } },
    ])
  })
})
