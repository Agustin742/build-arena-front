import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CommandRuntimeProvider } from '@/app/providers/CommandRuntimeProvider'
import { type Command, type CommandState } from '@/shared/commands'

import { CommandListContainer } from './CommandListContainer'

const lobbyState: CommandState = { isAuthenticated: true, battleId: null, reactionWindowOpen: false }

function makeCommand(overrides: Partial<Command> = {}): Command {
  return {
    id: 'ping',
    label: 'PING',
    hint: '1d8',
    aliases: ['ping'],
    args: [],
    scope: ['lobby'],
    availability: () => ({ enabled: true }),
    run: () => Promise.resolve({ status: 'ok' }),
    ...overrides,
  }
}

describe('CommandListContainer', () => {
  it('maps every numbered item onto a CommandList entry with its number and hint', () => {
    render(
      <CommandRuntimeProvider commands={[makeCommand()]} state={lobbyState}>
        <CommandListContainer />
      </CommandRuntimeProvider>,
    )

    expect(screen.getByRole('button', { name: /1\).*PING.*1d8/s })).toBeInTheDocument()
  })

  it('renders a blocked command dimmed with its reason and never runs it on click', async () => {
    const run = vi.fn(() => Promise.resolve({ status: 'ok' as const }))
    const blocked = makeCommand({
      id: 'fireball',
      label: 'FIREBALL',
      availability: () => ({ enabled: false, reason: 'necesita MAGIC 14' }),
      run,
    })

    render(
      <CommandRuntimeProvider commands={[blocked]} state={lobbyState}>
        <CommandListContainer />
      </CommandRuntimeProvider>,
    )

    expect(screen.getByText('necesita MAGIC 14')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: /FIREBALL/ })
    expect(button).toBeDisabled()

    await userEvent.click(button)

    expect(run).not.toHaveBeenCalled()
  })

  it('runs the command through the single call site when an enabled item is clicked', async () => {
    const run = vi.fn(() => Promise.resolve({ status: 'ok' as const }))

    render(
      <CommandRuntimeProvider commands={[makeCommand({ run })]} state={lobbyState}>
        <CommandListContainer />
      </CommandRuntimeProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: /PING/ }))

    expect(run).toHaveBeenCalledTimes(1)
  })
})
