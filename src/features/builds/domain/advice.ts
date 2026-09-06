import { ATTRIBUTE_MAX } from './attribute-cost'
import { countByType, REACTION_SLOTS } from './kit'
import { ATTRIBUTE_KEYS, type AttributeKey, type AttributeSpread, type SkillRules } from './types'

/**
 * The three reactions that never answer a spell. A kit built out of only these eats every
 * spell whole, which is the single most expensive mistake a first build can make.
 */
export const PHYSICAL_ONLY_REACTIONS: readonly string[] = ['DODGE', 'PARRY', 'RIPOSTE']

export type BuildAdvice =
  { kind: 'wasted-ceiling'; attribute: AttributeKey } | { kind: 'no-magic-answer' }

/** Advisory only. Nothing here makes a build illegal: the server is the one that judges. */
export function adviseSpread(spread: AttributeSpread): BuildAdvice[] {
  return ATTRIBUTE_KEYS.filter((key) => spread[key] === ATTRIBUTE_MAX).map((attribute) => ({
    kind: 'wasted-ceiling',
    attribute,
  }))
}

export function adviseKit(chosen: readonly SkillRules[]): BuildAdvice[] {
  if (countByType(chosen, 'REACTION') < REACTION_SLOTS) {
    return []
  }

  const answersMagic = chosen.some(
    (skill) => skill.type === 'REACTION' && !PHYSICAL_ONLY_REACTIONS.includes(skill.code),
  )

  return answersMagic ? [] : [{ kind: 'no-magic-answer' }]
}

export function adviseBuild(spread: AttributeSpread, chosen: readonly SkillRules[]): BuildAdvice[] {
  return [...adviseSpread(spread), ...adviseKit(chosen)]
}
