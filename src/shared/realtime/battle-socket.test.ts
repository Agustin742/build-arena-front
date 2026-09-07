import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type BattleStatePayload, type CombatantView, type TurnView, type WindowView } from '@/shared/contracts'

import { createBattleSocket, type BattleSocketOptions, type SocketLike } from './battle-socket'
import { useBattleStore } from './battle.store'

const URL = 'wss://api.test'
const TOKEN_A = 'token-a'
const TOKEN_B = 'token-b'
const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '33333333-3333-4333-8333-333333333333'
const COMBATANT_A = '22222222-2222-4222-8222-222222222222'
const BATTLE_A = '44444444-4444-4444-8444-444444444444'
const BATTLE_B = '55555555-5555-4555-8555-555555555555'

function combatant(overrides: Partial<CombatantView> = {}): CombatantView {
  return {
    userId: USER_A,
    combatantId: COMBATANT_A,
    strength: 10,
    magic: 8,
    dexterity: 12,
    constitution: 14,
    armorClass: 15,
    maxHp: 30,
    currentHp: 30,
    initiative: 5,
    reactionAvailable: true,
    conditions: [],
    skillCodes: ['POWER_STRIKE'],
    ...overrides,
  }
}

function turn(overrides: Partial<TurnView> = {}): TurnView {
  return {
    round: 1,
    sequence: 1,
    actorId: USER_A,
    kind: 'ACTION',
    skillCode: 'POWER_STRIKE',
    attackRoll: 14,
    attackTotal: 18,
    targetValue: 15,
    hit: true,
    critical: false,
    damage: 6,
    ...overrides,
  }
}

function reactionWindow(overrides: Partial<WindowView> = {}): WindowView {
  return {
    round: 1,
    actorUserId: USER_B,
    actionSkillCode: 'FIREBALL',
    deadline: '2026-09-07T12:00:05.000Z',
    remainingMs: 5000,
    applicableSkillCodes: ['PARRY', 'DODGE'],
    ...overrides,
  }
}

function statePayload(overrides: Partial<BattleStatePayload> = {}): BattleStatePayload {
  return {
    battleId: BATTLE_A,
    status: 'IN_PROGRESS',
    currentRound: 2,
    activeUserId: USER_A,
    combatants: [combatant()],
    turns: [turn()],
    openWindow: null,
    opponentLeft: null,
    ...overrides,
  }
}

function fakeSocket() {
  const listeners = new Map<string, (payload: unknown) => void>()
  const on = vi.fn((event: string, listener: (payload: unknown) => void) => {
    listeners.set(event, listener)
  })
  const emit = vi.fn()
  const connect = vi.fn()
  const disconnect = vi.fn()

  const socket: SocketLike = {
    auth: { token: '' },
    on,
    emit,
    connect,
    disconnect,
  }

  return {
    socket,
    fire: (event: string, payload?: unknown) => {
      listeners.get(event)?.(payload)
    },
    on,
    emit,
    connect,
    disconnect,
  }
}

function fakeSession() {
  let listener: ((token: string | null) => void) | null = null
  const unsubscribe = vi.fn(() => {
    listener = null
  })

  return {
    subscribe: (next: (token: string | null) => void) => {
      listener = next
      return unsubscribe
    },
    rotate: (token: string | null) => {
      listener?.(token)
    },
    subscriberCount: () => (listener === null ? 0 : 1),
    unsubscribe,
  }
}

const ALL_LISTENERS = [
  'connect',
  'connect_error',
  'disconnect',
  'battle:state',
  'battle:round_start',
  'battle:reaction_window',
  'battle:turn_resolved',
  'battle:ended',
  'battle:opponent_left',
  'battle:error',
]

function setup() {
  const sock = fakeSocket()
  const session = fakeSession()
  const subscribeToAccessToken = vi.fn(session.subscribe)
  const openSocket = vi.fn(() => sock.socket)
  const options: BattleSocketOptions = { url: URL, subscribeToAccessToken, openSocket }
  const adapter = createBattleSocket(options)

  return { adapter, sock, session, subscribeToAccessToken, openSocket }
}

beforeEach(() => {
  useBattleStore.getState().reset()
  useBattleStore.getState().setConnection('idle')
})

describe('createBattleSocket', () => {
  describe('T1-T3: handshake', () => {
    it('registers each of the ten listeners exactly once on connect', () => {
      const { adapter, sock } = setup()

      adapter.connect(TOKEN_A)

      const registered = sock.on.mock.calls.map(([event]) => event)
      expect(registered).toHaveLength(ALL_LISTENERS.length)
      expect(new Set(registered).size).toBe(ALL_LISTENERS.length)
      for (const event of ALL_LISTENERS) {
        expect(registered).toContain(event)
      }
    })

    it('opens the connection and re-emits battle:join for the joined battle', () => {
      const { adapter, sock } = setup()

      adapter.connect(TOKEN_A)
      adapter.join(BATTLE_A)
      sock.fire('connect')

      expect(useBattleStore.getState().connection).toBe('open')
      expect(sock.emit).toHaveBeenCalledWith('battle:join', { battleId: BATTLE_A })
    })

    it('sets rejected on connect_error and leaves the session subscription alone', () => {
      const { adapter, sock, session } = setup()

      adapter.connect(TOKEN_A)
      sock.fire('connect_error', new Error('invalid token'))

      expect(useBattleStore.getState().connection).toBe('rejected')
      expect(session.unsubscribe).not.toHaveBeenCalled()
    })
  })

  describe('T4-T7: transport drop, server disconnect, and manual disconnect', () => {
    it('returns to connecting on a transport drop, and re-emits battle:join once the retry connects', () => {
      const { adapter, sock } = setup()

      adapter.connect(TOKEN_A)
      adapter.join(BATTLE_A)
      sock.fire('connect')
      sock.fire('disconnect', 'transport close')

      expect(useBattleStore.getState().connection).toBe('connecting')

      sock.fire('connect')

      expect(useBattleStore.getState().connection).toBe('open')
      expect(sock.emit).toHaveBeenNthCalledWith(2, 'battle:join', { battleId: BATTLE_A })
    })

    it('closes on a server-initiated disconnect with no retry', () => {
      const { adapter, sock } = setup()

      adapter.connect(TOKEN_A)
      sock.fire('connect')
      sock.fire('disconnect', 'io server disconnect')

      expect(useBattleStore.getState().connection).toBe('closed')
    })

    it('tears down the socket, unsubscribes, and resets the store on disconnect()', () => {
      const { adapter, sock, session } = setup()

      adapter.connect(TOKEN_A)
      adapter.join(BATTLE_A)
      sock.fire('connect')
      sock.fire('battle:state', statePayload())

      adapter.disconnect()

      expect(sock.disconnect).toHaveBeenCalledTimes(1)
      expect(session.unsubscribe).toHaveBeenCalledTimes(1)
      expect(useBattleStore.getState().connection).toBe('closed')
      expect(useBattleStore.getState().battleId).toBeNull()
    })

    it('is idempotent: a second disconnect() does not throw or re-run teardown', () => {
      const { adapter, sock } = setup()

      adapter.connect(TOKEN_A)
      sock.fire('connect')
      adapter.disconnect()

      expect(() => {
        adapter.disconnect()
      }).not.toThrow()
      expect(sock.disconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe('T8-T10: token rotation', () => {
    it('is a no-op when no battle is joined, including the token set on first login', () => {
      const { adapter, sock, session } = setup()

      adapter.connect(TOKEN_A)
      sock.fire('connect')

      session.rotate(TOKEN_B)

      expect(useBattleStore.getState().connection).toBe('open')
      expect(sock.connect).toHaveBeenCalledTimes(1)
      expect(sock.disconnect).not.toHaveBeenCalled()
    })

    it('reconnects and rejoins when a battle is joined, even before battle:state has ever arrived', () => {
      const { adapter, sock, session } = setup()

      adapter.connect(TOKEN_A)
      // join() happens before any 'connect' event: store.battleId is still null here.
      adapter.join(BATTLE_A)
      sock.fire('connect')
      expect(useBattleStore.getState().battleId).toBeNull()

      session.rotate(TOKEN_B)

      expect(useBattleStore.getState().connection).toBe('connecting')
      expect(sock.socket.auth.token).toBe(TOKEN_B)
      expect(sock.disconnect).toHaveBeenCalledTimes(1)
      expect(sock.connect).toHaveBeenCalledTimes(2)

      sock.fire('connect')

      expect(useBattleStore.getState().connection).toBe('open')
      expect(sock.emit).toHaveBeenNthCalledWith(2, 'battle:join', { battleId: BATTLE_A })
    })

    it('tears everything down when the token rotates to null', () => {
      const { adapter, sock, session } = setup()

      adapter.connect(TOKEN_A)
      adapter.join(BATTLE_A)
      sock.fire('connect')
      sock.fire('battle:state', statePayload())

      session.rotate(null)

      expect(sock.disconnect).toHaveBeenCalledTimes(1)
      expect(useBattleStore.getState().connection).toBe('closed')
      expect(useBattleStore.getState().battleId).toBeNull()
      expect(session.subscriberCount()).toBe(0)
    })
  })

  describe('subscription and payload hygiene', () => {
    it('reuses one token subscription and one socket across a double connect()', () => {
      const { adapter, subscribeToAccessToken, openSocket } = setup()

      adapter.connect(TOKEN_A)
      adapter.connect(TOKEN_A)

      expect(subscribeToAccessToken).toHaveBeenCalledTimes(1)
      expect(openSocket).toHaveBeenCalledTimes(1)
    })

    it('applies a well-formed battle:state payload', () => {
      const { adapter, sock } = setup()

      adapter.connect(TOKEN_A)
      sock.fire('connect')
      sock.fire('battle:state', statePayload())

      expect(useBattleStore.getState().battleId).toBe(BATTLE_A)
    })

    it('drops a malformed battle:state payload and runs no store action', () => {
      const { adapter, sock } = setup()

      adapter.connect(TOKEN_A)
      sock.fire('connect')
      sock.fire('battle:state', { totally: 'not-a-battle-state' })

      expect(useBattleStore.getState().battleId).toBeNull()
      expect(useBattleStore.getState().currentRound).toBe(0)
    })
  })

  describe('acceptance: scripted event sequence (frontend-guide.md §7)', () => {
    it('leaves the store as the guide describes, including a reconnect that closes and later reopens the window', () => {
      const { adapter, sock } = setup()

      adapter.connect(TOKEN_A)
      adapter.join(BATTLE_A)
      sock.fire('connect')

      sock.fire('battle:state', statePayload({ openWindow: reactionWindow() }))
      expect(useBattleStore.getState().openWindow).toEqual(reactionWindow())

      // A transport drop closes the window immediately, before any new event arrives.
      sock.fire('disconnect', 'transport close')
      expect(useBattleStore.getState().connection).toBe('connecting')
      expect(useBattleStore.getState().openWindow).toBeNull()

      // Reconnecting alone does not reopen it — only a server re-emit does.
      sock.fire('connect')
      expect(useBattleStore.getState().connection).toBe('open')
      expect(useBattleStore.getState().openWindow).toBeNull()

      sock.fire('battle:reaction_window', { ...reactionWindow(), battleId: BATTLE_A })
      expect(useBattleStore.getState().openWindow).toEqual(reactionWindow())

      sock.fire('battle:turn_resolved', {
        battleId: BATTLE_A,
        round: 1,
        turns: [turn({ sequence: 2, actorId: USER_B })],
        events: [],
        combatants: [combatant({ currentHp: 20 })],
        defeatedId: null,
      })
      expect(useBattleStore.getState().openWindow).toBeNull()
      expect(useBattleStore.getState().turns).toHaveLength(2)
      expect(useBattleStore.getState().combatants[0]?.currentHp).toBe(20)

      sock.fire('battle:ended', {
        battleId: BATTLE_A,
        winnerId: USER_A,
        reason: 'DEFEAT',
        endedAt: '2026-09-07T12:10:00.000Z',
        ranked: true,
        ratingChanges: [
          { userId: USER_A, before: 1200, change: 16, after: 1216 },
          { userId: USER_B, before: 1200, change: -16, after: 1184 },
        ],
      })

      const state = useBattleStore.getState()
      expect(state.status).toBe('FINISHED')
      expect(state.ended?.winnerId).toBe(USER_A)
      expect(state.combatants).toHaveLength(1)
      expect(state.turns).toHaveLength(2)
    })
  })
})
