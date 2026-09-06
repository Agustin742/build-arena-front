import { describe, expect, it } from 'vitest'

import { available, blocked } from './availability'
import { numberCommands, numberOptions } from './numbered'
import { type Command, type CommandOption, type VisibleCommand } from './types'

function makeCommand(id: string, label: string, hint?: string): Command {
  return {
    id,
    label,
    ...(hint === undefined ? {} : { hint }),
    aliases: [],
    args: [],
    scope: ['lobby'],
    availability: () => available(),
    run: () => Promise.resolve({ status: 'ok' }),
  }
}

describe('numberCommands', () => {
  it('assigns keys 1..n in registry order, including blocked commands', () => {
    const visible: VisibleCommand[] = [
      { command: makeCommand('attack', 'Attack'), availability: available() },
      {
        command: makeCommand('challenge', 'Challenge'),
        availability: blocked('necesita MAGIC 14'),
      },
      { command: makeCommand('flee', 'Flee'), availability: available() },
    ]

    const list = numberCommands(visible, 1)

    expect(list.items.map((item) => item.key)).toEqual(['1', '2', '3'])
    expect(list.items.map((item) => item.id)).toEqual(['attack', 'challenge', 'flee'])
    expect(list.items[1]).toMatchObject({ id: 'challenge', lockedReason: 'necesita MAGIC 14' })
  })

  it('agrees with items when looking up a key', () => {
    const visible: VisibleCommand[] = [
      { command: makeCommand('attack', 'Attack'), availability: available() },
      { command: makeCommand('flee', 'Flee'), availability: available() },
    ]

    const list = numberCommands(visible, 1)

    expect(list.lookup('1')).toBe('attack')
    expect(list.lookup('2')).toBe('flee')
    expect(list.lookup('3')).toBeUndefined()
  })

  it('carries a different generation across rebuilds of the same input', () => {
    const visible: VisibleCommand[] = [
      { command: makeCommand('attack', 'Attack'), availability: available() },
    ]

    const first = numberCommands(visible, 1)
    const second = numberCommands(visible, 2)

    expect(first.generation).not.toBe(second.generation)
  })
})

describe('numberOptions', () => {
  const options: CommandOption[] = [
    { id: 'rival-alice', label: 'Alice' },
    { id: 'rival-bob', label: 'Bob' },
  ]

  it('numbers the options themselves before appending control entries', () => {
    const list = numberOptions(options, 1, { skip: true })

    expect(list.items.slice(0, 2).map((item) => ({ key: item.key, id: item.id }))).toEqual([
      { key: '1', id: 'rival-alice' },
      { key: '2', id: 'rival-bob' },
    ])
  })

  it('appends the skip control entry only when controls.skip is true', () => {
    const withSkip = numberOptions(options, 1, { skip: true })
    const withoutSkip = numberOptions(options, 1, { skip: false })

    expect(withSkip.items).toContainEqual(expect.objectContaining({ key: 's', id: '__skip__' }))
    expect(withoutSkip.items.some((item) => item.key === 's')).toBe(false)
  })

  it('always appends the cancel control entry', () => {
    const list = numberOptions(options, 1, { skip: false })

    expect(list.items).toContainEqual(expect.objectContaining({ key: 'esc', id: '__cancel__' }))
  })
})

describe('numberOptions with locked options', () => {
  const options: CommandOption[] = [
    { id: 'POWER_STRIKE', label: 'POWER_STRIKE', hint: '4pts' },
    { id: 'PRECISE_SHOT', label: 'PRECISE_SHOT', lockedReason: 'necesita DEXTERITY 13, tenés 12' },
  ]

  it('numbers a locked option like any other, so the list keeps its shape', () => {
    const list = numberOptions(options, 1, { skip: false })

    expect(list.items.slice(0, 2).map((item) => item.key)).toEqual(['1', '2'])
  })

  it('carries the reason a locked option cannot be picked', () => {
    const list = numberOptions(options, 1, { skip: false })

    expect(list.items[1]).toMatchObject({
      id: 'PRECISE_SHOT',
      lockedReason: 'necesita DEXTERITY 13, tenés 12',
    })
  })

  it('leaves an open option without a reason', () => {
    const list = numberOptions(options, 1, { skip: false })

    expect(list.items[0]).not.toHaveProperty('lockedReason')
  })

  it('still resolves a locked option by its key, so the refusal can name it', () => {
    const list = numberOptions(options, 1, { skip: false })

    expect(list.lookup('2')).toBe('PRECISE_SHOT')
  })
})

describe('numberOptions with keys of their own', () => {
  const attributes: CommandOption[] = [
    { id: '8', key: '8', label: '8', hint: 'costo 0 · restan 20' },
    { id: '14', key: '14', label: '14', hint: 'costo 7 · restan 13' },
    { id: '15', key: '15', label: '15', lockedReason: 'te faltan 2 puntos' },
  ]

  it('uses the key an option carries instead of its position', () => {
    const list = numberOptions(attributes, 1, { skip: false })

    expect(list.items.slice(0, 3).map((item) => item.key)).toEqual(['8', '14', '15'])
  })

  it('resolves an option by the key it chose, so typing 14 means 14', () => {
    const list = numberOptions(attributes, 1, { skip: false })

    expect(list.lookup('14')).toBe('14')
  })

  it('still numbers by position the options that bring no key', () => {
    const list = numberOptions([{ id: 'a', label: 'A' }, attributes[1]!], 1, { skip: false })

    expect(list.items.slice(0, 2).map((item) => item.key)).toEqual(['1', '14'])
  })

  it('keeps the control entries reachable next to keyed options', () => {
    const list = numberOptions(attributes, 1, { skip: true })

    expect(list.lookup('s')).toBe('__skip__')
    expect(list.lookup('esc')).toBe('__cancel__')
  })
})
