import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { createApiClient, SchemaError, type TokenStore } from '@/shared/http'
import { server } from '@/test/msw/server'

import { createSkillsApi } from './skills.api'

const baseUrl = 'https://api.test'

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

const VENOM_BOLT = {
  code: 'VENOM_BOLT',
  name: 'Dardo venenoso',
  description: 'Envenena a quien toca',
  type: 'ACTION',
  cost: 4,
  requiredAttribute: 'MAGIC',
  requiredValue: 11,
  damageDice: '1d4',
  appliesCondition: 'POISONED',
  conditionRounds: 3,
}

function skillsApi(): ReturnType<typeof createSkillsApi> {
  return createSkillsApi(createApiClient({ baseUrl, tokens: tokenStore() }))
}

describe('createSkillsApi', () => {
  describe('list', () => {
    it('resolves the catalog the arena serves', async () => {
      server.use(http.get(`${baseUrl}/skills`, () => HttpResponse.json([POWER_STRIKE, VENOM_BOLT])))

      await expect(skillsApi().list()).resolves.toEqual([POWER_STRIKE, VENOM_BOLT])
    })

    it('carries the access token, because the catalog sits behind the guard', async () => {
      const seen = vi.fn()
      server.use(
        http.get(`${baseUrl}/skills`, ({ request }) => {
          seen(request.headers.get('Authorization'))
          return HttpResponse.json([])
        }),
      )

      await skillsApi().list()

      expect(seen).toHaveBeenCalledWith('Bearer access-1')
    })

    it('keeps a condition and its duration together', async () => {
      server.use(http.get(`${baseUrl}/skills`, () => HttpResponse.json([VENOM_BOLT])))

      const [venom] = await skillsApi().list()

      expect(venom).toMatchObject({ appliesCondition: 'POISONED', conditionRounds: 3 })
    })

    it('refuses a catalog entry that breaks the contract', async () => {
      server.use(
        http.get(`${baseUrl}/skills`, () =>
          HttpResponse.json([{ ...POWER_STRIKE, requiredAttribute: 'CHARISMA' }]),
        ),
      )

      await expect(skillsApi().list()).rejects.toBeInstanceOf(SchemaError)
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
