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
