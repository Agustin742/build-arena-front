import { describe, expect, it } from 'vitest'

import { advance, begin } from './pending'
import { type Command, type CommandContext, type NumberedList } from './types'

const emptyPicks: NumberedList = { generation: 0, items: [], lookup: () => undefined }

function contextFor(): CommandContext {
  return {
    activeScopes: ['lobby'],
    picks: emptyPicks,
    state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false },
  }
}

function makeCommand(): Command {
  return {
    id: 'challenge',
    label: 'challenge',
    aliases: ['challenge'],
    args: [
      { name: 'rival', kind: 'text', label: 'Rival', required: true },
      { name: 'build', kind: 'text', label: 'Build', required: false },
    ],
    scope: ['lobby'],
    availability: () => ({ enabled: true }),
    run: () => Promise.resolve({ status: 'ok' }),
  }
}

function makeZeroArgCommand(): Command {
  return { ...makeCommand(), id: 'ping', aliases: ['ping'], args: [] }
}

describe('begin', () => {
  it('fills the first argument absent from seed as awaiting', () => {
    const outcome = begin(makeCommand())

    expect(outcome).toEqual({
      kind: 'pending',
      pending: { commandId: 'challenge', values: {}, awaiting: 'rival' },
    })
  })

  it('returns filled immediately when no argument is missing from seed', () => {
    const seed = { rival: 'grace', build: 'aggro' }

    expect(begin(makeCommand(), seed)).toEqual({
      kind: 'filled',
      command: makeCommand(),
      args: seed,
    })
  })

  it('returns filled immediately for a command with zero arguments', () => {
    const command = makeZeroArgCommand()

    expect(begin(command)).toEqual({ kind: 'filled', command, args: {} })
  })
})

describe('advance', () => {
  it('returns invalid and keeps the pending command unchanged on an empty value submit', () => {
    const command = makeCommand()
    const started = begin(command)

    if (started.kind !== 'pending') {
      throw new Error('expected begin to return pending')
    }

    const outcome = advance(command, started.pending, { kind: 'value', raw: '' }, contextFor())

    expect(outcome).toEqual({
      kind: 'invalid',
      pending: started.pending,
      reason: 'rival cannot be empty',
    })
  })

  it('returns invalid when skipping a required argument', () => {
    const command = makeCommand()
    const started = begin(command)

    if (started.kind !== 'pending') {
      throw new Error('expected begin to return pending')
    }

    const outcome = advance(command, started.pending, { kind: 'skip' }, contextFor())

    expect(outcome).toEqual({
      kind: 'invalid',
      pending: started.pending,
      reason: 'rival is required',
    })
  })

  it('advances without writing a key when skipping an optional argument', () => {
    const command = makeCommand()
    const afterRival = advance(
      command,
      { commandId: 'challenge', values: {}, awaiting: 'rival' },
      { kind: 'value', raw: 'grace' },
      contextFor(),
    )

    if (afterRival.kind !== 'pending') {
      throw new Error('expected advance to return pending')
    }

    const outcome = advance(command, afterRival.pending, { kind: 'skip' }, contextFor())

    expect(outcome).toEqual({ kind: 'filled', command, args: { rival: 'grace' } })
  })

  it('returns cancelled on a cancel input', () => {
    const command = makeCommand()
    const started = begin(command)

    if (started.kind !== 'pending') {
      throw new Error('expected begin to return pending')
    }

    expect(advance(command, started.pending, { kind: 'cancel' }, contextFor())).toEqual({
      kind: 'cancelled',
    })
  })

  it('converges with begin on the same command and arguments regardless of path', () => {
    const command = makeCommand()
    const viaSeed = begin(command, { rival: 'grace', build: 'aggro' })

    const started = begin(command)

    if (started.kind !== 'pending') {
      throw new Error('expected begin to return pending')
    }

    const afterRival = advance(
      command,
      started.pending,
      { kind: 'value', raw: 'grace' },
      contextFor(),
    )

    if (afterRival.kind !== 'pending') {
      throw new Error('expected advance to return pending')
    }

    const viaClicks = advance(
      command,
      afterRival.pending,
      { kind: 'pick', optionId: 'aggro' },
      contextFor(),
    )

    expect(viaClicks).toEqual(viaSeed)
  })
})
