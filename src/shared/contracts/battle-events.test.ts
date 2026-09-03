import { describe, expect, it } from 'vitest'

import { BATTLE_EVENT_TYPES,battleEventListSchema, battleEventSchema } from './battle-events'

const combatantId = '5f1c2f2e-0d3a-4a1b-9c7d-1a2b3c4d5e6f'
const otherId = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

const samples = {
  ROUND_STARTED: { type: 'ROUND_STARTED', round: 3, actorId: combatantId },
  REACTION_RECHARGED: { type: 'REACTION_RECHARGED', combatantId },
  CONDITION_TICKED: {
    type: 'CONDITION_TICKED',
    combatantId,
    condition: 'POISONED',
    roundsRemaining: 2,
  },
  CONDITION_EXPIRED: { type: 'CONDITION_EXPIRED', combatantId, condition: 'POISONED' },
  CONDITION_APPLIED: {
    type: 'CONDITION_APPLIED',
    combatantId,
    condition: 'POISONED',
    rounds: 3,
    refreshed: false,
  },
  TURN_SKIPPED: { type: 'TURN_SKIPPED', combatantId, reason: 'STUNNED' },
  REACTION_IGNORED: {
    type: 'REACTION_IGNORED',
    combatantId,
    skillCode: 'DODGE',
    reason: 'NOT_APPLICABLE',
  },
  ATTACK_ROLLED: {
    type: 'ATTACK_ROLLED',
    actorId: combatantId,
    rolls: [10],
    kept: 10,
    total: 12,
    targetValue: 11,
    hit: true,
    critical: false,
  },
  SAVE_ROLLED: {
    type: 'SAVE_ROLLED',
    defenderId: otherId,
    rolls: [9],
    kept: 9,
    total: 10,
    difficulty: 10,
    passed: true,
  },
  DAMAGE_MITIGATED: {
    type: 'DAMAGE_MITIGATED',
    targetId: otherId,
    skillCode: 'PARRY',
    before: 9,
    after: 4,
  },
  DAMAGE_APPLIED: { type: 'DAMAGE_APPLIED', targetId: otherId, amount: 4, currentHp: 18 },
  COUNTER_ATTACKED: {
    type: 'COUNTER_ATTACKED',
    actorId: otherId,
    skillCode: 'COUNTER',
    damage: 5,
  },
  COMBATANT_DEFEATED: { type: 'COMBATANT_DEFEATED', combatantId: otherId },
} as const

describe('battleEventSchema', () => {
  it('covers the thirteen event types the guide documents', () => {
    expect(BATTLE_EVENT_TYPES).toHaveLength(13)
    expect(Object.keys(samples)).toEqual([...BATTLE_EVENT_TYPES])
  })

  it.each(Object.entries(samples))('accepts a %s event', (_type, payload) => {
    expect(battleEventSchema.parse(payload)).toEqual(payload)
  })

  it('keeps both dice and the kept one when the roll had advantage', () => {
    const withAdvantage = { ...samples.ATTACK_ROLLED, rolls: [16, 6], kept: 6 }

    expect(battleEventSchema.parse(withAdvantage)).toEqual(withAdvantage)
  })

  it('rejects an event type that is not in the union', () => {
    expect(battleEventSchema.safeParse({ type: 'HEALED', combatantId }).success).toBe(false)
  })

  it('rejects an event that is missing a field of its own variant', () => {
    const result = battleEventSchema.safeParse({ type: 'DAMAGE_APPLIED', targetId: otherId })

    expect(result.success).toBe(false)
  })

  it('rejects a condition the server never applies', () => {
    const result = battleEventSchema.safeParse({
      ...samples.CONDITION_EXPIRED,
      condition: 'BURNED',
    })

    expect(result.success).toBe(false)
  })

  it('rejects a reason that does not belong to the variant', () => {
    const result = battleEventSchema.safeParse({ ...samples.TURN_SKIPPED, reason: 'UNAVAILABLE' })

    expect(result.success).toBe(false)
  })

  it('narrows to the variant fields once parsed', () => {
    const parsed = battleEventSchema.parse(samples.DAMAGE_APPLIED)

    expect(parsed.type === 'DAMAGE_APPLIED' && parsed.currentHp).toBe(18)
  })
})

describe('battleEventListSchema', () => {
  it('accepts the narration in order', () => {
    const narration = [samples.ATTACK_ROLLED, samples.DAMAGE_APPLIED, samples.COMBATANT_DEFEATED]

    expect(battleEventListSchema.parse(narration)).toEqual(narration)
  })

  it('accepts the empty array of an idempotent re-emit', () => {
    expect(battleEventListSchema.parse([])).toEqual([])
  })
})
