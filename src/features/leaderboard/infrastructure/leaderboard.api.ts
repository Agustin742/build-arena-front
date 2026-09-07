import { type Leaderboard, leaderboardSchema } from '@/shared/contracts'
import { type ApiClient } from '@/shared/http'

/** The range `GET /leaderboard` accepts, and what it uses when nobody asks for one. */
export const LEADERBOARD_LIMIT = { min: 1, max: 100, fallback: 50 } as const

export interface LeaderboardApi {
  list: (limit?: number) => Promise<Leaderboard>
}

/**
 * The ranking is the only place a player can find somebody they have never fought, so it
 * is where every rival ends up coming from. Each row arrives with its `rank` already
 * resolved by the arena — the position is not the index of the array.
 */
export function createLeaderboardApi(client: ApiClient): LeaderboardApi {
  return {
    // The default is sent explicitly rather than left off: the cache is keyed by the
    // limit, and an absent one and a 50 would otherwise be two keys for one answer.
    list: (limit = LEADERBOARD_LIMIT.fallback) =>
      client.get(`/leaderboard?limit=${String(limit)}`, leaderboardSchema),
  }
}
