import { describe, expect, it } from 'vitest'

import { adviceMessage, lockMessage } from './build-messages'

describe('lockMessage', () => {
  it('names the attribute a skill asks for and what the build has', () => {
    expect(
      lockMessage({ kind: 'requirement', attribute: 'DEXTERITY', required: 13, current: 12 }),
    ).toBe('necesita Destreza 13, tenés 12')
  })

  it('says how short the build is when the gap is wide', () => {
    expect(lockMessage({ kind: 'requirement', attribute: 'MAGIC', required: 14, current: 8 })).toBe(
      'necesita Magia 14, tenés 8',
    )
  })

  it('says what a skill costs and what is left when the kit runs out of points', () => {
    expect(lockMessage({ kind: 'budget', cost: 5, remaining: 2 })).toBe(
      'cuesta 5 y te quedan 2 puntos',
    )
  })

  it('says the kit has no points left at all', () => {
    expect(lockMessage({ kind: 'budget', cost: 5, remaining: 0 })).toBe(
      'cuesta 5 y no te quedan puntos',
    )
  })

  it('names the slots that filled up, by type', () => {
    expect(lockMessage({ kind: 'slots', type: 'ACTION' })).toBe('ya elegiste tus 2 acciones')
    expect(lockMessage({ kind: 'slots', type: 'REACTION' })).toBe('ya elegiste tus 2 reacciones')
  })

  it('says a skill is already in the kit', () => {
    expect(lockMessage({ kind: 'duplicate' })).toBe('ya está en tu kit')
  })
})

describe('adviceMessage', () => {
  it('explains that the ceiling buys nothing', () => {
    expect(adviceMessage({ kind: 'wasted-ceiling', attribute: 'strength' })).toBe(
      'Fuerza en 15 da el mismo +2 que en 14, y ninguna habilidad pide más de 14: son 2 puntos tirados',
    )
  })

  it('names the attribute that was pushed', () => {
    expect(adviceMessage({ kind: 'wasted-ceiling', attribute: 'constitution' })).toMatch(
      /^Constitución/,
    )
  })

  it('warns that the build eats every spell whole', () => {
    expect(adviceMessage({ kind: 'no-magic-answer' })).toBe(
      'Tus dos reacciones solo responden a ataques físicos: contra magia comés el hechizo entero',
    )
  })
})
