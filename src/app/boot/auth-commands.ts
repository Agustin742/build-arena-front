import {
  type AuthSession,
  createAuthApi,
  createAuthCommands,
  useSessionStore,
} from '@/features/auth'
import { type Command } from '@/shared/commands'

import { apiClient } from './api-client'

const session: AuthSession = {
  getRefreshToken: () => useSessionStore.getState().refreshToken,
  setTokens: (pair) => {
    useSessionStore.getState().setTokens(pair)
  },
  setUser: (user) => {
    useSessionStore.getState().setUser(user)
  },
  clear: () => {
    useSessionStore.getState().clear()
  },
}

export const authCommands: readonly Command[] = createAuthCommands({
  api: createAuthApi(apiClient),
  session,
})
