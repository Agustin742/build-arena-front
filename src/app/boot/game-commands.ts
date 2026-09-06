import { type Command } from '@/shared/commands'

import { authCommands } from './auth-commands'
import { skillCommands } from './skill-commands'

/** Everything the console knows how to do. Scope decides which ones show up where. */
export const gameCommands: readonly Command[] = [...authCommands, ...skillCommands]
