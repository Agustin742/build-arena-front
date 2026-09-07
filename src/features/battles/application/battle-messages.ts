import { type BattleList, type PublicBattle } from '@/shared/contracts'

import { canAccept, canCancel, canReject, standingOf } from '../domain/standing'

/**
 * The arena marks a challenge unranked when an accepted friendship already existed between
 * the two players. The rule is invisible in the payload — one boolean — so the row has to
 * say it, or the player only finds out afterwards that the win moved nothing.
 */
export const UNRANKED_NOTE = 'sin rating en juego'

const NEVER_FOUGHT = 'Todavía no peleaste ninguna'

const ENDED: Record<string, string> = {
  REJECTED: 'rechazada',
  CANCELLED: 'cancelada',
}

const OUTCOME = { WON: 'ganaste', LOST: 'perdiste' } as const

function stateOf(battle: PublicBattle): string {
  switch (standingOf(battle)) {
    case 'live':
      return battle.status === 'IN_PROGRESS'
        ? `ronda ${String(battle.currentRound)}`
        : 'lista para empezar'
    case 'invitation':
      return 'esperando tu respuesta'
    case 'sent':
      return 'esperando respuesta'
    default:
      if (battle.status === 'FINISHED') {
        return battle.outcome === null ? 'terminó sin resultado' : OUTCOME[battle.outcome]
      }

      return ENDED[battle.status] ?? 'terminada'
  }
}

/**
 * What the row says on its right-hand side. The unranked warning rides along only while
 * the battle can still be played: on a finished one it is history nobody can act on.
 */
export function battleDetail(battle: PublicBattle): string {
  const state = stateOf(battle)

  if (battle.ranked || standingOf(battle) === 'over') {
    return state
  }

  return `${state} · ${UNRANKED_NOTE}`
}

function countStanding(list: BattleList, standing: 'live' | 'invitation'): number {
  return list.filter((battle) => standingOf(battle) === standing).length
}

function battles(count: number): string {
  return count === 1 ? '1 batalla' : `${String(count)} batallas`
}

function challenges(count: number): string {
  return count === 1 ? '1 desafío esperándote' : `${String(count)} desafíos esperándote`
}

/**
 * The headline names whatever is costing the player something right now: a battle already
 * on first, then the challenges waiting on them. With neither, counting the list is all
 * there is left to say.
 */
export function battleHeadline(list: BattleList): string {
  if (list.length === 0) {
    return NEVER_FOUGHT
  }

  const live = countStanding(list, 'live')
  const waiting = countStanding(list, 'invitation')

  if (live > 0) {
    const running = live === 1 ? '1 batalla en juego' : `${String(live)} batallas en juego`

    return waiting === 0 ? `Tenés ${running}` : `Tenés ${running} · ${challenges(waiting)}`
  }

  return waiting === 0 ? `Tenés ${battles(list.length)}` : `Tenés ${challenges(waiting)}`
}

/**
 * Why an action is closed on a row. Locked rows stay on the list instead of disappearing,
 * so the numbering keeps matching the list the player just read — and each refusal points
 * at the command that would have worked instead.
 */
export function acceptLock(battle: PublicBattle): string | undefined {
  if (canAccept(battle)) {
    return undefined
  }

  return battle.status === 'PENDING'
    ? 'Este lo mandaste vos: lo tiene que aceptar la otra persona'
    : 'Ese desafío ya está contestado'
}

export function rejectLock(battle: PublicBattle): string | undefined {
  if (canReject(battle)) {
    return undefined
  }

  return battle.status === 'PENDING'
    ? 'Este lo mandaste vos: para eso está cancelarlo'
    : 'Ese desafío ya está contestado'
}

export function cancelLock(battle: PublicBattle): string | undefined {
  if (canCancel(battle)) {
    return undefined
  }

  return battle.status === 'PENDING'
    ? 'Este te lo mandaron: para eso está rechazarlo'
    : 'Ya no se puede: la otra persona lo aceptó'
}
