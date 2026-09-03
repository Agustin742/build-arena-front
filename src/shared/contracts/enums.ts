import { z } from 'zod'

export const SKILL_CODES = [
  'POWER_STRIKE',
  'RECKLESS_BLOW',
  'PRECISE_SHOT',
  'FIREBALL',
  'VENOM_BOLT',
  'MIND_SPIKE',
  'BRACE',
  'PARRY',
  'DODGE',
  'ARCANE_WARD',
  'COUNTER',
  'RIPOSTE',
] as const

export const skillCodeSchema = z.enum(SKILL_CODES)
export type SkillCode = z.infer<typeof skillCodeSchema>

export const skillTypeSchema = z.enum(['ACTION', 'REACTION'])
export type SkillType = z.infer<typeof skillTypeSchema>

export const attributeSchema = z.enum(['STRENGTH', 'MAGIC', 'DEXTERITY', 'CONSTITUTION'])
export type Attribute = z.infer<typeof attributeSchema>

export const conditionTypeSchema = z.enum(['POISONED', 'STUNNED', 'WEAKENED'])
export type ConditionType = z.infer<typeof conditionTypeSchema>

export const friendshipStatusSchema = z.enum(['PENDING', 'ACCEPTED'])
export type FriendshipStatus = z.infer<typeof friendshipStatusSchema>

export const friendshipDirectionSchema = z.enum(['OUTGOING', 'INCOMING'])
export type FriendshipDirection = z.infer<typeof friendshipDirectionSchema>

export const battleStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'FINISHED',
  'REJECTED',
  'CANCELLED',
])
export type BattleStatus = z.infer<typeof battleStatusSchema>

export const battleRoleSchema = z.enum(['CHALLENGER', 'OPPONENT'])
export type BattleRole = z.infer<typeof battleRoleSchema>

export const battleOutcomeSchema = z.enum(['WON', 'LOST'])
export type BattleOutcome = z.infer<typeof battleOutcomeSchema>

export const battleEndReasonSchema = z.enum(['DEFEAT', 'ABANDONMENT'])
export type BattleEndReason = z.infer<typeof battleEndReasonSchema>

export const buildViolationRuleSchema = z.enum([
  'ATTRIBUTE_OUT_OF_RANGE',
  'ATTRIBUTE_BUDGET_EXCEEDED',
  'SLOT_COUNT',
  'UNKNOWN_SKILL',
  'DUPLICATE_SKILL',
  'KIT_BUDGET_EXCEEDED',
  'ATTRIBUTE_REQUIREMENT_NOT_MET',
])
export type BuildViolationRule = z.infer<typeof buildViolationRuleSchema>

export const battleViolationRuleSchema = z.enum(['SELF_CHALLENGE'])
export type BattleViolationRule = z.infer<typeof battleViolationRuleSchema>

export const battleErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'NOT_FOUND',
  'WRONG_STATUS',
  'NOT_YOUR_TURN',
  'ALREADY_DECLARED',
  'NO_OPEN_WINDOW',
  'SKILL_NOT_IN_KIT',
  'WRONG_SKILL_TYPE',
  'REACTION_UNAVAILABLE',
  'TURN_ALREADY_RECORDED',
])
export type BattleErrorCode = z.infer<typeof battleErrorCodeSchema>

export const turnSkippedReasonSchema = z.enum(['STUNNED'])
export type TurnSkippedReason = z.infer<typeof turnSkippedReasonSchema>

export const reactionIgnoredReasonSchema = z.enum(['NOT_APPLICABLE', 'UNAVAILABLE', 'STUNNED'])
export type ReactionIgnoredReason = z.infer<typeof reactionIgnoredReasonSchema>
