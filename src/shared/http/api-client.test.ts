import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { publicUserSchema } from '@/shared/contracts'
import { server } from '@/test/msw/server'

import { createApiClient, type TokenStore } from './api-client'
import { ApiError, SchemaError } from './api-error'

const baseUrl = 'https://api.test'

const user = {
  id: '3b9a1c4e-2f5d-4c8b-9a7e-6d5c4b3a2f1e',
  email: 'ada@arena.dev',
  username: 'ada',
  rating: 1216,
  createdAt: '2026-09-02T18:57:39.097Z',
}

function tokenStoreWith(accessToken: string | null): TokenStore {
  let access = accessToken
  let refresh = accessToken === null ? null : 'refresh-1'

  return {
    getAccessToken: () => access,
    getRefreshToken: () => refresh,
    setTokens: (pair) => {
      access = pair.accessToken
      refresh = pair.refreshToken
    },
    clear: () => {
      access = null
      refresh = null
    },
  }
}

function clientWith(accessToken: string | null = 'access-1') {
  return createApiClient({ baseUrl, tokens: tokenStoreWith(accessToken) })
}

describe('createApiClient', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  it('returns the parsed body when it matches the schema', async () => {
    server.use(http.get(`${baseUrl}/auth/me`, () => HttpResponse.json(user)))

    await expect(clientWith().get('/auth/me', publicUserSchema)).resolves.toEqual(user)
  })

  it('sends the access token as a bearer header', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${baseUrl}/auth/me`, ({ request }) => {
        seen(request.headers.get('authorization'))
        return HttpResponse.json(user)
      }),
    )

    await clientWith('access-1').get('/auth/me', publicUserSchema)

    expect(seen).toHaveBeenCalledWith('Bearer access-1')
  })

  it('omits the header on a public request', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${baseUrl}/health`, ({ request }) => {
        seen(request.headers.get('authorization'))
        return HttpResponse.json({ status: 'ok' })
      }),
    )

    await clientWith().request('/health', { schema: z.object({ status: z.string() }), auth: false })

    expect(seen).toHaveBeenCalledWith(null)
  })

  it('omits the header when there is no session yet', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${baseUrl}/auth/me`, ({ request }) => {
        seen(request.headers.get('authorization'))
        return HttpResponse.json(user)
      }),
    )

    await clientWith(null).get('/auth/me', publicUserSchema)

    expect(seen).toHaveBeenCalledWith(null)
  })

  it('sends a json body on a post', async () => {
    const seen = vi.fn()
    server.use(
      http.post(`${baseUrl}/auth/login`, async ({ request }) => {
        seen(await request.json(), request.headers.get('content-type'))
        return HttpResponse.json({ accessToken: 'a', refreshToken: 'b' })
      }),
    )

    await clientWith().post(
      '/auth/login',
      { email: 'ada@arena.dev', password: 'hunter2hunter2' },
      z.object({ accessToken: z.string(), refreshToken: z.string() }),
    )

    expect(seen).toHaveBeenCalledWith(
      { email: 'ada@arena.dev', password: 'hunter2hunter2' },
      'application/json',
    )
  })

  it('resolves with undefined on a 204 that carries no body', async () => {
    server.use(http.delete(`${baseUrl}/builds/1`, () => new HttpResponse(null, { status: 204 })))

    await expect(clientWith().del('/builds/1')).resolves.toBeUndefined()
  })

  it('throws a SchemaError when the body does not match the contract', async () => {
    server.use(http.get(`${baseUrl}/auth/me`, () => HttpResponse.json({ id: 'not-a-uuid' })))

    await expect(clientWith().get('/auth/me', publicUserSchema)).rejects.toBeInstanceOf(SchemaError)
  })

  it('throws an ApiError carrying the status of a failed request', async () => {
    server.use(
      http.get(`${baseUrl}/builds/1`, () =>
        HttpResponse.json({ statusCode: 404, message: 'Not Found' }, { status: 404 }),
      ),
    )

    const error = await clientWith()
      .get('/builds/1', publicUserSchema)
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
  })

  it('exposes the validation pipe messages on the error', async () => {
    server.use(
      http.post(`${baseUrl}/auth/register`, () =>
        HttpResponse.json(
          { statusCode: 400, message: ['email must be an email'], error: 'Bad Request' },
          { status: 400 },
        ),
      ),
    )

    const error = (await clientWith()
      .post('/auth/register', {})
      .catch((caught: unknown) => caught)) as ApiError

    expect(error.validation?.message).toEqual(['email must be an email'])
    expect(error.violations).toBeUndefined()
  })

  it('exposes the rule violations on the error, which are a different envelope', async () => {
    server.use(
      http.post(`${baseUrl}/builds`, () =>
        HttpResponse.json(
          {
            message: 'The build breaks the rules of the arena',
            violations: [{ rule: 'KIT_BUDGET_EXCEEDED', message: 'The kit costs 21 points' }],
          },
          { status: 400 },
        ),
      ),
    )

    const error = (await clientWith()
      .post('/builds', {})
      .catch((caught: unknown) => caught)) as ApiError

    expect(error.violations?.violations).toEqual([
      { rule: 'KIT_BUDGET_EXCEEDED', message: 'The kit costs 21 points' },
    ])
    expect(error.validation).toBeUndefined()
  })

  it('reports a network failure as an ApiError without a status', async () => {
    server.use(http.get(`${baseUrl}/auth/me`, () => HttpResponse.error()))

    const error = (await clientWith()
      .get('/auth/me', publicUserSchema)
      .catch((caught: unknown) => caught)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBeNull()
  })

  it('uses whatever global fetch is installed when the request runs, not at creation', async () => {
    const client = createApiClient({ baseUrl, tokens: tokenStoreWith('access-1') })
    const original = globalThis.fetch
    const swapped = vi.fn(original)
    globalThis.fetch = swapped

    server.use(http.get(`${baseUrl}/auth/me`, () => HttpResponse.json(user)))

    try {
      await client.get('/auth/me', publicUserSchema)
    } finally {
      globalThis.fetch = original
    }

    expect(swapped).toHaveBeenCalled()
  })

  it('joins the base url and the path without doubling the slash', async () => {
    server.use(http.get(`${baseUrl}/auth/me`, () => HttpResponse.json(user)))

    const client = createApiClient({ baseUrl: `${baseUrl}/`, tokens: tokenStoreWith('access-1') })

    await expect(client.get('/auth/me', publicUserSchema)).resolves.toEqual(user)
  })
})
