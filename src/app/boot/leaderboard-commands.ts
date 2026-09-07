import { useSessionStore } from '@/features/auth'
import { createLeaderboardApi, createLeaderboardCommands } from '@/features/leaderboard'
import { type Command } from '@/shared/commands'

import { apiClient } from './api-client'
import { queryClient } from './query-client'

export const leaderboardCommands: readonly Command[] = createLeaderboardCommands({
  client: queryClient,
  api: createLeaderboardApi(apiClient),
  // Read when the ranking is drawn, not when the command is registered: the session lands
  // after the console is already built, and it changes again on every logout.
  self: () => useSessionStore.getState().user?.id ?? null,
})
