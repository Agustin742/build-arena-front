import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/features/auth'

import { GuestOnly } from './GuestOnly'

const pair = { accessToken: 'access-1', refreshToken: 'refresh-1' }

function WhereAmI() {
  return <span data-testid="path">{useLocation().pathname}</span>
}

function renderAt(entry: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <WhereAmI />
      <Routes>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <p>the login console</p>
            </GuestOnly>
          }
        />
        <Route path="/" element={<p>the lobby</p>} />
        <Route path="/builds" element={<p>the builds screen</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GuestOnly', () => {
  beforeEach(() => {
    useSessionStore.getState().clear()
  })

  it('shows the console to a visitor with no session', () => {
    renderAt('/login')

    expect(screen.getByText('the login console')).toBeInTheDocument()
  })

  it('sends a player who already has a session to the lobby', () => {
    useSessionStore.getState().setTokens(pair)

    renderAt('/login')

    expect(screen.queryByText('the login console')).not.toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/')
  })

  it('returns the player to the screen that sent them here', () => {
    useSessionStore.getState().setTokens(pair)

    renderAt({ pathname: '/login', state: { from: '/builds' } })

    expect(screen.getByText('the builds screen')).toBeInTheDocument()
  })

  it('leaves the moment the session lands, without a reload', async () => {
    renderAt('/login')
    expect(screen.getByText('the login console')).toBeInTheDocument()

    await act(async () => {
      useSessionStore.getState().setTokens(pair)
      await Promise.resolve()
    })

    expect(screen.getByText('the lobby')).toBeInTheDocument()
  })
})
