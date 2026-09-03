import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { type PublicUser, type TokenPair } from '@/shared/contracts'

export const SESSION_STORAGE_KEY = 'build-arena.session'

interface SessionState {
  accessToken: string | null
  refreshToken: string | null
  user: PublicUser | null
  isAuthenticated: () => boolean
  setTokens: (pair: TokenPair) => void
  setUser: (user: PublicUser | null) => void
  clear: () => void
}

const anonymous = {
  accessToken: null,
  refreshToken: null,
  user: null,
} satisfies Pick<SessionState, 'accessToken' | 'refreshToken' | 'user'>

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...anonymous,
      isAuthenticated: () => get().accessToken !== null && get().refreshToken !== null,
      setTokens: (pair) => {
        set({ accessToken: pair.accessToken, refreshToken: pair.refreshToken })
      },
      setUser: (user) => {
        set({ user })
      },
      clear: () => {
        set({ ...anonymous })
      },
    }),
    {
      name: SESSION_STORAGE_KEY,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)

export const sessionTokens = {
  getAccessToken: () => useSessionStore.getState().accessToken,
  getRefreshToken: () => useSessionStore.getState().refreshToken,
  setTokens: (pair: TokenPair) => {
    useSessionStore.getState().setTokens(pair)
  },
  clear: () => {
    useSessionStore.getState().clear()
  },
}
