import { describe, expect, it } from 'vitest'

import {
  ATTRIBUTE_BASE,
  ATTRIBUTE_BUDGET,
  ATTRIBUTE_COST,
  ATTRIBUTE_MAX,
  attributeCost,
  baseSpread,
  isAttributeValue,
  modifier,
  remainingPoints,
  spreadCost,
  toAttributeSpread,
} from './attribute-cost'
import { type AttributeSpreadInput } from './types'

describe('ATTRIBUTE_COST', () => {
  it('matches the accelerated table of the arena', () => {
    expect(ATTRIBUTE_COST).toEqual({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 })
  })

  it('declares the base, the ceiling and the budget', () => {
    expect({ ATTRIBUTE_BASE, ATTRIBUTE_MAX, ATTRIBUTE_BUDGET }).toEqual({
      ATTRIBUTE_BASE: 8,
      ATTRIBUTE_MAX: 15,
      ATTRIBUTE_BUDGET: 20,
    })
  })
})

describe('attributeCost', () => {
  it('charges nothing for the base value', () => {
    expect(attributeCost(8)).toBe(0)
  })

  it('charges one point per step up to 13', () => {
    expect([9, 10, 11, 12, 13].map(assertValue).map(attributeCost)).toEqual([1, 2, 3, 4, 5])
  })

  it('accelerates on the last two steps', () => {
    expect(attributeCost(14)).toBe(7)
    expect(attributeCost(15)).toBe(9)
  })
})

describe('modifier', () => {
  it('follows floor((value - 10) / 2)', () => {
    const values = [8, 9, 10, 11, 12, 13, 14, 15].map(assertValue)

    expect(values.map(modifier)).toEqual([-1, -1, 0, 0, 1, 1, 2, 2])
  })

  it('gives 14 and 15 the same modifier', () => {
    expect(modifier(15)).toBe(modifier(14))
  })
})

describe('isAttributeValue', () => {
  it('accepts every value inside 8..15', () => {
    expect([8, 9, 10, 11, 12, 13, 14, 15].every(isAttributeValue)).toBe(true)
  })

  it('rejects values outside the range', () => {
    expect([7, 16, 0, -3, 100].some(isAttributeValue)).toBe(false)
  })

  it('rejects fractional values', () => {
    expect(isAttributeValue(12.5)).toBe(false)
  })
})

describe('toAttributeSpread', () => {
  it('accepts a spread whose four attributes are inside the range', () => {
    expect(toAttributeSpread({ strength: 14, magic: 8, dexterity: 12, constitution: 10 })).toEqual({
      strength: 14,
      magic: 8,
      dexterity: 12,
      constitution: 10,
    })
  })

  it('returns null when any attribute falls outside the range', () => {
    expect(
      toAttributeSpread({ strength: 16, magic: 8, dexterity: 12, constitution: 10 }),
    ).toBeNull()
  })
})

describe('baseSpread', () => {
  it('starts the four attributes at the base value', () => {
    expect(baseSpread()).toEqual({ strength: 8, magic: 8, dexterity: 8, constitution: 8 })
  })

  it('costs nothing and leaves the whole budget', () => {
    expect(spreadCost(baseSpread())).toBe(0)
    expect(remainingPoints(baseSpread())).toBe(ATTRIBUTE_BUDGET)
  })
})

describe('spreadCost', () => {
  it('adds up the cost of the four attributes', () => {
    const spread = assertSpread({ strength: 14, magic: 8, dexterity: 12, constitution: 13 })

    expect(spreadCost(spread)).toBe(7 + 0 + 4 + 5)
  })

  it('costs 18 for the 14/13/12/10 spread of the guide', () => {
    const spread = assertSpread({ strength: 14, magic: 13, dexterity: 12, constitution: 10 })

    expect(spreadCost(spread)).toBe(18)
  })
})

describe('remainingPoints', () => {
  it('leaves 2 points on the 14/13/12/10 spread of the guide', () => {
    const spread = assertSpread({ strength: 14, magic: 13, dexterity: 12, constitution: 10 })

    expect(remainingPoints(spread)).toBe(2)
  })

  it('goes negative when the spread overspends the budget', () => {
    const spread = assertSpread({ strength: 15, magic: 15, dexterity: 15, constitution: 8 })

    expect(remainingPoints(spread)).toBe(ATTRIBUTE_BUDGET - 27)
  })
})

function assertValue(value: number) {
  if (!isAttributeValue(value)) {
    throw new Error(`${String(value)} is not an attribute value`)
  }

  return value
}

function assertSpread(input: AttributeSpreadInput) {
  const spread = toAttributeSpread(input)

  if (spread === null) {
    throw new Error('the fixture spread is out of range')
  }

  return spread
}
