import { z } from 'zod'

import {
  battleErrorCodeSchema,
  battleViolationRuleSchema,
  buildViolationRuleSchema,
  friendshipViolationRuleSchema,
} from './enums'
import { integerSchema } from './primitives'

export const validationErrorSchema = z.object({
  statusCode: integerSchema,
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
})
export type ValidationError = z.infer<typeof validationErrorSchema>

function violationEnvelopeOf<T extends z.ZodType>(ruleSchema: T) {
  return z.object({
    message: z.string(),
    violations: z.array(z.object({ rule: ruleSchema, message: z.string() })),
  })
}

export const violationEnvelopeSchema = violationEnvelopeOf(z.string())
export type ViolationEnvelope = z.infer<typeof violationEnvelopeSchema>

export const buildViolationEnvelopeSchema = violationEnvelopeOf(buildViolationRuleSchema)
export type BuildViolationEnvelope = z.infer<typeof buildViolationEnvelopeSchema>

export const battleViolationEnvelopeSchema = violationEnvelopeOf(battleViolationRuleSchema)
export type BattleViolationEnvelope = z.infer<typeof battleViolationEnvelopeSchema>

export const friendshipViolationEnvelopeSchema = violationEnvelopeOf(friendshipViolationRuleSchema)
export type FriendshipViolationEnvelope = z.infer<typeof friendshipViolationEnvelopeSchema>

export const battleErrorPayloadSchema = z.object({
  code: battleErrorCodeSchema,
  message: z.string(),
  event: z.string().optional(),
})
export type BattleErrorPayload = z.infer<typeof battleErrorPayloadSchema>
