import { describe, expect, it } from 'vitest'

import {
  battleErrorPayloadSchema,
  battleViolationEnvelopeSchema,
  buildViolationEnvelopeSchema,
  friendshipViolationEnvelopeSchema,
  validationErrorSchema,
  violationEnvelopeSchema,
} from './errors'

describe('validationErrorSchema', () => {
  it('accepts the validation pipe envelope from the guide', () => {
    const payload = {
      statusCode: 400,
      message: ['email must be an email'],
      error: 'Bad Request',
    }

    expect(validationErrorSchema.parse(payload)).toEqual(payload)
  })

  it('accepts an exception that carries a single message string', () => {
    const payload = { statusCode: 404, message: 'Not Found', error: 'Not Found' }

    expect(validationErrorSchema.parse(payload)).toEqual(payload)
  })

  it('accepts an envelope without the error label', () => {
    const payload = { statusCode: 401, message: 'Unauthorized' }

    expect(validationErrorSchema.parse(payload)).toEqual(payload)
  })

  it('rejects an envelope without a status code', () => {
    expect(validationErrorSchema.safeParse({ message: 'Bad Request' }).success).toBe(false)
  })

  it('does not accept the violations envelope, which is a different shape', () => {
    const violations = {
      message: 'The build breaks the rules of the arena',
      violations: [{ rule: 'SLOT_COUNT', message: 'Pick exactly two actions' }],
    }

    expect(validationErrorSchema.safeParse(violations).success).toBe(false)
  })
})

describe('buildViolationEnvelopeSchema', () => {
  const payload = {
    message: 'The build breaks the rules of the arena',
    violations: [
      {
        rule: 'ATTRIBUTE_BUDGET_EXCEEDED',
        message: 'The spread costs 24 points and the budget is 20',
      },
    ],
  }

  it('accepts the guide payload', () => {
    expect(buildViolationEnvelopeSchema.parse(payload)).toEqual(payload)
  })

  it('accepts every violation the server can report at once', () => {
    const all = {
      ...payload,
      violations: [
        { rule: 'ATTRIBUTE_OUT_OF_RANGE', message: 'Strength 16 is above 15' },
        { rule: 'ATTRIBUTE_BUDGET_EXCEEDED', message: 'The spread costs 24 points' },
        { rule: 'SLOT_COUNT', message: 'Pick exactly two actions and two reactions' },
        { rule: 'UNKNOWN_SKILL', message: 'FROSTBITE is not in the catalog' },
        { rule: 'DUPLICATE_SKILL', message: 'PARRY is picked twice' },
        { rule: 'KIT_BUDGET_EXCEEDED', message: 'The kit costs 21 points and the budget is 18' },
        { rule: 'ATTRIBUTE_REQUIREMENT_NOT_MET', message: 'MIND_SPIKE needs MAGIC 14' },
      ],
    }

    expect(buildViolationEnvelopeSchema.parse(all).violations).toHaveLength(7)
  })

  it('rejects a rule that is not a build rule', () => {
    const result = buildViolationEnvelopeSchema.safeParse({
      ...payload,
      violations: [{ rule: 'SELF_CHALLENGE', message: 'You cannot challenge yourself' }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects an envelope without its violations', () => {
    const result = buildViolationEnvelopeSchema.safeParse({
      message: 'The build breaks the rules of the arena',
    })

    expect(result.success).toBe(false)
  })
})

describe('battleViolationEnvelopeSchema', () => {
  it('accepts a self challenge', () => {
    const payload = {
      message: 'The challenge breaks the rules of the arena',
      violations: [{ rule: 'SELF_CHALLENGE', message: 'You cannot challenge yourself' }],
    }

    expect(battleViolationEnvelopeSchema.parse(payload)).toEqual(payload)
  })
})

describe('friendshipViolationEnvelopeSchema', () => {
  it('accepts a duplicate request', () => {
    const payload = {
      message: 'The friend request breaks the rules of the arena',
      violations: [{ rule: 'DUPLICATE_REQUEST', message: 'That request already exists' }],
    }

    expect(friendshipViolationEnvelopeSchema.parse(payload)).toEqual(payload)
  })
})

describe('violationEnvelopeSchema', () => {
  it('accepts any violation envelope without knowing its vocabulary', () => {
    const payload = {
      message: 'The build breaks the rules of the arena',
      violations: [{ rule: 'A_RULE_ADDED_LATER', message: 'Something the client does not know' }],
    }

    expect(violationEnvelopeSchema.parse(payload)).toEqual(payload)
  })
})

describe('battleErrorPayloadSchema', () => {
  it('accepts the socket error from the guide', () => {
    const payload = {
      code: 'NOT_YOUR_TURN',
      message: 'It is not your turn',
      event: 'battle:action',
    }

    expect(battleErrorPayloadSchema.parse(payload)).toEqual(payload)
  })

  it('accepts an error that does not name the rejected event', () => {
    const payload = { code: 'NOT_FOUND', message: 'Battle not found' }

    expect(battleErrorPayloadSchema.parse(payload)).toEqual(payload)
  })

  it('rejects a code the client has no mapping for', () => {
    const result = battleErrorPayloadSchema.safeParse({ code: 'TOO_SLOW', message: 'Too slow' })

    expect(result.success).toBe(false)
  })
})
