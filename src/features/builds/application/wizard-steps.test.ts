import { describe, expect, it } from 'vitest'

import { type ParsedArgs } from '@/shared/commands'
import { type PublicSkill, type SkillCatalog } from '@/shared/contracts'

import {
  ATTRIBUTE_STEP_LABEL,
  attributeOptions,
  chosenSkills,
  KIT_STEPS,
  skillOptions,
  spreadFrom,
} from './wizard-steps'

const CATALOG: SkillCatalog = [
  skill({ code: 'POWER_STRIKE', cost: 4, requiredAttribute: 'STRENGTH', requiredValue: 12 }),
  skill({ code: 'RECKLESS_BLOW', cost: 5, requiredAttribute: 'STRENGTH', requiredValue: 14 }),
  skill({ code: 'PRECISE_SHOT', cost: 4, requiredAttribute: 'DEXTERITY', requiredValue: 13 }),
  skill({ code: 'FIREBALL', cost: 5, requiredAttribute: 'MAGIC', requiredValue: 12 }),
  skill({
    code: 'VENOM_BOLT',
    cost: 4,
    requiredAttribute: 'MAGIC',
    requiredValue: 11,
    damageDice: '1d4',
    appliesCondition: 'POISONED',
    conditionRounds: 3,
  }),
  skill({
    code: 'BRACE',
    type: 'REACTION',
    cost: 3,
    requiredAttribute: 'CONSTITUTION',
    requiredValue: 12,
    damageDice: null,
  }),
  skill({
    code: 'PARRY',
    type: 'REACTION',
    cost: 4,
    requiredAttribute: 'STRENGTH',
    requiredValue: 12,
    damageDice: null,
  }),
  skill({
    code: 'RIPOSTE',
    type: 'REACTION',
    cost: 7,
    requiredAttribute: 'DEXTERITY',
    requiredValue: 14,
    damageDice: '1d8',
  }),
]

/** Costs 19 of the 20 points: strength 12, magic 14, dexterity 12, constitution 12. */
const MAGE: ParsedArgs = { strength: '12', magic: '14', dexterity: '12', constitution: '12' }

describe('ATTRIBUTE_STEP_LABEL', () => {
  it('names the four attributes for the prompt', () => {
    expect(ATTRIBUTE_STEP_LABEL).toEqual({
      strength: 'Fuerza',
      magic: 'Magia',
      dexterity: 'Destreza',
      constitution: 'Constitución',
    })
  })
})

describe('KIT_STEPS', () => {
  it('asks for two actions and then two reactions', () => {
    expect(KIT_STEPS.map((step) => step.type)).toEqual(['ACTION', 'ACTION', 'REACTION', 'REACTION'])
  })

  it('gives every step a name of its own', () => {
    expect(new Set(KIT_STEPS.map((step) => step.name)).size).toBe(KIT_STEPS.length)
  })
})

describe('attributeOptions', () => {
  it('offers every value from the base to the ceiling', () => {
    const options = attributeOptions({}, 'strength')

    expect(options.map((option) => option.id)).toEqual([
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
    ])
  })

  it('lets the player type the value itself', () => {
    const options = attributeOptions({}, 'strength')

    expect(options.map((option) => option.key)).toEqual(options.map((option) => option.id))
  })

  it('shows what each value costs and what would be left', () => {
    const [base] = attributeOptions({}, 'strength')

    expect(base?.hint).toBe('mod -1 · costo 0 · restan 20')
  })

  it('charges the accelerated price at the top of the table', () => {
    const options = attributeOptions({}, 'strength')

    expect(options.at(-2)?.hint).toBe('mod +2 · costo 7 · restan 13')
  })

  it('shows the modifier every value buys, so the flat top of the table is visible', () => {
    const options = attributeOptions({}, 'strength')

    expect(options.map((option) => option.hint?.slice(0, 6))).toEqual([
      'mod -1',
      'mod -1',
      'mod +0',
      'mod +0',
      'mod +1',
      'mod +1',
      'mod +2',
      'mod +2',
    ])
  })

  it('gives 14 and 15 the same modifier, which is the whole warning', () => {
    const options = attributeOptions({}, 'strength')
    const [fourteen, fifteen] = options.slice(-2)

    expect(fourteen?.hint?.startsWith('mod +2')).toBe(true)
    expect(fifteen?.hint?.startsWith('mod +2')).toBe(true)
  })

  it('discounts what the earlier attributes already spent', () => {
    const [base] = attributeOptions({ strength: '14' }, 'magic')

    expect(base?.hint).toBe('mod -1 · costo 0 · restan 13')
  })

  it('ignores what this same attribute held before, so a step can be replayed', () => {
    const [base] = attributeOptions({ strength: '15', magic: '8' }, 'strength')

    expect(base?.hint).toBe('mod -1 · costo 0 · restan 20')
  })

  it('locks a value the remaining budget cannot pay, and says by how much', () => {
    const options = attributeOptions({ strength: '14', magic: '13' }, 'dexterity')

    expect(options.at(-1)).toMatchObject({ id: '15', lockedReason: 'te faltan 1 punto' })
  })

  it('leaves a value the budget covers exactly wide open', () => {
    const options = attributeOptions({ strength: '14', magic: '13' }, 'dexterity')

    expect(options.find((option) => option.id === '14')?.lockedReason).toBeUndefined()
  })

  it('says the plural when more than one point is missing', () => {
    const options = attributeOptions({ strength: '14', magic: '14' }, 'dexterity')

    expect(options.at(-1)?.lockedReason).toBe('te faltan 3 puntos')
  })
})

describe('spreadFrom', () => {
  it('reads the four attributes the player answered', () => {
    expect(spreadFrom(MAGE)).toEqual({
      strength: 12,
      magic: 14,
      dexterity: 12,
      constitution: 12,
    })
  })

  it('reports nothing while an attribute is still missing', () => {
    expect(spreadFrom({ strength: '12', magic: '14' })).toBeNull()
  })

  it('reports nothing when an answer is not a legal value', () => {
    expect(spreadFrom({ ...MAGE, strength: '20' })).toBeNull()
  })
})

describe('chosenSkills', () => {
  it('resolves the codes the player picked into catalog entries', () => {
    const picked = chosenSkills(CATALOG, { ...MAGE, action1: 'FIREBALL', reaction1: 'BRACE' })

    expect(picked.map((entry) => entry.code)).toEqual(['FIREBALL', 'BRACE'])
  })

  it('resolves nothing before the kit starts', () => {
    expect(chosenSkills(CATALOG, MAGE)).toEqual([])
  })

  it('drops a code the catalog does not carry', () => {
    expect(chosenSkills(CATALOG, { ...MAGE, action1: 'CHARM' })).toEqual([])
  })
})

describe('skillOptions', () => {
  it('offers only the skills of the type the step asks for', () => {
    const options = skillOptions(CATALOG, MAGE, 'REACTION')

    expect(options.map((option) => option.id)).toEqual(['BRACE', 'PARRY', 'RIPOSTE'])
    expect(options.map((option) => option.label)).toEqual(['Aguantar', 'Parada', 'Riposta'])
  })

  it('shows what a skill costs and what it rolls', () => {
    const options = skillOptions(CATALOG, MAGE, 'ACTION')

    expect(options.find((option) => option.id === 'FIREBALL')?.hint).toBe('5pts · 1d8')
  })

  it('names the condition a skill leaves behind', () => {
    const options = skillOptions(CATALOG, MAGE, 'ACTION')

    expect(options.find((option) => option.id === 'VENOM_BOLT')?.hint).toBe(
      '4pts · 1d4 · Envenenado 3 rondas',
    )
  })

  it('leaves the damage out of a reaction that deals none', () => {
    const options = skillOptions(CATALOG, MAGE, 'REACTION')

    expect(options.find((option) => option.id === 'BRACE')?.hint).toBe('3pts')
  })

  it('shows a skill the build cannot unlock, with the gap that locks it', () => {
    const options = skillOptions(CATALOG, MAGE, 'ACTION')

    expect(options.find((option) => option.id === 'PRECISE_SHOT')?.lockedReason).toBe(
      'necesita Destreza 13, tenés 12',
    )
  })

  it('leaves a skill the build unlocks wide open', () => {
    const options = skillOptions(CATALOG, MAGE, 'ACTION')

    expect(options.find((option) => option.id === 'FIREBALL')?.lockedReason).toBeUndefined()
  })

  it('locks a skill that is already in the kit', () => {
    const options = skillOptions(CATALOG, { ...MAGE, action1: 'FIREBALL' }, 'ACTION')

    expect(options.find((option) => option.id === 'FIREBALL')?.lockedReason).toBe(
      'ya está en tu kit',
    )
  })

  it('locks what the remaining kit points cannot pay', () => {
    const spent = { ...MAGE, action1: 'FIREBALL', reaction1: 'RIPOSTE', reaction2: 'PARRY' }
    const options = skillOptions(CATALOG, spent, 'ACTION')

    expect(options.find((option) => option.id === 'VENOM_BOLT')?.lockedReason).toBe(
      'cuesta 4 y te quedan 2 puntos',
    )
  })

  it('locks everything once the type has no slot left', () => {
    const full = { ...MAGE, action1: 'POWER_STRIKE', action2: 'FIREBALL' }
    const options = skillOptions(CATALOG, full, 'ACTION')

    expect(options.find((option) => option.id === 'VENOM_BOLT')?.lockedReason).toBe(
      'ya elegiste tus 2 acciones',
    )
  })

  it('locks everything when the attributes are not answered yet', () => {
    const options = skillOptions(CATALOG, {}, 'ACTION')

    expect(options.every((option) => option.lockedReason !== undefined)).toBe(true)
  })
})

function skill(overrides: Partial<PublicSkill> & Pick<PublicSkill, 'code'>): PublicSkill {
  return {
    name: overrides.code,
    description: 'una habilidad del catálogo',
    type: 'ACTION',
    cost: 4,
    requiredAttribute: 'STRENGTH',
    requiredValue: 12,
    damageDice: '1d8',
    appliesCondition: null,
    conditionRounds: null,
    ...overrides,
  }
}
