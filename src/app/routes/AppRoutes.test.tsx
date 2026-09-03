import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from './AppRoutes'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  it.each([
    ['/login', 'login'],
    ['/register', 'register'],
    ['/', 'lobby'],
    ['/builds', 'builds'],
    ['/builds/new', 'build wizard'],
    ['/builds/42', 'build detail'],
    ['/friends', 'friends'],
    ['/battles', 'battles'],
    ['/battles/42', 'arena'],
    ['/leaderboard', 'leaderboard'],
  ])('renders the %s screen', (path, screenName) => {
    renderAt(path)

    expect(screen.getByRole('heading', { name: screenName })).toBeInTheDocument()
  })

  it('renders a not found screen for an unknown deep route', () => {
    renderAt('/battles/42/does-not-exist')

    expect(screen.getByRole('heading', { name: 'not found' })).toBeInTheDocument()
  })

  it('keeps the app shell around every screen', () => {
    renderAt('/leaderboard')

    expect(screen.getByRole('banner')).toHaveTextContent('build arena')
  })
})
