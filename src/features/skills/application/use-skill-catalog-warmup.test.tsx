import { QueryClient } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { type SkillCatalog } from '@/shared/contracts'
import { ApiError } from '@/shared/http'

import { type SkillsApi } from '../infrastructure/skills.api'
import { cachedSkillCatalog } from './skill-catalog'
import { useSkillCatalogWarmup } from './use-skill-catalog-warmup'

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

describe('useSkillCatalogWarmup', () => {
  it('leaves the arena alone while there is no session', () => {
    const { client, api, list } = harness()

    renderWarmup({ client, api, hasSession: false })

    expect(list).not.toHaveBeenCalled()
    expect(cachedSkillCatalog(client)).toBeUndefined()
  })

  it('brings the catalog in as soon as a session exists', async () => {
    const { client, api } = harness()

    renderWarmup({ client, api, hasSession: true })

    await waitFor(() => {
      expect(cachedSkillCatalog(client)).toEqual(CATALOG)
    })
  })

  it('asks only once however many times it re-renders', async () => {
    const { client, api, list } = harness()
    const { rerender } = renderWarmup({ client, api, hasSession: true })

    await waitFor(() => {
      expect(list).toHaveBeenCalledTimes(1)
    })
    rerender(<Warmup client={client} api={api} hasSession />)

    expect(list).toHaveBeenCalledTimes(1)
  })

  it('warms up when the session arrives later', async () => {
    const { client, api, list } = harness()
    const { rerender } = renderWarmup({ client, api, hasSession: false })

    rerender(<Warmup client={client} api={api} hasSession />)

    await waitFor(() => {
      expect(list).toHaveBeenCalledTimes(1)
    })
  })

  it('swallows a failure, because a warm up nobody asked for must not shout', async () => {
    const list = vi
      .fn<SkillsApi['list']>()
      .mockRejectedValue(new ApiError('offline', { status: null, payload: undefined }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    renderWarmup({ client, api: { list }, hasSession: true })

    await waitFor(() => {
      expect(list).toHaveBeenCalled()
    })
    expect(cachedSkillCatalog(client)).toBeUndefined()
  })
})

interface WarmupProps {
  client: QueryClient
  api: SkillsApi
  hasSession: boolean
}

function Warmup({ client, api, hasSession }: WarmupProps) {
  useSkillCatalogWarmup({ client, api, hasSession })

  return null
}

function renderWarmup(props: WarmupProps) {
  return render(<Warmup {...props} />)
}

function harness() {
  const list = vi.fn<SkillsApi['list']>().mockResolvedValue(CATALOG)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return { client, api: { list }, list }
}
