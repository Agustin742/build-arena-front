import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { type FriendshipList } from '@/shared/contracts'

import { type FriendshipsApi } from '../infrastructure/friendships.api'
import {
  cachedFriendships,
  fetchFriendships,
  FRIENDSHIPS_QUERY_KEY,
  friendshipsQuery,
} from './friendship-queries'

const GRACE = { id: 'grace-id', username: 'grace', rating: 1350 }
const ADA = { id: 'ada-id', username: 'ada', rating: 1216 }

const INCOMING = {
  id: 'friendship-1',
  status: 'PENDING' as const,
  direction: 'INCOMING' as const,
  player: GRACE,
  createdAt: '2026-09-07T10:15:00.000Z',
  updatedAt: '2026-09-07T10:15:00.000Z',
}

const ACCEPTED = { ...INCOMING, id: 'friendship-2', status: 'ACCEPTED' as const, player: ADA }

function apiReturning(...pages: FriendshipList[]): FriendshipsApi {
  const list = vi.fn<FriendshipsApi['list']>()
  pages.forEach((page) => list.mockResolvedValueOnce(page))

  return {
    list,
    request: vi.fn(),
    accept: vi.fn(),
    remove: vi.fn(),
  }
}

function client(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('friendshipsQuery', () => {
  it('is stale the moment it lands and is never garbage collected', () => {
    const options = friendshipsQuery(apiReturning([]))

    expect(options.queryKey).toEqual(FRIENDSHIPS_QUERY_KEY)
    expect(options.staleTime).toBe(0)
    expect(options.gcTime).toBe(Infinity)
  })
})

describe('fetchFriendships', () => {
  it('resolves the rows the arena serves', async () => {
    await expect(fetchFriendships(client(), apiReturning([INCOMING, ACCEPTED]))).resolves.toEqual([
      INCOMING,
      ACCEPTED,
    ])
  })

  it('asks again every time, because a request arrives without us doing anything', async () => {
    const api = apiReturning([], [INCOMING])
    const shared = client()

    await fetchFriendships(shared, api)

    await expect(fetchFriendships(shared, api)).resolves.toEqual([INCOMING])
    expect(api.list).toHaveBeenCalledTimes(2)
  })
})

describe('cachedFriendships', () => {
  it('knows nothing until somebody opens the list', () => {
    expect(cachedFriendships(client())).toBeUndefined()
  })

  it('hands back the last rows without going to the network', async () => {
    const api = apiReturning([INCOMING])
    const shared = client()

    await fetchFriendships(shared, api)

    expect(cachedFriendships(shared)).toEqual([INCOMING])
    expect(api.list).toHaveBeenCalledTimes(1)
  })
})
