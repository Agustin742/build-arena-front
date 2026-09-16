import { useEffect } from 'react'

import { type BattleSocket } from '@/shared/realtime'

interface ConnectionOwnership {
  battleId: string
  releaseTimer: ReturnType<typeof setTimeout> | null
}

/**
 * Tracked outside React on purpose: a genuine route unmount+remount (spec's "Same-battle
 * remount keeps a single connection") destroys any `useRef` the unmounted instance held, so
 * only state scoped to the stable `socket` singleton can survive across that boundary.
 */
const ownershipBySocket = new WeakMap<BattleSocket, ConnectionOwnership>()

function scheduleRelease(socket: BattleSocket): () => void {
  return () => {
    const owned = ownershipBySocket.get(socket)

    if (owned === undefined) {
      return
    }

    owned.releaseTimer = setTimeout(() => {
      if (ownershipBySocket.get(socket) === owned) {
        socket.disconnect()
        ownershipBySocket.delete(socket)
      }
    }, 0)
  }
}

/**
 * The only caller of `connect`/`join`/`disconnect` for the arena route (design D2). A
 * StrictMode double mount, or a real unmount immediately followed by a remount for the same
 * `battleId`, must not visibly disconnect: the cleanup defers `disconnect` by one tick, and a
 * same-battle remount cancels that pending release before it fires.
 */
export function useArenaConnection(
  socket: BattleSocket,
  battleId: string,
  getToken: () => string | null,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const owned = ownershipBySocket.get(socket)

    if (owned !== undefined && owned.battleId === battleId) {
      if (owned.releaseTimer !== null) {
        clearTimeout(owned.releaseTimer)
        owned.releaseTimer = null
      }

      return scheduleRelease(socket)
    }

    const token = getToken()

    if (token === null) {
      return
    }

    socket.connect(token)
    socket.join(battleId)
    ownershipBySocket.set(socket, { battleId, releaseTimer: null })

    return scheduleRelease(socket)
  }, [socket, battleId, getToken, enabled])
}
