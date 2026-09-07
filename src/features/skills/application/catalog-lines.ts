import { type PublicSkill, type SkillCatalog, type SkillType } from '@/shared/contracts'
import { ATTRIBUTE_NAME, CONDITION_NAME, skillName } from '@/shared/game-text'

const HEADING: Record<SkillType, string> = {
  ACTION: 'ACCIONES',
  REACTION: 'REACCIONES',
}

/** Wide enough for the longest name and the longest requirement of the seeded catalog. */
const NAME_WIDTH = 17
const COST_WIDTH = 6
const REQUIREMENT_WIDTH = 16
const DAMAGE_WIDTH = 6

function conditionOf(skill: PublicSkill): string {
  if (skill.appliesCondition === null) {
    return ''
  }

  const name = CONDITION_NAME[skill.appliesCondition]
  const rounds = skill.conditionRounds

  if (rounds === null) {
    return name
  }

  return `${name} ${String(rounds)} ${rounds === 1 ? 'ronda' : 'rondas'}`
}

function lineFor(skill: PublicSkill): string {
  const cost = `${String(skill.cost)}pts`
  const requirement = `${ATTRIBUTE_NAME[skill.requiredAttribute]} ${String(skill.requiredValue)}`

  return [
    skillName(skill.code).padEnd(NAME_WIDTH),
    cost.padEnd(COST_WIDTH),
    requirement.padEnd(REQUIREMENT_WIDTH),
    (skill.damageDice ?? '').padEnd(DAMAGE_WIDTH),
    conditionOf(skill),
  ]
    .join('')
    .trimEnd()
}

function sectionFor(catalog: SkillCatalog, type: SkillType): string[] {
  const skills = catalog.filter((skill) => skill.type === type)

  return skills.length === 0 ? [] : [HEADING[type], ...skills.map(lineFor)]
}

/** The catalog as the console prints it: actions first, one padded column per field. */
export function catalogLines(catalog: SkillCatalog): string[] {
  return [...sectionFor(catalog, 'ACTION'), ...sectionFor(catalog, 'REACTION')]
}
