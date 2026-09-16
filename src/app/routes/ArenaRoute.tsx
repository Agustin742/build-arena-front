import { useParams } from 'react-router'

import { battleSocket } from '@/app/boot/battle-socket'
import { useArenaConnection } from '@/features/arena'
import { useSessionStore } from '@/features/auth'
import { type BattleSocket, useBattleStore } from '@/shared/realtime'

/**
 * A stable reference, unlike an inline arrow: `useArenaConnection`'s effect depends on it, so
 * a fresh function every render would reconnect on every render too.
 */
function getAccessToken(): string | null {
  return useSessionStore.getState().accessToken
}

interface ArenaRouteProps {
  socket?: BattleSocket
  getToken?: () => string | null
}

/**
 * The screen at `/battles/:battleId`. Only PR 1g's `ArenaScreen` fragment replaces this text
 * once the battle is `live`; for now it only proves the connection is owned and shown.
 */
export function ArenaRoute({ socket = battleSocket, getToken = getAccessToken }: ArenaRouteProps) {
  const { battleId } = useParams<{ battleId: string }>()
  const connection = useBattleStore((battle) => battle.connection)

  useArenaConnection(socket, battleId ?? '', getToken, battleId !== undefined)

  return <p>{connection === 'open' ? 'Conectado' : 'Conectando…'}</p>
}
