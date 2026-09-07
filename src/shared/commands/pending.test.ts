import { describe, expect, it, vi } from 'vitest'

import { advance, begin } from './pending'
import {
  type Command,
  type CommandArg,
  type CommandContext,
  type CommandOption,
  type NumberedList,
} from './types'

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
    const command = makeCommand()
    const seed = { rival: 'grace', build: 'aggro' }

    expect(begin(command, seed)).toEqual({ kind: 'filled', command, args: seed })
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

function makeKitCommand(options: CommandOption[]): Command {
  return {
    ...makeCommand(),
    id: 'build-new',
    aliases: ['build new'],
    args: [
      { name: 'name', kind: 'text', label: 'Nombre', required: true },
      {
        name: 'action',
        kind: 'pick',
        label: 'Acción',
        required: true,
        options: () => options,
      },
    ],
  }
}

describe('advance over a pick argument', () => {
  const open: CommandOption = { id: 'POWER_STRIKE', label: 'POWER_STRIKE' }
  const locked: CommandOption = {
    id: 'PRECISE_SHOT',
    label: 'PRECISE_SHOT',
    lockedReason: 'necesita DEXTERITY 13, tenés 12',
  }

  it('takes an option that is open', () => {
    const command = makeKitCommand([open, locked])
    const pending = { commandId: 'build-new', values: { name: 'ágil' }, awaiting: 'action' }

    expect(
      advance(command, pending, { kind: 'pick', optionId: 'POWER_STRIKE' }, contextFor()),
    ).toEqual({
      kind: 'filled',
      command,
      args: { name: 'ágil', action: 'POWER_STRIKE' },
    })
  })

  it('refuses a locked option and answers with its reason', () => {
    const command = makeKitCommand([open, locked])
    const pending = { commandId: 'build-new', values: { name: 'ágil' }, awaiting: 'action' }

    expect(
      advance(command, pending, { kind: 'pick', optionId: 'PRECISE_SHOT' }, contextFor()),
    ).toEqual({
      kind: 'invalid',
      pending,
      reason: 'necesita DEXTERITY 13, tenés 12',
    })
  })

  it('refuses an option the list never offered', () => {
    const command = makeKitCommand([open])
    const pending = { commandId: 'build-new', values: { name: 'ágil' }, awaiting: 'action' }

    const outcome = advance(command, pending, { kind: 'pick', optionId: 'FIREBALL' }, contextFor())

    expect(outcome).toMatchObject({ kind: 'invalid', pending })
  })

  it('hands the answers collected so far to the option builder', () => {
    const seen = vi.fn<NonNullable<CommandArg['options']>>().mockReturnValue([open])
    const command: Command = {
      ...makeKitCommand([open]),
      args: [
        { name: 'name', kind: 'text', label: 'Nombre', required: true },
        { name: 'action', kind: 'pick', label: 'Acción', required: true, options: seen },
      ],
    }
    const pending = { commandId: 'build-new', values: { name: 'ágil' }, awaiting: 'action' }
    const ctx = contextFor()

    advance(command, pending, { kind: 'pick', optionId: 'POWER_STRIKE' }, ctx)

    expect(seen).toHaveBeenCalledWith(ctx, { name: 'ágil' })
  })

  it('lets a typed value the list never offered through, because the arena decides', () => {
    const command = makeKitCommand([open])
    const pending = { commandId: 'build-new', values: { name: 'ágil' }, awaiting: 'action' }

    expect(advance(command, pending, { kind: 'value', raw: 'FIREBALL' }, contextFor())).toEqual({
      kind: 'filled',
      command,
      args: { name: 'ágil', action: 'FIREBALL' },
    })
  })

  it('takes a typed value that names an open option', () => {
    const command = makeKitCommand([open, locked])
    const pending = { commandId: 'build-new', values: { name: 'ágil' }, awaiting: 'action' }

    expect(advance(command, pending, { kind: 'value', raw: 'POWER_STRIKE' }, contextFor())).toEqual(
      {
        kind: 'filled',
        command,
        args: { name: 'ágil', action: 'POWER_STRIKE' },
      },
    )
  })

  it('refuses a typed value that names a locked option, the same as clicking it', () => {
    const command = makeKitCommand([open, locked])
    const pending = { commandId: 'build-new', values: { name: 'ágil' }, awaiting: 'action' }

    expect(advance(command, pending, { kind: 'value', raw: 'PRECISE_SHOT' }, contextFor())).toEqual(
      {
        kind: 'invalid',
        pending,
        reason: 'necesita DEXTERITY 13, tenés 12',
      },
    )
  })

  it('takes a pick on an argument that offers no options at all', () => {
    const command = makeCommand()
    const pending = { commandId: 'challenge', values: {}, awaiting: 'rival' }

    expect(advance(command, pending, { kind: 'pick', optionId: 'grace' }, contextFor())).toEqual({
      kind: 'pending',
      pending: { commandId: 'challenge', values: { rival: 'grace' }, awaiting: 'build' },
    })
  })
})
