import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { server } from '@/test/msw/server'

import { createApiClient, type TokenStore } from './api-client'
import { ApiError } from './api-error'

const baseUrl = 'https://api.test'
const bodySchema = z.object({ ok: z.boolean() })

interface TokenPairState {
  accessToken: string | null
  refreshToken: string | null
}

function trackedTokenStore(
  initial: TokenPairState = { accessToken: 'stale', refreshToken: 'refresh-1' },
) {
  let pair: TokenPairState = { ...initial }
  const clear = vi.fn(() => {
    pair = { accessToken: null, refreshToken: null }
  })

  const store: TokenStore & { clear: typeof clear } = {
    getAccessToken: () => pair.accessToken,
    getRefreshToken: () => pair.refreshToken,
    setTokens: (next) => {
      pair = { ...next }
    },
    clear,
  }

  return store
}

interface Scenario {
  refreshCalls: () => number
  protectedCalls: () => number
  seenTokens: () => (string | null)[]
}

function arrange(options: { refreshSucceeds: boolean }): Scenario {
  const refreshCalls = vi.fn()
  const protectedCalls = vi.fn()
  const seen: (string | null)[] = []

  server.use(
    http.post(`${baseUrl}/auth/refresh`, () => {
      refreshCalls()

      if (!options.refreshSucceeds) {
        return HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 })
      }

      return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'refresh-2' })
    }),
    http.get(`${baseUrl}/builds`, ({ request }) => {
      protectedCalls()
      const authorization = request.headers.get('authorization')
      seen.push(authorization)

      if (authorization !== 'Bearer fresh') {
        return HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 })
      }

      return HttpResponse.json({ ok: true })
    }),
  )

  return {
    refreshCalls: () => refreshCalls.mock.calls.length,
    protectedCalls: () => protectedCalls.mock.calls.length,
    seenTokens: () => seen,
  }
}

describe('single flight refresh', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  it('fires one refresh for three requests that fail with 401 at the same time', async () => {
    const scenario = arrange({ refreshSucceeds: true })
    const client = createApiClient({ baseUrl, tokens: trackedTokenStore() })

    const results = await Promise.all([
      client.get('/builds', bodySchema),
      client.get('/builds', bodySchema),
      client.get('/builds', bodySchema),
    ])

    expect(scenario.refreshCalls()).toBe(1)
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }])
  })

  it('retries each of those requests exactly once', async () => {
    const scenario = arrange({ refreshSucceeds: true })
    const client = createApiClient({ baseUrl, tokens: trackedTokenStore() })

    await Promise.all([
      client.get('/builds', bodySchema),
      client.get('/builds', bodySchema),
      client.get('/builds', bodySchema),
    ])

    expect(scenario.protectedCalls()).toBe(6)
    expect(scenario.seenTokens()).toEqual([
      'Bearer stale',
      'Bearer stale',
      'Bearer stale',
      'Bearer fresh',
      'Bearer fresh',
      'Bearer fresh',
    ])
  })

  it('stores the rotated pair and drops the old one', async () => {
    arrange({ refreshSucceeds: true })
    const tokens = trackedTokenStore()
    const client = createApiClient({ baseUrl, tokens })

    await client.get('/builds', bodySchema)

    expect(tokens.getAccessToken()).toBe('fresh')
    expect(tokens.getRefreshToken()).toBe('refresh-2')
  })

  it('clears the session and reports it when the refresh is rejected too', async () => {
    arrange({ refreshSucceeds: false })
    const tokens = trackedTokenStore()
    const onSessionExpired = vi.fn()
    const client = createApiClient({ baseUrl, tokens, onSessionExpired })

    const error = (await client
      .get('/builds', bodySchema)
      .catch((caught: unknown) => caught)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(401)
    expect(tokens.clear).toHaveBeenCalledTimes(1)
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('reports an expired session once for three requests that fail together', async () => {
    arrange({ refreshSucceeds: false })
    const tokens = trackedTokenStore()
    const onSessionExpired = vi.fn()
    const client = createApiClient({ baseUrl, tokens, onSessionExpired })

    await Promise.allSettled([
      client.get('/builds', bodySchema),
      client.get('/builds', bodySchema),
      client.get('/builds', bodySchema),
    ])

    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('does not retry a second time when the fresh token is rejected as well', async () => {
    const refreshCalls = vi.fn()
    const protectedCalls = vi.fn()

    server.use(
      http.post(`${baseUrl}/auth/refresh`, () => {
        refreshCalls()
        return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'refresh-2' })
      }),
      http.get(`${baseUrl}/builds`, () => {
        protectedCalls()
        return HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 })
      }),
    )

    const client = createApiClient({ baseUrl, tokens: trackedTokenStore() })

    await expect(client.get('/builds', bodySchema)).rejects.toBeInstanceOf(ApiError)
    expect(refreshCalls).toHaveBeenCalledTimes(1)
    expect(protectedCalls).toHaveBeenCalledTimes(2)
  })

  it('does not attempt a refresh when there is no refresh token', async () => {
    const scenario = arrange({ refreshSucceeds: true })
    const tokens = trackedTokenStore({ accessToken: 'stale', refreshToken: null })
    const client = createApiClient({ baseUrl, tokens })

    await expect(client.get('/builds', bodySchema)).rejects.toBeInstanceOf(ApiError)
    expect(scenario.refreshCalls()).toBe(0)
  })

  it('does not refresh a request that never carried a token', async () => {
    const scenario = arrange({ refreshSucceeds: true })
    const client = createApiClient({ baseUrl, tokens: trackedTokenStore() })

    await expect(
      client.request('/builds', { schema: bodySchema, auth: false }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(scenario.refreshCalls()).toBe(0)
  })

  it('retries without refreshing when another request already rotated the token', async () => {
    const scenario = arrange({ refreshSucceeds: true })
    const tokens = trackedTokenStore()
    const client = createApiClient({ baseUrl, tokens })

    await client.get('/builds', bodySchema)
    tokens.setTokens({ accessToken: 'stale', refreshToken: 'refresh-2' })

    const late = client.get('/builds', bodySchema)
    tokens.setTokens({ accessToken: 'fresh', refreshToken: 'refresh-3' })

    await expect(late).resolves.toEqual({ ok: true })
    expect(scenario.refreshCalls()).toBe(1)
  })

  it('opens a new refresh for a 401 that arrives after the first one settled', async () => {
    const scenario = arrange({ refreshSucceeds: true })
    const tokens = trackedTokenStore()
    const client = createApiClient({ baseUrl, tokens })

    await client.get('/builds', bodySchema)
    tokens.setTokens({ accessToken: 'stale', refreshToken: 'refresh-2' })
    await client.get('/builds', bodySchema)

    expect(scenario.refreshCalls()).toBe(2)
  })
})
