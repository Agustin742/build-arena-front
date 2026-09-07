import { useMenuStore } from '@/app/providers/menu.store'
import { useSessionStore } from '@/features/auth'
import { createFriendshipsApi, createFriendshipsCommands } from '@/features/friendships'
import {
  cachedLeaderboard,
  createLeaderboardApi,
  fetchLeaderboard,
  LEADERBOARD_LIMIT,
} from '@/features/leaderboard'
import { type Command } from '@/shared/commands'

import { apiClient } from './api-client'
import { queryClient } from './query-client'

const leaderboardApi = createLeaderboardApi(apiClient)

export const friendshipCommands: readonly Command[] = createFriendshipsCommands({
  client: queryClient,
  api: createFriendshipsApi(apiClient),
  menu: {
    open: (menu) => {
      useMenuStore.getState().open(menu)
    },
    close: () => {
      useMenuStore.getState().close()
    },
  },
  // The two features never meet: friendships asks for players to offer, and the app is
  // what decides the ranking is where they come from.
  rivals: {
    warm: () => fetchLeaderboard(queryClient, leaderboardApi, LEADERBOARD_LIMIT.max),
    cached: () => cachedLeaderboard(queryClient) ?? [],
  },
  self: () => useSessionStore.getState().user?.id ?? null,
})
