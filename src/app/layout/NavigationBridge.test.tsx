import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { bindNavigate, navigation } from '@/app/boot/navigation'

import { NavigationBridge } from './NavigationBridge'

afterEach(() => {
  bindNavigate(null)
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavigationBridge />
      <Routes>
        <Route path="/" element={<p>the lobby screen</p>} />
        <Route path="/battles/:battleId" element={<p>the arena screen</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('NavigationBridge', () => {
  it('hands the router navigate function to the ArenaNavigation port on mount', () => {
    renderAt('/battles/42')

    navigation.toLobby()

    expect(screen.getByText('the lobby screen')).toBeInTheDocument()
  })

  it('sends the arena navigation to the given battle', () => {
    renderAt('/')

    navigation.toArena('42')

    expect(screen.getByText('the arena screen')).toBeInTheDocument()
  })

  it('unbinds on unmount, so a stray navigate call does nothing', () => {
    const { unmount } = renderAt('/')
    unmount()

    expect(() => {
      navigation.toLobby()
    }).not.toThrow()
  })
})
