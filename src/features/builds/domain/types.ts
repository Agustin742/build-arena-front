/**
 * The domain imports nothing from the project, so it restates the few literals it shares
 * with the wire contract instead of importing them. Nothing is adapted at runtime: a
 * `PublicSkill` is structurally assignable to `SkillRules`, and if the contract ever
 * drifts, the call site in `application/` stops compiling.
 */

/** The attribute a skill demands, spelled as the catalog spells it. */
export type AttributeName = 'STRENGTH' | 'MAGIC' | 'DEXTERITY' | 'CONSTITUTION'

/** The four attributes as they travel in the build payload. */
export type AttributeKey = 'strength' | 'magic' | 'dexterity' | 'constitution'

/** Every legal value an attribute can hold, from the base to the ceiling. */
export type AttributeValue = 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15

/** A spread whose four values are already known to be legal. */
export type AttributeSpread = Readonly<Record<AttributeKey, AttributeValue>>

/** A spread that has not been validated yet: raw numbers from the server or the prompt. */
export type AttributeSpreadInput = Readonly<Record<AttributeKey, number>>

export type SkillKind = 'ACTION' | 'REACTION'

/** What the rules need to know about a skill. The catalog carries more; this is enough. */
export interface SkillRules {
  code: string
  type: SkillKind
  cost: number
  requiredAttribute: AttributeName
  requiredValue: number
}

export const ATTRIBUTE_KEYS: readonly AttributeKey[] = [
  'strength',
  'magic',
  'dexterity',
  'constitution',
]

/** Maps the attribute a skill requires to the field that holds it in a spread. */
export const ATTRIBUTE_KEY_OF: Readonly<Record<AttributeName, AttributeKey>> = {
  STRENGTH: 'strength',
  MAGIC: 'magic',
  DEXTERITY: 'dexterity',
  CONSTITUTION: 'constitution',
}
