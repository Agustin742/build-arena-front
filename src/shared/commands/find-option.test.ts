import { describe, expect, it } from 'vitest'

import { findOption } from './find-option'
import { type CommandOption } from './types'

const GRACE: CommandOption = { id: 'grace-uuid', key: '1', label: 'grace' }
const ADA: CommandOption = { id: 'ada-uuid', key: '2', label: 'ada' }
const LOCKED: CommandOption = { id: 'turing-uuid', key: '3', label: 'turing', lockedReason: 'no' }

const OPTIONS = [GRACE, ADA, LOCKED]

describe('findOption', () => {
  it('takes the number the list showed', () => {
    expect(findOption(OPTIONS, '2')).toBe(ADA)
  })

  it('takes the label, whatever case it was typed in', () => {
    expect(findOption(OPTIONS, 'GRACE')).toBe(GRACE)
  })

  it('ignores the spaces around what was typed', () => {
    expect(findOption(OPTIONS, '  ada  ')).toBe(ADA)
  })

  it('takes the id, for whoever happens to have one', () => {
    expect(findOption(OPTIONS, 'grace-uuid')).toBe(GRACE)
  })

  it('lets the key win over a label that looks like a number', () => {
    const numeric = [
      { id: 'first', key: '1', label: '2' },
      { id: 'second', key: '2', label: 'dos' },
    ]

    expect(findOption(numeric, '2')).toMatchObject({ id: 'second' })
  })

  it('still finds a locked row, because refusing it is the caller’s job', () => {
    expect(findOption(OPTIONS, '3')).toBe(LOCKED)
  })

  it('finds nothing outside the list', () => {
    expect(findOption(OPTIONS, 'hopper')).toBeUndefined()
    expect(findOption(OPTIONS, '9')).toBeUndefined()
    expect(findOption(OPTIONS, '')).toBeUndefined()
  })

  it('falls back to the position when the options carry no keys', () => {
    expect(findOption([{ id: 'only', label: 'sola' }], '1')).toMatchObject({ id: 'only' })
  })
})
