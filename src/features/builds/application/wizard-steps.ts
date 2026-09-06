import { type CommandOption, type ParsedArgs } from '@/shared/commands'
import { type PublicSkill, type SkillCatalog } from '@/shared/contracts'

import {
  ATTRIBUTE_BASE,
  ATTRIBUTE_BUDGET,
  ATTRIBUTE_MAX,
  attributeCost,
  isAttributeValue,
  toAttributeSpread,
} from '../domain/attribute-cost'
import { lockFor } from '../domain/kit'
import {
  ATTRIBUTE_KEYS,
  type AttributeKey,
  type AttributeSpread,
  type AttributeValue,
  type SkillKind,
} from '../domain/types'
import { lockMessage } from './build-messages'

export const ATTRIBUTE_STEP_LABEL: Readonly<Record<AttributeKey, string>> = {
  strength: 'Fuerza',
  magic: 'Magia',
  dexterity: 'Destreza',
  constitution: 'Constitución',
}

export interface KitStep {
  name: string
  type: SkillKind
  label: string
}

/** Actions first, so the kit budget is spent on what the build does before how it answers. */
export const KIT_STEPS: readonly KitStep[] = [
  { name: 'action1', type: 'ACTION', label: 'Acción 1' },
  { name: 'action2', type: 'ACTION', label: 'Acción 2' },
  { name: 'reaction1', type: 'REACTION', label: 'Reacción 1' },
  { name: 'reaction2', type: 'REACTION', label: 'Reacción 2' },
]

const ATTRIBUTE_VALUES: readonly AttributeValue[] = Array.from(
  { length: ATTRIBUTE_MAX - ATTRIBUTE_BASE + 1 },
  (_unused, offset) => ATTRIBUTE_BASE + offset,
).filter(isAttributeValue)

function answeredValue(values: ParsedArgs, key: AttributeKey): AttributeValue | undefined {
  const raw = values[key]

  if (raw === undefined) {
    return undefined
  }

  const parsed = Number(raw)

  return isAttributeValue(parsed) ? parsed : undefined
}

/** What the other three attributes already cost. The one being answered does not count. */
function spentOnOthers(values: ParsedArgs, answering: AttributeKey): number {
  return ATTRIBUTE_KEYS.filter((key) => key !== answering).reduce((total, key) => {
    const value = answeredValue(values, key)

    return value === undefined ? total : total + attributeCost(value)
  }, 0)
}

function missingPoints(short: number): string {
  return short === 1 ? 'te faltan 1 punto' : `te faltan ${String(short)} puntos`
}

/**
 * Every legal value with its price and what would be left over, so the player compares
 * before committing instead of discovering the budget by running out of it. A value the
 * budget cannot pay is shown locked, never hidden.
 */
export function attributeOptions(values: ParsedArgs, answering: AttributeKey): CommandOption[] {
  const available = ATTRIBUTE_BUDGET - spentOnOthers(values, answering)

  return ATTRIBUTE_VALUES.map((value) => {
    const cost = attributeCost(value)
    const remaining = available - cost
    const label = String(value)

    return {
      id: label,
      key: label,
      label,
      hint: `costo ${String(cost)} · restan ${String(Math.max(remaining, 0))}`,
      ...(remaining < 0 ? { lockedReason: missingPoints(-remaining) } : {}),
    }
  })
}

/** The four answers as a spread, or nothing while any of them is missing or illegal. */
export function spreadFrom(values: ParsedArgs): AttributeSpread | null {
  const input: Partial<Record<AttributeKey, number>> = {}

  for (const key of ATTRIBUTE_KEYS) {
    const value = answeredValue(values, key)

    if (value === undefined) {
      return null
    }

    input[key] = value
  }

  return toAttributeSpread(input as Record<AttributeKey, number>)
}

/** The skills already picked, in the order the steps asked for them. */
export function chosenSkills(catalog: SkillCatalog, values: ParsedArgs): PublicSkill[] {
  return KIT_STEPS.map((step) => values[step.name])
    .filter((code): code is string => code !== undefined)
    .map((code) => catalog.find((skill) => skill.code === code))
    .filter((skill): skill is PublicSkill => skill !== undefined)
}

function skillHint(skill: PublicSkill): string {
  const parts = [`${String(skill.cost)}pts`]

  if (skill.damageDice !== null) {
    parts.push(skill.damageDice)
  }

  if (skill.appliesCondition !== null) {
    const rounds = skill.conditionRounds
    parts.push(
      rounds === null
        ? skill.appliesCondition
        : `${skill.appliesCondition} ${String(rounds)} ${rounds === 1 ? 'ronda' : 'rondas'}`,
    )
  }

  return parts.join(' · ')
}

const ATTRIBUTES_FIRST = 'primero elegí los atributos'

/**
 * The catalog filtered to one type, each entry carrying what it costs and, when it cannot
 * be picked, why. The server judges the build anyway; this is the courtesy that teaches.
 */
export function skillOptions(
  catalog: SkillCatalog,
  values: ParsedArgs,
  type: SkillKind,
): CommandOption[] {
  const spread = spreadFrom(values)
  const chosen = chosenSkills(catalog, values)

  return catalog
    .filter((skill) => skill.type === type)
    .map((skill) => {
      const lock = spread === null ? ATTRIBUTES_FIRST : lockedReasonFor(skill, spread, chosen)

      return {
        id: skill.code,
        label: skill.code,
        hint: skillHint(skill),
        ...(lock === undefined ? {} : { lockedReason: lock }),
      }
    })
}

function lockedReasonFor(
  skill: PublicSkill,
  spread: AttributeSpread,
  chosen: readonly PublicSkill[],
): string | undefined {
  const lock = lockFor(skill, { spread, chosen })

  return lock === null ? undefined : lockMessage(lock)
}
