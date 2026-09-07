import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { createApiClient, SchemaError, type TokenStore } from '@/shared/http'
import { server } from '@/test/msw/server'

import { createLeaderboardApi, LEADERBOARD_LIMIT } from './leaderboard.api'

const baseUrl = 'https://api.test'

const ADA = { rank: 1, id: '11111111-1111-4111-8111-111111111111', username: 'ada', rating: 1216 }
const GRACE = {
  rank: 2,
  id: '22222222-2222-4222-8222-222222222222',
  username: 'grace',
  rating: 1180,
}

function leaderboardApi(): ReturnType<typeof createLeaderboardApi> {
  return createLeaderboardApi(createApiClient({ baseUrl, tokens: tokenStore() }))
}

describe('LEADERBOARD_LIMIT', () => {
  it('mirrors the range the arena accepts', () => {
    expect(LEADERBOARD_LIMIT).toEqual({ min: 1, max: 100, fallback: 50 })
  })
})

describe('createLeaderboardApi', () => {
  describe('list', () => {
    it('resolves the ranking the arena serves', async () => {
      server.use(http.get(`${baseUrl}/leaderboard`, () => HttpResponse.json([ADA, GRACE])))

      await expect(leaderboardApi().list(10)).resolves.toEqual([ADA, GRACE])
    })

    it('asks for the limit it was given', async () => {
      const seen = vi.fn()
      server.use(
        http.get(`${baseUrl}/leaderboard`, ({ request }) => {
          seen(new URL(request.url).searchParams.get('limit'))
          return HttpResponse.json([])
        }),
      )

      await leaderboardApi().list(10)

      expect(seen).toHaveBeenCalledWith('10')
    })

    it('falls back to the arena default when nobody says how many', async () => {
      const seen = vi.fn()
      server.use(
        http.get(`${baseUrl}/leaderboard`, ({ request }) => {
          seen(new URL(request.url).searchParams.get('limit'))
          return HttpResponse.json([])
        }),
      )

      await leaderboardApi().list()

      expect(seen).toHaveBeenCalledWith('50')
    })

    it('carries the access token, because the ranking sits behind the guard', async () => {
      const seen = vi.fn()
      server.use(
        http.get(`${baseUrl}/leaderboard`, ({ request }) => {
          seen(request.headers.get('Authorization'))
          return HttpResponse.json([])
        }),
      )

      await leaderboardApi().list()

      expect(seen).toHaveBeenCalledWith('Bearer access-1')
    })

    it('refuses a row that breaks the contract', async () => {
      server.use(
        http.get(`${baseUrl}/leaderboard`, () => HttpResponse.json([{ ...ADA, rating: 'high' }])),
      )

      await expect(leaderboardApi().list()).rejects.toBeInstanceOf(SchemaError)
    })
  })
})

function tokenStore(): TokenStore {
  let access: string | null = 'access-1'
  let refresh: string | null = 'refresh-1'

  return {
    getAccessToken: () => access,
    getRefreshToken: () => refresh,
    setTokens: (next) => {
      access = next.accessToken
      refresh = next.refreshToken
    },
    clear: () => {
      access = null
      refresh = null
    },
  }
}
