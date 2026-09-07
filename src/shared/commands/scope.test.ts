import { describe, expect, it } from 'vitest'

import { deriveScopes } from './scope'
import { type CommandState } from './types'

describe('deriveScopes', () => {
  it('returns anonymous when there is no session', () => {
    const state: CommandState = {
      isAuthenticated: false,
      battleId: null,
      reactionWindowOpen: false,
    }

    expect(deriveScopes(state)).toEqual(['anonymous'])
  })

  it('returns lobby for a session with no active battle', () => {
    const state: CommandState = { isAuthenticated: true, battleId: null, reactionWindowOpen: false }

    expect(deriveScopes(state)).toEqual(['lobby'])
  })

  it('returns battle for an active battle with no open reaction window', () => {
    const state: CommandState = {
      isAuthenticated: true,
      battleId: 'battle-1',
      reactionWindowOpen: false,
    }

    expect(deriveScopes(state)).toEqual(['battle'])
  })

  it('returns battle and reaction-window together when a reaction window is open', () => {
    const state: CommandState = {
      isAuthenticated: true,
      battleId: 'battle-1',
      reactionWindowOpen: true,
    }

    expect(deriveScopes(state)).toEqual(['battle', 'reaction-window'])
  })
})

describe('deriveScopes inside a menu', () => {
  it('swaps the lobby for the menu the console opened', () => {
    const state: CommandState = {
      isAuthenticated: true,
      battleId: null,
      reactionWindowOpen: false,
      menu: 'builds',
    }

    expect(deriveScopes(state)).toEqual(['builds'])
  })

  it('swaps the lobby for any other menu just the same', () => {
    const state: CommandState = {
      isAuthenticated: true,
      battleId: null,
      reactionWindowOpen: false,
      menu: 'friends',
    }

    expect(deriveScopes(state)).toEqual(['friends'])
  })

  it('stays in the lobby while no menu is open', () => {
    const state: CommandState = {
      isAuthenticated: true,
      battleId: null,
      reactionWindowOpen: false,
      menu: null,
    }

    expect(deriveScopes(state)).toEqual(['lobby'])
  })

  it('lets a battle outrank any menu left open, because a battle cannot wait', () => {
    const state: CommandState = {
      isAuthenticated: true,
      battleId: 'battle-1',
      reactionWindowOpen: false,
      menu: 'builds',
    }

    expect(deriveScopes(state)).toEqual(['battle'])
  })

  it('keeps a menu out of reach of a player with no session', () => {
    const state: CommandState = {
      isAuthenticated: false,
      battleId: null,
      reactionWindowOpen: false,
      menu: 'builds',
    }

    expect(deriveScopes(state)).toEqual(['anonymous'])
  })
})
