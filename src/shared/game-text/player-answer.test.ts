import { describe, expect, it } from 'vitest'

import { type CommandOption } from '@/shared/commands'

import { resolvePlayerAnswer } from './player-answer'

const OFFERED: CommandOption[] = [
  { id: 'turing-id', key: '1', label: 'turing' },
  { id: 'grace-id', key: '2', label: 'grace' },
]

const PASTED = '9f8e7d6c-5b4a-4392-8180-7f6e5d4c3b2a'

describe('resolvePlayerAnswer', () => {
  it('takes the number the list showed', () => {
    expect(resolvePlayerAnswer(OFFERED, '2')).toEqual({ id: 'grace-id' })
  })

  it('takes the username, whatever case it was typed in', () => {
    expect(resolvePlayerAnswer(OFFERED, 'TURING')).toEqual({ id: 'turing-id' })
  })

  it('takes an id that is already on the list', () => {
    expect(resolvePlayerAnswer(OFFERED, 'grace-id')).toEqual({ id: 'grace-id' })
  })

  it('lets a real id through even when no list was ever loaded', () => {
    expect(resolvePlayerAnswer([], PASTED)).toEqual({ id: PASTED })
  })

  it('refuses a name nobody on the list answers to, and says why', () => {
    expect(resolvePlayerAnswer(OFFERED, 'hopper')).toEqual({
      refusal: {
        message: 'No encontré a nadie que se llame "hopper"',
        lines: [
          'La arena no tiene buscador: elegí de la lista, o pegá el id que te hayan pasado',
          'Cada uno consigue el suyo con el comando me',
        ],
      },
    })
  })

  it('refuses an empty answer the same way', () => {
    expect(resolvePlayerAnswer(OFFERED, '   ')).toMatchObject({
      refusal: { message: 'No encontré a nadie que se llame ""' },
    })
  })

  it('refuses something that only looks like an id', () => {
    expect(resolvePlayerAnswer(OFFERED, 'not-a-uuid-at-all')).toMatchObject({
      refusal: { message: 'No encontré a nadie que se llame "not-a-uuid-at-all"' },
    })
  })
})
