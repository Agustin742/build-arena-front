import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { ApiError, createApiClient, SchemaError, type TokenStore } from '@/shared/http'
import { server } from '@/test/msw/server'

import { createFriendshipsApi } from './friendships.api'

const baseUrl = 'https://api.test'

const GRACE = { id: '22222222-2222-4222-8222-222222222222', username: 'grace', rating: 1350 }

const INCOMING = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  status: 'PENDING',
  direction: 'INCOMING',
  player: GRACE,
  createdAt: '2026-09-07T10:15:00.000Z',
  updatedAt: '2026-09-07T10:15:00.000Z',
}

const ACCEPTED = { ...INCOMING, status: 'ACCEPTED' }

function friendshipsApi(): ReturnType<typeof createFriendshipsApi> {
  return createFriendshipsApi(createApiClient({ baseUrl, tokens: tokenStore() }))
}

describe('createFriendshipsApi', () => {
  describe('list', () => {
    it('resolves every row already oriented to whoever asked', async () => {
      server.use(http.get(`${baseUrl}/friendships`, () => HttpResponse.json([INCOMING])))

      await expect(friendshipsApi().list()).resolves.toEqual([INCOMING])
    })

    it('refuses a direction the contract does not know', async () => {
      server.use(
        http.get(`${baseUrl}/friendships`, () =>
          HttpResponse.json([{ ...INCOMING, direction: 'SIDEWAYS' }]),
        ),
      )

      await expect(friendshipsApi().list()).rejects.toBeInstanceOf(SchemaError)
    })
  })

  describe('request', () => {
    it('sends the addressee the arena asked for', async () => {
      const seen = vi.fn()
      server.use(
        http.post(`${baseUrl}/friendships`, async ({ request }) => {
          seen(await request.json())
          return HttpResponse.json(INCOMING, { status: 201 })
        }),
      )

      await friendshipsApi().request(GRACE.id)

      expect(seen).toHaveBeenCalledWith({ addresseeId: GRACE.id })
    })

    it('carries the broken rule through, so the console can name it', async () => {
      server.use(
        http.post(`${baseUrl}/friendships`, () =>
          HttpResponse.json(
            {
              message: 'The friend request breaks the rules of the arena',
              violations: [{ rule: 'DUPLICATE_REQUEST', message: 'already asked' }],
            },
            { status: 400 },
          ),
        ),
      )

      await expect(friendshipsApi().request(GRACE.id)).rejects.toMatchObject({
        violations: { violations: [{ rule: 'DUPLICATE_REQUEST' }] },
      })
    })
  })

  describe('accept', () => {
    it('patches the accept route of that one friendship', async () => {
      const seen = vi.fn()
      server.use(
        http.patch(`${baseUrl}/friendships/${INCOMING.id}/accept`, () => {
          seen()
          return HttpResponse.json(ACCEPTED)
        }),
      )

      await expect(friendshipsApi().accept(INCOMING.id)).resolves.toMatchObject({
        status: 'ACCEPTED',
      })
      expect(seen).toHaveBeenCalled()
    })

    it('surfaces the refusal when the arena says it is not ours to accept', async () => {
      server.use(
        http.patch(`${baseUrl}/friendships/${INCOMING.id}/accept`, () =>
          HttpResponse.json({ statusCode: 403, message: 'Forbidden' }, { status: 403 }),
        ),
      )

      await expect(friendshipsApi().accept(INCOMING.id)).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('remove', () => {
    it('deletes the friendship and expects nothing back', async () => {
      server.use(
        http.delete(
          `${baseUrl}/friendships/${INCOMING.id}`,
          () => new HttpResponse(null, { status: 204 }),
        ),
      )

      await expect(friendshipsApi().remove(INCOMING.id)).resolves.toBeUndefined()
    })

    it('reports a friendship that is already gone', async () => {
      server.use(
        http.delete(`${baseUrl}/friendships/${INCOMING.id}`, () =>
          HttpResponse.json({ statusCode: 404, message: 'Not Found' }, { status: 404 }),
        ),
      )

      await expect(friendshipsApi().remove(INCOMING.id)).rejects.toBeInstanceOf(ApiError)
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
