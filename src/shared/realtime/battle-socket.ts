import { io } from 'socket.io-client'
import { type z } from 'zod'

import {
  battleEndedPayloadSchema,
  battleErrorPayloadSchema,
  battleOpponentLeftPayloadSchema,
  battleReactionWindowPayloadSchema,
  battleRoundStartPayloadSchema,
  battleStatePayloadSchema,
  battleTurnResolvedPayloadSchema,
} from '@/shared/contracts'

import { type BattleState, type ConnectionState, useBattleStore } from './battle.store'

export type SubscribeToAccessToken = (
  listener: (accessToken: string | null) => void,
) => () => void

export interface SocketLike {
  auth: { token: string }
  on: (event: string, listener: (payload: unknown) => void) => void
  emit: (event: string, payload: unknown) => void
  connect: () => void
  disconnect: () => void
}

export interface BattleSocket {
  connect: (token: string) => void
  join: (battleId: string) => void
  declareAction: (battleId: string, skillCode: string) => void
  declareReaction: (battleId: string, skillCode: string | null) => void
  disconnect: () => void
}

export interface BattleSocketOptions {
  url: string
  subscribeToAccessToken: SubscribeToAccessToken
  openSocket?: ((url: string, auth: { token: string }) => SocketLike) | undefined
  store?: { getState: () => BattleState } | undefined
}

function defaultOpenSocket(url: string, auth: { token: string }): SocketLike {
  return io(url, { transports: ['websocket'], auth }) as unknown as SocketLike
}

function bindEvent<TValue>(
  socket: SocketLike,
  event: string,
  schema: z.ZodType<TValue>,
  apply: (payload: TValue) => void,
) {
  socket.on(event, (raw) => {
    const parsed = schema.safeParse(raw)

    if (parsed.success) {
      apply(parsed.data)
    }
  })
}

export function createBattleSocket(options: BattleSocketOptions): BattleSocket {
  const { url, subscribeToAccessToken, openSocket = defaultOpenSocket, store = useBattleStore } =
    options

  let socket: SocketLike | null = null
  let unsubscribeToken: (() => void) | null = null
  let joinedBattleId: string | null = null

  function setConnection(next: ConnectionState) {
    store.getState().setConnection(next)
  }

  function registerListeners(target: SocketLike) {
    target.on('connect', () => {
      setConnection('open')

      if (joinedBattleId !== null) {
        target.emit('battle:join', { battleId: joinedBattleId })
      }
    })

    target.on('connect_error', () => {
      socket = null
      setConnection('rejected')
    })

    target.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        socket = null
        setConnection('closed')
        return
      }

      if (reason === 'io client disconnect') {
        return
      }

      setConnection('connecting')
    })

    bindEvent(target, 'battle:state', battleStatePayloadSchema, (payload) => {
      store.getState().applyState(payload)
    })
    bindEvent(target, 'battle:round_start', battleRoundStartPayloadSchema, (payload) => {
      store.getState().applyRoundStart(payload)
    })
    bindEvent(target, 'battle:reaction_window', battleReactionWindowPayloadSchema, (payload) => {
      store.getState().applyReactionWindow(payload)
    })
    bindEvent(target, 'battle:turn_resolved', battleTurnResolvedPayloadSchema, (payload) => {
      store.getState().applyTurnResolved(payload)
    })
    bindEvent(target, 'battle:ended', battleEndedPayloadSchema, (payload) => {
      store.getState().applyEnded(payload)
    })
    bindEvent(target, 'battle:opponent_left', battleOpponentLeftPayloadSchema, (payload) => {
      store.getState().applyOpponentLeft(payload)
    })
    bindEvent(target, 'battle:error', battleErrorPayloadSchema, (payload) => {
      store.getState().applyError(payload)
    })
  }

  function teardownSocket() {
    socket?.disconnect()
    socket = null
  }

  function performTeardown() {
    teardownSocket()
    unsubscribeToken?.()
    unsubscribeToken = null
    joinedBattleId = null
    setConnection('closed')
    store.getState().reset()
  }

  function handleTokenChange(token: string | null) {
    if (joinedBattleId === null) {
      return
    }

    if (token === null) {
      performTeardown()
      return
    }

    setConnection('connecting')

    if (socket === null) {
      socket = openSocket(url, { token })
      registerListeners(socket)
      socket.connect()
      return
    }

    socket.auth.token = token
    socket.disconnect()
    socket.connect()
  }

  return {
    connect: (token) => {
      unsubscribeToken ??= subscribeToAccessToken(handleTokenChange)

      if (socket !== null) {
        return
      }

      setConnection('connecting')
      socket = openSocket(url, { token })
      registerListeners(socket)
      socket.connect()
    },
    join: (battleId) => {
      if (battleId !== joinedBattleId) {
        store.getState().reset()
      }

      joinedBattleId = battleId

      if (store.getState().connection === 'open') {
        socket?.emit('battle:join', { battleId })
      }
    },
    declareAction: (battleId, skillCode) => {
      socket?.emit('battle:action', { battleId, skillCode })
    },
    declareReaction: (battleId, skillCode) => {
      socket?.emit('battle:reaction', { battleId, skillCode })
    },
    disconnect: () => {
      performTeardown()
    },
  }
}
