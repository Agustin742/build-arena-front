import { create } from 'zustand'

import {
  type BattleEndedPayload,
  type BattleEndReason,
  type BattleErrorPayload,
  type BattleEvent,
  type BattleOpponentLeftPayload,
  type BattleReactionWindowPayload,
  type BattleRoundStartPayload,
  type BattleStatePayload,
  type BattleStatus,
  type BattleTurnResolvedPayload,
  type CombatantView,
  type LeftView,
  type RatingChangeView,
  type TurnView,
  type WindowView,
} from '@/shared/contracts'

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'rejected'

export interface EndedView {
  winnerId: string
  reason: BattleEndReason
  endedAt: string
  ranked: boolean
  ratingChanges: RatingChangeView[]
}

export interface BattleState {
  battleId: string | null
  status: BattleStatus | null
  currentRound: number
  activeUserId: string | null
  combatants: CombatantView[]
  turns: TurnView[]
  log: BattleEvent[]
  openWindow: WindowView | null
  opponentLeft: LeftView | null
  ended: EndedView | null
  lastError: BattleErrorPayload | null
  connection: ConnectionState

  applyState: (payload: BattleStatePayload) => void
  applyRoundStart: (payload: BattleRoundStartPayload) => void
  applyReactionWindow: (payload: BattleReactionWindowPayload) => void
  applyTurnResolved: (payload: BattleTurnResolvedPayload) => void
  applyEnded: (payload: BattleEndedPayload) => void
  applyOpponentLeft: (payload: BattleOpponentLeftPayload) => void
  applyError: (payload: BattleErrorPayload) => void
  setConnection: (next: ConnectionState) => void
  reset: () => void
}

function turnKey(t: Pick<TurnView, 'round' | 'sequence'>): string {
  return [t.round, t.sequence].map(String).join(':')
}

function mergeTurns(existing: TurnView[], incoming: TurnView[]): TurnView[] {
  const byKey = new Map(existing.map((t) => [turnKey(t), t]))
  for (const t of incoming) {
    byKey.set(turnKey(t), t)
  }
  return [...byKey.values()].sort((a, b) => a.round - b.round || a.sequence - b.sequence)
}

const initialCombatSlice = {
  battleId: null,
  status: null,
  currentRound: 0,
  activeUserId: null,
  combatants: [],
  turns: [],
  log: [],
  openWindow: null,
  opponentLeft: null,
  ended: null,
  lastError: null,
} satisfies Pick<
  BattleState,
  | 'battleId'
  | 'status'
  | 'currentRound'
  | 'activeUserId'
  | 'combatants'
  | 'turns'
  | 'log'
  | 'openWindow'
  | 'opponentLeft'
  | 'ended'
  | 'lastError'
>

export const useBattleStore = create<BattleState>()((set) => ({
  ...initialCombatSlice,
  connection: 'idle',
  applyState: (payload) => {
    set({
      battleId: payload.battleId,
      status: payload.status,
      currentRound: payload.currentRound,
      activeUserId: payload.activeUserId,
      combatants: payload.combatants,
      turns: payload.turns,
      openWindow: payload.openWindow,
      opponentLeft: payload.opponentLeft,
      log: [],
      lastError: null,
    })
  },
  applyRoundStart: (payload) => {
    set((state) => ({
      currentRound: payload.round,
      activeUserId: payload.activeUserId,
      log: [...state.log, ...payload.events],
    }))
  },
  applyReactionWindow: (payload) => {
    const { battleId: _battleId, ...window } = payload
    set({ openWindow: window })
  },
  applyTurnResolved: (payload) => {
    set((state) => ({
      combatants: payload.combatants,
      turns: mergeTurns(state.turns, payload.turns),
      log: [...state.log, ...payload.events],
      openWindow: null,
    }))
  },
  applyEnded: (payload) => {
    set({
      status: 'FINISHED',
      ended: {
        winnerId: payload.winnerId,
        reason: payload.reason,
        endedAt: payload.endedAt,
        ranked: payload.ranked,
        ratingChanges: payload.ratingChanges,
      },
      openWindow: null,
      activeUserId: null,
    })
  },
  applyOpponentLeft: (payload) => {
    set({ opponentLeft: { userId: payload.userId, deadline: payload.deadline } })
  },
  applyError: (payload) => {
    set({ lastError: payload })
  },
  setConnection: (next) => {
    set((state) => ({
      connection: next,
      openWindow: next === 'open' ? state.openWindow : null,
    }))
  },
  reset: () => {
    set({ ...initialCombatSlice })
  },
}))
