import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { type Leaderboard } from '@/shared/contracts'

import { type LeaderboardApi } from '../infrastructure/leaderboard.api'
import {
  cachedLeaderboard,
  fetchLeaderboard,
  LEADERBOARD_QUERY_KEY,
  leaderboardQuery,
} from './leaderboard-queries'

const ADA = { rank: 1, id: '11111111-1111-4111-8111-111111111111', username: 'ada', rating: 1216 }
const GRACE = {
  rank: 2,
  id: '22222222-2222-4222-8222-222222222222',
  username: 'grace',
  rating: 1180,
}

function apiReturning(...pages: Leaderboard[]): LeaderboardApi {
  const list = vi.fn<LeaderboardApi['list']>()
  pages.forEach((page) => list.mockResolvedValueOnce(page))

  return { list }
}

function client(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('leaderboardQuery', () => {
  it('never goes stale by itself and is never garbage collected', () => {
    const options = leaderboardQuery(apiReturning([]), 50)

    expect(options.queryKey).toEqual(LEADERBOARD_QUERY_KEY)
    expect(options.staleTime).toBe(0)
    expect(options.gcTime).toBe(Infinity)
  })

  it('asks the api for the limit it was given', async () => {
    const api = apiReturning([ADA])

    await leaderboardQuery(api, 10).queryFn()

    expect(api.list).toHaveBeenCalledWith(10)
  })
})

describe('fetchLeaderboard', () => {
  it('resolves the ranking the arena serves', async () => {
    await expect(fetchLeaderboard(client(), apiReturning([ADA, GRACE]), 50)).resolves.toEqual([
      ADA,
      GRACE,
    ])
  })

  it('asks again every time, because a rating moves after every battle', async () => {
    const api = apiReturning([ADA], [GRACE])
    const shared = client()

    await fetchLeaderboard(shared, api, 50)

    await expect(fetchLeaderboard(shared, api, 50)).resolves.toEqual([GRACE])
    expect(api.list).toHaveBeenCalledTimes(2)
  })

  it('replaces the ranking a different limit had left behind', async () => {
    const api = apiReturning([ADA, GRACE], [ADA])
    const shared = client()

    await fetchLeaderboard(shared, api, 50)
    await fetchLeaderboard(shared, api, 1)

    expect(cachedLeaderboard(shared)).toEqual([ADA])
  })
})

describe('cachedLeaderboard', () => {
  it('knows nothing until somebody asks for the ranking', () => {
    expect(cachedLeaderboard(client())).toBeUndefined()
  })

  it('hands back the last ranking without going to the network', async () => {
    const api = apiReturning([ADA, GRACE])
    const shared = client()

    await fetchLeaderboard(shared, api, 50)

    expect(cachedLeaderboard(shared)).toEqual([ADA, GRACE])
    expect(api.list).toHaveBeenCalledTimes(1)
  })
})
