import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { SKILLS_QUERY_KEY } from '@/features/skills'
import {
  type CommandContext,
  type CommandResult,
  EMPTY_NUMBERED_LIST,
  type ParsedArgs,
} from '@/shared/commands'
import { type PublicSkill, type SkillCatalog } from '@/shared/contracts'
import { ApiError } from '@/shared/http'

import { type BuildsApi } from '../infrastructure/builds.api'
import { fetchBuilds } from './build-queries'
import { createBuildsCommands } from './builds.commands'

const CATALOG: SkillCatalog = [
  skill({ code: 'POWER_STRIKE', cost: 4, requiredAttribute: 'STRENGTH', requiredValue: 12 }),
  skill({ code: 'FIREBALL', cost: 5, requiredAttribute: 'MAGIC', requiredValue: 12 }),
  skill({ code: 'PRECISE_SHOT', cost: 4, requiredAttribute: 'DEXTERITY', requiredValue: 13 }),
  skill({
    code: 'BRACE',
    type: 'REACTION',
    cost: 3,
    requiredAttribute: 'CONSTITUTION',
    requiredValue: 12,
    damageDice: null,
  }),
  skill({
    code: 'PARRY',
    type: 'REACTION',
    cost: 4,
    requiredAttribute: 'STRENGTH',
    requiredValue: 12,
    damageDice: null,
  }),
  skill({
    code: 'DODGE',
    type: 'REACTION',
    cost: 4,
    requiredAttribute: 'DEXTERITY',
    requiredValue: 12,
    damageDice: null,
  }),
]

const ANSWERS: ParsedArgs = {
  name: 'Duelista híbrido',
  strength: '12',
  magic: '14',
  dexterity: '12',
  constitution: '12',
  action1: 'POWER_STRIKE',
  action2: 'FIREBALL',
  reaction1: 'BRACE',
  reaction2: 'PARRY',
  confirm: 'yes',
}

const CREATED = {
  id: '7c3f1a92-8d4e-4b6a-9f21-0e5d8c7b6a34',
  name: 'Duelista híbrido',
  strength: 12,
  magic: 14,
  dexterity: 12,
  constitution: 12,
  skills: [],
  createdAt: '2026-09-06T10:15:00.000Z',
  updatedAt: '2026-09-06T10:15:00.000Z',
}

describe('createBuildsCommands', () => {
  describe('the command itself', () => {
    it('registers the wizard in the lobby', () => {
      expect(wizard()).toMatchObject({
        id: 'build-new',
        aliases: ['build new'],
        scope: ['lobby'],
      })
    })

    it('asks for the name, the four attributes, the kit and a confirmation', () => {
      expect(wizard().args.map((arg) => arg.name)).toEqual([
        'name',
        'strength',
        'magic',
        'dexterity',
        'constitution',
        'action1',
        'action2',
        'reaction1',
        'reaction2',
        'confirm',
      ])
    })

    it('waits for the catalog instead of offering a wizard it cannot fill', () => {
      const { client, api } = deps({ withCatalog: false })
      const [command] = createBuildsCommands({ client, api })

      expect(command?.availability(ctx())).toEqual({
        enabled: false,
        reason: 'el catálogo todavía no llegó',
      })
    })

    it('opens once the catalog is in memory', () => {
      expect(wizard().availability(ctx())).toEqual({ enabled: true })
    })
  })

  describe('the attribute steps', () => {
    it('offers every value with what it costs and what would be left', () => {
      const options = optionsOf('strength', {})

      expect(options[0]).toMatchObject({ id: '8', key: '8', hint: 'mod -1 · costo 0 · restan 20' })
    })

    it('locks a value the budget can no longer pay', () => {
      const options = optionsOf('constitution', { strength: '14', magic: '14', dexterity: '8' })

      expect(options.at(-1)?.lockedReason).toBe('te faltan 3 puntos')
    })
  })

  describe('the kit steps', () => {
    it('offers only actions on an action step', () => {
      const options = optionsOf('action1', ANSWERS)

      expect(options.map((option) => option.id)).toEqual([
        'POWER_STRIKE',
        'FIREBALL',
        'PRECISE_SHOT',
      ])
    })

    it('offers only reactions on a reaction step', () => {
      const options = optionsOf('reaction1', ANSWERS)

      expect(options.map((option) => option.id)).toEqual(['BRACE', 'PARRY', 'DODGE'])
    })

    it('shows a locked skill with the attribute it is missing', () => {
      const options = optionsOf('action1', ANSWERS)

      expect(options.find((option) => option.id === 'PRECISE_SHOT')?.lockedReason).toBe(
        'necesita DEXTERITY 13, tenés 12',
      )
    })

    it('locks a skill the player already took', () => {
      const options = optionsOf('action2', ANSWERS)

      expect(options.find((option) => option.id === 'POWER_STRIKE')?.lockedReason).toBe(
        'ya está en tu kit',
      )
    })
  })

  describe('the confirmation step', () => {
    it('offers saving and discarding', () => {
      expect(optionsOf('confirm', ANSWERS).map((option) => option.id)).toEqual(['yes', 'no'])
    })

    it('previews the armour class, the hit points and what the kit costs', () => {
      const [save] = optionsOf('confirm', ANSWERS)

      expect(save?.hint).toBe('CA 11 · 35 PV · kit 16/18')
    })
  })

  describe('running the wizard', () => {
    it('posts the draft the player assembled', async () => {
      const { client, api, create } = deps()

      await createBuildsCommands({ client, api })[0]?.run(ANSWERS, ctx())

      expect(create).toHaveBeenCalledWith({
        name: 'Duelista híbrido',
        strength: 12,
        magic: 14,
        dexterity: 12,
        constitution: 12,
        skillCodes: ['POWER_STRIKE', 'FIREBALL', 'BRACE', 'PARRY'],
      })
    })

    it('reports the build it created', async () => {
      const result = await run(ANSWERS)

      expect(result).toMatchObject({ status: 'ok' })
      expect(result.message).toMatch(/Duelista híbrido/)
    })

    it('sends the next listing back to the arena, which the endless cache would not', async () => {
      const { client, api, list } = deps()
      await fetchBuilds(client, api)

      await createBuildsCommands({ client, api })[0]?.run(ANSWERS, ctx())
      await fetchBuilds(client, api)

      expect(list).toHaveBeenCalledTimes(2)
    })

    it('leaves the cached listing alone when nothing was created', async () => {
      const { client, api, list } = deps()
      await fetchBuilds(client, api)

      await createBuildsCommands({ client, api })[0]?.run({ ...ANSWERS, confirm: 'no' }, ctx())
      await fetchBuilds(client, api)

      expect(list).toHaveBeenCalledTimes(1)
    })

    it('discards the build when the player says no, without asking the arena', async () => {
      const { client, api, create } = deps()

      const result = await createBuildsCommands({ client, api })[0]?.run(
        { ...ANSWERS, confirm: 'no' },
        ctx(),
      )

      expect(create).not.toHaveBeenCalled()
      expect(result).toEqual({ status: 'ok', message: 'Build descartada' })
    })

    it('warns that the ceiling bought nothing', async () => {
      const result = await run({ ...ANSWERS, magic: '15', dexterity: '8', constitution: '8' })

      expect(result.lines?.some((line) => line.startsWith('MAGIC en 15'))).toBe(true)
    })

    it('warns about a kit with no answer to magic', async () => {
      const result = await run({ ...ANSWERS, reaction1: 'PARRY', reaction2: 'DODGE' })

      expect(result.lines).toContain(
        'Tus dos reacciones solo responden a ataques físicos: contra magia comés el hechizo entero',
      )
    })

    it('says nothing extra about a build that spends well and answers magic', async () => {
      const result = await run(ANSWERS)

      expect(result.lines ?? []).toEqual([])
    })
  })

  describe('when the arena refuses the build', () => {
    it('renders every violation, not just the first', async () => {
      const result = await run(ANSWERS, rejection())

      expect(result.status).toBe('error')
      expect(result.lines).toEqual([
        'El reparto de atributos se pasa del presupuesto de 20 puntos',
        'El kit se pasa del presupuesto de 18 puntos',
      ])
    })

    it('keeps the headline about the arena refusing, not about one rule', async () => {
      const result = await run(ANSWERS, rejection())

      expect(result.message).toBe('La arena rechazó la build')
    })

    it('reports a name the player already used', async () => {
      const conflict = new ApiError('taken', {
        status: 409,
        payload: { statusCode: 409, message: 'Conflict' },
      })

      expect(await run(ANSWERS, conflict)).toEqual({
        status: 'error',
        message: 'Ya tenés una build con ese nombre',
      })
    })

    it('falls back to the game message when the failure carries no violations', async () => {
      const offline = new ApiError('offline', { status: null, payload: undefined })

      expect(await run(ANSWERS, offline)).toEqual({
        status: 'error',
        message: 'No se pudo llegar a la arena. Revisá tu conexión',
      })
    })
  })
})

function rejection(): ApiError {
  return new ApiError('illegal', {
    status: 400,
    payload: {
      message: 'The build breaks the rules of the arena',
      violations: [
        { rule: 'ATTRIBUTE_BUDGET_EXCEEDED', message: 'The spread costs 24' },
        { rule: 'KIT_BUDGET_EXCEEDED', message: 'The kit costs 21' },
      ],
    },
  })
}

function deps({ withCatalog = true } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  if (withCatalog) {
    client.setQueryData(SKILLS_QUERY_KEY, CATALOG)
  }

  const create = vi.fn<BuildsApi['create']>().mockResolvedValue(CREATED)
  const list = vi.fn<BuildsApi['list']>().mockResolvedValue([])
  const api = { create, list } as unknown as BuildsApi

  return { client, api, create, list }
}

function wizard() {
  const { client, api } = deps()
  const [command] = createBuildsCommands({ client, api })

  if (command === undefined) {
    throw new Error('the wizard was not registered')
  }

  return command
}

function optionsOf(argName: string, values: ParsedArgs) {
  const arg = wizard().args.find((candidate) => candidate.name === argName)

  return arg?.options?.(ctx(), values) ?? []
}

async function run(values: ParsedArgs, failure?: ApiError): Promise<CommandResult> {
  const { client, api, create } = deps()

  if (failure !== undefined) {
    create.mockRejectedValue(failure)
  }

  const result = await createBuildsCommands({ client, api })[0]?.run(values, ctx())

  if (result === undefined) {
    throw new Error('the wizard was not registered')
  }

  return result
}

function ctx(): CommandContext {
  return {
    activeScopes: ['lobby'],
    picks: EMPTY_NUMBERED_LIST,
    state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false },
  }
}

function skill(overrides: Partial<PublicSkill> & Pick<PublicSkill, 'code'>): PublicSkill {
  return {
    name: overrides.code,
    description: 'una habilidad del catálogo',
    type: 'ACTION',
    cost: 4,
    requiredAttribute: 'STRENGTH',
    requiredValue: 12,
    damageDice: '1d8',
    appliesCondition: null,
    conditionRounds: null,
    ...overrides,
  }
}
