import { describe, expect, it, vi } from 'vitest'

import { type CommandContext } from '@/shared/commands'

import { createArenaCommands } from './arena.commands'
import { type ArenaNavigation } from './ports'

const ctx: CommandContext = {
  activeScopes: ['battle'],
  picks: { generation: 0, items: [], lookup: () => undefined },
  state: { isAuthenticated: true, battleId: '42', reactionWindowOpen: false },
}

function makeNavigation(): ArenaNavigation {
  return { toArena: vi.fn(), toLobby: vi.fn() }
}

function commandNamed(commands: ReturnType<typeof createArenaCommands>, id: string) {
  const found = commands.find((command) => command.id === id)

  if (found === undefined) {
    throw new Error(`no command named ${id}`)
  }

  return found
}

describe('createArenaCommands', () => {
  it('offers volver only in the battle scope', () => {
    const commands = createArenaCommands({ navigation: makeNavigation() })
    const volver = commandNamed(commands, 'volver')

    expect(volver.scope).toEqual(['battle'])
  })

  it('sends the player back to the lobby when volver runs, with no confirmation yet', async () => {
    const navigation = makeNavigation()
    const commands = createArenaCommands({ navigation })
    const volver = commandNamed(commands, 'volver')

    const result = await volver.run({}, ctx)

    expect(navigation.toLobby).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('ok')
  })
})
