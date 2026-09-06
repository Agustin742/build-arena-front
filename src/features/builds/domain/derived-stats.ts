import { modifier } from './attribute-cost'
import { type AttributeSpread } from './types'

export interface DerivedStats {
  armorClass: number
  maxHp: number
}

const ARMOR_CLASS_BASE = 10
const MAX_HP_BASE = 30
const HP_PER_CONSTITUTION_POINT = 5

/**
 * An estimate, not a fact. The server computes these when it freezes the build for a
 * battle; the wizard shows them so the player can compare two spreads before saving.
 * Initiative is not here because it is a die roll, not a formula.
 */
export function estimateDerivedStats(spread: AttributeSpread): DerivedStats {
  return {
    armorClass: ARMOR_CLASS_BASE + modifier(spread.dexterity),
    maxHp: MAX_HP_BASE + modifier(spread.constitution) * HP_PER_CONSTITUTION_POINT,
  }
}
