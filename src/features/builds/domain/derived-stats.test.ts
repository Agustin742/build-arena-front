import { describe, expect, it } from 'vitest'

import { baseSpread, toAttributeSpread } from './attribute-cost'
import { estimateDerivedStats } from './derived-stats'
import { type AttributeSpreadInput } from './types'

describe('estimateDerivedStats', () => {
  it('derives armour class from dexterity and hit points from constitution', () => {
    const stats = estimateDerivedStats(
      assertSpread({ strength: 8, magic: 8, dexterity: 14, constitution: 12 }),
    )

    expect(stats).toEqual({ armorClass: 12, maxHp: 35 })
  })

  it('drops below the floor when both attributes stay at the base', () => {
    expect(estimateDerivedStats(baseSpread())).toEqual({ armorClass: 9, maxHp: 25 })
  })

  it('ignores strength and magic', () => {
    const agile = assertSpread({ strength: 8, magic: 8, dexterity: 12, constitution: 12 })
    const brute = assertSpread({ strength: 15, magic: 15, dexterity: 12, constitution: 12 })

    expect(estimateDerivedStats(brute)).toEqual(estimateDerivedStats(agile))
  })

  it('gives 14 and 15 the same estimate', () => {
    const fourteen = assertSpread({ strength: 8, magic: 8, dexterity: 14, constitution: 14 })
    const fifteen = assertSpread({ strength: 8, magic: 8, dexterity: 15, constitution: 15 })

    expect(estimateDerivedStats(fifteen)).toEqual(estimateDerivedStats(fourteen))
  })
})

function assertSpread(input: AttributeSpreadInput) {
  const spread = toAttributeSpread(input)

  if (spread === null) {
    throw new Error('the fixture spread is out of range')
  }

  return spread
}
