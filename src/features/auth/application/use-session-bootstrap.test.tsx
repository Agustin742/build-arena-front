import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/http'

import { useSessionStore } from './session.store'
import { useSessionBootstrap } from './use-session-bootstrap'

const profile = {
  id: '3b9a1c4e-2f5d-4c8b-9a7e-6d5c4b3a2f1e',
  email: 'ada@arena.dev',
  username: 'ada',
  rating: 1200,
  createdAt: '2026-09-04T10:15:00.000Z',
}

const pair = { accessToken: 'access-1', refreshToken: 'refresh-1' }

describe('useSessionBootstrap', () => {
  beforeEach(() => {
    useSessionStore.getState().clear()
  })

  it('recovers the profile when a stored session has tokens but no user', async () => {
    useSessionStore.getState().setTokens(pair)
    const fetchProfile = vi.fn(() => Promise.resolve(profile))

    renderHook(() => {
      useSessionBootstrap({ fetchProfile })
    })

    await waitFor(() => {
      expect(useSessionStore.getState().user).toEqual(profile)
    })
    expect(fetchProfile).toHaveBeenCalledTimes(1)
  })

  it('asks for nothing when there is no stored session', () => {
    const fetchProfile = vi.fn(() => Promise.resolve(profile))

    renderHook(() => {
      useSessionBootstrap({ fetchProfile })
    })

    expect(fetchProfile).not.toHaveBeenCalled()
  })

  it('asks for nothing when the profile is already there', () => {
    useSessionStore.getState().setTokens(pair)
    useSessionStore.getState().setUser(profile)
    const fetchProfile = vi.fn(() => Promise.resolve(profile))

    renderHook(() => {
      useSessionBootstrap({ fetchProfile })
    })

    expect(fetchProfile).not.toHaveBeenCalled()
  })

  it('drops a session the arena no longer accepts', async () => {
    useSessionStore.getState().setTokens(pair)
    const fetchProfile = vi.fn(() =>
      Promise.reject(new ApiError('nope', { status: 401, payload: undefined })),
    )

    renderHook(() => {
      useSessionBootstrap({ fetchProfile })
    })

    await waitFor(() => {
      expect(useSessionStore.getState().accessToken).toBeNull()
    })
  })

  it('keeps the tokens when the arena could not be reached at all', async () => {
    useSessionStore.getState().setTokens(pair)
    const fetchProfile = vi.fn(() =>
      Promise.reject(new ApiError('offline', { status: null, payload: undefined })),
    )

    renderHook(() => {
      useSessionBootstrap({ fetchProfile })
    })

    await waitFor(() => {
      expect(fetchProfile).toHaveBeenCalled()
    })

    expect(useSessionStore.getState().accessToken).toBe('access-1')
    expect(useSessionStore.getState().refreshToken).toBe('refresh-1')
  })

  it('runs once, not on every render', async () => {
    useSessionStore.getState().setTokens(pair)
    const fetchProfile = vi.fn(() => Promise.resolve(profile))

    const { rerender } = renderHook(() => {
      useSessionBootstrap({ fetchProfile })
    })

    await waitFor(() => {
      expect(useSessionStore.getState().user).toEqual(profile)
    })

    rerender()
    rerender()

    expect(fetchProfile).toHaveBeenCalledTimes(1)
  })
})
