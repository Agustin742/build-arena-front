import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  type CommandRuntime,
  CommandRuntimeContext,
  type PendingStep,
} from '@/app/providers/command-runtime'
import { type CommandResult, createCommandRegistry, EMPTY_NUMBERED_LIST } from '@/shared/commands'

import { CommandResultLine } from './CommandResultLine'

describe('CommandResultLine', () => {
  it('shows nothing when no command has run yet', () => {
    const { container } = renderResult(null)

    expect(container).toBeEmptyDOMElement()
  })

  it('announces a plain success as a status', () => {
    renderResult({ status: 'ok', message: 'Sesión cerrada' })

    expect(screen.getByRole('status')).toHaveTextContent('Sesión cerrada')
  })

  it('announces a failure as an alert', () => {
    renderResult({ status: 'error', message: 'Email o contraseña incorrectos' })

    expect(screen.getByRole('alert')).toHaveTextContent('Email o contraseña incorrectos')
  })

  it('prints every line a result carries, in order', () => {
    renderResult({
      status: 'ok',
      message: 'Catálogo',
      lines: ['1) POWER_STRIKE  4pts', '2) FIREBALL  5pts'],
    })

    const status = screen.getByRole('status')

    expect(status).toHaveTextContent('Catálogo')
    expect(screen.getByText(/POWER_STRIKE/)).toBeInTheDocument()
    expect(screen.getByText(/FIREBALL/)).toBeInTheDocument()
  })

  it('keeps the padding that lines up the columns of a listing', () => {
    renderResult({ status: 'ok', lines: ['1) POWER_STRIKE  4pts'] })

    expect(screen.getByText(/POWER_STRIKE/).textContent).toBe('1) POWER_STRIKE  4pts')
  })

  it('prints the lines of a rejection, so every violation lands together', () => {
    renderResult({
      status: 'error',
      message: 'La arena rechazó la build',
      lines: ['El reparto se pasa de 20 puntos', 'El kit se pasa de 18 puntos'],
    })

    const alert = screen.getByRole('alert')

    expect(alert).toHaveTextContent('El reparto se pasa de 20 puntos')
    expect(alert).toHaveTextContent('El kit se pasa de 18 puntos')
  })

  it('prints the lines even when the result carries no headline', () => {
    renderResult({ status: 'ok', lines: ['1) POWER_STRIKE 4pts'] })

    expect(screen.getByRole('status')).toHaveTextContent('1) POWER_STRIKE 4pts')
  })
  it('frames the messages in a panel of their own, like every other box', () => {
    renderResult({ status: 'ok', message: 'Catálogo', lines: ['1) Golpe potente'] })

    expect(screen.getByRole('region', { name: 'salida' })).toBeInTheDocument()
  })

  it('scrolls the messages instead of pushing the prompt away', () => {
    renderResult({ status: 'ok', message: 'Catálogo', lines: ['1) Golpe potente'] })

    const body = screen.getByRole('status').parentElement

    expect(body).toHaveClass('overflow-y-auto')
    expect(body).toHaveClass('console-scroll')
  })

  it('frames a failure the same way, so the console does not jump around', () => {
    renderResult({ status: 'error', message: 'La arena rechazó la build' })

    expect(screen.getByRole('region', { name: 'salida' })).toBeInTheDocument()
  })

  it('takes the leftover height while nothing is being asked, for a catalog of twelve', () => {
    renderResult({ status: 'ok', message: 'Catálogo', lines: ['1) Golpe potente'] })

    expect(screen.getByRole('region', { name: 'salida' })).toHaveClass('flex-1')
  })

  it('holds still while a step is open, instead of being crushed by the options', () => {
    renderResult({ status: 'ok', message: 'Catálogo', lines: ['1) Golpe potente'] }, asking())

    const region = screen.getByRole('region', { name: 'salida' })

    expect(region).toHaveClass('shrink-0')
    expect(region).not.toHaveClass('flex-1')
  })
})

/** A step waiting on an answer: the console is asking, so the output is only context. */
function asking(): PendingStep {
  return {
    arg: { name: 'player', kind: 'pick', label: 'A quién', required: true },
    index: 1,
    total: 1,
    group: null,
  }
}

function renderResult(lastResult: CommandResult | null, pendingStep: PendingStep | null = null) {
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
    lastResult,
    selectItem: () => undefined,
    submitText: () => undefined,
    cancelPending: () => undefined,
  }

  return render(
    <CommandRuntimeContext value={runtime}>
      <CommandResultLine />
    </CommandRuntimeContext>,
  )
}
