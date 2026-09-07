import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  type CommandRuntime,
  CommandRuntimeContext,
  type PendingStep,
} from '@/app/providers/command-runtime'
import {
  type CommandArg,
  type CommandMenu,
  createCommandRegistry,
  EMPTY_NUMBERED_LIST,
  type ParsedArgs,
} from '@/shared/commands'

import { CommandPanel } from './CommandPanel'

describe('CommandPanel', () => {
  it('offers the commands while the console waits for one', () => {
    renderPanel(null)

    expect(screen.getByRole('heading')).toHaveTextContent('comandos')
    expect(screen.getByText('escribí el comando o su número')).toBeInTheDocument()
  })

  it('names the question instead of the word comandos while a step is open', () => {
    renderPanel(step({ label: 'Fuerza' }))

    expect(screen.getByRole('heading')).toHaveTextContent('Fuerza')
    expect(screen.getByRole('heading')).not.toHaveTextContent('comandos')
  })

  it('spells out what the step is asking, because a label is not an explanation', () => {
    renderPanel(step({ label: 'Fuerza', prompt: 'Elegí tu nivel de fuerza' }))

    expect(screen.getByText(/Elegí tu nivel de fuerza/)).toBeInTheDocument()
  })

  it('counts the step among the ones that share its group, not among all of them', () => {
    renderPanel(step({ label: 'Fuerza' }, { name: 'atributo', index: 1, total: 4 }))

    expect(screen.getByText(/atributo 1 de 4/)).toBeInTheDocument()
    expect(screen.queryByText(/paso 2 de 10/)).not.toBeInTheDocument()
  })

  it('falls back to the position in the whole run when the step has no group', () => {
    renderPanel(step({ label: 'Nombre' }))

    expect(screen.getByText(/paso 2 de 10/)).toBeInTheDocument()
  })

  it('carries the live note the step computes from the answers so far', () => {
    const arg = step({
      label: 'Fuerza',
      prompt: 'Elegí tu nivel de fuerza',
      describe: () => 'te quedan 20 puntos',
    })

    renderPanel(arg)

    expect(screen.getByText(/te quedan 20 puntos/)).toBeInTheDocument()
  })

  it('hands the answers so far to the step that describes itself', () => {
    const arg = step({
      label: 'Magia',
      describe: (values: ParsedArgs) => `fuerza ${values.strength ?? 'sin elegir'}`,
    })

    renderPanel(arg, { strength: '14' })

    expect(screen.getByText(/fuerza 14/)).toBeInTheDocument()
  })

  it('keeps the sentence and the live note on one readable line', () => {
    const arg = step({
      label: 'Fuerza',
      prompt: 'Elegí tu nivel de fuerza',
      describe: () => 'te quedan 20 puntos',
    })

    renderPanel(arg)

    expect(screen.getByText('Elegí tu nivel de fuerza · te quedan 20 puntos')).toBeInTheDocument()
  })

  it('names the region apart from the input that asks the very same question', () => {
    renderPanel(step({ label: 'Acción 1' }))

    expect(screen.getByRole('region', { name: 'Opciones: Acción 1' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Acción 1' })).not.toBeInTheDocument()
  })

  it('tells the player a step can be dropped when it is optional', () => {
    renderPanel(step({ label: 'Build', required: false }))

    expect(screen.getByText(/s para saltear/)).toBeInTheDocument()
  })

  it('says nothing about skipping a step that is required', () => {
    renderPanel(step({ label: 'Fuerza' }))

    expect(screen.queryByText(/saltear/)).not.toBeInTheDocument()
  })

  it('offers the way out of a step', () => {
    renderPanel(step({ label: 'Fuerza' }))

    expect(screen.getByText(/esc para cancelar/)).toBeInTheDocument()
  })

  it('scrolls a list of options instead of running it off the console', () => {
    renderPanel(step({ label: 'A quién' }))

    expect(screen.getByRole('region', { name: 'Opciones: A quién' })).toHaveClass('min-h-0')
  })

  it('scrolls the command list too, because a menu can outgrow the console as well', () => {
    renderPanel(null)

    expect(screen.getByRole('region', { name: 'comandos' })).toHaveClass('min-h-0')
  })
})

function step(
  overrides: Partial<CommandArg> & Pick<CommandArg, 'label'>,
  group: PendingStep['group'] = null,
): PendingStep {
  return {
    arg: { name: 'field', kind: 'pick', required: true, ...overrides },
    index: 2,
    total: 10,
    group,
  }
}

function renderPanel(
  pendingStep: PendingStep | null,
  values: ParsedArgs = {},
  menu: CommandMenu | null = null,
) {
  const withGroup = pendingStep

  const runtime: CommandRuntime = {
    ctx: {
      activeScopes: ['lobby'],
      picks: EMPTY_NUMBERED_LIST,
      state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false, menu },
    },
    registry: createCommandRegistry([]),
    pending: withGroup === null ? null : { commandId: 'build-new', values, awaiting: 'field' },
    pendingStep: withGroup,
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

describe('CommandPanel inside a menu', () => {
  it('names the menu the console stepped into, instead of the word comandos', () => {
    renderPanel(null, {}, 'builds')

    expect(screen.getByRole('heading')).toHaveTextContent('builds')
    expect(screen.getByRole('heading')).not.toHaveTextContent('comandos')
  })

  it('still says how to answer, because the list works the same in here', () => {
    renderPanel(null, {}, 'builds')

    expect(screen.getByText('escribí el comando o su número')).toBeInTheDocument()
  })

  it('says comandos again once the console steps back out', () => {
    renderPanel(null, {}, null)

    expect(screen.getByRole('heading')).toHaveTextContent('comandos')
  })

  it('lets the open step outrank the menu, it is the more immediate question', () => {
    renderPanel(step({ label: 'Fuerza' }), {}, 'builds')

    expect(screen.getByRole('heading')).toHaveTextContent('Fuerza')
  })
})
