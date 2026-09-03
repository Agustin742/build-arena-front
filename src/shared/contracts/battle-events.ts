import { z } from 'zod'

import { conditionTypeSchema, reactionIgnoredReasonSchema, turnSkippedReasonSchema } from './enums'
import { integerSchema, uuidSchema } from './primitives'

export const BATTLE_EVENT_TYPES = [
  'ROUND_STARTED',
  'REACTION_RECHARGED',
  'CONDITION_TICKED',
  'CONDITION_EXPIRED',
  'CONDITION_APPLIED',
  'TURN_SKIPPED',
  'REACTION_IGNORED',
  'ATTACK_ROLLED',
  'SAVE_ROLLED',
  'DAMAGE_MITIGATED',
  'DAMAGE_APPLIED',
  'COUNTER_ATTACKED',
  'COMBATANT_DEFEATED',
] as const

export const battleEventTypeSchema = z.enum(BATTLE_EVENT_TYPES)
export type BattleEventType = z.infer<typeof battleEventTypeSchema>

export const roundStartedEventSchema = z.object({
  type: z.literal('ROUND_STARTED'),
  round: integerSchema,
  actorId: uuidSchema,
})

export const reactionRechargedEventSchema = z.object({
  type: z.literal('REACTION_RECHARGED'),
  combatantId: uuidSchema,
})

export const conditionTickedEventSchema = z.object({
  type: z.literal('CONDITION_TICKED'),
  combatantId: uuidSchema,
  condition: conditionTypeSchema,
  roundsRemaining: integerSchema,
})

export const conditionExpiredEventSchema = z.object({
  type: z.literal('CONDITION_EXPIRED'),
  combatantId: uuidSchema,
  condition: conditionTypeSchema,
})

export const conditionAppliedEventSchema = z.object({
  type: z.literal('CONDITION_APPLIED'),
  combatantId: uuidSchema,
  condition: conditionTypeSchema,
  rounds: integerSchema,
  refreshed: z.boolean(),
})

export const turnSkippedEventSchema = z.object({
  type: z.literal('TURN_SKIPPED'),
  combatantId: uuidSchema,
  reason: turnSkippedReasonSchema,
})

export const reactionIgnoredEventSchema = z.object({
  type: z.literal('REACTION_IGNORED'),
  combatantId: uuidSchema,
  skillCode: z.string(),
  reason: reactionIgnoredReasonSchema,
})

export const attackRolledEventSchema = z.object({
  type: z.literal('ATTACK_ROLLED'),
  actorId: uuidSchema,
  rolls: z.array(integerSchema),
  kept: integerSchema,
  total: integerSchema,
  targetValue: integerSchema,
  hit: z.boolean(),
  critical: z.boolean(),
})

export const saveRolledEventSchema = z.object({
  type: z.literal('SAVE_ROLLED'),
  defenderId: uuidSchema,
  rolls: z.array(integerSchema),
  kept: integerSchema,
  total: integerSchema,
  difficulty: integerSchema,
  passed: z.boolean(),
})

export const damageMitigatedEventSchema = z.object({
  type: z.literal('DAMAGE_MITIGATED'),
  targetId: uuidSchema,
  skillCode: z.string(),
  before: integerSchema,
  after: integerSchema,
})

export const damageAppliedEventSchema = z.object({
  type: z.literal('DAMAGE_APPLIED'),
  targetId: uuidSchema,
  amount: integerSchema,
  currentHp: integerSchema,
})

export const counterAttackedEventSchema = z.object({
  type: z.literal('COUNTER_ATTACKED'),
  actorId: uuidSchema,
  skillCode: z.string(),
  damage: integerSchema,
})

export const combatantDefeatedEventSchema = z.object({
  type: z.literal('COMBATANT_DEFEATED'),
  combatantId: uuidSchema,
})

export const battleEventSchema = z.discriminatedUnion('type', [
  roundStartedEventSchema,
  reactionRechargedEventSchema,
  conditionTickedEventSchema,
  conditionExpiredEventSchema,
  conditionAppliedEventSchema,
  turnSkippedEventSchema,
  reactionIgnoredEventSchema,
  attackRolledEventSchema,
  saveRolledEventSchema,
  damageMitigatedEventSchema,
  damageAppliedEventSchema,
  counterAttackedEventSchema,
  combatantDefeatedEventSchema,
])
export type BattleEvent = z.infer<typeof battleEventSchema>

export const battleEventListSchema = z.array(battleEventSchema)
export type BattleEventList = z.infer<typeof battleEventListSchema>
