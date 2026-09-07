import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { createApiClient, SchemaError, type TokenStore } from '@/shared/http'
import { server } from '@/test/msw/server'

import { createBattlesApi } from './battles.api'

const baseUrl = 'https://api.test'

const GRACE = { id: '22222222-2222-4222-8222-222222222222', username: 'grace', rating: 1350 }
const BUILD_ID = '7c3f1a92-8d4e-4b6a-9f21-0e5d8c7b6a34'

const PENDING = {
  id: 'bbbbbbbb-1111-4111-8111-111111111111',
  status: 'PENDING',
  ranked: true,
  role: 'OPPONENT',
  rival: GRACE,
  outcome: null,
  currentRound: 0,
  createdAt: '2026-09-07T10:15:00.000Z',
  startedAt: null,
  endedAt: null,
}

function battlesApi(): ReturnType<typeof createBattlesApi> {
  return createBattlesApi(createApiClient({ baseUrl, tokens: tokenStore() }))
}

describe('createBattlesApi', () => {
  describe('list', () => {
    it('resolves every row already oriented to whoever asked', async () => {
      server.use(http.get(`${baseUrl}/battles`, () => HttpResponse.json([PENDING])))

      await expect(battlesApi().list()).resolves.toEqual([PENDING])
    })

    it('refuses a status the contract does not know', async () => {
      server.use(
        http.get(`${baseUrl}/battles`, () =>
          HttpResponse.json([{ ...PENDING, status: 'FORFEITED' }]),
        ),
      )

      await expect(battlesApi().list()).rejects.toBeInstanceOf(SchemaError)
    })

    it('keeps an unranked battle unranked', async () => {
      server.use(
        http.get(`${baseUrl}/battles`, () => HttpResponse.json([{ ...PENDING, ranked: false }])),
      )

      const [battle] = await battlesApi().list()

      expect(battle?.ranked).toBe(false)
    })
  })

  describe('challenge', () => {
    it('sends the rival and the build together, because both are frozen at once', async () => {
      const seen = vi.fn()
      server.use(
        http.post(`${baseUrl}/battles`, async ({ request }) => {
          seen(await request.json())
          return HttpResponse.json(PENDING, { status: 201 })
        }),
      )

      await battlesApi().challenge(GRACE.id, BUILD_ID)

      expect(seen).toHaveBeenCalledWith({ opponentId: GRACE.id, buildId: BUILD_ID })
    })

    it('carries the broken rule through, so the console can name it', async () => {
      server.use(
        http.post(`${baseUrl}/battles`, () =>
          HttpResponse.json(
            {
              message: 'The challenge breaks the rules of the arena',
              violations: [{ rule: 'SELF_CHALLENGE', message: 'not yourself' }],
            },
            { status: 400 },
          ),
        ),
      )

      await expect(battlesApi().challenge(GRACE.id, BUILD_ID)).rejects.toMatchObject({
        violations: { violations: [{ rule: 'SELF_CHALLENGE' }] },
      })
    })
  })

  describe('accept', () => {
    it('sends the build the challenged player is walking in with', async () => {
      const seen = vi.fn()
      server.use(
        http.patch(`${baseUrl}/battles/${PENDING.id}/accept`, async ({ request }) => {
          seen(await request.json())
          return HttpResponse.json({ ...PENDING, status: 'ACCEPTED' })
        }),
      )

      await expect(battlesApi().accept(PENDING.id, BUILD_ID)).resolves.toMatchObject({
        status: 'ACCEPTED',
      })
      expect(seen).toHaveBeenCalledWith({ buildId: BUILD_ID })
    })

    it('surfaces the conflict when the challenger dropped the build they picked', async () => {
      server.use(
        http.patch(`${baseUrl}/battles/${PENDING.id}/accept`, () =>
          HttpResponse.json({ statusCode: 409, message: 'Conflict' }, { status: 409 }),
        ),
      )

      await expect(battlesApi().accept(PENDING.id, BUILD_ID)).rejects.toMatchObject({ status: 409 })
    })
  })

  describe('reject', () => {
    it('patches the reject route of that one battle', async () => {
      server.use(
        http.patch(`${baseUrl}/battles/${PENDING.id}/reject`, () =>
          HttpResponse.json({ ...PENDING, status: 'REJECTED' }),
        ),
      )

      await expect(battlesApi().reject(PENDING.id)).resolves.toMatchObject({ status: 'REJECTED' })
    })
  })

  describe('cancel', () => {
    it('patches the cancel route of that one battle', async () => {
      server.use(
        http.patch(`${baseUrl}/battles/${PENDING.id}/cancel`, () =>
          HttpResponse.json({ ...PENDING, status: 'CANCELLED' }),
        ),
      )

      await expect(battlesApi().cancel(PENDING.id)).resolves.toMatchObject({ status: 'CANCELLED' })
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
