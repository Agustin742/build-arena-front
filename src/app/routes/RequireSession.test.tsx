import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/features/auth'

import { RequireSession } from './RequireSession'

const pair = { accessToken: 'access-1', refreshToken: 'refresh-1' }

function LoginProbe() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  return <p>login screen, from {from ?? 'nowhere'}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/builds"
          element={
            <RequireSession>
              <p>the builds screen</p>
            </RequireSession>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireSession', () => {
  beforeEach(() => {
    useSessionStore.getState().clear()
  })

  it('lets a player with a session through', () => {
    useSessionStore.getState().setTokens(pair)

    renderAt('/builds')

    expect(screen.getByText('the builds screen')).toBeInTheDocument()
  })

  it('sends an anonymous visitor to the login screen', () => {
    renderAt('/builds')

    expect(screen.queryByText('the builds screen')).not.toBeInTheDocument()
    expect(screen.getByText(/login screen/)).toBeInTheDocument()
  })

  it('remembers where the visitor was headed', () => {
    renderAt('/builds')

    expect(screen.getByText('login screen, from /builds')).toBeInTheDocument()
  })

  it('treats half a token pair as no session at all', () => {
    useSessionStore.setState({ accessToken: 'access-1', refreshToken: null })

    renderAt('/builds')

    expect(screen.getByText(/login screen/)).toBeInTheDocument()
  })
})
