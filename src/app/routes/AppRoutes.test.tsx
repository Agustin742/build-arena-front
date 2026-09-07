import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/features/auth'

import { AppRoutes } from './AppRoutes'

const pair = { accessToken: 'access-1', refreshToken: 'refresh-1' }

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  beforeEach(() => {
    useSessionStore.getState().clear()
  })

  it.each([['/login'], ['/register']])('offers the way in at %s', (path) => {
    renderAt(path)

    expect(screen.getByText('LOGIN')).toBeInTheDocument()
    expect(screen.getByText('REGISTER')).toBeInTheDocument()
  })

  it.each([
    ['/', 'lobby'],
    ['/friends', 'friends'],
    ['/battles', 'battles'],
    ['/battles/42', 'arena'],
    ['/leaderboard', 'leaderboard'],
  ])('renders the %s screen to a player with a session', (path, screenName) => {
    useSessionStore.getState().setTokens(pair)

    renderAt(path)

    expect(screen.getByRole('heading', { name: screenName })).toBeInTheDocument()
  })

  it.each([
    ['/', 'lobby'],
    ['/friends', 'friends'],
    ['/battles', 'battles'],
    ['/battles/42', 'arena'],
    ['/leaderboard', 'leaderboard'],
  ])('sends an anonymous visitor from %s to the way in', (path, screenName) => {
    renderAt(path)

    expect(screen.queryByRole('heading', { name: screenName })).not.toBeInTheDocument()
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })

  it('keeps the console on every screen behind the session', () => {
    useSessionStore.getState().setTokens(pair)

    renderAt('/leaderboard')

    expect(screen.getByRole('heading', { name: 'leaderboard' })).toBeInTheDocument()
    expect(screen.getByText('LOGOUT')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders a not found screen for an unknown deep route', () => {
    useSessionStore.getState().setTokens(pair)

    renderAt('/battles/42/does-not-exist')

    expect(screen.getByRole('heading', { name: 'not found' })).toBeInTheDocument()
  })

  it('leaves the design screen outside the console, with its own runtime', () => {
    renderAt('/design')

    expect(screen.getByRole('heading', { name: 'Panel' })).toBeInTheDocument()
    expect(screen.queryByText('LOGIN')).not.toBeInTheDocument()
  })

  it('keeps the app shell around every screen', () => {
    useSessionStore.getState().setTokens(pair)

    renderAt('/leaderboard')

    expect(screen.getByRole('banner')).toHaveTextContent('build arena')
  })
})

describe('the routes builds used to have', () => {
  it.each(['/builds', '/builds/new', '/builds/42'])(
    'sends %s to the not found screen, because builds live in the console now',
    (path) => {
      useSessionStore.getState().setTokens(pair)

      renderAt(path)

      expect(screen.getByRole('heading', { name: 'not found' })).toBeInTheDocument()
    },
  )
})
