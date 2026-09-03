import { z } from 'zod'

import {
  attributeSchema,
  battleOutcomeSchema,
  battleRoleSchema,
  battleStatusSchema,
  conditionTypeSchema,
  friendshipDirectionSchema,
  friendshipStatusSchema,
  skillTypeSchema,
} from './enums'
import { integerSchema, isoDateTimeSchema, uuidSchema } from './primitives'

export const healthStatusSchema = z.object({
  status: z.string(),
  version: z.string(),
  uptime: integerSchema,
  timestamp: isoDateTimeSchema,
})
export type HealthStatus = z.infer<typeof healthStatusSchema>

export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})
export type TokenPair = z.infer<typeof tokenPairSchema>

export const publicUserSchema = z.object({
  id: uuidSchema,
  email: z.email(),
  username: z.string(),
  rating: integerSchema,
  createdAt: isoDateTimeSchema,
})
export type PublicUser = z.infer<typeof publicUserSchema>

export const publicPlayerSchema = z.object({
  id: uuidSchema,
  username: z.string(),
  rating: integerSchema,
})
export type PublicPlayer = z.infer<typeof publicPlayerSchema>

export const publicSkillSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  type: skillTypeSchema,
  cost: integerSchema,
  requiredAttribute: attributeSchema,
  requiredValue: integerSchema,
  damageDice: z.string().nullable(),
  appliesCondition: conditionTypeSchema.nullable(),
  conditionRounds: integerSchema.nullable(),
})
export type PublicSkill = z.infer<typeof publicSkillSchema>

export const skillCatalogSchema = z.array(publicSkillSchema)
export type SkillCatalog = z.infer<typeof skillCatalogSchema>

export const publicBuildSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  strength: integerSchema,
  magic: integerSchema,
  dexterity: integerSchema,
  constitution: integerSchema,
  skills: z.array(publicSkillSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type PublicBuild = z.infer<typeof publicBuildSchema>

export const buildListSchema = z.array(publicBuildSchema)
export type BuildList = z.infer<typeof buildListSchema>

export const publicFriendshipSchema = z.object({
  id: uuidSchema,
  status: friendshipStatusSchema,
  direction: friendshipDirectionSchema,
  player: publicPlayerSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type PublicFriendship = z.infer<typeof publicFriendshipSchema>

export const friendshipListSchema = z.array(publicFriendshipSchema)
export type FriendshipList = z.infer<typeof friendshipListSchema>

export const publicBattleSchema = z.object({
  id: uuidSchema,
  status: battleStatusSchema,
  ranked: z.boolean(),
  role: battleRoleSchema,
  rival: publicPlayerSchema,
  outcome: battleOutcomeSchema.nullable(),
  currentRound: integerSchema,
  createdAt: isoDateTimeSchema,
  startedAt: isoDateTimeSchema.nullable(),
  endedAt: isoDateTimeSchema.nullable(),
})
export type PublicBattle = z.infer<typeof publicBattleSchema>

export const battleListSchema = z.array(publicBattleSchema)
export type BattleList = z.infer<typeof battleListSchema>

export const leaderboardEntrySchema = publicPlayerSchema.extend({
  rank: integerSchema,
})
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>

export const leaderboardSchema = z.array(leaderboardEntrySchema)
export type Leaderboard = z.infer<typeof leaderboardSchema>
