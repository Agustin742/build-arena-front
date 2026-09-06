import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { ApiError, createApiClient, SchemaError, type TokenStore } from '@/shared/http'
import { server } from '@/test/msw/server'

import { createBuildsApi } from './builds.api'

const baseUrl = 'https://api.test'
const buildId = '7c3f1a92-8d4e-4b6a-9f21-0e5d8c7b6a34'

const POWER_STRIKE = {
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
}

const build = {
  id: buildId,
  name: 'Duelista híbrido',
  strength: 14,
  magic: 13,
  dexterity: 12,
  constitution: 10,
  skills: [POWER_STRIKE],
  createdAt: '2026-09-06T10:15:00.000Z',
  updatedAt: '2026-09-06T10:15:00.000Z',
}

const draft = {
  name: 'Duelista híbrido',
  strength: 14,
  magic: 13,
  dexterity: 12,
  constitution: 10,
  skillCodes: ['POWER_STRIKE', 'FIREBALL', 'PARRY', 'BRACE'],
}

describe('createBuildsApi', () => {
  describe('create', () => {
    it('posts the draft and resolves the build the arena stored', async () => {
      const seen = vi.fn()
      server.use(
        http.post(`${baseUrl}/builds`, async ({ request }) => {
          seen(await request.json())
          return HttpResponse.json(build, { status: 201 })
        }),
      )

      await expect(buildsApi().create(draft)).resolves.toEqual(build)
      expect(seen).toHaveBeenCalledWith(draft)
    })

    it('carries the violations of an illegal build, all of them', async () => {
      server.use(
        http.post(`${baseUrl}/builds`, () =>
          HttpResponse.json(
            {
              message: 'The build breaks the rules of the arena',
              violations: [
                { rule: 'ATTRIBUTE_BUDGET_EXCEEDED', message: 'The spread costs 24' },
                { rule: 'KIT_BUDGET_EXCEEDED', message: 'The kit costs 21' },
              ],
            },
            { status: 400 },
          ),
        ),
      )

      const error = await buildsApi()
        .create(draft)
        .catch((cause: unknown) => cause)

      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).violations?.violations).toHaveLength(2)
    })

    it('reports a name the player already used as a conflict', async () => {
      server.use(
        http.post(`${baseUrl}/builds`, () =>
          HttpResponse.json({ statusCode: 409, message: 'Conflict' }, { status: 409 }),
        ),
      )

      const error = await buildsApi()
        .create(draft)
        .catch((cause: unknown) => cause)

      expect((error as ApiError).status).toBe(409)
    })
  })

  describe('list', () => {
    it('resolves every build the player owns', async () => {
      server.use(http.get(`${baseUrl}/builds`, () => HttpResponse.json([build])))

      await expect(buildsApi().list()).resolves.toEqual([build])
    })

    it('resolves an empty list for a player with no builds', async () => {
      server.use(http.get(`${baseUrl}/builds`, () => HttpResponse.json([])))

      await expect(buildsApi().list()).resolves.toEqual([])
    })

    it('refuses a build that breaks the contract', async () => {
      server.use(
        http.get(`${baseUrl}/builds`, () => HttpResponse.json([{ ...build, strength: 'mucha' }])),
      )

      await expect(buildsApi().list()).rejects.toBeInstanceOf(SchemaError)
    })
  })

  describe('get', () => {
    it('resolves one build by its id', async () => {
      server.use(http.get(`${baseUrl}/builds/${buildId}`, () => HttpResponse.json(build)))

      await expect(buildsApi().get(buildId)).resolves.toEqual(build)
    })

    it('reports somebody else s build as missing, never as forbidden', async () => {
      server.use(
        http.get(`${baseUrl}/builds/${buildId}`, () =>
          HttpResponse.json({ statusCode: 404, message: 'Not Found' }, { status: 404 }),
        ),
      )

      const error = await buildsApi()
        .get(buildId)
        .catch((cause: unknown) => cause)

      expect((error as ApiError).status).toBe(404)
    })
  })

  describe('update', () => {
    it('patches only the fields it was given', async () => {
      const seen = vi.fn()
      server.use(
        http.patch(`${baseUrl}/builds/${buildId}`, async ({ request }) => {
          seen(await request.json())
          return HttpResponse.json({ ...build, name: 'Duelista ágil' })
        }),
      )

      await expect(buildsApi().update(buildId, { name: 'Duelista ágil' })).resolves.toMatchObject({
        name: 'Duelista ágil',
      })
      expect(seen).toHaveBeenCalledWith({ name: 'Duelista ágil' })
    })

    it('carries the violations of a change that leaves the build illegal', async () => {
      server.use(
        http.patch(`${baseUrl}/builds/${buildId}`, () =>
          HttpResponse.json(
            {
              message: 'The build breaks the rules of the arena',
              violations: [{ rule: 'ATTRIBUTE_REQUIREMENT_NOT_MET', message: 'FIREBALL needs 12' }],
            },
            { status: 400 },
          ),
        ),
      )

      const error = await buildsApi()
        .update(buildId, { magic: 8 })
        .catch((cause: unknown) => cause)

      expect((error as ApiError).violations?.violations[0]?.rule).toBe(
        'ATTRIBUTE_REQUIREMENT_NOT_MET',
      )
    })
  })

  describe('remove', () => {
    it('resolves on the empty answer a delete gives back', async () => {
      server.use(
        http.delete(`${baseUrl}/builds/${buildId}`, () => new HttpResponse(null, { status: 204 })),
      )

      await expect(buildsApi().remove(buildId)).resolves.toBeUndefined()
    })

    it('reports a build that is not there', async () => {
      server.use(
        http.delete(`${baseUrl}/builds/${buildId}`, () =>
          HttpResponse.json({ statusCode: 404, message: 'Not Found' }, { status: 404 }),
        ),
      )

      await expect(buildsApi().remove(buildId)).rejects.toBeInstanceOf(ApiError)
    })
  })

  it('carries the access token on every route', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${baseUrl}/builds`, ({ request }) => {
        seen(request.headers.get('Authorization'))
        return HttpResponse.json([])
      }),
    )

    await buildsApi().list()

    expect(seen).toHaveBeenCalledWith('Bearer access-1')
  })
})

function buildsApi() {
  return createBuildsApi(createApiClient({ baseUrl, tokens: tokenStore() }))
}

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
