import { describe, expect, it } from 'vitest'

import {
  healthStatusSchema,
  leaderboardSchema,
  publicBattleSchema,
  publicBuildSchema,
  publicFriendshipSchema,
  publicPlayerSchema,
  publicSkillSchema,
  publicUserSchema,
  tokenPairSchema,
} from './models'

const player = {
  id: '5f1c2f2e-0d3a-4a1b-9c7d-1a2b3c4d5e6f',
  username: 'grace',
  rating: 1350,
}

const skill = {
  code: 'POWER_STRIKE',
  name: 'Power Strike',
  description: 'A heavy overhead swing',
  type: 'ACTION',
  cost: 4,
  requiredAttribute: 'STRENGTH',
  requiredValue: 12,
  damageDice: '1d8',
  appliesCondition: null,
  conditionRounds: null,
}

const build = {
  id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  name: 'Iron Vanguard',
  strength: 14,
  magic: 8,
  dexterity: 12,
  constitution: 13,
  skills: [skill],
  createdAt: '2026-09-02T18:57:39.097Z',
  updatedAt: '2026-09-02T18:57:39.097Z',
}

describe('healthStatusSchema', () => {
  it('accepts the guide payload', () => {
    const payload = {
      status: 'ok',
      version: '0.1.0',
      uptime: 564,
      timestamp: '2026-09-02T18:57:39.097Z',
    }

    expect(healthStatusSchema.parse(payload)).toEqual(payload)
  })

  it('rejects a payload without uptime', () => {
    const result = healthStatusSchema.safeParse({
      status: 'ok',
      version: '0.1.0',
      timestamp: '2026-09-02T18:57:39.097Z',
    })

    expect(result.success).toBe(false)
  })
})

describe('tokenPairSchema', () => {
  it('accepts a login response', () => {
    const payload = { accessToken: 'header.payload.signature', refreshToken: 'opaque-refresh' }

    expect(tokenPairSchema.parse(payload)).toEqual(payload)
  })

  it('rejects a response missing the refresh token', () => {
    expect(tokenPairSchema.safeParse({ accessToken: 'only-access' }).success).toBe(false)
  })
})

describe('publicUserSchema', () => {
  it('accepts the auth me payload', () => {
    const payload = {
      id: '3b9a1c4e-2f5d-4c8b-9a7e-6d5c4b3a2f1e',
      email: 'ada@arena.dev',
      username: 'ada',
      rating: 1216,
      createdAt: '2026-09-02T18:57:39.097Z',
    }

    expect(publicUserSchema.parse(payload)).toEqual(payload)
  })

  it('rejects a user without a rating', () => {
    const result = publicUserSchema.safeParse({
      id: '3b9a1c4e-2f5d-4c8b-9a7e-6d5c4b3a2f1e',
      email: 'ada@arena.dev',
      username: 'ada',
      createdAt: '2026-09-02T18:57:39.097Z',
    })

    expect(result.success).toBe(false)
  })

  it('rejects an id that is not a uuid', () => {
    const result = publicUserSchema.safeParse({
      id: 'not-a-uuid',
      email: 'ada@arena.dev',
      username: 'ada',
      rating: 1216,
      createdAt: '2026-09-02T18:57:39.097Z',
    })

    expect(result.success).toBe(false)
  })
})

describe('publicPlayerSchema', () => {
  it('accepts the three fields another player exposes', () => {
    expect(publicPlayerSchema.parse(player)).toEqual(player)
  })

  it('strips an email that should never have reached the client', () => {
    const parsed = publicPlayerSchema.parse({ ...player, email: 'grace@arena.dev' })

    expect(parsed).not.toHaveProperty('email')
  })
})

describe('publicSkillSchema', () => {
  it('accepts a catalog entry without a condition', () => {
    expect(publicSkillSchema.parse(skill)).toEqual(skill)
  })

  it('accepts a catalog entry that applies a condition', () => {
    const venomBolt = {
      ...skill,
      code: 'VENOM_BOLT',
      name: 'Venom Bolt',
      cost: 4,
      requiredAttribute: 'MAGIC',
      requiredValue: 11,
      damageDice: '1d4',
      appliesCondition: 'POISONED',
      conditionRounds: 3,
    }

    expect(publicSkillSchema.parse(venomBolt)).toEqual(venomBolt)
  })

  it('accepts a reaction with no damage dice', () => {
    const parry = {
      ...skill,
      code: 'PARRY',
      name: 'Parry',
      type: 'REACTION',
      cost: 4,
      damageDice: null,
    }

    expect(publicSkillSchema.parse(parry)).toEqual(parry)
  })

  it('rejects an unknown skill type', () => {
    expect(publicSkillSchema.safeParse({ ...skill, type: 'PASSIVE' }).success).toBe(false)
  })

  it('rejects an unknown required attribute', () => {
    expect(publicSkillSchema.safeParse({ ...skill, requiredAttribute: 'LUCK' }).success).toBe(false)
  })
})

describe('publicBuildSchema', () => {
  it('accepts a build with its resolved kit', () => {
    expect(publicBuildSchema.parse(build)).toEqual(build)
  })

  it('rejects a build without its attributes', () => {
    const { strength: _strength, ...withoutStrength } = build

    expect(publicBuildSchema.safeParse(withoutStrength).success).toBe(false)
  })
})

describe('publicFriendshipSchema', () => {
  it('accepts the oriented row from the guide', () => {
    const payload = {
      id: '1d2c3b4a-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      status: 'PENDING',
      direction: 'INCOMING',
      player,
      createdAt: '2026-09-02T18:57:39.097Z',
      updatedAt: '2026-09-02T18:57:39.097Z',
    }

    expect(publicFriendshipSchema.parse(payload)).toEqual(payload)
  })

  it('rejects a direction the server never sends', () => {
    const result = publicFriendshipSchema.safeParse({
      id: '1d2c3b4a-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      status: 'PENDING',
      direction: 'MUTUAL',
      player,
      createdAt: '2026-09-02T18:57:39.097Z',
      updatedAt: '2026-09-02T18:57:39.097Z',
    })

    expect(result.success).toBe(false)
  })
})

describe('publicBattleSchema', () => {
  const payload = {
    id: '7e6d5c4b-3a2f-4e1d-9c8b-7a6f5e4d3c2b',
    status: 'ACCEPTED',
    ranked: true,
    role: 'CHALLENGER',
    rival: player,
    outcome: null,
    currentRound: 0,
    createdAt: '2026-09-02T18:57:39.097Z',
    startedAt: null,
    endedAt: null,
  }

  it('accepts the guide payload', () => {
    expect(publicBattleSchema.parse(payload)).toEqual(payload)
  })

  it('accepts a finished battle with an outcome and both timestamps', () => {
    const finished = {
      ...payload,
      status: 'FINISHED',
      outcome: 'WON',
      currentRound: 4,
      startedAt: '2026-09-02T18:57:39.097Z',
      endedAt: '2026-09-02T19:05:12.400Z',
    }

    expect(publicBattleSchema.parse(finished)).toEqual(finished)
  })

  it('rejects a status outside the battle lifecycle', () => {
    expect(publicBattleSchema.safeParse({ ...payload, status: 'PAUSED' }).success).toBe(false)
  })

  it('rejects a battle without its rival', () => {
    const { rival: _rival, ...withoutRival } = payload

    expect(publicBattleSchema.safeParse(withoutRival).success).toBe(false)
  })
})

describe('leaderboardSchema', () => {
  it('accepts the ranked list', () => {
    const payload = [{ rank: 1, id: player.id, username: 'ada', rating: 1216 }]

    expect(leaderboardSchema.parse(payload)).toEqual(payload)
  })

  it('rejects an entry without a rank', () => {
    const result = leaderboardSchema.safeParse([{ id: player.id, username: 'ada', rating: 1216 }])

    expect(result.success).toBe(false)
  })
})
