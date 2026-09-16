import { type QueryClient } from '@tanstack/react-query'

import { battleOptions, cachedBattles, findBattle, standingOf } from '@/features/battles'
import {
  type Command,
  type CommandContext,
  type CommandResult,
  type ParsedArgs,
} from '@/shared/commands'
import { type PublicBattle } from '@/shared/contracts'

import { type ArenaNavigation } from './ports'

export interface ArenaCommandDeps {
  navigation: ArenaNavigation
  client: QueryClient
}

const NO_LIVE_BATTLE = 'No encontré esa batalla'
const ENTER_CONFIRM_PROMPT = 'Entrar arranca la batalla. ¿Seguimos?'

/** The caller's battles that can actually be entered — a fight already accepted or running. */
function liveBattles(client: QueryClient): PublicBattle[] {
  return (cachedBattles(client) ?? []).filter((battle) => standingOf(battle) === 'live')
}

/**
 * Only `volver` and `enter` for now. Leaving mid-`IN_PROGRESS` costs the 2-minute
 * abandonment window (10A), but that confirmation step ships with the rest of `volver`'s
 * autofill in PR 4b — here it only navigates, so the player is never stuck once the arena
 * route exists.
 */
export function createArenaCommands({ navigation, client }: ArenaCommandDeps): Command[] {
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
    {
      id: 'enter',
      label: 'ENTER',
      hint: 'entrar a tu batalla en juego',
      aliases: ['enter', 'entrar'],
      args: [
        {
          name: 'battle',
          kind: 'pick',
          label: 'Cuál',
          prompt: 'Elegí la batalla a la que querés entrar',
          required: true,
          options: () => battleOptions(liveBattles(client), () => undefined),
          autofill: () => {
            const live = liveBattles(client)

            return live.length === 1 ? live[0]?.id : undefined
          },
        },
        {
          name: 'confirm',
          kind: 'text',
          label: 'Confirmar',
          prompt: ENTER_CONFIRM_PROMPT,
          required: true,
          autofill: (_ctx: CommandContext, values: ParsedArgs) => {
            const target = findBattle(liveBattles(client), values.battle ?? '')

            return target?.status === 'ACCEPTED' ? undefined : 'yes'
          },
        },
      ],
      scope: ['lobby', 'battles'],
      availability: () => ({ enabled: true }),
      run: (values): Promise<CommandResult> => {
        const target = findBattle(liveBattles(client), values.battle ?? '')

        if (target === undefined) {
          return Promise.resolve({ status: 'error', message: NO_LIVE_BATTLE })
        }

        navigation.toArena(target.id)

        return Promise.resolve({ status: 'ok' })
      },
    },
  ]
}
