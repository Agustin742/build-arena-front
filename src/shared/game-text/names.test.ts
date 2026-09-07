import { describe, expect, it } from 'vitest'

import { SKILL_CODES } from '@/shared/contracts'

import { ATTRIBUTE_NAME, CONDITION_NAME, SKILL_NAME, SKILL_TYPE_NAME, skillName } from './names'

describe('SKILL_NAME', () => {
  it('names every skill the arena seeds, and no more', () => {
    expect(Object.keys(SKILL_NAME).sort()).toEqual([...SKILL_CODES].sort())
  })

  it('gives each skill a name of its own', () => {
    expect(new Set(Object.values(SKILL_NAME)).size).toBe(SKILL_CODES.length)
  })

  it('translates the codes the guide uses in its examples', () => {
    expect(SKILL_NAME.POWER_STRIKE).toBe('Golpe potente')
    expect(SKILL_NAME.FIREBALL).toBe('Bola de fuego')
    expect(SKILL_NAME.PARRY).toBe('Parada')
  })

  it('keeps the two counterattacks apart, they are different reactions', () => {
    expect(SKILL_NAME.COUNTER).not.toBe(SKILL_NAME.RIPOSTE)
  })
})

describe('skillName', () => {
  it('resolves a code the catalog carries', () => {
    expect(skillName('VENOM_BOLT')).toBe('Dardo venenoso')
  })

  it('falls back to the raw code the arena sent when it knows no better', () => {
    expect(skillName('SOUL_DRAIN')).toBe('SOUL_DRAIN')
  })
})

describe('ATTRIBUTE_NAME', () => {
  it('names the four attributes', () => {
    expect(ATTRIBUTE_NAME).toEqual({
      STRENGTH: 'Fuerza',
      MAGIC: 'Magia',
      DEXTERITY: 'Destreza',
      CONSTITUTION: 'Constitución',
    })
  })
})

describe('CONDITION_NAME', () => {
  it('names the three conditions a skill can leave behind', () => {
    expect(CONDITION_NAME).toEqual({
      POISONED: 'Envenenado',
      STUNNED: 'Aturdido',
      WEAKENED: 'Debilitado',
    })
  })
})

describe('SKILL_TYPE_NAME', () => {
  it('names what a skill is used for', () => {
    expect(SKILL_TYPE_NAME).toEqual({ ACTION: 'Acción', REACTION: 'Reacción' })
  })
})
