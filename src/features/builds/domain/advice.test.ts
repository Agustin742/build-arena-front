import { describe, expect, it } from 'vitest'

import { adviseBuild, adviseKit, adviseSpread, PHYSICAL_ONLY_REACTIONS } from './advice'
import { toAttributeSpread } from './attribute-cost'
import { type AttributeSpreadInput, type SkillRules } from './types'

const POWER_STRIKE = skill('POWER_STRIKE', 'ACTION')
const FIREBALL = skill('FIREBALL', 'ACTION')
const PARRY = skill('PARRY', 'REACTION')
const DODGE = skill('DODGE', 'REACTION')
const RIPOSTE = skill('RIPOSTE', 'REACTION')
const BRACE = skill('BRACE', 'REACTION')
const COUNTER = skill('COUNTER', 'REACTION')
const ARCANE_WARD = skill('ARCANE_WARD', 'REACTION')

describe('PHYSICAL_ONLY_REACTIONS', () => {
  it('lists the three reactions that never answer a spell', () => {
    expect([...PHYSICAL_ONLY_REACTIONS].sort()).toEqual(['DODGE', 'PARRY', 'RIPOSTE'])
  })
})

describe('adviseSpread', () => {
  it('says nothing about a spread that stops at 14', () => {
    expect(
      adviseSpread(assertSpread({ strength: 14, magic: 8, dexterity: 12, constitution: 12 })),
    ).toEqual([])
  })

  it('flags an attribute pushed to the ceiling', () => {
    expect(
      adviseSpread(assertSpread({ strength: 15, magic: 8, dexterity: 8, constitution: 12 })),
    ).toEqual([{ kind: 'wasted-ceiling', attribute: 'strength' }])
  })

  it('flags every attribute at the ceiling, in spread order', () => {
    expect(
      adviseSpread(assertSpread({ strength: 15, magic: 8, dexterity: 15, constitution: 8 })),
    ).toEqual([
      { kind: 'wasted-ceiling', attribute: 'strength' },
      { kind: 'wasted-ceiling', attribute: 'dexterity' },
    ])
  })
})

describe('adviseKit', () => {
  it('says nothing while the reactions are still being picked', () => {
    expect(adviseKit([POWER_STRIKE, FIREBALL, PARRY])).toEqual([])
  })

  it('warns when both reactions only answer a physical attack', () => {
    expect(adviseKit([POWER_STRIKE, FIREBALL, PARRY, DODGE])).toEqual([{ kind: 'no-magic-answer' }])
  })

  it('warns for any pair drawn from the physical-only reactions', () => {
    expect(adviseKit([PARRY, RIPOSTE])).toEqual([{ kind: 'no-magic-answer' }])
  })

  it('stays quiet when one reaction answers anything', () => {
    expect(adviseKit([PARRY, BRACE])).toEqual([])
    expect(adviseKit([DODGE, COUNTER])).toEqual([])
  })

  it('stays quiet when a reaction answers magic', () => {
    expect(adviseKit([PARRY, ARCANE_WARD])).toEqual([])
  })
})

describe('adviseBuild', () => {
  it('gathers the advice of the spread and of the kit', () => {
    const spread = assertSpread({ strength: 15, magic: 8, dexterity: 12, constitution: 12 })

    expect(adviseBuild(spread, [POWER_STRIKE, FIREBALL, PARRY, DODGE])).toEqual([
      { kind: 'wasted-ceiling', attribute: 'strength' },
      { kind: 'no-magic-answer' },
    ])
  })

  it('says nothing about a build that spends well and answers magic', () => {
    const spread = assertSpread({ strength: 14, magic: 8, dexterity: 12, constitution: 12 })

    expect(adviseBuild(spread, [POWER_STRIKE, FIREBALL, PARRY, BRACE])).toEqual([])
  })
})

function skill(code: string, type: SkillRules['type']): SkillRules {
  return { code, type, cost: 4, requiredAttribute: 'STRENGTH', requiredValue: 8 }
}

function assertSpread(input: AttributeSpreadInput) {
  const spread = toAttributeSpread(input)

  if (spread === null) {
    throw new Error('the fixture spread is out of range')
  }

  return spread
}
