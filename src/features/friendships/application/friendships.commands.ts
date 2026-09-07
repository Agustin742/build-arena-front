import { type QueryClient } from '@tanstack/react-query'

import {
  available,
  type Command,
  type CommandResult,
  type MenuControl,
  type ParsedArgs,
} from '@/shared/commands'
import { type PublicFriendship, type PublicPlayer } from '@/shared/contracts'
import { ApiError, toGameMessage, toViolationMessages } from '@/shared/http'

import { removalOf } from '../domain/relation'
import { type FriendshipsApi } from '../infrastructure/friendships.api'
import { friendshipHeadline, friendshipLines, orderedFriendships } from './friendship-lines'
import { acceptLock, removalDone } from './friendship-messages'
import {
  acceptOptions,
  candidateOptions,
  findFriendship,
  removalOptions,
} from './friendship-picker'
import { cachedFriendships, fetchFriendships } from './friendship-queries'

/**
 * Where addable players come from. The ranking is the only list of strangers the arena
 * publishes, and it belongs to another feature — so this asks for it instead of importing
 * it, and the app decides what fills it.
 */
export interface RivalSource {
  /** Best effort: the menu opens whether or not the ranking arrives. */
  warm: () => Promise<unknown>
  cached: () => readonly PublicPlayer[]
}

export interface FriendshipCommandDeps {
  client: QueryClient
  api: FriendshipsApi
  menu: MenuControl
  rivals: RivalSource
  /** Whoever is reading, so the ranking never offers them themselves. */
  self?: (() => string | null) | undefined
}

const NOT_FOUND = 'No encontré esa solicitud'
const GONE = 'Esa solicitud ya no está'
const REFUSED = 'La arena rechazó la solicitud'

/**
 * The arena answers a refused request with the complete array of broken rules. Everything
 * else falls back to the game message, which already knows what each status means.
 */
function refusalOf(error: unknown, byStatus: Readonly<Record<number, string>> = {}): CommandResult {
  const violations = toViolationMessages(error)

  if (violations.length > 0) {
    return { status: 'error', message: REFUSED, lines: violations }
  }

  if (error instanceof ApiError && error.status !== null) {
    const known = byStatus[error.status]

    if (known !== undefined) {
      return { status: 'error', message: known }
    }
  }

  return { status: 'error', message: toGameMessage(error) }
}

export function createFriendshipsCommands({
  client,
  api,
  menu,
  rivals,
  self,
}: FriendshipCommandDeps): Command[] {
  // Read when a step is drawn, not when the command is registered: a request can land
  // while the player is standing in the menu reading the list.
  const ordered = (): PublicFriendship[] => orderedFriendships(cachedFriendships(client) ?? [])

  function pick(values: ParsedArgs): PublicFriendship | undefined {
    return findFriendship(ordered(), values.friendship ?? '')
  }

  const chooseRow = {
    name: 'friendship',
    kind: 'pick' as const,
    label: 'Cuál',
    required: true,
  }

  /** Reading the list back is what keeps the numbers pointing at the same rows. */
  async function reread(): Promise<void> {
    try {
      await fetchFriendships(client, api)
    } catch {
      // The write already went through. A list that failed to come back is the next
      // command's problem, not a reason to tell the player their request did not land.
    }
  }

  return [
    {
      id: 'friends',
      label: 'FRIENDS',
      hint: 'tus amistades y solicitudes',
      aliases: ['friends', 'amigos'],
      args: [],
      scope: ['lobby'],
      availability: available,
      run: async (): Promise<CommandResult> => {
        let list

        try {
          list = await fetchFriendships(client, api)
        } catch (error) {
          // Stay in the lobby. A menu whose every command needs a list that never arrived
          // is a room with nothing in it.
          return { status: 'error', message: toGameMessage(error) }
        }

        // The ranking is a convenience for `friend add`, not a condition for the menu, so
        // a failure here costs the player the suggestions and nothing else.
        await rivals.warm().catch(() => undefined)

        menu.open('friends')

        return {
          status: 'ok',
          message: friendshipHeadline(list),
          lines: friendshipLines(orderedFriendships(list)),
        }
      },
    },
    {
      id: 'friend-add',
      label: 'FRIEND ADD',
      hint: 'mandarle solicitud a alguien',
      aliases: ['friend add'],
      args: [
        {
          name: 'player',
          kind: 'pick',
          label: 'A quién',
          // The list is a courtesy, not the authority: an id shared by hand is still a
          // legal answer, and the arena is the one that judges it.
          prompt: 'Elegí a alguien del ranking, o pegá su id si te lo pasaron',
          required: true,
          options: () =>
            candidateOptions(rivals.cached(), {
              friendships: ordered(),
              selfId: self?.() ?? null,
            }),
        },
      ],
      scope: ['friends'],
      availability: available,
      run: async (values): Promise<CommandResult> => {
        const target = values.player ?? ''
        const named = rivals.cached().find((player) => player.id === target)

        try {
          await api.request(target)
        } catch (error) {
          return refusalOf(error, { 404: 'Ese jugador no existe' })
        }

        await reread()

        return {
          status: 'ok',
          message: `Le mandaste solicitud a ${named?.username ?? 'ese jugador'}`,
        }
      },
    },
    {
      id: 'friend-ok',
      label: 'FRIEND OK',
      hint: 'aceptar una solicitud',
      aliases: ['friend ok'],
      args: [
        {
          ...chooseRow,
          prompt: 'Elegí la solicitud que querés aceptar',
          options: () => acceptOptions(ordered()),
        },
      ],
      scope: ['friends'],
      availability: available,
      run: async (values): Promise<CommandResult> => {
        const target = pick(values)

        if (target === undefined) {
          return { status: 'error', message: NOT_FOUND }
        }

        // The same refusal the locked option carries, for the player who typed the number
        // instead of clicking the row. One door, closed from both sides.
        const locked = acceptLock(target)

        if (locked !== undefined) {
          return { status: 'error', message: locked }
        }

        try {
          await api.accept(target.id)
        } catch (error) {
          return refusalOf(error, { 403: 'Esa solicitud no es tuya para aceptar', 404: GONE })
        }

        await reread()

        return { status: 'ok', message: `Ahora sos amigo de ${target.player.username}` }
      },
    },
    {
      id: 'friend-rm',
      label: 'FRIEND RM',
      hint: 'rechazar, cancelar o eliminar',
      aliases: ['friend rm'],
      args: [
        {
          ...chooseRow,
          // One verb for three things, so the option itself has to say which one it is.
          prompt: 'Elegí a quién sacar de la lista',
          options: () => removalOptions(ordered()),
        },
      ],
      scope: ['friends'],
      availability: available,
      run: async (values): Promise<CommandResult> => {
        const target = pick(values)

        if (target === undefined) {
          return { status: 'error', message: NOT_FOUND }
        }

        const removal = removalOf(target)

        try {
          await api.remove(target.id)
        } catch (error) {
          return refusalOf(error, { 404: GONE })
        }

        await reread()

        return { status: 'ok', message: removalDone(removal, target.player.username) }
      },
    },
    {
      id: 'friend-back',
      label: 'VOLVER',
      hint: 'salir de tus amistades',
      aliases: ['back', 'volver'],
      args: [],
      scope: ['friends'],
      availability: available,
      run: (): Promise<CommandResult> => {
        menu.close()

        return Promise.resolve({ status: 'ok', message: 'Volviste al lobby' })
      },
    },
  ]
}
