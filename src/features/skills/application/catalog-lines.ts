import { type PublicSkill, type SkillCatalog, type SkillType } from '@/shared/contracts'

const HEADING: Record<SkillType, string> = {
  ACTION: 'ACCIONES',
  REACTION: 'REACCIONES',
}

/** Wide enough for RECKLESS_BLOW and CONSTITUTION 12, the longest of each column. */
const CODE_WIDTH = 15
const COST_WIDTH = 6
const REQUIREMENT_WIDTH = 16
const DAMAGE_WIDTH = 6

function conditionOf(skill: PublicSkill): string {
  if (skill.appliesCondition === null) {
    return ''
  }

  const rounds = skill.conditionRounds

  if (rounds === null) {
    return skill.appliesCondition
  }

  return `${skill.appliesCondition} ${String(rounds)} ${rounds === 1 ? 'ronda' : 'rondas'}`
}

function lineFor(skill: PublicSkill): string {
  const cost = `${String(skill.cost)}pts`
  const requirement = `${skill.requiredAttribute} ${String(skill.requiredValue)}`

  return [
    skill.code.padEnd(CODE_WIDTH),
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
