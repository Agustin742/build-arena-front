import { createArenaCommands } from '@/features/arena'
import { type Command } from '@/shared/commands'

import { navigation } from './navigation'
import { queryClient } from './query-client'

export const arenaCommands: readonly Command[] = createArenaCommands({
  navigation,
  client: queryClient,
})
