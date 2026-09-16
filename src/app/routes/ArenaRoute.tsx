import { useParams } from 'react-router'

import { battleSocket } from '@/app/boot/battle-socket'
import { useArenaConnection } from '@/features/arena'
import { sessionTokens } from '@/features/auth'
import { type BattleSocket, useBattleStore } from '@/shared/realtime'

interface ArenaRouteProps {
  socket?: BattleSocket
  getToken?: () => string | null
}

/**
 * The screen at `/battles/:battleId`. Only PR 1g's `ArenaScreen` fragment replaces this text
 * once the battle is `live`; for now it only proves the connection is owned and shown.
 *
 * `getToken` defaults to `sessionTokens.getAccessToken`, already a stable module-level
 * reference (the same one `api-client.ts` uses): `useArenaConnection`'s effect depends on
 * it, so a fresh function every render would reconnect on every render too.
 */
export function ArenaRoute({
  socket = battleSocket,
  getToken = sessionTokens.getAccessToken,
}: ArenaRouteProps) {
  const { battleId } = useParams<{ battleId: string }>()
  const connection = useBattleStore((battle) => battle.connection)

  useArenaConnection(socket, battleId ?? '', getToken, battleId !== undefined)

  return <p>{connection === 'open' ? 'Conectado' : 'Conectando…'}</p>
}
