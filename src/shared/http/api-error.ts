import { type z } from 'zod'

import {
  type ValidationError,
  validationErrorSchema,
  type ViolationEnvelope,
  violationEnvelopeSchema,
} from '@/shared/contracts'

interface ApiErrorInit {
  status: number | null
  payload: unknown
  cause?: unknown
}

export class ApiError extends Error {
  readonly status: number | null
  readonly payload: unknown
  readonly validation: ValidationError | undefined
  readonly violations: ViolationEnvelope | undefined

  constructor(message: string, init: ApiErrorInit) {
    super(message, init.cause === undefined ? undefined : { cause: init.cause })
    this.name = 'ApiError'
    this.status = init.status
    this.payload = init.payload

    const violations = violationEnvelopeSchema.safeParse(init.payload)
    this.violations = violations.success ? violations.data : undefined

    const validation = this.violations ? undefined : validationErrorSchema.safeParse(init.payload)
    this.validation = validation?.success === true ? validation.data : undefined
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isOffline() {
    return this.status === null
  }
}

export class SchemaError extends Error {
  readonly path: string
  readonly issues: z.core.$ZodIssue[]
  readonly payload: unknown

  constructor(path: string, issues: z.core.$ZodIssue[], payload: unknown) {
    super(`The response from ${path} does not match its contract`)
    this.name = 'SchemaError'
    this.path = path
    this.issues = issues
    this.payload = payload
  }
}
