import {
  ATTRIBUTE_KEY_OF,
  type AttributeName,
  type AttributeSpread,
  type SkillKind,
  type SkillRules,
} from './types'

export const KIT_BUDGET = 18
export const ACTION_SLOTS = 2
export const REACTION_SLOTS = 2

export interface RequirementGap {
  attribute: AttributeName
  required: number
  current: number
}

/** Why a skill cannot be picked right now. The kit shows it instead of hiding the skill. */
export type SkillLock =
  | { kind: 'duplicate' }
  | ({ kind: 'requirement' } & RequirementGap)
  | { kind: 'slots'; type: SkillKind }
  | { kind: 'budget'; cost: number; remaining: number }

export interface KitState {
  spread: AttributeSpread
  chosen: readonly SkillRules[]
}

export function slotsFor(type: SkillKind): number {
  return type === 'ACTION' ? ACTION_SLOTS : REACTION_SLOTS
}

export function kitCost(chosen: readonly SkillRules[]): number {
  return chosen.reduce((total, skill) => total + skill.cost, 0)
}

export function remainingKitPoints(chosen: readonly SkillRules[]): number {
  return KIT_BUDGET - kitCost(chosen)
}

export function countByType(chosen: readonly SkillRules[], type: SkillKind): number {
  return chosen.filter((skill) => skill.type === type).length
}

export function isKitComplete(chosen: readonly SkillRules[]): boolean {
  return (['ACTION', 'REACTION'] as const).every(
    (type) => countByType(chosen, type) === slotsFor(type),
  )
}

/** What the skill asks for and what the build actually has, or nothing when it reaches it. */
export function requirementGap(spread: AttributeSpread, skill: SkillRules): RequirementGap | null {
  const current = spread[ATTRIBUTE_KEY_OF[skill.requiredAttribute]]

  if (current >= skill.requiredValue) {
    return null
  }

  return { attribute: skill.requiredAttribute, required: skill.requiredValue, current }
}

/**
 * The reasons are ordered by how permanent they are. A duplicate is about this very pick,
 * a requirement outlives the whole kit, and the slots and the budget both free up as soon
 * as the player drops something.
 */
export function lockFor(skill: SkillRules, { spread, chosen }: KitState): SkillLock | null {
  if (chosen.some((picked) => picked.code === skill.code)) {
    return { kind: 'duplicate' }
  }

  const gap = requirementGap(spread, skill)

  if (gap !== null) {
    return { kind: 'requirement', ...gap }
  }

  if (countByType(chosen, skill.type) >= slotsFor(skill.type)) {
    return { kind: 'slots', type: skill.type }
  }

  const remaining = remainingKitPoints(chosen)

  if (skill.cost > remaining) {
    return { kind: 'budget', cost: skill.cost, remaining }
  }

  return null
}
