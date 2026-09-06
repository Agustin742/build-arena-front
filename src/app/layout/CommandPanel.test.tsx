import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  type CommandRuntime,
  CommandRuntimeContext,
  type PendingStep,
} from '@/app/providers/command-runtime'
import { createCommandRegistry, EMPTY_NUMBERED_LIST } from '@/shared/commands'

import { CommandPanel } from './CommandPanel'

describe('CommandPanel', () => {
  it('offers the commands while the console waits for one', () => {
    renderPanel(null)

    expect(screen.getByRole('heading')).toHaveTextContent('comandos')
    expect(screen.getByText('escribí el comando o su número')).toBeInTheDocument()
  })

  it('names the question instead of the word comandos while a step is open', () => {
    renderPanel(step('Fuerza', 2, 10))

    expect(screen.getByRole('heading')).toHaveTextContent('Fuerza')
    expect(screen.getByRole('heading')).not.toHaveTextContent('comandos')
  })

  it('says where the step sits in the run, so the wizard has an end in sight', () => {
    renderPanel(step('Fuerza', 2, 10))

    expect(screen.getByText(/paso 2 de 10/)).toBeInTheDocument()
  })

  it('names the region apart from the input that asks the very same question', () => {
    renderPanel(step('Acción 1', 6, 10))

    expect(screen.getByRole('region', { name: 'Opciones: Acción 1' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Acción 1' })).not.toBeInTheDocument()
  })

  it('tells the player a step can be dropped when it is optional', () => {
    renderPanel(step('Build', 2, 3, false))

    expect(screen.getByText(/s para saltear/)).toBeInTheDocument()
  })

  it('says nothing about skipping a step that is required', () => {
    renderPanel(step('Fuerza', 2, 10))

    expect(screen.queryByText(/saltear/)).not.toBeInTheDocument()
  })

  it('offers the way out of a step', () => {
    renderPanel(step('Fuerza', 2, 10))

    expect(screen.getByText(/esc para cancelar/)).toBeInTheDocument()
  })
})

function step(label: string, index: number, total: number, required = true): PendingStep {
  return {
    arg: { name: 'field', kind: 'pick', label, required },
    index,
    total,
  }
}

function renderPanel(pendingStep: PendingStep | null) {
  const runtime: CommandRuntime = {
    ctx: {
      activeScopes: ['lobby'],
      picks: EMPTY_NUMBERED_LIST,
      state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false },
    },
    registry: createCommandRegistry([]),
    pending: null,
    pendingStep,
    promptError: undefined,
    lastResult: null,
    selectItem: () => undefined,
    submitText: () => undefined,
    cancelPending: () => undefined,
  }

  return render(
    <CommandRuntimeContext value={runtime}>
      <CommandPanel />
    </CommandRuntimeContext>,
  )
}
