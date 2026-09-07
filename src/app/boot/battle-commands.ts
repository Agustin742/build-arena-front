import { useMenuStore } from '@/app/providers/menu.store'
import { useSessionStore } from '@/features/auth'
import { createBattlesApi, createBattlesCommands } from '@/features/battles'
import { createBuildsApi } from '@/features/builds'
import { cachedFriendships, createFriendshipsApi, fetchFriendships } from '@/features/friendships'
import {
  cachedLeaderboard,
  createLeaderboardApi,
  fetchLeaderboard,
  LEADERBOARD_LIMIT,
} from '@/features/leaderboard'
import { type Command } from '@/shared/commands'
import { type PublicPlayer } from '@/shared/contracts'

import { apiClient } from './api-client'
import { queryClient } from './query-client'

const leaderboardApi = createLeaderboardApi(apiClient)
const friendshipsApi = createFriendshipsApi(apiClient)

/**
 * Everybody the player could challenge, in the order that makes sense to read: the friends
 * they already know first, then the rest of the ranking. Neither list belongs to battles —
 * this is the app deciding where rivals come from, and the picker drops the duplicates.
 */
function knownPlayers(): readonly PublicPlayer[] {
  const friends = (cachedFriendships(queryClient) ?? [])
    .filter((row) => row.status === 'ACCEPTED')
    .map((row) => row.player)

  return [...friends, ...(cachedLeaderboard(queryClient) ?? [])]
}

export const battleCommands: readonly Command[] = createBattlesCommands({
  client: queryClient,
  api: createBattlesApi(apiClient),
  buildsApi: createBuildsApi(apiClient),
  menu: {
    open: (menu) => {
      useMenuStore.getState().open(menu)
    },
    close: () => {
      useMenuStore.getState().close()
    },
  },
  rivals: {
    warm: () =>
      Promise.all([
        fetchLeaderboard(queryClient, leaderboardApi, LEADERBOARD_LIMIT.max),
        fetchFriendships(queryClient, friendshipsApi),
      ]),
    cached: knownPlayers,
  },
  self: () => useSessionStore.getState().user?.id ?? null,
})
