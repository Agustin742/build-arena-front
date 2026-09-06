import {
  ATTRIBUTE_KEYS,
  type AttributeSpread,
  type AttributeSpreadInput,
  type AttributeValue,
} from './types'

export const ATTRIBUTE_BASE = 8
export const ATTRIBUTE_MAX = 15
export const ATTRIBUTE_BUDGET = 20

/**
 * Cumulative cost of raising one attribute from the base to a given value. The last
 * two steps cost double: the arena makes the ceiling expensive on purpose.
 */
export const ATTRIBUTE_COST: Readonly<Record<AttributeValue, number>> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
}

export function isAttributeValue(value: number): value is AttributeValue {
  return Number.isInteger(value) && value >= ATTRIBUTE_BASE && value <= ATTRIBUTE_MAX
}

export function attributeCost(value: AttributeValue): number {
  return ATTRIBUTE_COST[value]
}

/** The modifier combat uses. 14 and 15 land on the same one. */
export function modifier(value: AttributeValue): number {
  return Math.floor((value - 10) / 2)
}

export function baseSpread(): AttributeSpread {
  return {
    strength: ATTRIBUTE_BASE,
    magic: ATTRIBUTE_BASE,
    dexterity: ATTRIBUTE_BASE,
    constitution: ATTRIBUTE_BASE,
  }
}

/** The single door into the domain: raw numbers become a spread, or nothing at all. */
export function toAttributeSpread(input: AttributeSpreadInput): AttributeSpread | null {
  const spread: Partial<Record<keyof AttributeSpread, AttributeValue>> = {}

  for (const key of ATTRIBUTE_KEYS) {
    const value = input[key]

    if (!isAttributeValue(value)) {
      return null
    }

    spread[key] = value
  }

  return spread as AttributeSpread
}

export function spreadCost(spread: AttributeSpread): number {
  return ATTRIBUTE_KEYS.reduce((total, key) => total + attributeCost(spread[key]), 0)
}

export function remainingPoints(spread: AttributeSpread): number {
  return ATTRIBUTE_BUDGET - spreadCost(spread)
}
