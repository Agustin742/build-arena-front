import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type BuildList } from '@/shared/contracts'

import { type BuildsApi } from '../infrastructure/builds.api'
import {
  buildQueryKey,
  BUILDS_QUERY_KEY,
  cachedBuilds,
  fetchBuilds,
  invalidateBuilds,
} from './build-queries'

const buildId = '7c3f1a92-8d4e-4b6a-9f21-0e5d8c7b6a34'

const BUILDS = [
  {
    id: buildId,
    name: 'Duelista híbrido',
    strength: 14,
    magic: 13,
    dexterity: 12,
    constitution: 10,
    skills: [],
    createdAt: '2026-09-06T10:15:00.000Z',
    updatedAt: '2026-09-06T10:15:00.000Z',
  },
] satisfies BuildList

describe('the build query keys', () => {
  it('names the list', () => {
    expect(BUILDS_QUERY_KEY).toEqual(['builds'])
  })

  it('nests one build under the list, so invalidating the list reaches it', () => {
    expect(buildQueryKey(buildId)).toEqual(['builds', buildId])
  })
})

describe('fetchBuilds', () => {
  it('resolves the builds the player owns', async () => {
    const { client, api } = harness()

    await expect(fetchBuilds(client, api)).resolves.toEqual(BUILDS)
  })

  it('serves later calls from memory, because this client is the only writer', async () => {
    const { client, api, list } = harness()

    await fetchBuilds(client, api)
    await fetchBuilds(client, api)

    expect(list).toHaveBeenCalledTimes(1)
  })

  it('shares one request between two callers at once', async () => {
    const { client, api, list } = harness()

    await Promise.all([fetchBuilds(client, api), fetchBuilds(client, api)])

    expect(list).toHaveBeenCalledTimes(1)
  })

  it('survives the window that would garbage collect an unwatched query', async () => {
    vi.useFakeTimers()
    const { client, api, list } = harness()

    await fetchBuilds(client, api)
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    await fetchBuilds(client, api)

    expect(list).toHaveBeenCalledTimes(1)
  })
})

describe('invalidateBuilds', () => {
  it('sends the next listing back to the arena', async () => {
    const { client, api, list } = harness()

    await fetchBuilds(client, api)
    await invalidateBuilds(client)
    await fetchBuilds(client, api)

    expect(list).toHaveBeenCalledTimes(2)
  })

  it('reaches a single build too, because its key hangs off the list', async () => {
    const { client } = harness()
    client.setQueryData(buildQueryKey(buildId), BUILDS[0])

    await invalidateBuilds(client)

    expect(client.getQueryState(buildQueryKey(buildId))?.isInvalidated).toBe(true)
  })
})

describe('cachedBuilds', () => {
  it('reports nothing before the builds are asked for', () => {
    const { client } = harness()

    expect(cachedBuilds(client)).toBeUndefined()
  })

  it('reads the builds straight from memory once they landed', async () => {
    const { client, api } = harness()

    await fetchBuilds(client, api)

    expect(cachedBuilds(client)).toEqual(BUILDS)
  })
})

afterEach(() => {
  vi.useRealTimers()
})

function harness() {
  const list = vi.fn<BuildsApi['list']>().mockResolvedValue(BUILDS)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return { client, api: { list }, list }
}
