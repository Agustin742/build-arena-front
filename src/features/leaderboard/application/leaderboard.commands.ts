import { type QueryClient } from '@tanstack/react-query'

import { available, type Command, type CommandOption, type CommandResult } from '@/shared/commands'
import { toGameMessage } from '@/shared/http'

import { LEADERBOARD_LIMIT, type LeaderboardApi } from '../infrastructure/leaderboard.api'
import { leaderboardHeadline, leaderboardLines } from './leaderboard-lines'
import { fetchLeaderboard } from './leaderboard-queries'

export interface LeaderboardCommandDeps {
  client: QueryClient
  api: LeaderboardApi
  /** Whoever is reading, so their own row can be marked. Absent before anybody logs in. */
  self?: (() => string | null) | undefined
}

/** Four sizes instead of a free number: one keystroke, and none of them can be refused. */
const SIZES = [10, 25, 50, 100] as const

function sizeOptions(): CommandOption[] {
  return SIZES.map((size) => ({
    id: String(size),
    key: String(size),
    label: `Top ${String(size)}`,
    ...(size === LEADERBOARD_LIMIT.fallback ? { hint: 'lo que trae por defecto' } : {}),
  }))
}

/**
 * The step can be skipped, and it can also be typed straight past — `top 20` seeds the
 * value positionally and never draws the list. Neither path is validated by the runtime,
 * so anything outside the range the arena accepts is pulled back into it here: a player
 * who asks for 999 wants "as many as you have", not a 400.
 */
function limitFrom(answer: string | undefined): number {
  const asked = Number(answer)

  if (answer === undefined || !Number.isFinite(asked)) {
    return LEADERBOARD_LIMIT.fallback
  }

  return Math.min(LEADERBOARD_LIMIT.max, Math.max(LEADERBOARD_LIMIT.min, Math.trunc(asked)))
}

export function createLeaderboardCommands({
  client,
  api,
  self,
}: LeaderboardCommandDeps): Command[] {
  return [
    {
      id: 'top',
      label: 'TOP',
      hint: 'el ranking de la arena',
      aliases: ['top'],
      args: [
        {
          name: 'limit',
          kind: 'pick',
          label: 'Cuántos',
          prompt: 'Cuántos jugadores querés ver',
          required: false,
          options: () => sizeOptions(),
        },
      ],
      scope: ['lobby'],
      availability: available,
      run: async (values): Promise<CommandResult> => {
        let ranking

        try {
          ranking = await fetchLeaderboard(client, api, limitFrom(values.limit))
        } catch (error) {
          return { status: 'error', message: toGameMessage(error) }
        }

        return {
          status: 'ok',
          message: leaderboardHeadline(ranking.length),
          lines: leaderboardLines(ranking, self?.() ?? null),
        }
      },
    },
  ]
}
