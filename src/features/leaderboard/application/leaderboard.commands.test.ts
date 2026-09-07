import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { type Command, type CommandContext } from '@/shared/commands'
import { ApiError } from '@/shared/http'

import { type LeaderboardApi } from '../infrastructure/leaderboard.api'
import { createLeaderboardCommands, type LeaderboardCommandDeps } from './leaderboard.commands'
import { cachedLeaderboard } from './leaderboard-queries'

const ADA = { rank: 1, id: 'ada-id', username: 'ada', rating: 1216 }
const GRACE = { rank: 2, id: 'grace-id', username: 'grace', rating: 1180 }

const ctx = {} as CommandContext

function deps(overrides: Partial<LeaderboardCommandDeps> = {}): LeaderboardCommandDeps {
  return {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    api: { list: vi.fn<LeaderboardApi['list']>().mockResolvedValue([ADA, GRACE]) },
    ...overrides,
  }
}

function top(from: LeaderboardCommandDeps): Command {
  const command = createLeaderboardCommands(from).find((entry) => entry.id === 'top')

  if (command === undefined) {
    throw new Error('the top command was not registered')
  }

  return command
}

describe('createLeaderboardCommands', () => {
  it('answers to top, from the lobby', () => {
    const command = top(deps())

    expect(command.aliases).toContain('top')
    expect(command.scope).toEqual(['lobby'])
  })

  it('offers the four sizes without forcing anybody to pick one', () => {
    const [limit] = top(deps()).args

    expect(limit).toMatchObject({ name: 'limit', kind: 'pick', required: false })
    expect(limit?.options?.(ctx, {}).map((option) => option.key)).toEqual(['10', '25', '50', '100'])
  })

  describe('run', () => {
    it('prints the ranking under a headline that counts it', async () => {
      const command = top(deps())

      await expect(command.run({}, ctx)).resolves.toMatchObject({
        status: 'ok',
        message: 'Top 2 de la arena',
        lines: [expect.stringContaining('ada'), expect.stringContaining('grace')],
      })
    })

    it('asks for the arena default when the step was skipped', async () => {
      const api = { list: vi.fn<LeaderboardApi['list']>().mockResolvedValue([]) }
      await top(deps({ api })).run({}, ctx)

      expect(api.list).toHaveBeenCalledWith(50)
    })

    it('asks for the size the player chose', async () => {
      const api = { list: vi.fn<LeaderboardApi['list']>().mockResolvedValue([]) }
      await top(deps({ api })).run({ limit: '10' }, ctx)

      expect(api.list).toHaveBeenCalledWith(10)
    })

    it('clamps a size the arena would refuse instead of bouncing off a 400', async () => {
      const api = { list: vi.fn<LeaderboardApi['list']>().mockResolvedValue([]) }
      const command = top(deps({ api }))

      await command.run({ limit: '999' }, ctx)
      await command.run({ limit: '0' }, ctx)

      expect(api.list).toHaveBeenNthCalledWith(1, 100)
      expect(api.list).toHaveBeenNthCalledWith(2, 1)
    })

    it('falls back to the default when the answer is not a number at all', async () => {
      const api = { list: vi.fn<LeaderboardApi['list']>().mockResolvedValue([]) }
      await top(deps({ api })).run({ limit: 'muchos' }, ctx)

      expect(api.list).toHaveBeenCalledWith(50)
    })

    it('marks the row of whoever is reading', async () => {
      const command = top(deps({ self: () => 'grace-id' }))

      const result = await command.run({}, ctx)

      expect(result.lines?.[1]).toContain('· vos')
      expect(result.lines?.[0]).not.toContain('· vos')
    })

    it('leaves the ranking in the cache, because that is where rivals come from', async () => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

      await top(deps({ client })).run({}, ctx)

      expect(cachedLeaderboard(client)).toEqual([ADA, GRACE])
    })

    it('reports a refusal from the arena instead of pretending the ranking is empty', async () => {
      const api = {
        list: vi
          .fn<LeaderboardApi['list']>()
          .mockRejectedValue(new ApiError('down', { status: 503, payload: null })),
      }

      await expect(top(deps({ api })).run({}, ctx)).resolves.toMatchObject({ status: 'error' })
    })
  })
})
