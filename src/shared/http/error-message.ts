import {
  type BattleErrorCode,
  battleErrorPayloadSchema,
  type BattleViolationRule,
  type BuildViolationRule,
  type FriendshipViolationRule,
} from '@/shared/contracts'

import { ApiError, SchemaError } from './api-error'

export const BATTLE_ERROR_MESSAGES: Record<BattleErrorCode, string> = {
  UNAUTHORIZED: 'Tu sesión terminó. Volvé a entrar',
  NOT_FOUND: 'Esa batalla no existe, o no es tuya',
  WRONG_STATUS: 'La batalla no está en el momento para eso',
  NOT_YOUR_TURN: 'No es tu turno',
  ALREADY_DECLARED: 'Ya declaraste tu acción de esta ronda',
  NO_OPEN_WINDOW: 'No hay ninguna ventana abierta para vos',
  SKILL_NOT_IN_KIT: 'Esa habilidad no está en tu kit congelado',
  WRONG_SKILL_TYPE: 'Esa habilidad no se usa en este momento del turno',
  REACTION_UNAVAILABLE: 'Tu reacción ya se gastó esta ronda',
  TURN_ALREADY_RECORDED: 'Ese turno ya quedó registrado',
}

export const BUILD_VIOLATION_MESSAGES: Record<BuildViolationRule, string> = {
  ATTRIBUTE_OUT_OF_RANGE: 'Cada atributo va entre 8 y 15',
  ATTRIBUTE_BUDGET_EXCEEDED: 'El reparto de atributos se pasa del presupuesto de 20 puntos',
  SLOT_COUNT: 'La build lleva exactamente 2 acciones y 2 reacciones',
  UNKNOWN_SKILL: 'Esa habilidad no está en el catálogo',
  DUPLICATE_SKILL: 'No podés repetir una habilidad',
  KIT_BUDGET_EXCEEDED: 'El kit se pasa del presupuesto de 18 puntos',
  ATTRIBUTE_REQUIREMENT_NOT_MET: 'Una habilidad exige más de lo que tu build tiene',
}

const BATTLE_VIOLATION_MESSAGES: Record<BattleViolationRule, string> = {
  SELF_CHALLENGE: 'No podés desafiarte a vos mismo',
}

const FRIENDSHIP_VIOLATION_MESSAGES: Record<FriendshipViolationRule, string> = {
  SELF_FRIENDSHIP: 'No podés agregarte a vos mismo',
  DUPLICATE_REQUEST: 'Esa solicitud ya existe',
}

const RULE_MESSAGES: Record<string, string> = {
  ...BUILD_VIOLATION_MESSAGES,
  ...BATTLE_VIOLATION_MESSAGES,
  ...FRIENDSHIP_VIOLATION_MESSAGES,
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'La arena rechazó esos datos',
  401: 'Tu sesión terminó. Volvé a entrar',
  403: 'Eso no te corresponde',
  404: 'Eso no existe, o no es tuyo',
  409: 'Eso choca con algo que ya existe',
  429: 'Frená un poco: demasiadas peticiones seguidas',
}

const OFFLINE_MESSAGE = 'No se pudo llegar a la arena. Revisá tu conexión'
const SERVER_MESSAGE = 'La arena falló. Probá de nuevo en un momento'
const CONTRACT_MESSAGE = 'La arena respondió algo que este cliente no entiende'
const LAST_RESORT_MESSAGE = 'Algo salió mal'

function messageForRule(rule: string, serverMessage: string) {
  return RULE_MESSAGES[rule] ?? serverMessage
}

export function toViolationMessages(error: unknown): string[] {
  if (!(error instanceof ApiError) || !error.violations) {
    return []
  }

  return error.violations.violations.map((violation) =>
    messageForRule(violation.rule, violation.message),
  )
}

export function toGameMessage(error: unknown): string {
  const socketError = battleErrorPayloadSchema.safeParse(error)

  if (socketError.success) {
    return BATTLE_ERROR_MESSAGES[socketError.data.code]
  }

  if (error instanceof SchemaError) {
    return CONTRACT_MESSAGE
  }

  if (!(error instanceof ApiError)) {
    return LAST_RESORT_MESSAGE
  }

  const [firstViolation] = toViolationMessages(error)

  if (firstViolation !== undefined) {
    return firstViolation
  }

  if (error.status === null) {
    return OFFLINE_MESSAGE
  }

  if (error.status >= 500) {
    return SERVER_MESSAGE
  }

  const validationMessage = error.validation?.message

  if (validationMessage !== undefined && error.status === 400) {
    return Array.isArray(validationMessage) ? validationMessage.join('. ') : validationMessage
  }

  return STATUS_MESSAGES[error.status] ?? LAST_RESORT_MESSAGE
}
