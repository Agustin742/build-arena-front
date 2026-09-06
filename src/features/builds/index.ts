export {
  adviseBuild,
  adviseKit,
  adviseSpread,
  type BuildAdvice,
  PHYSICAL_ONLY_REACTIONS,
} from './domain/advice'
export {
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
} from './domain/attribute-cost'
export { type DerivedStats, estimateDerivedStats } from './domain/derived-stats'
export {
  ACTION_SLOTS,
  countByType,
  isKitComplete,
  KIT_BUDGET,
  kitCost,
  type KitState,
  lockFor,
  REACTION_SLOTS,
  remainingKitPoints,
  type RequirementGap,
  requirementGap,
  type SkillLock,
  slotsFor,
} from './domain/kit'
export {
  ATTRIBUTE_KEY_OF,
  ATTRIBUTE_KEYS,
  type AttributeKey,
  type AttributeName,
  type AttributeSpread,
  type AttributeSpreadInput,
  type AttributeValue,
  type SkillKind,
  type SkillRules,
} from './domain/types'
