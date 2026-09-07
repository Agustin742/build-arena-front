import { beforeEach, describe, expect, it } from 'vitest'

import {
  type BattleErrorPayload,
  type BattleEvent,
  type BattleStatePayload,
  type CombatantView,
  type TurnView,
  type WindowView,
} from '@/shared/contracts'

import { useBattleStore } from './battle.store'

const USER_A = '11111111-1111-4111-8111-111111111111'
const COMBATANT_A = '22222222-2222-4222-8222-222222222222'
const USER_B = '33333333-3333-4333-8333-333333333333'
const BATTLE_A = '44444444-4444-4444-8444-444444444444'
const BATTLE_B = '55555555-5555-4555-8555-555555555555'
const COMBATANT_C = '66666666-6666-4666-8666-666666666666'

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
    openWindow: reactionWindow(),
    opponentLeft: null,
    ...overrides,
  }
}

function roundStartedEvent(overrides: Partial<Extract<BattleEvent, { type: 'ROUND_STARTED' }>> = {}) {
  return {
    type: 'ROUND_STARTED' as const,
    round: 3,
    actorId: USER_B,
    ...overrides,
  }
}

function damageAppliedEvent(overrides: Partial<Extract<BattleEvent, { type: 'DAMAGE_APPLIED' }>> = {}) {
  return {
    type: 'DAMAGE_APPLIED' as const,
    targetId: COMBATANT_A,
    amount: 10,
    currentHp: 20,
    ...overrides,
  }
}

function errorPayload(overrides: Partial<BattleErrorPayload> = {}): BattleErrorPayload {
  return {
    code: 'NOT_FOUND',
    message: 'Battle not found',
    ...overrides,
  }
}

describe('useBattleStore', () => {
  beforeEach(() => {
    useBattleStore.getState().reset()
    useBattleStore.getState().setConnection('idle')
  })

  it('starts with every slice at its initial value', () => {
    const state = useBattleStore.getState()

    expect(state.battleId).toBeNull()
    expect(state.status).toBeNull()
    expect(state.currentRound).toBe(0)
    expect(state.activeUserId).toBeNull()
    expect(state.combatants).toEqual([])
    expect(state.turns).toEqual([])
    expect(state.log).toEqual([])
    expect(state.openWindow).toBeNull()
    expect(state.opponentLeft).toBeNull()
    expect(state.ended).toBeNull()
    expect(state.lastError).toBeNull()
    expect(state.connection).toBe('idle')
  })

  describe('applyState', () => {
    it('replaces battleId, status, currentRound, activeUserId, combatants, turns, openWindow and opponentLeft', () => {
      const payload = statePayload()

      useBattleStore.getState().applyState(payload)

      const state = useBattleStore.getState()
      expect(state.battleId).toBe(payload.battleId)
      expect(state.status).toBe(payload.status)
      expect(state.currentRound).toBe(payload.currentRound)
      expect(state.activeUserId).toBe(payload.activeUserId)
      expect(state.combatants).toEqual(payload.combatants)
      expect(state.turns).toEqual(payload.turns)
      expect(state.openWindow).toEqual(payload.openWindow)
      expect(state.opponentLeft).toEqual(payload.opponentLeft)
    })

    it('replaces a previous battle entirely on a second applyState, leaving no residue', () => {
      useBattleStore.getState().applyState(statePayload())

      const second = statePayload({
        battleId: BATTLE_B,
        currentRound: 5,
        combatants: [combatant({ combatantId: COMBATANT_C })],
      })
      useBattleStore.getState().applyState(second)

      const state = useBattleStore.getState()
      expect(state.battleId).toBe(BATTLE_B)
      expect(state.currentRound).toBe(5)
      expect(state.combatants).toEqual(second.combatants)
    })

    it('clears log and lastError', () => {
      useBattleStore.setState({
        log: [{ type: 'REACTION_RECHARGED', combatantId: COMBATANT_A }],
        lastError: { code: 'NOT_FOUND', message: 'Battle not found' },
      })

      useBattleStore.getState().applyState(statePayload())

      const state = useBattleStore.getState()
      expect(state.log).toEqual([])
      expect(state.lastError).toBeNull()
    })

    it('leaves ended and connection untouched', () => {
      const ended = {
        winnerId: USER_A,
        reason: 'DEFEAT' as const,
        endedAt: '2026-09-07T12:05:00.000Z',
        ranked: true,
        ratingChanges: [],
      }
      useBattleStore.setState({ ended })
      useBattleStore.getState().setConnection('open')

      useBattleStore.getState().applyState(statePayload())

      const state = useBattleStore.getState()
      expect(state.ended).toEqual(ended)
      expect(state.connection).toBe('open')
    })
  })

  describe('setConnection', () => {
    it('clears openWindow when leaving open for another connection state', () => {
      useBattleStore.setState({ connection: 'open', openWindow: reactionWindow() })

      useBattleStore.getState().setConnection('connecting')

      expect(useBattleStore.getState().openWindow).toBeNull()
      expect(useBattleStore.getState().connection).toBe('connecting')
    })

    it.each(['idle', 'connecting', 'closed', 'rejected'] as const)(
      'clears openWindow when the next state is %s',
      (next) => {
        useBattleStore.setState({ connection: 'open', openWindow: reactionWindow() })

        useBattleStore.getState().setConnection(next)

        expect(useBattleStore.getState().openWindow).toBeNull()
      },
    )

    it('leaves openWindow untouched when the next state is open', () => {
      const window = reactionWindow()
      useBattleStore.setState({ connection: 'connecting', openWindow: window })

      useBattleStore.getState().setConnection('open')

      expect(useBattleStore.getState().openWindow).toEqual(window)
      expect(useBattleStore.getState().connection).toBe('open')
    })
  })

  describe('reset', () => {
    it('restores every combat slice to its initial value but leaves connection untouched', () => {
      useBattleStore.getState().applyState(statePayload())
      useBattleStore.setState({
        log: [{ type: 'REACTION_RECHARGED', combatantId: COMBATANT_A }],
        lastError: { code: 'NOT_FOUND', message: 'Battle not found' },
        ended: {
          winnerId: USER_A,
          reason: 'DEFEAT',
          endedAt: '2026-09-07T12:05:00.000Z',
          ranked: true,
          ratingChanges: [],
        },
      })
      useBattleStore.getState().setConnection('open')

      useBattleStore.getState().reset()

      const state = useBattleStore.getState()
      expect(state.battleId).toBeNull()
      expect(state.status).toBeNull()
      expect(state.currentRound).toBe(0)
      expect(state.activeUserId).toBeNull()
      expect(state.combatants).toEqual([])
      expect(state.turns).toEqual([])
      expect(state.log).toEqual([])
      expect(state.openWindow).toBeNull()
      expect(state.opponentLeft).toBeNull()
      expect(state.ended).toBeNull()
      expect(state.lastError).toBeNull()
      expect(state.connection).toBe('open')
    })
  })

  describe('applyRoundStart', () => {
    it('sets currentRound and activeUserId, appends events to log, leaves combatants untouched', () => {
      useBattleStore.getState().applyState(statePayload())
      const event = roundStartedEvent()

      useBattleStore.getState().applyRoundStart({
        battleId: BATTLE_A,
        round: 3,
        activeUserId: USER_B,
        events: [event],
      })

      const state = useBattleStore.getState()
      expect(state.currentRound).toBe(3)
      expect(state.activeUserId).toBe(USER_B)
      expect(state.log).toEqual([event])
      expect(state.combatants).toEqual(statePayload().combatants)
    })

    it('appends to an existing log rather than replacing it', () => {
      const firstEvent = roundStartedEvent({ round: 2, actorId: USER_A })
      useBattleStore.setState({ log: [firstEvent] })
      const secondEvent = roundStartedEvent({ round: 3, actorId: USER_B })

      useBattleStore.getState().applyRoundStart({
        battleId: BATTLE_A,
        round: 3,
        activeUserId: USER_B,
        events: [secondEvent],
      })

      expect(useBattleStore.getState().log).toEqual([firstEvent, secondEvent])
    })
  })

  describe('applyReactionWindow', () => {
    it('sets openWindow only, leaving every other field untouched', () => {
      useBattleStore.getState().applyState(statePayload({ openWindow: null }))
      const window = reactionWindow({ round: 3, actorUserId: USER_A })

      useBattleStore.getState().applyReactionWindow({ battleId: BATTLE_A, ...window })

      const state = useBattleStore.getState()
      expect(state.openWindow).toEqual(window)
      expect(state.currentRound).toBe(statePayload().currentRound)
      expect(state.activeUserId).toBe(statePayload().activeUserId)
      expect(state.combatants).toEqual(statePayload().combatants)
      expect(state.turns).toEqual(statePayload().turns)
    })
  })

  describe('applyTurnResolved', () => {
    it('replaces combatants, appends events to log, closes openWindow, leaves currentRound/activeUserId/status/opponentLeft untouched', () => {
      useBattleStore
        .getState()
        .applyState(statePayload({ currentRound: 2, activeUserId: USER_A, openWindow: reactionWindow() }))
      const newCombatants = [combatant({ currentHp: 20 })]
      const event = damageAppliedEvent()

      useBattleStore.getState().applyTurnResolved({
        battleId: BATTLE_A,
        round: 2,
        turns: [turn({ round: 2, sequence: 2 })],
        events: [event],
        combatants: newCombatants,
        defeatedId: null,
      })

      const state = useBattleStore.getState()
      expect(state.combatants).toEqual(newCombatants)
      expect(state.log).toEqual([event])
      expect(state.openWindow).toBeNull()
      expect(state.currentRound).toBe(2)
      expect(state.activeUserId).toBe(USER_A)
      expect(state.status).toBe('IN_PROGRESS')
      expect(state.opponentLeft).toBeNull()
    })

    it('does not advance currentRound even when the payload names a different round', () => {
      useBattleStore.getState().applyState(statePayload({ currentRound: 5 }))

      useBattleStore.getState().applyTurnResolved({
        battleId: BATTLE_A,
        round: 2,
        turns: [turn({ round: 2, sequence: 1 })],
        events: [],
        combatants: [combatant()],
        defeatedId: null,
      })

      expect(useBattleStore.getState().currentRound).toBe(5)
    })

    it('appends a new entry for a turn with a new (round, sequence) key', () => {
      useBattleStore.getState().applyState(statePayload({ turns: [turn({ round: 1, sequence: 1 })] }))
      const nextTurn = turn({ round: 2, sequence: 1 })

      useBattleStore.getState().applyTurnResolved({
        battleId: BATTLE_A,
        round: 2,
        turns: [nextTurn],
        events: [],
        combatants: [combatant()],
        defeatedId: null,
      })

      expect(useBattleStore.getState().turns).toEqual([turn({ round: 1, sequence: 1 }), nextTurn])
    })

    it('replaces the matching entry instead of duplicating it on an idempotent re-emit', () => {
      const original = turn({ round: 2, sequence: 1, damage: 6 })
      useBattleStore.getState().applyState(statePayload({ turns: [original] }))
      const reEmit = turn({ round: 2, sequence: 1, damage: 6 })

      useBattleStore.getState().applyTurnResolved({
        battleId: BATTLE_A,
        round: 2,
        turns: [reEmit],
        events: [],
        combatants: [combatant()],
        defeatedId: null,
      })

      const state = useBattleStore.getState()
      expect(state.turns).toHaveLength(1)
      expect(state.turns).toEqual([reEmit])
    })

    it('updates turns and combatants from an empty events array without adding a log entry', () => {
      const previousLog = [roundStartedEvent()]
      useBattleStore.getState().applyState(statePayload({ turns: [] }))
      useBattleStore.setState({ log: previousLog })
      const newCombatants = [combatant({ currentHp: 15 })]
      const newTurn = turn({ round: 2, sequence: 1 })

      useBattleStore.getState().applyTurnResolved({
        battleId: BATTLE_A,
        round: 2,
        turns: [newTurn],
        events: [],
        combatants: newCombatants,
        defeatedId: null,
      })

      const state = useBattleStore.getState()
      expect(state.turns).toEqual([newTurn])
      expect(state.combatants).toEqual(newCombatants)
      expect(state.log).toEqual(previousLog)
    })
  })

  describe('applyEnded', () => {
    it('sets status and ended, closes openWindow and activeUserId, preserves combatants, turns and log', () => {
      useBattleStore
        .getState()
        .applyState(statePayload({ openWindow: reactionWindow(), activeUserId: USER_A }))
      const log = [roundStartedEvent()]
      useBattleStore.setState({ log })

      useBattleStore.getState().applyEnded({
        battleId: BATTLE_A,
        winnerId: USER_A,
        reason: 'DEFEAT',
        endedAt: '2026-09-07T12:05:00.000Z',
        ranked: true,
        ratingChanges: [{ userId: USER_A, before: 1000, change: 20, after: 1020 }],
      })

      const state = useBattleStore.getState()
      expect(state.status).toBe('FINISHED')
      expect(state.ended).toEqual({
        winnerId: USER_A,
        reason: 'DEFEAT',
        endedAt: '2026-09-07T12:05:00.000Z',
        ranked: true,
        ratingChanges: [{ userId: USER_A, before: 1000, change: 20, after: 1020 }],
      })
      expect(state.openWindow).toBeNull()
      expect(state.activeUserId).toBeNull()
      expect(state.combatants).toEqual(statePayload().combatants)
      expect(state.turns).toEqual(statePayload().turns)
      expect(state.log).toEqual(log)
    })
  })

  describe('applyOpponentLeft', () => {
    it('sets opponentLeft only, leaving every other field untouched', () => {
      useBattleStore.getState().applyState(statePayload({ opponentLeft: null }))

      useBattleStore.getState().applyOpponentLeft({
        battleId: BATTLE_A,
        userId: USER_B,
        deadline: '2026-09-07T12:10:00.000Z',
      })

      const state = useBattleStore.getState()
      expect(state.opponentLeft).toEqual({ userId: USER_B, deadline: '2026-09-07T12:10:00.000Z' })
      expect(state.combatants).toEqual(statePayload().combatants)
      expect(state.turns).toEqual(statePayload().turns)
      expect(state.currentRound).toBe(statePayload().currentRound)
    })
  })

  describe('applyError', () => {
    it('sets lastError only, leaving connection and combat state untouched', () => {
      useBattleStore.getState().applyState(statePayload())
      useBattleStore.getState().setConnection('open')

      useBattleStore.getState().applyError(errorPayload())

      const state = useBattleStore.getState()
      expect(state.lastError).toEqual(errorPayload())
      expect(state.connection).toBe('open')
      expect(state.combatants).toEqual(statePayload().combatants)
      expect(state.currentRound).toBe(statePayload().currentRound)
    })

    it('replaces the previous error with the new one', () => {
      useBattleStore.getState().applyError(errorPayload({ code: 'NOT_FOUND', message: 'first' }))

      useBattleStore.getState().applyError(errorPayload({ code: 'WRONG_STATUS', message: 'second' }))

      expect(useBattleStore.getState().lastError).toEqual({ code: 'WRONG_STATUS', message: 'second' })
    })
  })
})
