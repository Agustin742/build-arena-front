import { describe, expect, it } from 'vitest'

import { type PublicBuild, type PublicSkill } from '@/shared/contracts'

import { buildDetailLines, buildListLines } from './build-lines'

const POWER_STRIKE = skill('POWER_STRIKE', 'ACTION', 4, 'STRENGTH', 12, '1d8')
const FIREBALL = skill('FIREBALL', 'ACTION', 5, 'MAGIC', 12, '1d12')
const BRACE = skill('BRACE', 'REACTION', 3, 'CONSTITUTION', 12, null)
const PARRY = skill('PARRY', 'REACTION', 4, 'STRENGTH', 12, null)
const DODGE = skill('DODGE', 'REACTION', 4, 'DEXTERITY', 12, null)

const MAGE = build({
  name: 'Duelista híbrido',
  strength: 12,
  magic: 14,
  dexterity: 12,
  constitution: 12,
  skills: [POWER_STRIKE, FIREBALL, BRACE, PARRY],
})

describe('buildListLines', () => {
  it('says so plainly when the player has no builds yet', () => {
    expect(buildListLines([])).toEqual(['Todavía no armaste ninguna build'])
  })

  it('numbers the builds, so nobody has to type a uuid', () => {
    const lines = buildListLines([MAGE, build({ name: 'Bruto', id: 'b2' })])

    expect(lines[0]).toMatch(/^ 1\)/)
    expect(lines[1]).toMatch(/^ 2\)/)
  })

  it('names each build and previews what it walks into the arena with', () => {
    const [line] = buildListLines([MAGE])

    expect(line).toMatch(/Duelista híbrido/)
    expect(line).toMatch(/CA 11/)
    expect(line).toMatch(/35 PV/)
    expect(line).toMatch(/kit 16\/18/)
  })

  it('lines the columns up across builds of different name lengths', () => {
    const [first, second] = buildListLines([MAGE, build({ name: 'Ok', id: 'b2' })])

    expect(first?.indexOf('CA ')).toBe(second?.indexOf('CA '))
  })

  it('does not choke on a build the arena sent outside the legal range', () => {
    const broken = build({ name: 'Raro', strength: 99 })

    expect(buildListLines([broken])[0]).toMatch(/Raro/)
  })
})

describe('buildDetailLines', () => {
  it('opens with the four attributes and what each one buys', () => {
    const lines = buildDetailLines(MAGE).join('\n')

    expect(lines).toMatch(/Fuerza\s+12\s+mod \+1/)
    expect(lines).toMatch(/Magia\s+14\s+mod \+2/)
  })

  it('shows what the spread cost and what was left over', () => {
    expect(buildDetailLines(MAGE).join('\n')).toMatch(/19\/20 puntos/)
  })

  it('shows the derived stats it can only estimate', () => {
    const lines = buildDetailLines(MAGE).join('\n')

    expect(lines).toMatch(/CA 11/)
    expect(lines).toMatch(/35 PV/)
  })

  it('lists the kit by name, split into actions and reactions', () => {
    const lines = buildDetailLines(MAGE)

    expect(lines).toContain('ACCIONES')
    expect(lines).toContain('REACCIONES')
    expect(lines.join('\n')).toMatch(/Golpe potente/)
    expect(lines.join('\n')).toMatch(/Aguantar/)
  })

  it('says what the kit cost', () => {
    expect(buildDetailLines(MAGE).join('\n')).toMatch(/16\/18 puntos/)
  })

  it('warns about a build with no answer to magic', () => {
    const brittle = build({ ...MAGE, skills: [POWER_STRIKE, FIREBALL, PARRY, DODGE] })

    expect(buildDetailLines(brittle).join('\n')).toMatch(/solo responden a ataques físicos/)
  })

  it('says nothing extra about a build that spends well', () => {
    expect(buildDetailLines(MAGE).join('\n')).not.toMatch(/puntos tirados/)
  })

  it('reports the spread it cannot read instead of pretending it can', () => {
    const broken = build({ ...MAGE, strength: 99 })

    expect(buildDetailLines(broken).join('\n')).toMatch(/no entiende/)
  })
})

function skill(
  code: string,
  type: PublicSkill['type'],
  cost: number,
  requiredAttribute: PublicSkill['requiredAttribute'],
  requiredValue: number,
  damageDice: string | null,
): PublicSkill {
  return {
    code,
    name: code,
    description: 'una habilidad',
    type,
    cost,
    requiredAttribute,
    requiredValue,
    damageDice,
    appliesCondition: null,
    conditionRounds: null,
  }
}

function build(overrides: Partial<PublicBuild>): PublicBuild {
  return {
    id: '7c3f1a92-8d4e-4b6a-9f21-0e5d8c7b6a34',
    name: 'Una build',
    strength: 12,
    magic: 12,
    dexterity: 12,
    constitution: 12,
    skills: [],
    createdAt: '2026-09-06T10:15:00.000Z',
    updatedAt: '2026-09-06T10:15:00.000Z',
    ...overrides,
  }
}
