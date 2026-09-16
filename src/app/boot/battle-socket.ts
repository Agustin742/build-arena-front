import { useSessionStore } from '@/features/auth'
import { env } from '@/shared/config'
import { createBattleSocket } from '@/shared/realtime'

/**
 * Mirrors api-client.ts: the session store fires on every `set`, so the equality check that
 * turns that into an access-token change lives here, not inside `shared/realtime` (D1).
 */
export const battleSocket = createBattleSocket({
  url: env.apiUrl,
  subscribeToAccessToken: (listener) => {
    let previous = useSessionStore.getState().accessToken

    return useSessionStore.subscribe((state) => {
      const next = state.accessToken

      if (next !== previous) {
        previous = next
        listener(next)
      }
    })
  },
})
