import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { type BattleList } from '@/shared/contracts'

import { type BattlesLister } from './battle-queries'
import { BATTLES_QUERY_KEY, battlesQuery, cachedBattles, fetchBattles } from './battle-queries'

const GRACE = { id: 'grace-id', username: 'grace', rating: 1350 }

const PENDING = {
  id: 'b1',
  status: 'PENDING' as const,
  ranked: true,
  role: 'OPPONENT' as const,
  rival: GRACE,
  outcome: null,
  currentRound: 0,
  createdAt: '2026-09-07T10:15:00.000Z',
  startedAt: null,
  endedAt: null,
}

function apiReturning(...pages: BattleList[]): BattlesLister {
  const list = vi.fn<BattlesLister['list']>()
  pages.forEach((page) => list.mockResolvedValueOnce(page))

  return { list }
}

function client(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('battlesQuery', () => {
  it('is stale the moment it lands and is never garbage collected', () => {
    const options = battlesQuery(apiReturning([]))

    expect(options.queryKey).toEqual(BATTLES_QUERY_KEY)
    expect(options.staleTime).toBe(0)
    expect(options.gcTime).toBe(Infinity)
  })
})

describe('fetchBattles', () => {
  it('resolves the rows the arena serves', async () => {
    await expect(fetchBattles(client(), apiReturning([PENDING]))).resolves.toEqual([PENDING])
  })

  it('asks again every time, because a challenge arrives without us doing anything', async () => {
    const api = apiReturning([], [PENDING])
    const shared = client()

    await fetchBattles(shared, api)

    await expect(fetchBattles(shared, api)).resolves.toEqual([PENDING])
    expect(api.list).toHaveBeenCalledTimes(2)
  })
})

describe('cachedBattles', () => {
  it('knows nothing until somebody opens the list', () => {
    expect(cachedBattles(client())).toBeUndefined()
  })

  it('hands back the last rows without going to the network', async () => {
    const api = apiReturning([PENDING])
    const shared = client()

    await fetchBattles(shared, api)

    expect(cachedBattles(shared)).toEqual([PENDING])
    expect(api.list).toHaveBeenCalledTimes(1)
  })
})
