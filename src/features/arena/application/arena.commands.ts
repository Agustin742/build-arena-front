import { type Command, type CommandResult } from '@/shared/commands'

import { type ArenaNavigation } from './ports'

export interface ArenaCommandDeps {
  navigation: ArenaNavigation
}

/**
 * Only `volver` for now. Leaving mid-`IN_PROGRESS` costs the 2-minute abandonment window
 * (10A), but that confirmation step ships with the rest of `volver`'s autofill in PR 4b —
 * here it only navigates, so the player is never stuck once the arena route exists.
 */
export function createArenaCommands({ navigation }: ArenaCommandDeps): Command[] {
  return [
    {
      id: 'volver',
      label: 'VOLVER',
      hint: 'volver al lobby',
      aliases: ['volver'],
      args: [],
      scope: ['battle'],
      availability: () => ({ enabled: true }),
      run: (): Promise<CommandResult> => {
        navigation.toLobby()

        return Promise.resolve({ status: 'ok' })
      },
    },
  ]
}
