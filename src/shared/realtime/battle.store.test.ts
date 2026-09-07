import { beforeEach, describe, expect, it } from 'vitest'

import {
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
})
