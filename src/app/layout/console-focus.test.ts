import { describe, expect, it } from 'vitest'

import { type PendingStep } from '@/app/providers/command-runtime'

import { focusOf, hasOutput } from './console-focus'

const step: PendingStep = {
  arg: { name: 'player', kind: 'pick', label: 'A quién', required: true },
  index: 1,
  total: 1,
  group: null,
}

describe('hasOutput', () => {
  it('has nothing to show before any command has run', () => {
    expect(hasOutput(null)).toBe(false)
  })

  it('has nothing to show for a result with no headline and no lines', () => {
    expect(hasOutput({ status: 'ok' })).toBe(false)
    expect(hasOutput({ status: 'ok', lines: [] })).toBe(false)
  })

  it('shows a headline on its own', () => {
    expect(hasOutput({ status: 'ok', message: 'Sesión cerrada' })).toBe(true)
  })

  it('shows lines even without a headline', () => {
    expect(hasOutput({ status: 'ok', lines: ['1) POWER_STRIKE'] })).toBe(true)
  })
})

describe('focusOf', () => {
  it('focuses the question while a step is open, even with output on screen', () => {
    expect(focusOf(step, { status: 'ok', message: 'Catálogo' })).toBe('question')
  })

  it('focuses the output once something printed and nothing is being asked', () => {
    expect(focusOf(null, { status: 'ok', lines: ['1) Golpe potente'] })).toBe('output')
  })

  it('focuses the screen while there is nothing to read and nothing asked', () => {
    expect(focusOf(null, null)).toBe('screen')
  })

  it('never focuses an output box that would render nothing', () => {
    expect(focusOf(null, { status: 'ok', lines: [] })).toBe('screen')
  })
})
