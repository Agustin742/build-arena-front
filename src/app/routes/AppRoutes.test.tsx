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

  it.each([
    ['/login', 'entrar'],
    ['/register', 'crear cuenta'],
  ])('mounts the auth console at %s', (path, title) => {
    renderAt(path)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })

  it.each([
    ['/', 'lobby'],
    ['/builds', 'builds'],
    ['/builds/new', 'build wizard'],
    ['/builds/42', 'build detail'],
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
    ['/'],
    ['/builds'],
    ['/builds/new'],
    ['/builds/42'],
    ['/friends'],
    ['/battles'],
    ['/battles/42'],
    ['/leaderboard'],
  ])('sends an anonymous visitor from %s to the login console', (path) => {
    renderAt(path)

    expect(screen.getByRole('heading', { name: 'entrar' })).toBeInTheDocument()
  })

  it('renders a not found screen for an unknown deep route', () => {
    renderAt('/battles/42/does-not-exist')

    expect(screen.getByRole('heading', { name: 'not found' })).toBeInTheDocument()
  })

  it('keeps the app shell around every screen', () => {
    useSessionStore.getState().setTokens(pair)

    renderAt('/leaderboard')

    expect(screen.getByRole('banner')).toHaveTextContent('build arena')
  })
})
