import { describe, expect, it } from 'vitest'

import { available, blocked } from './availability'
import { createCommandRegistry } from './registry'
import { resolve } from './resolve'
import {
  type Command,
  type CommandArg,
  type CommandAvailability,
  type CommandContext,
  type CommandScope,
  type NumberedList,
} from './types'

function makeCommand(params: {
  id: string
  aliases: readonly string[]
  scope?: readonly CommandScope[]
  args?: readonly CommandArg[]
  availability?: (ctx: CommandContext) => CommandAvailability
}): Command {
  return {
    id: params.id,
    label: params.id,
    aliases: params.aliases,
    args: params.args ?? [],
    scope: params.scope ?? ['lobby'],
    availability: params.availability ?? (() => available()),
    run: () => Promise.resolve({ status: 'ok' }),
  }
}

const emptyPicks: NumberedList = { generation: 0, items: [], lookup: () => undefined }

function contextFor(picks: NumberedList): CommandContext {
  return {
    activeScopes: ['lobby'],
    picks,
    state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false },
  }
}

describe('resolve', () => {
  it('returns empty for a blank input', () => {
    const registry = createCommandRegistry()

    expect(resolve('', registry, contextFor(emptyPicks))).toEqual({ kind: 'empty' })
    expect(resolve('   ', registry, contextFor(emptyPicks))).toEqual({ kind: 'empty' })
  })

  it('returns stale-number when typedAtGeneration does not match the current generation', () => {
    const registry = createCommandRegistry()
    const picks: NumberedList = { generation: 2, items: [], lookup: () => 'attack' }

    const outcome = resolve('1', registry, contextFor(picks), { typedAtGeneration: 1 })

    expect(outcome).toEqual({ kind: 'stale-number', input: '1' })
  })

  it('returns stale-number when the numeral has no entry in the current map', () => {
    const registry = createCommandRegistry()
    const picks: NumberedList = { generation: 1, items: [], lookup: () => undefined }

    const outcome = resolve('2', registry, contextFor(picks), { typedAtGeneration: 1 })

    expect(outcome).toEqual({ kind: 'stale-number', input: '2' })
  })

  it('resolves a matching numeral to the looked-up command', () => {
    const command = makeCommand({ id: 'fireball', aliases: ['fireball'] })
    const registry = createCommandRegistry([command])
    const picks: NumberedList = { generation: 1, items: [], lookup: () => 'fireball' }

    const outcome = resolve('2', registry, contextFor(picks), { typedAtGeneration: 1 })

    expect(outcome).toEqual({ kind: 'begin', command, seed: {} })
  })

  it('resolves a known alias with positionally parsed arguments', () => {
    const command = makeCommand({
      id: 'challenge',
      aliases: ['challenge'],
      args: [
        { name: 'rival', kind: 'text', label: 'Rival', required: true },
        { name: 'build', kind: 'text', label: 'Build', required: false },
      ],
    })
    const registry = createCommandRegistry([command])

    const outcome = resolve('challenge alice starter', registry, contextFor(emptyPicks))

    expect(outcome).toEqual({
      kind: 'begin',
      command,
      seed: { rival: 'alice', build: 'starter' },
    })
  })

  it('returns blocked with the availability reason for a blocked alias', () => {
    const command = makeCommand({
      id: 'challenge',
      aliases: ['challenge'],
      availability: () => blocked('necesita MAGIC 14'),
    })
    const registry = createCommandRegistry([command])

    const outcome = resolve('challenge', registry, contextFor(emptyPicks))

    expect(outcome).toEqual({ kind: 'blocked', command, reason: 'necesita MAGIC 14' })
  })

  it('returns unknown with suggestions for an unmatched alias', () => {
    const command = makeCommand({ id: 'attack', aliases: ['attack'] })
    const registry = createCommandRegistry([command])

    const outcome = resolve('atack', registry, contextFor(emptyPicks))

    expect(outcome).toEqual({ kind: 'unknown', input: 'atack', suggestions: ['attack'] })
  })
})
