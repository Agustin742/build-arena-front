import { create } from 'zustand'

import {
  type BattleEndReason,
  type BattleErrorPayload,
  type BattleEvent,
  type BattleStatePayload,
  type BattleStatus,
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
  setConnection: (next: ConnectionState) => void
  reset: () => void
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
