import { type QueryClient } from '@tanstack/react-query'

import {
  buildOptions,
  type BuildsLister,
  cachedBuilds,
  fetchBuilds,
  findBuild,
} from '@/features/builds'
import {
  available,
  blocked,
  type Command,
  type CommandAvailability,
  type CommandOption,
  type CommandResult,
  type MenuControl,
  type ParsedArgs,
} from '@/shared/commands'
import { type BuildList, type PublicBattle, type PublicPlayer } from '@/shared/contracts'
import { resolvePlayerAnswer } from '@/shared/game-text'
import { ApiError, toGameMessage, toViolationMessages } from '@/shared/http'

import { type BattlesApi } from '../infrastructure/battles.api'
import { battleLines, orderedBattles } from './battle-lines'
import { acceptLock, battleHeadline, cancelLock, rejectLock } from './battle-messages'
import { type BattleGate, battleOptions, findBattle, rivalOptions } from './battle-picker'
import { cachedBattles, fetchBattles } from './battle-queries'

/**
 * Where rivals come from. The ranking and the friend list both hold players worth
 * challenging, and neither belongs to this feature — so this asks for players and the app
 * decides which lists fill it.
 */
export interface RivalSource {
  /** Best effort: the menu opens whether or not the names arrive. */
  warm: () => Promise<unknown>
  cached: () => readonly PublicPlayer[]
}

export interface BattleCommandDeps {
  client: QueryClient
  api: BattlesApi
  /** A challenge carries a build, so this feature genuinely needs the player's builds. */
  buildsApi: BuildsLister
  menu: MenuControl
  rivals: RivalSource
  /** Whoever is reading, so the rival list never offers them themselves. */
  self?: (() => string | null) | undefined
}

const NOT_FOUND = 'No encontré ese desafío'
const NO_BUILD = 'No encontré esa build'
const GONE = 'Ese desafío ya no está'
const NOT_YOURS = 'Ese desafío no es tuyo para eso'
const BUILD_GONE = 'La otra persona se quedó sin la build que había elegido'
const REFUSED = 'La arena rechazó el desafío'
const NEED_A_BUILD = 'Armá una build primero: no se pelea sin una'
const UNRANKED_LINE = 'Son amigos, así que esta pelea no mueve el rating'

/**
 * The arena answers a refused challenge with the complete array of broken rules.
 * Everything else falls back to the game message, which already knows each status.
 */
function refusalOf(error: unknown, byStatus: Readonly<Record<number, string>> = {}): CommandResult {
  const violations = toViolationMessages(error)

  if (violations.length > 0) {
    return { status: 'error', message: REFUSED, lines: violations }
  }

  if (error instanceof ApiError && error.status !== null) {
    const known = byStatus[error.status]

    if (known !== undefined) {
      return { status: 'error', message: known }
    }
  }

  return { status: 'error', message: toGameMessage(error) }
}

export function createBattlesCommands({
  client,
  api,
  buildsApi,
  menu,
  rivals,
  self,
}: BattleCommandDeps): Command[] {
  // Read when a step is drawn, not when the command is registered: a challenge can land
  // while the player is standing in the menu reading the list.
  const ordered = (): PublicBattle[] => orderedBattles(cachedBattles(client) ?? [])
  const owned = (): BuildList => cachedBuilds(client) ?? []

  function pick(values: ParsedArgs): PublicBattle | undefined {
    return findBattle(ordered(), values.battle ?? '')
  }

  /** The rows the rival step draws, so the answer is resolved against what was on screen. */
  function offeredRivals(): CommandOption[] {
    return rivalOptions(rivals.cached(), self?.() ?? null)
  }

  const chooseBuild = {
    name: 'build',
    kind: 'pick' as const,
    label: 'Con cuál',
    prompt: 'Elegí la build con la que vas a pelear. Se congela al aceptarse',
    required: true,
    options: () => buildOptions(owned()),
  }

  function chooseBattle(prompt: string, gate: BattleGate) {
    return {
      name: 'battle',
      kind: 'pick' as const,
      label: 'Cuál',
      prompt,
      required: true,
      options: () => battleOptions(ordered(), gate),
    }
  }

  /** Reading the list back is what keeps the numbers pointing at the same rows. */
  async function reread(): Promise<void> {
    try {
      await fetchBattles(client, api)
    } catch {
      // The write already went through. A list that failed to come back is the next
      // command's problem, not a reason to say the challenge did not land.
    }
  }

  /**
   * Every one of these is a row plus a gate: find it, refuse it with the same words the
   * locked option carried, then call the arena. One door, closed from both sides.
   */
  function actOn(
    values: ParsedArgs,
    gate: BattleGate,
  ): { battle: PublicBattle } | { refusal: CommandResult } {
    const target = pick(values)

    if (target === undefined) {
      return { refusal: { status: 'error', message: NOT_FOUND } }
    }

    const locked = gate(target)

    return locked === undefined
      ? { battle: target }
      : { refusal: { status: 'error', message: locked } }
  }

  return [
    {
      id: 'battles',
      label: 'BATTLES',
      hint: 'tus desafíos y batallas',
      aliases: ['battles', 'batallas'],
      args: [],
      scope: ['lobby'],
      availability: available,
      run: async (): Promise<CommandResult> => {
        let list

        try {
          list = await fetchBattles(client, api)
        } catch (error) {
          // Stay in the lobby. A menu whose every command needs a list that never arrived
          // is a room with nothing in it.
          return { status: 'error', message: toGameMessage(error) }
        }

        // Both are conveniences for the steps inside, not conditions for the menu, so a
        // failure here costs the player the suggestions and nothing else.
        await Promise.all([
          rivals.warm().catch(() => undefined),
          fetchBuilds(client, buildsApi).catch(() => undefined),
        ])

        menu.open('battles')

        return {
          status: 'ok',
          message: battleHeadline(list),
          lines: battleLines(orderedBattles(list)),
        }
      },
    },
    {
      id: 'challenge',
      label: 'CHALLENGE',
      hint: 'desafiar a alguien',
      aliases: ['challenge', 'desafiar'],
      args: [
        {
          name: 'rival',
          kind: 'pick',
          label: 'A quién',
          // The list is a courtesy, not the authority: an id shared by hand is still a
          // legal answer, and the arena is the one that judges it.
          prompt: 'Elegí a quién desafiar, o pegá su id si te lo pasaron',
          required: true,
          options: () => offeredRivals(),
        },
        chooseBuild,
      ],
      scope: ['battles'],
      // A challenge without a build is a request the arena cannot answer, so the door is
      // closed here rather than after the player has already picked a rival.
      availability: (): CommandAvailability =>
        owned().length === 0 ? blocked(NEED_A_BUILD) : available(),
      run: async (values): Promise<CommandResult> => {
        const build = findBuild(owned(), values.build ?? '')

        if (build === undefined) {
          return { status: 'error', message: NO_BUILD }
        }

        // Clicking a row hands over the id, but typing hands over whatever was in the
        // prompt — a number, a username, or an id somebody passed along. Sending that raw
        // would earn a validation error naming a field the player never saw.
        const answer = resolvePlayerAnswer(offeredRivals(), values.rival ?? '')

        if ('refusal' in answer) {
          return { status: 'error', ...answer.refusal }
        }

        const named = rivals.cached().find((player) => player.id === answer.id)
        let created

        try {
          created = await api.challenge(answer.id, build.id)
        } catch (error) {
          return refusalOf(error, { 404: 'Ese jugador no existe, o esa build no es tuya' })
        }

        await reread()

        return {
          status: 'ok',
          message: `Desafiaste a ${named?.username ?? 'ese jugador'} con ${build.name}`,
          // The rule is invisible until the arena answers: only the created battle knows
          // whether the two were already friends.
          ...(created.ranked ? {} : { lines: [UNRANKED_LINE] }),
        }
      },
    },
    {
      id: 'battle-accept',
      label: 'ACCEPT',
      hint: 'aceptar un desafío',
      aliases: ['accept', 'aceptar'],
      args: [chooseBattle('Elegí el desafío que querés aceptar', acceptLock), chooseBuild],
      scope: ['battles'],
      availability: (): CommandAvailability =>
        owned().length === 0 ? blocked(NEED_A_BUILD) : available(),
      run: async (values): Promise<CommandResult> => {
        const found = actOn(values, acceptLock)

        if ('refusal' in found) {
          return found.refusal
        }

        const build = findBuild(owned(), values.build ?? '')

        if (build === undefined) {
          return { status: 'error', message: NO_BUILD }
        }

        try {
          await api.accept(found.battle.id, build.id)
        } catch (error) {
          return refusalOf(error, { 403: NOT_YOURS, 404: GONE, 409: BUILD_GONE })
        }

        await reread()

        return {
          status: 'ok',
          message: `Aceptaste el desafío de ${found.battle.rival.username} con ${build.name}`,
        }
      },
    },
    {
      id: 'battle-reject',
      label: 'REJECT',
      hint: 'rechazar un desafío',
      aliases: ['reject', 'rechazar'],
      args: [chooseBattle('Elegí el desafío que querés rechazar', rejectLock)],
      scope: ['battles'],
      availability: available,
      run: async (values): Promise<CommandResult> => {
        const found = actOn(values, rejectLock)

        if ('refusal' in found) {
          return found.refusal
        }

        try {
          await api.reject(found.battle.id)
        } catch (error) {
          return refusalOf(error, { 403: NOT_YOURS, 404: GONE })
        }

        await reread()

        return {
          status: 'ok',
          message: `Rechazaste el desafío de ${found.battle.rival.username}`,
        }
      },
    },
    {
      id: 'battle-cancel',
      label: 'CANCEL',
      hint: 'cancelar un desafío que mandaste',
      aliases: ['cancel', 'cancelar'],
      args: [chooseBattle('Elegí el desafío que querés cancelar', cancelLock)],
      scope: ['battles'],
      availability: available,
      run: async (values): Promise<CommandResult> => {
        const found = actOn(values, cancelLock)

        if ('refusal' in found) {
          return found.refusal
        }

        try {
          await api.cancel(found.battle.id)
        } catch (error) {
          return refusalOf(error, { 403: NOT_YOURS, 404: GONE })
        }

        await reread()

        return {
          status: 'ok',
          message: `Cancelaste el desafío que le mandaste a ${found.battle.rival.username}`,
        }
      },
    },
    {
      id: 'battle-back',
      label: 'VOLVER',
      hint: 'salir de tus batallas',
      aliases: ['back', 'volver'],
      args: [],
      scope: ['battles'],
      availability: available,
      run: (): Promise<CommandResult> => {
        menu.close()

        return Promise.resolve({ status: 'ok', message: 'Volviste al lobby' })
      },
    },
  ]
}
