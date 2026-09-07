import { type BattleList, type PublicBattle } from '@/shared/contracts'

import { type BattleStanding, sortBattles, standingOf } from '../domain/standing'
import { battleDetail } from './battle-messages'

const NOBODY_AT_ALL = 'Nadie te desafió y vos tampoco'

/** The same columns the ranking and the friendship list use. Three lists, one shape. */
const NAME_WIDTH = 24

const HEADING: Record<BattleStanding, string> = {
  live: 'EN JUEGO',
  invitation: 'TE DESAFIARON',
  sent: 'DESAFIASTE',
  over: 'TERMINADAS',
}

const STANDINGS: readonly BattleStanding[] = ['live', 'invitation', 'sent', 'over']

/**
 * The one order everything else is built on. The printed list and the pickers both number
 * this array, so the number the player reads and the number they type are the same one.
 */
export function orderedBattles(list: BattleList): PublicBattle[] {
  return sortBattles(list)
}

/**
 * Headings group the rows, but the numbering runs straight through them: a heading is not
 * a row, so counting it would make the third rival the fourth number.
 */
export function battleLines(ordered: readonly PublicBattle[]): string[] {
  if (ordered.length === 0) {
    return [NOBODY_AT_ALL]
  }

  const lines: string[] = []

  STANDINGS.forEach((standing) => {
    const rows = ordered
      .map((battle, index) => ({ battle, position: index + 1 }))
      .filter((entry) => standingOf(entry.battle) === standing)

    if (rows.length === 0) {
      return
    }

    lines.push(HEADING[standing])
    rows.forEach(({ battle, position }) => {
      lines.push(
        `${String(position).padStart(2)}) ${battle.rival.username.padEnd(NAME_WIDTH)}${battleDetail(
          battle,
        )}`,
      )
    })
  })

  return lines
}
