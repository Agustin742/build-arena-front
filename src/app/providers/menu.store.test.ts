import { beforeEach, describe, expect, it } from 'vitest'

import { useMenuStore } from './menu.store'

describe('useMenuStore', () => {
  beforeEach(() => {
    useMenuStore.getState().close()
  })

  it('starts in the lobby, inside no menu at all', () => {
    expect(useMenuStore.getState().menu).toBeNull()
  })

  it('remembers the menu the console stepped into', () => {
    useMenuStore.getState().open('builds')

    expect(useMenuStore.getState().menu).toBe('builds')
  })

  it('steps back out', () => {
    useMenuStore.getState().open('builds')
    useMenuStore.getState().close()

    expect(useMenuStore.getState().menu).toBeNull()
  })

  it('closing a menu nobody opened changes nothing', () => {
    useMenuStore.getState().close()

    expect(useMenuStore.getState().menu).toBeNull()
  })
})
