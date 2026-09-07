import {
  type Attribute,
  type ConditionType,
  type SkillCode,
  type SkillType,
} from '@/shared/contracts'

/**
 * The arena speaks codes on the wire and seeds English names next to them. A player never
 * needs either: POWER_STRIKE is a database key, not a move. These are what the console
 * shows, and the code stays as the identifier that travels.
 */
export const SKILL_NAME: Readonly<Record<SkillCode, string>> = {
  POWER_STRIKE: 'Golpe potente',
  RECKLESS_BLOW: 'Golpe temerario',
  PRECISE_SHOT: 'Disparo preciso',
  FIREBALL: 'Bola de fuego',
  VENOM_BOLT: 'Dardo venenoso',
  MIND_SPIKE: 'Punzada mental',
  BRACE: 'Aguantar',
  PARRY: 'Parada',
  DODGE: 'Esquivar',
  ARCANE_WARD: 'Barrera arcana',
  COUNTER: 'Contragolpe',
  RIPOSTE: 'Riposta',
}

export const ATTRIBUTE_NAME: Readonly<Record<Attribute, string>> = {
  STRENGTH: 'Fuerza',
  MAGIC: 'Magia',
  DEXTERITY: 'Destreza',
  CONSTITUTION: 'Constitución',
}

export const CONDITION_NAME: Readonly<Record<ConditionType, string>> = {
  POISONED: 'Envenenado',
  STUNNED: 'Aturdido',
  WEAKENED: 'Debilitado',
}

export const SKILL_TYPE_NAME: Readonly<Record<SkillType, string>> = {
  ACTION: 'Acción',
  REACTION: 'Reacción',
}

/** Widened on purpose: a code off the wire is a string, not a member of the enum yet. */
const BY_CODE: Readonly<Record<string, string | undefined>> = SKILL_NAME

/**
 * The catalog is seeded, but a deployment could add a skill this build has never heard of.
 * Showing its raw code is ugly and honest; showing nothing would be neither.
 */
export function skillName(code: string): string {
  return BY_CODE[code] ?? code
}
