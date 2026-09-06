import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CommandRuntimeContext, type CommandRuntime } from '@/app/providers/command-runtime'
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
    expect(status).toHaveTextContent('1) POWER_STRIKE  4pts')
    expect(status).toHaveTextContent('2) FIREBALL  5pts')
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
    renderResult({ status: 'ok', lines: ['1) POWER_STRIKE  4pts'] })

    expect(screen.getByRole('status')).toHaveTextContent('1) POWER_STRIKE  4pts')
  })
})

function renderResult(lastResult: CommandResult | null) {
  const runtime: CommandRuntime = {
    ctx: {
      activeScopes: ['lobby'],
      picks: EMPTY_NUMBERED_LIST,
      state: { isAuthenticated: true, battleId: null, reactionWindowOpen: false },
    },
    registry: createCommandRegistry([]),
    pending: null,
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
