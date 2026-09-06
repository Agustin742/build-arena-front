import { describe, expect, it } from 'vitest'

import { toAttributeSpread } from './attribute-cost'
import {
  ACTION_SLOTS,
  countByType,
  isKitComplete,
  KIT_BUDGET,
  kitCost,
  lockFor,
  REACTION_SLOTS,
  remainingKitPoints,
  requirementGap,
  slotsFor,
} from './kit'
import { type AttributeSpreadInput, type SkillRules } from './types'

const POWER_STRIKE = skill('POWER_STRIKE', 'ACTION', 4, 'STRENGTH', 12)
const RECKLESS_BLOW = skill('RECKLESS_BLOW', 'ACTION', 5, 'STRENGTH', 14)
const PRECISE_SHOT = skill('PRECISE_SHOT', 'ACTION', 4, 'DEXTERITY', 13)
const FIREBALL = skill('FIREBALL', 'ACTION', 5, 'MAGIC', 12)
const MIND_SPIKE = skill('MIND_SPIKE', 'ACTION', 7, 'MAGIC', 14)
const BRACE = skill('BRACE', 'REACTION', 3, 'CONSTITUTION', 12)
const PARRY = skill('PARRY', 'REACTION', 4, 'STRENGTH', 12)
const RIPOSTE = skill('RIPOSTE', 'REACTION', 7, 'DEXTERITY', 14)

/** Costs 19 of the 20 points. Unlocks everything the tests pick, and nothing they lock. */
const MAGE = assertSpread({ strength: 12, magic: 14, dexterity: 12, constitution: 12 })

describe('kit constants', () => {
  it('declares two slots per type and an 18 point budget', () => {
    expect({ ACTION_SLOTS, REACTION_SLOTS, KIT_BUDGET }).toEqual({
      ACTION_SLOTS: 2,
      REACTION_SLOTS: 2,
      KIT_BUDGET: 18,
    })
  })
})

describe('slotsFor', () => {
  it('gives each type its own slot count', () => {
    expect(slotsFor('ACTION')).toBe(ACTION_SLOTS)
    expect(slotsFor('REACTION')).toBe(REACTION_SLOTS)
  })
})

describe('kitCost', () => {
  it('costs nothing when nothing is chosen', () => {
    expect(kitCost([])).toBe(0)
  })

  it('adds up the cost of every chosen skill', () => {
    expect(kitCost([POWER_STRIKE, FIREBALL, PARRY, BRACE])).toBe(4 + 5 + 4 + 3)
  })
})

describe('remainingKitPoints', () => {
  it('leaves the whole budget on an empty kit', () => {
    expect(remainingKitPoints([])).toBe(KIT_BUDGET)
  })

  it('discounts what the chosen skills already cost', () => {
    expect(remainingKitPoints([MIND_SPIKE, RIPOSTE])).toBe(KIT_BUDGET - 14)
  })
})

describe('countByType', () => {
  it('counts only the skills of the asked type', () => {
    const chosen = [POWER_STRIKE, FIREBALL, PARRY]

    expect(countByType(chosen, 'ACTION')).toBe(2)
    expect(countByType(chosen, 'REACTION')).toBe(1)
  })
})

describe('isKitComplete', () => {
  it('accepts exactly two actions and two reactions', () => {
    expect(isKitComplete([POWER_STRIKE, FIREBALL, PARRY, BRACE])).toBe(true)
  })

  it('rejects a kit that is short a reaction', () => {
    expect(isKitComplete([POWER_STRIKE, FIREBALL, PARRY])).toBe(false)
  })

  it('rejects four skills of the same type', () => {
    expect(isKitComplete([POWER_STRIKE, FIREBALL, RECKLESS_BLOW, PRECISE_SHOT])).toBe(false)
  })
})

describe('requirementGap', () => {
  it('reports nothing when the spread reaches the requirement exactly', () => {
    expect(requirementGap(MAGE, POWER_STRIKE)).toBeNull()
  })

  it('reports nothing when the spread overshoots the requirement', () => {
    expect(requirementGap(MAGE, FIREBALL)).toBeNull()
  })

  it('names the attribute, what it asks and what the build has', () => {
    expect(requirementGap(MAGE, PRECISE_SHOT)).toEqual({
      attribute: 'DEXTERITY',
      required: 13,
      current: 12,
    })
  })
})

describe('lockFor', () => {
  it('leaves a payable, unlocked skill open', () => {
    expect(lockFor(POWER_STRIKE, { spread: MAGE, chosen: [] })).toBeNull()
  })

  it('locks a skill the build cannot unlock, naming the gap', () => {
    expect(lockFor(PRECISE_SHOT, { spread: MAGE, chosen: [] })).toEqual({
      kind: 'requirement',
      attribute: 'DEXTERITY',
      required: 13,
      current: 12,
    })
  })

  it('locks a skill that is already in the kit', () => {
    expect(lockFor(POWER_STRIKE, { spread: MAGE, chosen: [POWER_STRIKE] })).toEqual({
      kind: 'duplicate',
    })
  })

  it('locks a type whose slots are already full', () => {
    const chosen = [POWER_STRIKE, FIREBALL]

    expect(lockFor(MIND_SPIKE, { spread: MAGE, chosen })).toEqual({
      kind: 'slots',
      type: 'ACTION',
    })
  })

  it('leaves the other type open when one type fills up', () => {
    const chosen = [POWER_STRIKE, FIREBALL]

    expect(lockFor(PARRY, { spread: MAGE, chosen })).toBeNull()
  })

  it('locks a skill the remaining budget cannot pay', () => {
    const chosen = [MIND_SPIKE, BRACE, PARRY]

    expect(lockFor(FIREBALL, { spread: MAGE, chosen })).toEqual({
      kind: 'budget',
      cost: 5,
      remaining: 4,
    })
  })

  it('leaves a skill open when the budget covers it exactly', () => {
    const chosen = [MIND_SPIKE, BRACE, PARRY]

    expect(lockFor(POWER_STRIKE, { spread: MAGE, chosen })).toBeNull()
  })

  it('reports the requirement before the full slots, because the gap outlives the kit', () => {
    const chosen = [POWER_STRIKE, FIREBALL]

    expect(lockFor(PRECISE_SHOT, { spread: MAGE, chosen })).toEqual({
      kind: 'requirement',
      attribute: 'DEXTERITY',
      required: 13,
      current: 12,
    })
  })

  it('reports the duplicate before anything else', () => {
    const chosen = [PRECISE_SHOT, POWER_STRIKE]

    expect(lockFor(PRECISE_SHOT, { spread: MAGE, chosen })).toEqual({ kind: 'duplicate' })
  })
})

function skill(
  code: string,
  type: SkillRules['type'],
  cost: number,
  requiredAttribute: SkillRules['requiredAttribute'],
  requiredValue: number,
): SkillRules {
  return { code, type, cost, requiredAttribute, requiredValue }
}

function assertSpread(input: AttributeSpreadInput) {
  const spread = toAttributeSpread(input)

  if (spread === null) {
    throw new Error('the fixture spread is out of range')
  }

  return spread
}
