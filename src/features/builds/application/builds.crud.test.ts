import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import {
  type Command,
  type CommandContext,
  type CommandResult,
  EMPTY_NUMBERED_LIST,
} from '@/shared/commands'
import { type BuildList, type PublicBuild } from '@/shared/contracts'
import { ApiError } from '@/shared/http'

import { type BuildsApi } from '../infrastructure/builds.api'
import { fetchBuilds } from './build-queries'
import { createBuildsCommands } from './builds.commands'

const MAGE = build({ id: 'id-mage', name: 'Duelista híbrido', magic: 14 })
const BRUTE = build({ id: 'id-brute', name: 'Bruto', strength: 14 })
const BUILDS: BuildList = [MAGE, BRUTE]

describe('the builds listing command', () => {
  it('lives in the lobby and answers to builds', () => {
    expect(commandNamed('builds')).toMatchObject({
      aliases: ['builds'],
      scope: ['lobby'],
      args: [],
    })
  })

  it('lists what the player owns', async () => {
    const result = await run('builds')

    expect(result.status).toBe('ok')
    expect(result.lines?.join('\n')).toMatch(/Duelista híbrido/)
    expect(result.lines?.join('\n')).toMatch(/Bruto/)
  })

  it('counts them in the headline', async () => {
    expect((await run('builds')).message).toBe('Tenés 2 builds')
  })

  it('says one build in the singular, like a person would', async () => {
    expect((await run('builds', { builds: [MAGE] })).message).toBe('Tenés 1 build')
  })

  it('does not count out loud when there is nothing to count', async () => {
    expect((await run('builds', { builds: [] })).message).toBe('No tenés ninguna build')
  })

  it('says plainly when there are none', async () => {
    const result = await run('builds', { builds: [] })

    expect(result.lines).toEqual(['Todavía no armaste ninguna build'])
  })

  it('turns a failed request into a game message', async () => {
    const result = await run('builds', { failure: offline() })

    expect(result).toEqual({
      status: 'error',
      message: 'No se pudo llegar a la arena. Revisá tu conexión',
    })
  })
})

describe('the build detail command', () => {
  it('asks which build, offering the ones the player owns', async () => {
    const { deps, command } = await ready('build show')
    const options = command.args[0]?.options?.(ctx(), {}) ?? []

    expect(options.map((option) => option.label)).toEqual(['Duelista híbrido', 'Bruto'])
    expect(deps.list).toHaveBeenCalled()
  })

  it('reads back the build the player picked', async () => {
    const result = await run('build show', { args: { build: 'id-mage' } })

    expect(result.message).toMatch(/Duelista híbrido/)
    expect(result.lines?.join('\n')).toMatch(/Magia/)
  })

  it('takes the number the list showed', async () => {
    const result = await run('build show', { args: { build: '2' } })

    expect(result.message).toMatch(/Bruto/)
  })

  it('says it does not know a build nobody owns', async () => {
    const result = await run('build show', { args: { build: 'Fantasma' } })

    expect(result).toEqual({ status: 'error', message: 'No encontré esa build' })
  })
})

describe('the build rename command', () => {
  it('patches only the name', async () => {
    const { update } = await runWith('build rename', { build: 'id-mage', name: 'Duelista ágil' })

    expect(update).toHaveBeenCalledWith('id-mage', { name: 'Duelista ágil' })
  })

  it('reports the new name', async () => {
    const result = await run('build rename', { args: { build: '1', name: 'Duelista ágil' } })

    expect(result.status).toBe('ok')
    expect(result.message).toMatch(/Duelista ágil/)
  })

  it('sends the next listing back to the arena', async () => {
    const deps = harness()
    await fetchBuilds(deps.client, deps.api)
    await commandFrom(deps, 'build rename').run({ build: '1', name: 'Otro' }, ctx())
    await fetchBuilds(deps.client, deps.api)

    expect(deps.list).toHaveBeenCalledTimes(2)
  })

  it('reports a name that is already taken', async () => {
    const conflict = new ApiError('taken', { status: 409, payload: {} })
    const result = await run('build rename', {
      args: { build: '1', name: 'Bruto' },
      updateFailure: conflict,
    })

    expect(result).toEqual({ status: 'error', message: 'Ya tenés una build con ese nombre' })
  })

  it('renders every violation when the arena refuses the change', async () => {
    const refusal = new ApiError('illegal', {
      status: 400,
      payload: {
        message: 'The build breaks the rules of the arena',
        violations: [{ rule: 'SLOT_COUNT', message: 'not two and two' }],
      },
    })
    const result = await run('build rename', {
      args: { build: '1', name: 'X' },
      updateFailure: refusal,
    })

    expect(result.message).toBe('La arena rechazó la build')
    expect(result.lines).toEqual(['La build lleva exactamente 2 acciones y 2 reacciones'])
  })
})

describe('the build delete command', () => {
  it('asks for a confirmation before it destroys anything', async () => {
    const { command } = await ready('build rm')

    expect(command.args.map((arg) => arg.name)).toEqual(['build', 'confirm'])
  })

  it('names the build in the confirmation, so nobody deletes the wrong one', async () => {
    const { command } = await ready('build rm')
    const options = command.args[1]?.options?.(ctx(), { build: 'id-mage' }) ?? []

    expect(options[0]?.hint).toMatch(/Duelista híbrido/)
  })

  it('deletes the build the player picked', async () => {
    const { remove } = await runWith('build rm', { build: 'id-brute', confirm: 'yes' })

    expect(remove).toHaveBeenCalledWith('id-brute')
  })

  it('leaves the build alone when the player backs out', async () => {
    const { remove } = await runWith('build rm', { build: 'id-brute', confirm: 'no' })

    expect(remove).not.toHaveBeenCalled()
  })

  it('says which build it deleted', async () => {
    const result = await run('build rm', { args: { build: '2', confirm: 'yes' } })

    expect(result.status).toBe('ok')
    expect(result.message).toMatch(/Bruto/)
  })

  it('sends the next listing back to the arena', async () => {
    const deps = harness()
    await fetchBuilds(deps.client, deps.api)
    await commandFrom(deps, 'build rm').run({ build: '1', confirm: 'yes' }, ctx())
    await fetchBuilds(deps.client, deps.api)

    expect(deps.list).toHaveBeenCalledTimes(2)
  })

  it('reports a build the arena no longer has', async () => {
    const gone = new ApiError('gone', { status: 404, payload: {} })
    const result = await run('build rm', {
      args: { build: '1', confirm: 'yes' },
      removeFailure: gone,
    })

    expect(result).toEqual({ status: 'error', message: 'Esa build ya no está' })
  })
})

function offline() {
  return new ApiError('offline', { status: null, payload: undefined })
}

interface RunOptions {
  builds?: BuildList
  args?: Record<string, string>
  failure?: ApiError
  updateFailure?: ApiError
  removeFailure?: ApiError
}

function harness({ builds = BUILDS, failure, updateFailure, removeFailure }: RunOptions = {}) {
  const list = vi.fn<BuildsApi['list']>()
  const update = vi.fn<BuildsApi['update']>()
  const remove = vi.fn<BuildsApi['remove']>()

  if (failure === undefined) {
    list.mockResolvedValue(builds)
  } else {
    list.mockRejectedValue(failure)
  }

  if (updateFailure === undefined) {
    update.mockImplementation((id, change) =>
      Promise.resolve({ ...MAGE, id, name: change.name ?? MAGE.name }),
    )
  } else {
    update.mockRejectedValue(updateFailure)
  }

  if (removeFailure === undefined) {
    remove.mockResolvedValue(undefined)
  } else {
    remove.mockRejectedValue(removeFailure)
  }

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const api = { create: vi.fn(), list, get: vi.fn(), update, remove } as unknown as BuildsApi

  return { client, api, list, update, remove }
}

function commandFrom(deps: ReturnType<typeof harness>, alias: string): Command {
  const found = createBuildsCommands({ client: deps.client, api: deps.api }).find((command) =>
    command.aliases.includes(alias),
  )

  if (found === undefined) {
    throw new Error(`no hay comando ${alias}`)
  }

  return found
}

function commandNamed(alias: string): Command {
  return commandFrom(harness(), alias)
}

async function ready(alias: string) {
  const deps = harness()
  const command = commandFrom(deps, alias)

  await fetchBuilds(deps.client, deps.api)

  return { deps, command }
}

async function run(alias: string, options: RunOptions = {}): Promise<CommandResult> {
  const deps = harness(options)
  const command = commandFrom(deps, alias)

  await fetchBuilds(deps.client, deps.api).catch(() => undefined)

  return command.run(options.args ?? {}, ctx())
}

async function runWith(alias: string, args: Record<string, string>) {
  const deps = harness()
  const command = commandFrom(deps, alias)

  await fetchBuilds(deps.client, deps.api)
  await command.run(args, ctx())

  return deps
}

function ctx(): CommandContext {
  return {
    activeScopes: ['lobby'],
    picks: EMPTY_NUMBERED_LIST,
    state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false },
  }
}

function build(overrides: Partial<PublicBuild>): PublicBuild {
  return {
    id: '7c3f1a92-8d4e-4b6a-9f21-0e5d8c7b6a34',
    name: 'Una build',
    strength: 12,
    magic: 12,
    dexterity: 12,
    constitution: 12,
    skills: [],
    createdAt: '2026-09-06T10:15:00.000Z',
    updatedAt: '2026-09-06T10:15:00.000Z',
    ...overrides,
  }
}
