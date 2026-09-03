import { beforeEach, describe, expect, it } from 'vitest'

import { type PublicUser } from '@/shared/contracts'

import { SESSION_STORAGE_KEY, useSessionStore } from './session.store'

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' }

const user: PublicUser = {
  id: '3b9a1c4e-2f5d-4c8b-9a7e-6d5c4b3a2f1e',
  email: 'ada@arena.dev',
  username: 'ada',
  rating: 1216,
  createdAt: '2026-09-02T18:57:39.097Z',
}

function storedSession() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY)

  return raw === null ? null : (JSON.parse(raw) as { state: Record<string, unknown> }).state
}

describe('useSessionStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useSessionStore.getState().clear()
  })

  it('starts anonymous', () => {
    const state = useSessionStore.getState()

    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated()).toBe(false)
  })

  it('holds the token pair once it is set', () => {
    useSessionStore.getState().setTokens(tokens)

    expect(useSessionStore.getState().accessToken).toBe('access-1')
    expect(useSessionStore.getState().refreshToken).toBe('refresh-1')
    expect(useSessionStore.getState().isAuthenticated()).toBe(true)
  })

  it('replaces the whole pair on rotation instead of merging it', () => {
    useSessionStore.getState().setTokens(tokens)
    useSessionStore.getState().setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' })

    expect(useSessionStore.getState().accessToken).toBe('access-2')
    expect(useSessionStore.getState().refreshToken).toBe('refresh-2')
  })

  it('keeps the profile alongside the tokens', () => {
    useSessionStore.getState().setUser(user)

    expect(useSessionStore.getState().user).toEqual(user)
  })

  it('clears tokens and profile together', () => {
    useSessionStore.getState().setTokens(tokens)
    useSessionStore.getState().setUser(user)

    useSessionStore.getState().clear()

    const state = useSessionStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated()).toBe(false)
  })

  it('is not authenticated while only one half of the pair is present', () => {
    useSessionStore.setState({ accessToken: 'access-1', refreshToken: null })

    expect(useSessionStore.getState().isAuthenticated()).toBe(false)
  })

  it('mirrors the session into local storage', () => {
    useSessionStore.getState().setTokens(tokens)
    useSessionStore.getState().setUser(user)

    expect(storedSession()).toEqual({ ...tokens, user })
  })

  it('wipes the local storage mirror when the session is cleared', () => {
    useSessionStore.getState().setTokens(tokens)

    useSessionStore.getState().clear()

    expect(storedSession()).toEqual({ accessToken: null, refreshToken: null, user: null })
  })
})
