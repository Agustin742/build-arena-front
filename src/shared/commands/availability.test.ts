import { describe, expect, it } from 'vitest'

import { available, blocked } from './availability'

describe('available', () => {
  it('returns an enabled availability with no reason', () => {
    expect(available()).toEqual({ enabled: true })
  })
})

describe('blocked', () => {
  it('returns a disabled availability carrying the given reason', () => {
    expect(blocked('necesita MAGIC 14')).toEqual({ enabled: false, reason: 'necesita MAGIC 14' })
  })

  it('carries a different reason through unchanged', () => {
    expect(blocked('sin builds no se puede desafiar')).toEqual({
      enabled: false,
      reason: 'sin builds no se puede desafiar',
    })
  })
})
