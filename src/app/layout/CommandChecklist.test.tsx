import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type CommandRuntime, CommandRuntimeContext } from '@/app/providers/command-runtime'
import {
  type Command,
  createCommandRegistry,
  EMPTY_NUMBERED_LIST,
  type ParsedArgs,
  type PendingCommand,
} from '@/shared/commands'

import { CommandChecklist } from './CommandChecklist'

const WIZARD: Command = {
  id: 'build-new',
  label: 'BUILD NEW',
  aliases: ['build new'],
  args: [
    { name: 'name', kind: 'text', label: 'Nombre', required: true },
    { name: 'strength', kind: 'pick', label: 'Fuerza', required: true, group: 'atributo' },
    { name: 'magic', kind: 'pick', label: 'Magia', required: true, group: 'atributo' },
    {
      name: 'action1',
      kind: 'pick',
      label: 'Acción 1',
      required: true,
      options: () => [{ id: 'POWER_STRIKE', label: 'Golpe potente' }],
    },
    { name: 'secret', kind: 'password', label: 'Contraseña', required: true },
  ],
  scope: ['lobby'],
  availability: () => ({ enabled: true }),
  run: () => Promise.resolve({ status: 'ok' }),
}

describe('CommandChecklist', () => {
  it('stays out of the way while no command is running', () => {
    const { container } = renderChecklist(null)

    expect(container).toBeEmptyDOMElement()
  })

  it('names the run it is tracking', () => {
    renderChecklist({ commandId: 'build-new', values: {}, awaiting: 'name' })

    expect(screen.getByRole('heading')).toHaveTextContent('BUILD NEW')
  })

  it('lists every step of the run from the first one, so the end is in sight', () => {
    renderChecklist({ commandId: 'build-new', values: {}, awaiting: 'name' })

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Magia')).toBeInTheDocument()
  })

  it('shows the answer next to a step that is already done', () => {
    renderChecklist({
      commandId: 'build-new',
      values: { name: 'Duelista', strength: '14' },
      awaiting: 'magic',
    })

    expect(screen.getByText('Duelista')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('shows the answer the way the list showed it, not the code it sent', () => {
    renderChecklist({
      commandId: 'build-new',
      values: { name: 'Duelista', action1: 'POWER_STRIKE' },
      awaiting: 'strength',
    })

    expect(screen.getByText('Golpe potente')).toBeInTheDocument()
    expect(screen.queryByText('POWER_STRIKE')).not.toBeInTheDocument()
  })

  it('falls back to the raw answer when the step offers no list', () => {
    renderChecklist({ commandId: 'build-new', values: { name: 'Duelista' }, awaiting: 'strength' })

    expect(screen.getByText('Duelista')).toBeInTheDocument()
  })

  it('marks the step that is being asked right now', () => {
    renderChecklist({ commandId: 'build-new', values: { name: 'Duelista' }, awaiting: 'strength' })

    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Fuerza')
  })

  it('marks a step that already has its answer as done', () => {
    renderChecklist({ commandId: 'build-new', values: { name: 'Duelista' }, awaiting: 'strength' })

    const [first] = screen.getAllByRole('listitem')

    expect(first).toHaveAttribute('data-state', 'done')
  })

  it('leaves the steps still ahead untouched', () => {
    renderChecklist({ commandId: 'build-new', values: { name: 'Duelista' }, awaiting: 'strength' })

    const items = screen.getAllByRole('listitem')

    expect(items.at(-1)).toHaveAttribute('data-state', 'ahead')
  })

  it('never prints back a secret the player typed', () => {
    renderChecklist({
      commandId: 'build-new',
      values: { name: 'Duelista', secret: 'hunter2hunter2' },
      awaiting: 'strength',
    })

    expect(screen.queryByText('hunter2hunter2')).not.toBeInTheDocument()
    expect(screen.getByText('••••••')).toBeInTheDocument()
  })

  it('says nothing about a command the registry no longer knows', () => {
    const { container } = renderChecklist({ commandId: 'gone', values: {}, awaiting: 'name' })

    expect(container).toBeEmptyDOMElement()
  })
})

function renderChecklist(pending: PendingCommand | null, values: ParsedArgs = {}) {
  const runtime: CommandRuntime = {
    ctx: {
      activeScopes: ['lobby'],
      picks: EMPTY_NUMBERED_LIST,
      state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false },
    },
    registry: createCommandRegistry([WIZARD]),
    pending: pending === null ? null : { ...pending, values: { ...pending.values, ...values } },
    pendingStep: null,
    promptError: undefined,
    lastResult: null,
    selectItem: () => undefined,
    submitText: () => undefined,
    cancelPending: () => undefined,
  }

  return render(
    <CommandRuntimeContext value={runtime}>
      <CommandChecklist />
    </CommandRuntimeContext>,
  )
}
