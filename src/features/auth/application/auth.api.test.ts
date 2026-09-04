import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { ApiError, createApiClient, type TokenStore } from '@/shared/http'
import { server } from '@/test/msw/server'

import { createAuthApi } from './auth.api'

const baseUrl = 'https://api.test'

const profile = {
  id: '3b9a1c4e-2f5d-4c8b-9a7e-6d5c4b3a2f1e',
  email: 'ada@arena.dev',
  username: 'ada',
  rating: 1200,
  createdAt: '2026-09-04T10:15:00.000Z',
}

const pair = { accessToken: 'access-1', refreshToken: 'refresh-1' }

function tokenStore(accessToken: string | null = 'access-1'): TokenStore {
  let access = accessToken
  let refresh = accessToken === null ? null : 'refresh-1'

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

function authApiWith(accessToken: string | null = 'access-1') {
  return createAuthApi(createApiClient({ baseUrl, tokens: tokenStore(accessToken) }))
}

describe('createAuthApi', () => {
  describe('register', () => {
    it('posts the credentials and resolves the created profile', async () => {
      const seen = vi.fn()
      server.use(
        http.post(`${baseUrl}/auth/register`, async ({ request }) => {
          seen(await request.json())
          return HttpResponse.json(profile, { status: 201 })
        }),
      )

      await expect(
        authApiWith(null).register({
          email: 'ada@arena.dev',
          username: 'ada',
          password: 'hunter2hunter2',
        }),
      ).resolves.toEqual(profile)

      expect(seen).toHaveBeenCalledWith({
        email: 'ada@arena.dev',
        username: 'ada',
        password: 'hunter2hunter2',
      })
    })

    it('sends no authorization header because the route is public', async () => {
      const seen = vi.fn()
      server.use(
        http.post(`${baseUrl}/auth/register`, ({ request }) => {
          seen(request.headers.get('authorization'))
          return HttpResponse.json(profile, { status: 201 })
        }),
      )

      await authApiWith('access-1').register({
        email: 'ada@arena.dev',
        username: 'ada',
        password: 'hunter2hunter2',
      })

      expect(seen).toHaveBeenCalledWith(null)
    })

    it('rejects with the validation status when the arena refuses the credentials', async () => {
      server.use(
        http.post(`${baseUrl}/auth/register`, () =>
          HttpResponse.json(
            { statusCode: 400, message: ['email must be an email'], error: 'Bad Request' },
            { status: 400 },
          ),
        ),
      )

      const error = (await authApiWith(null)
        .register({ email: 'not-an-email', username: 'ada', password: 'hunter2hunter2' })
        .catch((caught: unknown) => caught)) as ApiError

      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(400)
      expect(error.validation?.message).toEqual(['email must be an email'])
    })
  })

  describe('login', () => {
    it('posts the credentials and resolves the token pair', async () => {
      const seen = vi.fn()
      server.use(
        http.post(`${baseUrl}/auth/login`, async ({ request }) => {
          seen(await request.json())
          return HttpResponse.json(pair)
        }),
      )

      await expect(
        authApiWith(null).login({ email: 'ada@arena.dev', password: 'hunter2hunter2' }),
      ).resolves.toEqual(pair)

      expect(seen).toHaveBeenCalledWith({
        email: 'ada@arena.dev',
        password: 'hunter2hunter2',
      })
    })

    it('sends no authorization header because the route is public', async () => {
      const seen = vi.fn()
      server.use(
        http.post(`${baseUrl}/auth/login`, ({ request }) => {
          seen(request.headers.get('authorization'))
          return HttpResponse.json(pair)
        }),
      )

      await authApiWith('access-1').login({
        email: 'ada@arena.dev',
        password: 'hunter2hunter2',
      })

      expect(seen).toHaveBeenCalledWith(null)
    })

    it('rejects with the unauthorized status on wrong credentials', async () => {
      server.use(
        http.post(`${baseUrl}/auth/login`, () =>
          HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
        ),
      )

      const error = (await authApiWith(null)
        .login({ email: 'ada@arena.dev', password: 'wrongpassword' })
        .catch((caught: unknown) => caught)) as ApiError

      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(401)
    })
  })

  describe('me', () => {
    it('resolves the profile of the stored session', async () => {
      server.use(http.get(`${baseUrl}/auth/me`, () => HttpResponse.json(profile)))

      await expect(authApiWith().me()).resolves.toEqual(profile)
    })

    it('sends the access token because the route is private', async () => {
      const seen = vi.fn()
      server.use(
        http.get(`${baseUrl}/auth/me`, ({ request }) => {
          seen(request.headers.get('authorization'))
          return HttpResponse.json(profile)
        }),
      )

      await authApiWith('access-1').me()

      expect(seen).toHaveBeenCalledWith('Bearer access-1')
    })
  })

  describe('logout', () => {
    it('posts the refresh token and resolves on the empty response', async () => {
      const seen = vi.fn()
      server.use(
        http.post(`${baseUrl}/auth/logout`, async ({ request }) => {
          seen(await request.json())
          return new HttpResponse(null, { status: 204 })
        }),
      )

      await expect(authApiWith().logout('refresh-1')).resolves.toBeUndefined()

      expect(seen).toHaveBeenCalledWith({ refreshToken: 'refresh-1' })
    })

    it('sends no authorization header because the route is public', async () => {
      const seen = vi.fn()
      server.use(
        http.post(`${baseUrl}/auth/logout`, ({ request }) => {
          seen(request.headers.get('authorization'))
          return new HttpResponse(null, { status: 204 })
        }),
      )

      await authApiWith('access-1').logout('refresh-1')

      expect(seen).toHaveBeenCalledWith(null)
    })
  })
})
