import { type BuildList, type PublicBuild, type PublicSkill } from '@/shared/contracts'
import { skillName } from '@/shared/game-text'

import { adviseBuild } from '../domain/advice'
import { ATTRIBUTE_BUDGET, modifier, spreadCost, toAttributeSpread } from '../domain/attribute-cost'
import { estimateDerivedStats } from '../domain/derived-stats'
import { KIT_BUDGET, kitCost } from '../domain/kit'
import { ATTRIBUTE_KEYS, type AttributeSpread } from '../domain/types'
import { adviceMessage } from './build-messages'
import { ATTRIBUTE_STEP_LABEL } from './wizard-steps'

const EMPTY = 'Todavía no armaste ninguna build'
const UNREADABLE = 'La arena mandó un reparto que este cliente no entiende'

const NAME_WIDTH = 24
const ATTRIBUTE_WIDTH = 15

function spreadOf(build: PublicBuild): AttributeSpread | null {
  return toAttributeSpread({
    strength: build.strength,
    magic: build.magic,
    dexterity: build.dexterity,
    constitution: build.constitution,
  })
}

/** What the build walks into the arena with, in one line. An estimate, like the wizard's. */
export function buildSummary(build: PublicBuild): string {
  const spread = spreadOf(build)
  const spent = kitCost(build.skills)
  const kit = `kit ${String(spent)}/${String(KIT_BUDGET)}`

  if (spread === null) {
    return kit
  }

  const { armorClass, maxHp } = estimateDerivedStats(spread)

  return `CA ${String(armorClass)} · ${String(maxHp)} PV · ${kit}`
}

export function buildListLines(builds: BuildList): string[] {
  if (builds.length === 0) {
    return [EMPTY]
  }

  return builds.map(
    (build, index) =>
      `${String(index + 1).padStart(2)}) ${build.name.padEnd(NAME_WIDTH)}${buildSummary(build)}`,
  )
}

function signed(value: number): string {
  return value < 0 ? String(value) : `+${String(value)}`
}

function attributeLines(spread: AttributeSpread): string[] {
  return ATTRIBUTE_KEYS.map((key) => {
    // The same labels the wizard used while the build was being made, so a build reads
    // back the way it was written — and no cast is needed to get at them.
    const name = ATTRIBUTE_STEP_LABEL[key]
    const value = spread[key]

    return `${name.padEnd(ATTRIBUTE_WIDTH)}${String(value).padStart(2)}   mod ${signed(modifier(value))}`
  })
}

function kitSection(skills: readonly PublicSkill[], type: PublicSkill['type']): string[] {
  const picked = skills.filter((skill) => skill.type === type)

  if (picked.length === 0) {
    return []
  }

  return [
    type === 'ACTION' ? 'ACCIONES' : 'REACCIONES',
    ...picked.map(
      (skill) =>
        `${skillName(skill.code).padEnd(ATTRIBUTE_WIDTH + 4)}${String(skill.cost)}pts${skill.damageDice === null ? '' : `  ${skill.damageDice}`}`,
    ),
  ]
}

/**
 * A build read back the way the wizard showed it while it was being made: the same names,
 * the same modifiers, the same warnings. Anything else and the player has to learn twice.
 */
export function buildDetailLines(build: PublicBuild): string[] {
  const spread = spreadOf(build)
  const spent = kitCost(build.skills)
  const kit = [
    ...kitSection(build.skills, 'ACTION'),
    ...kitSection(build.skills, 'REACTION'),
    `Kit: ${String(spent)}/${String(KIT_BUDGET)} puntos`,
  ]

  if (spread === null) {
    return [UNREADABLE, ...kit]
  }

  const { armorClass, maxHp } = estimateDerivedStats(spread)
  const advice = adviseBuild(spread, build.skills).map(adviceMessage)

  return [
    ...attributeLines(spread),
    `Reparto: ${String(spreadCost(spread))}/${String(ATTRIBUTE_BUDGET)} puntos`,
    '',
    `CA ${String(armorClass)} · ${String(maxHp)} PV`,
    '',
    ...kit,
    ...(advice.length === 0 ? [] : ['', ...advice]),
  ]
}
