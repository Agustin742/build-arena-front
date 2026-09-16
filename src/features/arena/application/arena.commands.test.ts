import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { BATTLES_QUERY_KEY } from '@/features/battles'
import { begin, type CommandContext } from '@/shared/commands'
import { type PublicBattle } from '@/shared/contracts'

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

function makeLiveBattle(id: string, status: PublicBattle['status']): PublicBattle {
  return {
    id,
    status,
    ranked: true,
    role: 'CHALLENGER',
    rival: { id: `rival-${id}`, username: `rival-${id}`, rating: 1000 },
    outcome: null,
    currentRound: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    startedAt: '2026-09-01T00:00:00.000Z',
    endedAt: null,
  }
}

function clientWithBattles(battles: readonly PublicBattle[]): QueryClient {
  const client = new QueryClient()
  client.setQueryData(BATTLES_QUERY_KEY, battles)

  return client
}

describe('createArenaCommands', () => {
  it('offers volver only in the battle scope', () => {
    const commands = createArenaCommands({
      navigation: makeNavigation(),
      client: new QueryClient(),
    })
    const volver = commandNamed(commands, 'volver')

    expect(volver.scope).toEqual(['battle'])
  })

  it('sends the player back to the lobby when volver runs, with no confirmation yet', async () => {
    const navigation = makeNavigation()
    const commands = createArenaCommands({ navigation, client: new QueryClient() })
    const volver = commandNamed(commands, 'volver')

    const result = await volver.run({}, ctx)

    expect(navigation.toLobby).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('ok')
  })

  describe('enter', () => {
    it('autofills the battle step without a picker when exactly one battle is live', () => {
      const client = clientWithBattles([makeLiveBattle('battle-1', 'ACCEPTED')])
      const commands = createArenaCommands({ navigation: makeNavigation(), client })
      const enter = commandNamed(commands, 'enter')

      const outcome = begin(enter, {}, ctx)

      expect(outcome).toEqual({
        kind: 'pending',
        pending: { commandId: 'enter', values: { battle: 'battle-1' }, awaiting: 'confirm' },
      })
    })

    it('opens a numbered picker when two or more battles are live', () => {
      const client = clientWithBattles([
        makeLiveBattle('battle-1', 'ACCEPTED'),
        makeLiveBattle('battle-2', 'IN_PROGRESS'),
      ])
      const commands = createArenaCommands({ navigation: makeNavigation(), client })
      const enter = commandNamed(commands, 'enter')

      const outcome = begin(enter, {}, ctx)

      expect(outcome).toEqual({
        kind: 'pending',
        pending: { commandId: 'enter', values: {}, awaiting: 'battle' },
      })

      const battleStep = enter.args.find((arg) => arg.name === 'battle')

      expect(battleStep?.options?.(ctx, {})).toHaveLength(2)
    })

    it('does not autofill confirm and prompts when the chosen battle is ACCEPTED', () => {
      const client = clientWithBattles([makeLiveBattle('battle-1', 'ACCEPTED')])
      const commands = createArenaCommands({ navigation: makeNavigation(), client })
      const enter = commandNamed(commands, 'enter')

      const outcome = begin(enter, { battle: 'battle-1' }, ctx)

      expect(outcome).toEqual({
        kind: 'pending',
        pending: { commandId: 'enter', values: { battle: 'battle-1' }, awaiting: 'confirm' },
      })
    })

    it('autofills confirm with no prompt when the chosen battle is IN_PROGRESS', () => {
      const client = clientWithBattles([makeLiveBattle('battle-1', 'IN_PROGRESS')])
      const commands = createArenaCommands({ navigation: makeNavigation(), client })
      const enter = commandNamed(commands, 'enter')

      const outcome = begin(enter, { battle: 'battle-1' }, ctx)

      expect(outcome).toEqual({
        kind: 'filled',
        command: enter,
        args: { battle: 'battle-1', confirm: 'yes' },
      })
    })
  })
})
