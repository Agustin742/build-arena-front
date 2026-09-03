import { z } from 'zod'

import { battleEventListSchema } from './battle-events'
import {
  battleEndReasonSchema,
  battleStatusSchema,
  conditionTypeSchema,
  skillTypeSchema,
} from './enums'
import { integerSchema, isoDateTimeSchema, uuidSchema } from './primitives'

export const combatantConditionSchema = z.object({
  type: conditionTypeSchema,
  roundsRemaining: integerSchema,
})
export type CombatantCondition = z.infer<typeof combatantConditionSchema>

export const combatantViewSchema = z.object({
  userId: uuidSchema,
  combatantId: uuidSchema,
  strength: integerSchema,
  magic: integerSchema,
  dexterity: integerSchema,
  constitution: integerSchema,
  armorClass: integerSchema,
  maxHp: integerSchema,
  currentHp: integerSchema,
  initiative: integerSchema,
  reactionAvailable: z.boolean(),
  conditions: z.array(combatantConditionSchema),
  skillCodes: z.array(z.string()),
})
export type CombatantView = z.infer<typeof combatantViewSchema>

export const turnViewSchema = z.object({
  round: integerSchema,
  sequence: integerSchema,
  actorId: uuidSchema,
  kind: skillTypeSchema,
  skillCode: z.string().nullable(),
  attackRoll: integerSchema.nullable(),
  attackTotal: integerSchema.nullable(),
  targetValue: integerSchema.nullable(),
  hit: z.boolean().nullable(),
  critical: z.boolean(),
  damage: integerSchema,
})
export type TurnView = z.infer<typeof turnViewSchema>

export const windowViewSchema = z.object({
  round: integerSchema,
  actorUserId: uuidSchema,
  actionSkillCode: z.string(),
  deadline: isoDateTimeSchema,
  remainingMs: integerSchema,
  applicableSkillCodes: z.array(z.string()),
})
export type WindowView = z.infer<typeof windowViewSchema>

export const leftViewSchema = z.object({
  userId: uuidSchema,
  deadline: isoDateTimeSchema,
})
export type LeftView = z.infer<typeof leftViewSchema>

export const ratingChangeViewSchema = z.object({
  userId: uuidSchema,
  before: integerSchema,
  change: integerSchema,
  after: integerSchema,
})
export type RatingChangeView = z.infer<typeof ratingChangeViewSchema>

export const battleStatePayloadSchema = z.object({
  battleId: uuidSchema,
  status: battleStatusSchema,
  currentRound: integerSchema,
  activeUserId: uuidSchema.nullable(),
  combatants: z.array(combatantViewSchema),
  turns: z.array(turnViewSchema),
  openWindow: windowViewSchema.nullable(),
  opponentLeft: leftViewSchema.nullable(),
})
export type BattleStatePayload = z.infer<typeof battleStatePayloadSchema>

export const battleRoundStartPayloadSchema = z.object({
  battleId: uuidSchema,
  round: integerSchema,
  activeUserId: uuidSchema,
  events: battleEventListSchema,
})
export type BattleRoundStartPayload = z.infer<typeof battleRoundStartPayloadSchema>

export const battleReactionWindowPayloadSchema = windowViewSchema.extend({
  battleId: uuidSchema,
})
export type BattleReactionWindowPayload = z.infer<typeof battleReactionWindowPayloadSchema>

export const battleTurnResolvedPayloadSchema = z.object({
  battleId: uuidSchema,
  round: integerSchema,
  turns: z.array(turnViewSchema),
  events: battleEventListSchema,
  combatants: z.array(combatantViewSchema),
  defeatedId: uuidSchema.nullable(),
})
export type BattleTurnResolvedPayload = z.infer<typeof battleTurnResolvedPayloadSchema>

export const battleEndedPayloadSchema = z.object({
  battleId: uuidSchema,
  winnerId: uuidSchema,
  reason: battleEndReasonSchema,
  endedAt: isoDateTimeSchema,
  ranked: z.boolean(),
  ratingChanges: z.array(ratingChangeViewSchema),
})
export type BattleEndedPayload = z.infer<typeof battleEndedPayloadSchema>

export const battleOpponentLeftPayloadSchema = leftViewSchema.extend({
  battleId: uuidSchema,
})
export type BattleOpponentLeftPayload = z.infer<typeof battleOpponentLeftPayloadSchema>

export const battleJoinPayloadSchema = z.object({
  battleId: uuidSchema,
})
export type BattleJoinPayload = z.infer<typeof battleJoinPayloadSchema>

export const battleActionPayloadSchema = z.object({
  battleId: uuidSchema,
  skillCode: z.string(),
})
export type BattleActionPayload = z.infer<typeof battleActionPayloadSchema>

export const battleReactionPayloadSchema = z.object({
  battleId: uuidSchema,
  skillCode: z.string().nullable(),
})
export type BattleReactionPayload = z.infer<typeof battleReactionPayloadSchema>
