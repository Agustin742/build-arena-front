import { createArenaCommands } from '@/features/arena'
import { type Command } from '@/shared/commands'

import { navigation } from './navigation'

export const arenaCommands: readonly Command[] = createArenaCommands({ navigation })
