import { afterEach, describe, expect, it, vi } from 'vitest'

import { bindNavigate, navigation } from './navigation'

afterEach(() => {
  bindNavigate(null)
})

describe('navigation', () => {
  it('sends toArena to the battle route once a navigate function is bound', () => {
    const navigate = vi.fn()
    bindNavigate(navigate)

    navigation.toArena('battle-1')

    expect(navigate).toHaveBeenCalledWith('/battles/battle-1')
  })

  it('sends toLobby to the root once a navigate function is bound', () => {
    const navigate = vi.fn()
    bindNavigate(navigate)

    navigation.toLobby()

    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('does nothing before any navigate function is bound', () => {
    expect(() => {
      navigation.toLobby()
    }).not.toThrow()
  })
})
