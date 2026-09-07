import { type QueryClient } from '@tanstack/react-query'

import {
  available,
  type Command,
  type CommandOption,
  type CommandResult,
  type ParsedArgs,
} from '@/shared/commands'
import { type CommandMenu } from '@/shared/commands'
import { type BuildList, type PublicBuild } from '@/shared/contracts'
import { ApiError, toGameMessage, toViolationMessages } from '@/shared/http'

import { type BuildsApi } from '../infrastructure/builds.api'
import { buildDetailLines, buildListLines, buildSummary } from './build-lines'
import { buildOptions, findBuild } from './build-picker'
import { cachedBuilds, fetchBuilds, invalidateBuilds } from './build-queries'

/** Opening and closing the console menu. The store lives in the app layer; this only asks. */
export interface MenuControl {
  open: (menu: CommandMenu) => void
  close: () => void
}

export interface BuildCrudDeps {
  client: QueryClient
  api: BuildsApi
  menu: MenuControl
}

const CONFIRM_YES = 'yes'
const NOT_FOUND = 'No encontré esa build'
const GONE = 'Esa build ya no está'
const NAME_TAKEN = 'Ya tenés una build con ese nombre'
const REFUSED = 'La arena rechazó la build'
const KEPT = 'La build sigue donde estaba'

/** A console that says "1 builds" reads like a form, not like somebody talking to you. */
function headlineFor(count: number): string {
  if (count === 0) {
    return 'No tenés ninguna build'
  }

  return count === 1 ? 'Tenés 1 build' : `Tenés ${String(count)} builds`
}

/**
 * The arena answers a rejected change with the complete array of broken rules, and a name
 * that is already taken with a conflict. Everything else falls back to the game message.
 */
function refusalOf(error: unknown, byStatus: Readonly<Record<number, string>>): CommandResult {
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

export function createBuildCrudCommands({ client, api, menu }: BuildCrudDeps): Command[] {
  // Read when a step is drawn, not when the command is registered: the list arrives late
  // and changes under the player as they create and delete.
  const known = (): BuildList => cachedBuilds(client) ?? []

  function pick(values: ParsedArgs): PublicBuild | undefined {
    return findBuild(known(), values.build ?? '')
  }

  const chooseBuild = {
    name: 'build',
    kind: 'pick' as const,
    label: 'Build',
    prompt: 'Elegí una de tus builds',
    required: true,
    options: () => buildOptions(known()),
  }

  function confirmDeleting(values: ParsedArgs): CommandOption[] {
    const target = pick(values)

    return [
      {
        id: CONFIRM_YES,
        label: 'BORRAR',
        ...(target === undefined ? {} : { hint: `${target.name} · ${buildSummary(target)}` }),
      },
      { id: 'no', label: 'DEJARLA', hint: 'no se borra nada' },
    ]
  }

  return [
    {
      id: 'builds',
      label: 'BUILDS',
      hint: 'tus builds',
      aliases: ['builds'],
      args: [],
      scope: ['lobby'],
      availability: available,
      run: async (): Promise<CommandResult> => {
        let builds

        try {
          builds = await fetchBuilds(client, api)
        } catch (error) {
          // Stay in the lobby. A menu whose every command needs a list that never arrived
          // is a room with nothing in it.
          return { status: 'error', message: toGameMessage(error) }
        }

        menu.open('builds')

        return {
          status: 'ok',
          message: headlineFor(builds.length),
          lines: buildListLines(builds),
        }
      },
    },
    {
      id: 'build-show',
      label: 'BUILD SHOW',
      hint: 'ver una build',
      aliases: ['build show'],
      args: [chooseBuild],
      scope: ['builds'],
      availability: available,
      run: (values): Promise<CommandResult> => {
        const target = pick(values)

        if (target === undefined) {
          return Promise.resolve({ status: 'error', message: NOT_FOUND })
        }

        return Promise.resolve({
          status: 'ok',
          message: `${target.name} · ${buildSummary(target)}`,
          lines: buildDetailLines(target),
        })
      },
    },
    {
      id: 'build-rename',
      label: 'BUILD RENAME',
      hint: 'cambiarle el nombre a una build',
      aliases: ['build rename'],
      args: [
        chooseBuild,
        {
          name: 'name',
          kind: 'text',
          label: 'Nombre nuevo',
          prompt: 'Poné el nombre nuevo, de 3 a 40 caracteres',
          required: true,
        },
      ],
      scope: ['builds'],
      availability: available,
      run: async (values): Promise<CommandResult> => {
        const target = pick(values)

        if (target === undefined) {
          return { status: 'error', message: NOT_FOUND }
        }

        let renamed

        try {
          renamed = await api.update(target.id, { name: values.name ?? '' })
        } catch (error) {
          return refusalOf(error, { 404: GONE, 409: NAME_TAKEN })
        }

        await invalidateBuilds(client)

        return { status: 'ok', message: `Ahora se llama "${renamed.name}"` }
      },
    },
    {
      id: 'build-rm',
      label: 'BUILD RM',
      hint: 'borrar una build',
      aliases: ['build rm'],
      args: [
        chooseBuild,
        {
          name: 'confirm',
          kind: 'pick',
          label: '¿Seguro?',
          // The build is named in the option itself: a confirmation that does not say what
          // it is about is a confirmation nobody reads.
          prompt: 'Esto no se puede deshacer',
          required: true,
          options: (_ctx, values) => confirmDeleting(values),
        },
      ],
      scope: ['builds'],
      availability: available,
      run: async (values): Promise<CommandResult> => {
        const target = pick(values)

        if (target === undefined) {
          return { status: 'error', message: NOT_FOUND }
        }

        if (values.confirm !== CONFIRM_YES) {
          return { status: 'ok', message: KEPT }
        }

        try {
          await api.remove(target.id)
        } catch (error) {
          return refusalOf(error, { 404: GONE })
        }

        await invalidateBuilds(client)

        return { status: 'ok', message: `Borré "${target.name}"` }
      },
    },
    {
      id: 'build-back',
      label: 'VOLVER',
      hint: 'salir de tus builds',
      aliases: ['back', 'volver'],
      args: [],
      scope: ['builds'],
      availability: available,
      run: (): Promise<CommandResult> => {
        menu.close()

        return Promise.resolve({ status: 'ok', message: 'Volviste al lobby' })
      },
    },
  ]
}
