import { describe, expect, it } from 'vitest'

import { battleErrorCodeSchema, buildViolationRuleSchema } from '@/shared/contracts'

import { ApiError, SchemaError } from './api-error'
import {
  BATTLE_ERROR_MESSAGES,
  BUILD_VIOLATION_MESSAGES,
  toGameMessage,
  toViolationMessages,
} from './error-message'

function apiErrorWith(status: number, payload: unknown) {
  return new ApiError('failed', { status, payload })
}

describe('BATTLE_ERROR_MESSAGES', () => {
  it('has a game message for every socket error code', () => {
    for (const code of battleErrorCodeSchema.options) {
      expect(BATTLE_ERROR_MESSAGES[code]).toBeTruthy()
    }
  })

  it('never leaks the english system message of the server', () => {
    expect(BATTLE_ERROR_MESSAGES.NOT_YOUR_TURN).not.toBe('It is not your turn')
  })
})

describe('BUILD_VIOLATION_MESSAGES', () => {
  it('has a game message for every build rule', () => {
    for (const rule of buildViolationRuleSchema.options) {
      expect(BUILD_VIOLATION_MESSAGES[rule]).toBeTruthy()
    }
  })
})

describe('toGameMessage', () => {
  it('maps a socket error by its code', () => {
    expect(toGameMessage({ code: 'NOT_YOUR_TURN', message: 'It is not your turn' })).toBe(
      BATTLE_ERROR_MESSAGES.NOT_YOUR_TURN,
    )
  })

  it('maps the first violation of a rejected build by its rule', () => {
    const error = apiErrorWith(400, {
      message: 'The build breaks the rules of the arena',
      violations: [{ rule: 'KIT_BUDGET_EXCEEDED', message: 'The kit costs 21 points' }],
    })

    expect(toGameMessage(error)).toBe(BUILD_VIOLATION_MESSAGES.KIT_BUDGET_EXCEEDED)
  })

  it('maps a rule that belongs to another module of the arena', () => {
    const error = apiErrorWith(400, {
      message: 'The challenge breaks the rules of the arena',
      violations: [{ rule: 'SELF_CHALLENGE', message: 'You cannot challenge yourself' }],
    })

    expect(toGameMessage(error)).toBe('No podés desafiarte a vos mismo')
  })

  it('falls back to the server text for a rule it has never seen', () => {
    const error = apiErrorWith(400, {
      message: 'The build breaks the rules of the arena',
      violations: [{ rule: 'A_RULE_ADDED_LATER', message: 'Something new happened' }],
    })

    expect(toGameMessage(error)).toBe('Something new happened')
  })

  it('maps an unauthorized response', () => {
    expect(toGameMessage(apiErrorWith(401, { statusCode: 401 }))).toBe(
      'Tu sesión terminó. Volvé a entrar',
    )
  })

  it('maps a not found response without hinting that the resource exists', () => {
    const message = toGameMessage(apiErrorWith(404, { statusCode: 404 }))

    expect(message).toBe('Eso no existe, o no es tuyo')
  })

  it('maps a server failure', () => {
    expect(toGameMessage(apiErrorWith(500, { statusCode: 500 }))).toBe(
      'La arena falló. Probá de nuevo en un momento',
    )
  })

  it('maps a request that never reached the arena', () => {
    const offline = new ApiError('offline', { status: null, payload: undefined })

    expect(toGameMessage(offline)).toBe('No se pudo llegar a la arena. Revisá tu conexión')
  })

  it('reports a broken contract as a client problem, not a player problem', () => {
    const error = new SchemaError('/auth/me', [], {})

    expect(toGameMessage(error)).toBe('La arena respondió algo que este cliente no entiende')
  })

  it('falls back to the validation pipe messages joined into one line', () => {
    const error = apiErrorWith(400, {
      statusCode: 400,
      message: ['email must be an email', 'password is too short'],
      error: 'Bad Request',
    })

    expect(toGameMessage(error)).toBe('email must be an email. password is too short')
  })

  it('has a last resort for anything it has never seen', () => {
    expect(toGameMessage(new Error('boom'))).toBe('Algo salió mal')
    expect(toGameMessage(undefined)).toBe('Algo salió mal')
  })
})

describe('toViolationMessages', () => {
  it('returns every violation so the player fixes them all at once', () => {
    const error = apiErrorWith(400, {
      message: 'The build breaks the rules of the arena',
      violations: [
        { rule: 'SLOT_COUNT', message: 'Pick exactly two actions and two reactions' },
        { rule: 'KIT_BUDGET_EXCEEDED', message: 'The kit costs 21 points' },
      ],
    })

    expect(toViolationMessages(error)).toEqual([
      BUILD_VIOLATION_MESSAGES.SLOT_COUNT,
      BUILD_VIOLATION_MESSAGES.KIT_BUDGET_EXCEEDED,
    ])
  })

  it('returns nothing when the error carries no violations', () => {
    expect(toViolationMessages(apiErrorWith(401, { statusCode: 401 }))).toEqual([])
  })
})
