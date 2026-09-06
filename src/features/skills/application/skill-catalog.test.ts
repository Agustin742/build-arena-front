import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type SkillCatalog } from '@/shared/contracts'

import { type SkillsApi } from '../infrastructure/skills.api'
import { cachedSkillCatalog, fetchSkillCatalog, SKILLS_QUERY_KEY } from './skill-catalog'

const CATALOG = [
  {
    code: 'POWER_STRIKE',
    name: 'Golpe potente',
    description: 'Un mandoble que abre la guardia',
    type: 'ACTION',
    cost: 4,
    requiredAttribute: 'STRENGTH',
    requiredValue: 12,
    damageDice: '1d8',
    appliesCondition: null,
    conditionRounds: null,
  },
] satisfies SkillCatalog

describe('SKILLS_QUERY_KEY', () => {
  it('names the catalog', () => {
    expect(SKILLS_QUERY_KEY).toEqual(['skills'])
  })
})

describe('fetchSkillCatalog', () => {
  it('resolves the catalog the arena serves', async () => {
    const { client, api } = harness()

    await expect(fetchSkillCatalog(client, api)).resolves.toEqual(CATALOG)
  })

  it('asks the arena once and serves every later call from memory', async () => {
    const { client, api, list } = harness()

    await fetchSkillCatalog(client, api)
    await fetchSkillCatalog(client, api)
    await fetchSkillCatalog(client, api)

    expect(list).toHaveBeenCalledTimes(1)
  })

  it('shares one request when two commands ask at the same time', async () => {
    const { client, api, list } = harness()

    await Promise.all([fetchSkillCatalog(client, api), fetchSkillCatalog(client, api)])

    expect(list).toHaveBeenCalledTimes(1)
  })

  it('lets the failure through instead of caching it', async () => {
    const list = vi
      .fn<SkillsApi['list']>()
      .mockRejectedValueOnce(new Error('the arena never answered'))
      .mockResolvedValue(CATALOG)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await expect(fetchSkillCatalog(client, { list })).rejects.toThrow('the arena never answered')
    await expect(fetchSkillCatalog(client, { list })).resolves.toEqual(CATALOG)
  })
})

describe('cachedSkillCatalog', () => {
  it('reports nothing before the catalog is asked for', () => {
    const { client } = harness()

    expect(cachedSkillCatalog(client)).toBeUndefined()
  })

  it('reads the catalog straight from memory once it landed', async () => {
    const { client, api } = harness()

    await fetchSkillCatalog(client, api)

    expect(cachedSkillCatalog(client)).toEqual(CATALOG)
  })

  it('survives the window that would garbage collect an unwatched query', async () => {
    vi.useFakeTimers()
    const { client, api } = harness()

    await fetchSkillCatalog(client, api)
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)

    expect(cachedSkillCatalog(client)).toEqual(CATALOG)
  })
})

afterEach(() => {
  vi.useRealTimers()
})

function harness() {
  const list = vi.fn<SkillsApi['list']>().mockResolvedValue(CATALOG)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return { client, api: { list }, list }
}
