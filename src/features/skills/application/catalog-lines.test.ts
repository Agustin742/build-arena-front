import { describe, expect, it } from 'vitest'

import { type PublicSkill, type SkillCatalog } from '@/shared/contracts'

import { catalogLines } from './catalog-lines'

const POWER_STRIKE = entry({
  code: 'POWER_STRIKE',
  type: 'ACTION',
  cost: 4,
  requiredAttribute: 'STRENGTH',
  requiredValue: 12,
  damageDice: '1d8',
})

const VENOM_BOLT = entry({
  code: 'VENOM_BOLT',
  type: 'ACTION',
  cost: 4,
  requiredAttribute: 'MAGIC',
  requiredValue: 11,
  damageDice: '1d4',
  appliesCondition: 'POISONED',
  conditionRounds: 3,
})

const BRACE = entry({
  code: 'BRACE',
  type: 'REACTION',
  cost: 3,
  requiredAttribute: 'CONSTITUTION',
  requiredValue: 12,
})

describe('catalogLines', () => {
  it('splits the catalog into actions and reactions, actions first', () => {
    const lines = catalogLines([BRACE, POWER_STRIKE])

    expect(lines[0]).toBe('ACCIONES')
    expect(lines.indexOf('REACCIONES')).toBeGreaterThan(lines.indexOf('ACCIONES'))
  })

  it('gives a skill its cost, its requirement and its damage', () => {
    const [, line] = catalogLines([POWER_STRIKE])

    expect(line).toMatch(/POWER_STRIKE/)
    expect(line).toMatch(/4pts/)
    expect(line).toMatch(/STRENGTH 12/)
    expect(line).toMatch(/1d8/)
  })

  it('names the condition a skill applies and how long it lasts', () => {
    const [, line] = catalogLines([VENOM_BOLT])

    expect(line).toMatch(/POISONED 3 rondas/)
  })

  it('says one round in the singular', () => {
    const spike = entry({
      code: 'MIND_SPIKE',
      type: 'ACTION',
      cost: 7,
      requiredAttribute: 'MAGIC',
      requiredValue: 14,
      damageDice: '1d10',
      appliesCondition: 'STUNNED',
      conditionRounds: 1,
    })

    expect(catalogLines([spike])[1]).toMatch(/STUNNED 1 ronda\b/)
  })

  it('leaves a reaction that deals no damage without a damage column', () => {
    const [, line] = catalogLines([BRACE])

    expect(line).toMatch(/CONSTITUTION 12/)
    expect(line).not.toMatch(/\dd\d/)
  })

  it('lines the codes up in a column', () => {
    const [, first, second] = catalogLines([POWER_STRIKE, VENOM_BOLT])

    expect(first?.indexOf('4pts')).toBe(second?.indexOf('4pts'))
  })

  it('drops a heading nobody fills', () => {
    expect(catalogLines([POWER_STRIKE])).not.toContain('REACCIONES')
  })

  it('says nothing about an empty catalog', () => {
    expect(catalogLines([])).toEqual([])
  })
})

function entry(overrides: Partial<PublicSkill> & Pick<PublicSkill, 'code'>): SkillCatalog[number] {
  return {
    name: overrides.code,
    description: 'una habilidad del catálogo',
    type: 'ACTION',
    cost: 4,
    requiredAttribute: 'STRENGTH',
    requiredValue: 12,
    damageDice: null,
    appliesCondition: null,
    conditionRounds: null,
    ...overrides,
  }
}
