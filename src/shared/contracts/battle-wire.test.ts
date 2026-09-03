import { describe, expect, it } from 'vitest'

import {
  battleEndedPayloadSchema,
  battleOpponentLeftPayloadSchema,
  battleReactionWindowPayloadSchema,
  battleRoundStartPayloadSchema,
  battleStatePayloadSchema,
  battleTurnResolvedPayloadSchema,
  combatantViewSchema,
  ratingChangeViewSchema,
  turnViewSchema,
  windowViewSchema,
} from './battle-wire'

const battleId = '7e6d5c4b-3a2f-4e1d-9c8b-7a6f5e4d3c2b'
const userId = '5f1c2f2e-0d3a-4a1b-9c7d-1a2b3c4d5e6f'
const rivalId = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const combatantId = '1d2c3b4a-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

const combatant = {
  userId,
  combatantId,
  strength: 14,
  magic: 13,
  dexterity: 12,
  constitution: 10,
  armorClass: 11,
  maxHp: 35,
  currentHp: 22,
  initiative: 14,
  reactionAvailable: true,
  conditions: [{ type: 'POISONED', roundsRemaining: 2 }],
  skillCodes: ['POWER_STRIKE', 'FIREBALL', 'PARRY', 'DODGE'],
}

const turn = {
  round: 3,
  sequence: 1,
  actorId: combatantId,
  kind: 'ACTION',
  skillCode: 'POWER_STRIKE',
  attackRoll: 10,
  attackTotal: 12,
  targetValue: 11,
  hit: true,
  critical: false,
  damage: 7,
}

const window = {
  round: 3,
  actorUserId: userId,
  actionSkillCode: 'POWER_STRIKE',
  deadline: '2026-09-02T18:57:54.000Z',
  remainingMs: 15000,
  applicableSkillCodes: ['PARRY', 'BRACE'],
}

describe('combatantViewSchema', () => {
  it('accepts the frozen stat block from the guide', () => {
    expect(combatantViewSchema.parse(combatant)).toEqual(combatant)
  })

  it('accepts a combatant with no conditions', () => {
    const clean = { ...combatant, conditions: [] }

    expect(combatantViewSchema.parse(clean)).toEqual(clean)
  })

  it('rejects a condition the server never applies', () => {
    const result = combatantViewSchema.safeParse({
      ...combatant,
      conditions: [{ type: 'BURNED', roundsRemaining: 2 }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects a combatant without its frozen kit', () => {
    const { skillCodes: _skillCodes, ...withoutKit } = combatant

    expect(combatantViewSchema.safeParse(withoutKit).success).toBe(false)
  })
})

describe('turnViewSchema', () => {
  it('accepts a resolved action row', () => {
    expect(turnViewSchema.parse(turn)).toEqual(turn)
  })

  it('accepts a lost turn where every roll field is null', () => {
    const skipped = {
      ...turn,
      sequence: 1,
      kind: 'ACTION',
      skillCode: null,
      attackRoll: null,
      attackTotal: null,
      targetValue: null,
      hit: null,
      critical: false,
      damage: 0,
    }

    expect(turnViewSchema.parse(skipped)).toEqual(skipped)
  })

  it('rejects a kind outside action and reaction', () => {
    expect(turnViewSchema.safeParse({ ...turn, kind: 'PASSIVE' }).success).toBe(false)
  })

  it('rejects a turn without its damage', () => {
    const { damage: _damage, ...withoutDamage } = turn

    expect(turnViewSchema.safeParse(withoutDamage).success).toBe(false)
  })
})

describe('windowViewSchema', () => {
  it('accepts the open window shape', () => {
    expect(windowViewSchema.parse(window)).toEqual(window)
  })

  it('rejects a window without the list the client must offer', () => {
    const { applicableSkillCodes: _codes, ...withoutCodes } = window

    expect(windowViewSchema.safeParse(withoutCodes).success).toBe(false)
  })
})

describe('ratingChangeViewSchema', () => {
  it('accepts a winner movement', () => {
    const change = { userId, before: 1200, change: 16, after: 1216 }

    expect(ratingChangeViewSchema.parse(change)).toEqual(change)
  })

  it('accepts an unranked duel reporting a change of zero', () => {
    const change = { userId, before: 1200, change: 0, after: 1200 }

    expect(ratingChangeViewSchema.parse(change)).toEqual(change)
  })

  it('accepts a negative change', () => {
    const change = { userId: rivalId, before: 1200, change: -16, after: 1184 }

    expect(ratingChangeViewSchema.parse(change)).toEqual(change)
  })
})

describe('battleStatePayloadSchema', () => {
  const payload = {
    battleId,
    status: 'IN_PROGRESS',
    currentRound: 3,
    activeUserId: userId,
    combatants: [combatant],
    turns: [turn],
    openWindow: null,
    opponentLeft: null,
  }

  it('accepts the guide reconnect payload', () => {
    expect(battleStatePayloadSchema.parse(payload)).toEqual(payload)
  })

  it('accepts a reconnect that lands on an open window', () => {
    const reconnected = { ...payload, openWindow: window }

    expect(battleStatePayloadSchema.parse(reconnected)).toEqual(reconnected)
  })

  it('accepts a reconnect while the opponent is mid disconnect', () => {
    const dropped = {
      ...payload,
      opponentLeft: { userId: rivalId, deadline: '2026-09-02T19:00:00.000Z' },
    }

    expect(battleStatePayloadSchema.parse(dropped)).toEqual(dropped)
  })

  it('accepts a battle that has no active player yet', () => {
    const pending = { ...payload, status: 'ACCEPTED', currentRound: 0, activeUserId: null }

    expect(battleStatePayloadSchema.parse(pending)).toEqual(pending)
  })

  it('rejects a state without its combatants', () => {
    const { combatants: _combatants, ...withoutCombatants } = payload

    expect(battleStatePayloadSchema.safeParse(withoutCombatants).success).toBe(false)
  })
})

describe('battleRoundStartPayloadSchema', () => {
  it('accepts a round start carrying its narration', () => {
    const payload = {
      battleId,
      round: 3,
      activeUserId: userId,
      events: [{ type: 'ROUND_STARTED', round: 3, actorId: combatantId }],
    }

    expect(battleRoundStartPayloadSchema.parse(payload)).toEqual(payload)
  })
})

describe('battleReactionWindowPayloadSchema', () => {
  it('accepts the window the defender receives', () => {
    const payload = { battleId, ...window }

    expect(battleReactionWindowPayloadSchema.parse(payload)).toEqual(payload)
  })
})

describe('battleTurnResolvedPayloadSchema', () => {
  const payload = {
    battleId,
    round: 3,
    turns: [turn],
    events: [{ type: 'DAMAGE_APPLIED', targetId: combatantId, amount: 4, currentHp: 18 }],
    combatants: [combatant],
    defeatedId: null,
  }

  it('accepts a resolved turn', () => {
    expect(battleTurnResolvedPayloadSchema.parse(payload)).toEqual(payload)
  })

  it('accepts the empty events of an idempotent re-emit', () => {
    const reEmit = { ...payload, events: [] }

    expect(battleTurnResolvedPayloadSchema.parse(reEmit)).toEqual(reEmit)
  })

  it('accepts a turn that defeated a combatant', () => {
    const lethal = { ...payload, defeatedId: combatantId }

    expect(battleTurnResolvedPayloadSchema.parse(lethal)).toEqual(lethal)
  })

  it('rejects a payload whose narration holds an unknown event', () => {
    const result = battleTurnResolvedPayloadSchema.safeParse({
      ...payload,
      events: [{ type: 'HEALED', combatantId }],
    })

    expect(result.success).toBe(false)
  })
})

describe('battleEndedPayloadSchema', () => {
  const payload = {
    battleId,
    winnerId: userId,
    reason: 'DEFEAT',
    endedAt: '2026-09-02T19:05:12.400Z',
    ranked: true,
    ratingChanges: [
      { userId, before: 1200, change: 16, after: 1216 },
      { userId: rivalId, before: 1200, change: -16, after: 1184 },
    ],
  }

  it('accepts the guide payload with both players', () => {
    expect(battleEndedPayloadSchema.parse(payload)).toEqual(payload)
  })

  it('accepts a battle closed by abandonment', () => {
    const abandoned = { ...payload, reason: 'ABANDONMENT' }

    expect(battleEndedPayloadSchema.parse(abandoned)).toEqual(abandoned)
  })

  it('rejects a reason the server never sends', () => {
    expect(battleEndedPayloadSchema.safeParse({ ...payload, reason: 'DRAW' }).success).toBe(false)
  })

  it('rejects an ending without the rating movements', () => {
    const { ratingChanges: _changes, ...withoutChanges } = payload

    expect(battleEndedPayloadSchema.safeParse(withoutChanges).success).toBe(false)
  })
})

describe('battleOpponentLeftPayloadSchema', () => {
  it('accepts the drop notice with its deadline', () => {
    const payload = { battleId, userId: rivalId, deadline: '2026-09-02T19:00:00.000Z' }

    expect(battleOpponentLeftPayloadSchema.parse(payload)).toEqual(payload)
  })
})
