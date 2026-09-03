import { describe, expect, it } from 'vitest'

import { deriveScopes } from './scope'
import { type CommandState } from './types'

describe('deriveScopes', () => {
  it('returns anonymous when there is no session', () => {
    const state: CommandState = { isAuthenticated: false, battleId: null, reactionWindowOpen: false }

    expect(deriveScopes(state)).toEqual(['anonymous'])
  })

  it('returns lobby for a session with no active battle', () => {
    const state: CommandState = { isAuthenticated: true, battleId: null, reactionWindowOpen: false }

    expect(deriveScopes(state)).toEqual(['lobby'])
  })

  it('returns battle for an active battle with no open reaction window', () => {
    const state: CommandState = { isAuthenticated: true, battleId: 'battle-1', reactionWindowOpen: false }

    expect(deriveScopes(state)).toEqual(['battle'])
  })

  it('returns battle and reaction-window together when a reaction window is open', () => {
    const state: CommandState = { isAuthenticated: true, battleId: 'battle-1', reactionWindowOpen: true }

    expect(deriveScopes(state)).toEqual(['battle', 'reaction-window'])
  })
})
