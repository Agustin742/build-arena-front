import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { type CommandContext, type CommandResult, EMPTY_NUMBERED_LIST } from '@/shared/commands'
import { type SkillCatalog } from '@/shared/contracts'
import { ApiError } from '@/shared/http'

import { type SkillsApi } from '../infrastructure/skills.api'
import { createSkillsCommands } from './skills.commands'

const CATALOG = [
  {
    code: 'POWER_STRIKE',
    name: 'Golpe potente',
    description: 'Un mandoble que abre la guardia',
    type: 'ACTION',
    cost: 4,
    requiredAttribute: 'STRENGTH',
    requiredValue: 12,
    damageDice: '1d8',
    appliesCondition: null,
    conditionRounds: null,
  },
  {
    code: 'BRACE',
    name: 'Aguantar',
    description: 'Planta los pies y encaja',
    type: 'REACTION',
    cost: 3,
    requiredAttribute: 'CONSTITUTION',
    requiredValue: 12,
    damageDice: null,
    appliesCondition: null,
    conditionRounds: null,
  },
] satisfies SkillCatalog

describe('createSkillsCommands', () => {
  it('registers the catalog command in the lobby', () => {
    const [skills] = createSkillsCommands(deps())

    expect(skills).toMatchObject({ id: 'skills', aliases: ['skills'], scope: ['lobby'], args: [] })
  })

  it('lists the catalog split by type', async () => {
    const result = await runSkills()

    expect(result.status).toBe('ok')
    expect(result.lines).toContain('ACCIONES')
    expect(result.lines).toContain('REACCIONES')
    expect(result.lines?.some((line) => line.includes('POWER_STRIKE'))).toBe(true)
    expect(result.lines?.some((line) => line.includes('BRACE'))).toBe(true)
  })

  it('counts the skills it found in the headline', async () => {
    const result = await runSkills()

    expect(result.message).toMatch(/2/)
  })

  it('asks the arena once no matter how often the command runs', async () => {
    const { client, api, list } = deps()
    const [skills] = createSkillsCommands({ client, api })

    await skills?.run({}, ctx())
    await skills?.run({}, ctx())

    expect(list).toHaveBeenCalledTimes(1)
  })

  it('turns a failed request into a game message instead of throwing', async () => {
    const list = vi
      .fn<SkillsApi['list']>()
      .mockRejectedValue(new ApiError('boom', { status: null, payload: undefined }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const [skills] = createSkillsCommands({ client, api: { list } })

    const result = await skills?.run({}, ctx())

    expect(result).toEqual({
      status: 'error',
      message: 'No se pudo llegar a la arena. Revisá tu conexión',
    })
  })
})

async function runSkills(): Promise<CommandResult> {
  const [skills] = createSkillsCommands(deps())
  const result = await skills?.run({}, ctx())

  if (result === undefined) {
    throw new Error('the skills command was not registered')
  }

  return result
}

function deps() {
  const list = vi.fn<SkillsApi['list']>().mockResolvedValue(CATALOG)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return { client, api: { list }, list }
}

function ctx(): CommandContext {
  return {
    activeScopes: ['lobby'],
    picks: EMPTY_NUMBERED_LIST,
    state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false },
  }
}
