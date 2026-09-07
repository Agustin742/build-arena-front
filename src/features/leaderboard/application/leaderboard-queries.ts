import { type QueryClient } from '@tanstack/react-query'

import { type Leaderboard } from '@/shared/contracts'

import { type LeaderboardApi } from '../infrastructure/leaderboard.api'

/**
 * One key for every limit. The ranking is refetched on every read anyway, so keying by
 * limit would only split one answer into several entries — and it would hide the last
 * ranking the player looked at from the commands that pick a rival out of it.
 */
export const LEADERBOARD_QUERY_KEY = ['leaderboard'] as const

/**
 * The opposite of the skill catalog: a rating moves every time anybody in the arena
 * finishes a battle, and a ranking that is one battle out of date is a ranking that lies.
 * So `staleTime` is zero and every read goes back to the network.
 *
 * `gcTime` is still infinite for the same reason it is everywhere else here: commands read
 * this through `query` and a command is not a subscriber, so the default garbage window
 * would drop the rows after five idle minutes — and those rows are where rivals come from.
 */
export function leaderboardQuery(api: LeaderboardApi, limit: number) {
  return {
    queryKey: LEADERBOARD_QUERY_KEY,
    queryFn: () => api.list(limit),
    staleTime: 0,
    gcTime: Infinity,
  }
}

export function fetchLeaderboard(
  client: QueryClient,
  api: LeaderboardApi,
  limit: number,
): Promise<Leaderboard> {
  return client.query(leaderboardQuery(api, limit))
}

/** The last ranking the player looked at, without going to the network for it. */
export function cachedLeaderboard(client: QueryClient): Leaderboard | undefined {
  return client.getQueryData<Leaderboard>(LEADERBOARD_QUERY_KEY)
}
