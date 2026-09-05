import { useEffect, useRef } from 'react'

import { type PublicUser } from '@/shared/contracts'
import { ApiError } from '@/shared/http'

import { useSessionStore } from './session.store'

interface UseSessionBootstrapOptions {
  fetchProfile: () => Promise<PublicUser>
}

function rejectedByTheArena(error: unknown): boolean {
  return error instanceof ApiError && error.status !== null
}

export function useSessionBootstrap({ fetchProfile }: UseSessionBootstrapOptions): void {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      return
    }

    started.current = true

    const { accessToken, refreshToken, user, setUser, clear } = useSessionStore.getState()

    if (accessToken === null || refreshToken === null || user !== null) {
      return
    }

    fetchProfile().then(setUser, (cause: unknown) => {
      if (rejectedByTheArena(cause)) {
        clear()
      }
    })
  }, [fetchProfile])
}
