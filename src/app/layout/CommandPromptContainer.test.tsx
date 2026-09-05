import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactElement, type ReactNode, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CommandRuntimeProvider } from '@/app/providers/CommandRuntimeProvider'
import { type Command, type CommandState } from '@/shared/commands'

import { CommandListContainer } from './CommandListContainer'
import { CommandPromptContainer } from './CommandPromptContainer'
import { PromptSlotContext } from './prompt-slot'

const lobbyState: CommandState = {
  isAuthenticated: true,
  battleId: null,
  reactionWindowOpen: false,
}
const battleState: CommandState = {
  isAuthenticated: true,
  battleId: 'b1',
  reactionWindowOpen: false,
}
const ok = () => Promise.resolve({ status: 'ok' as const })

function PromptSlotHarness({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  return (
    <>
      <div ref={setSlot} />
      <PromptSlotContext value={slot}>{children}</PromptSlotContext>
    </>
  )
}

function renderPrompt(ui: ReactElement) {
  return render(ui, { wrapper: PromptSlotHarness })
}

function makeCommand(overrides: Partial<Command> = {}): Command {
  return {
    id: 'ping',
    label: 'PING',
    aliases: ['ping'],
    args: [],
    scope: ['lobby', 'battle'],
    availability: () => ({ enabled: true }),
    run: ok,
    ...overrides,
  }
}

function makeChallenge(run: Command['run'] = ok): Command {
  return makeCommand({
    id: 'challenge',
    label: 'CHALLENGE',
    aliases: ['challenge'],
    args: [
      { name: 'rival', kind: 'text', label: 'Rival', required: true },
      { name: 'build', kind: 'text', label: 'Build', required: true },
    ],
    run,
  })
}

function makePickCommand(run: Command['run'] = ok): Command {
  return makeCommand({
    id: 'select-build',
    label: 'SELECT_BUILD',
    aliases: ['select-build'],
    args: [
      {
        name: 'build',
        kind: 'pick',
        label: 'Build',
        required: true,
        options: () => [
          { id: 'starter', label: 'Starter' },
          { id: 'aggro', label: 'Aggro' },
        ],
      },
    ],
    run,
  })
}

function makeLogin(run: Command['run'] = ok): Command {
  return makeCommand({
    id: 'login',
    label: 'LOGIN',
    aliases: ['login'],
    args: [
      { name: 'email', kind: 'text', label: 'Email', required: true },
      { name: 'password', kind: 'password', label: 'Contraseña', required: true },
    ],
    scope: ['anonymous', 'lobby'],
    run,
  })
}

describe('CommandPromptContainer', () => {
  it('holds the keyboard as soon as it mounts, with no click', () => {
    renderPrompt(
      <CommandRuntimeProvider commands={[makeChallenge()]} state={lobbyState}>
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )

    expect(screen.getByRole('textbox')).toHaveFocus()
  })

  it('takes the keyboard back when someone types with the line unfocused', async () => {
    renderPrompt(
      <CommandRuntimeProvider commands={[makeChallenge()]} state={lobbyState}>
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )

    const input = screen.getByRole('textbox')
    input.blur()
    expect(input).not.toHaveFocus()

    await userEvent.keyboard('c')

    expect(input).toHaveFocus()
  })

  it('keeps the keyboard when the guided prompt swaps to the masked line', async () => {
    renderPrompt(
      <CommandRuntimeProvider commands={[makeLogin()]} state={lobbyState}>
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )

    await userEvent.type(screen.getByRole('textbox'), 'login{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada@arena.dev{Enter}')

    expect(screen.getByLabelText('Contraseña')).toHaveFocus()
  })

  it('names the argument it is waiting for so the player knows what to type', async () => {
    renderPrompt(
      <CommandRuntimeProvider commands={[makeChallenge()]} state={lobbyState}>
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )

    await userEvent.type(screen.getByRole('textbox'), 'challenge{Enter}')

    expect(screen.getByText('Rival:')).toBeInTheDocument()
  })

  it('masks the line while it waits for a password and clears the mask afterwards', async () => {
    const run = vi.fn(ok)
    renderPrompt(
      <CommandRuntimeProvider commands={[makeLogin(run)]} state={lobbyState}>
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )

    await userEvent.type(screen.getByRole('textbox'), 'login{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada@arena.dev{Enter}')

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    const masked = screen.getByLabelText('Contraseña')
    expect(masked).toHaveAttribute('type', 'password')

    await userEvent.type(masked, 'hunter2hunter2{Enter}')

    expect(run).toHaveBeenCalledWith(
      { email: 'ada@arena.dev', password: 'hunter2hunter2' },
      expect.anything(),
    )
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
  })

  it('resolves a full typed line positionally and runs once', async () => {
    const run = vi.fn(ok)
    renderPrompt(
      <CommandRuntimeProvider commands={[makeChallenge(run)]} state={lobbyState}>
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )

    await userEvent.type(screen.getByRole('textbox'), 'challenge alice starter{Enter}')

    expect(run).toHaveBeenCalledWith({ rival: 'alice', build: 'starter' }, expect.anything())
  })

  it('opens the guided prompt sequence in declaration order for a bare alias', async () => {
    const run = vi.fn(ok)
    renderPrompt(
      <CommandRuntimeProvider commands={[makeChallenge(run)]} state={lobbyState}>
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )
    const input = screen.getByRole('textbox')

    await userEvent.type(input, 'challenge{Enter}')
    expect(run).not.toHaveBeenCalled()

    await userEvent.type(input, 'alice{Enter}')
    expect(run).not.toHaveBeenCalled()

    await userEvent.type(input, 'starter{Enter}')
    expect(run).toHaveBeenCalledWith({ rival: 'alice', build: 'starter' }, expect.anything())
  })

  it('feeds a blocked alias reason into the prompt error', async () => {
    const blocked = makeCommand({
      id: 'fireball',
      label: 'FIREBALL',
      aliases: ['fireball'],
      availability: () => ({ enabled: false, reason: 'necesita MAGIC 14' }),
    })
    renderPrompt(
      <CommandRuntimeProvider commands={[blocked]} state={lobbyState}>
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )

    await userEvent.type(screen.getByRole('textbox'), 'fireball{Enter}')

    expect(screen.getByRole('alert')).toHaveTextContent('necesita MAGIC 14')
  })

  it('drops a pending command via Esc or a typed cancel, without ever calling run', async () => {
    const run = vi.fn(ok)
    renderPrompt(
      <CommandRuntimeProvider commands={[makeChallenge(run)]} state={lobbyState}>
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )
    const input = screen.getByRole('textbox')

    await userEvent.type(input, 'challenge{Enter}')
    await userEvent.type(input, 'alice{Enter}')
    await userEvent.keyboard('{Escape}')
    await userEvent.type(input, 'starter{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown command')

    await userEvent.type(input, 'challenge{Enter}')
    await userEvent.type(input, 'alice{Enter}')
    await userEvent.type(input, 'cancel{Enter}')
    await userEvent.type(input, 'starter{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown command')

    expect(run).not.toHaveBeenCalled()
  })

  it('resolves a typed numeral mid-flow against the pending pick options', async () => {
    const run = vi.fn(ok)
    renderPrompt(
      <CommandRuntimeProvider commands={[makePickCommand(run)]} state={lobbyState}>
        <CommandListContainer />
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )
    const input = screen.getByRole('textbox')

    await userEvent.type(input, 'select-build{Enter}')
    await userEvent.type(input, '2{Enter}')

    expect(run).toHaveBeenCalledWith({ build: 'aggro' }, expect.anything())
  })

  it('gives an explicit error and selects nothing when a pending pick numeral goes stale', async () => {
    const run = vi.fn(ok)
    const command = makePickCommand(run)
    const { rerender } = renderPrompt(
      <CommandRuntimeProvider commands={[command]} state={lobbyState}>
        <CommandListContainer />
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )
    const input = screen.getByRole('textbox')

    await userEvent.type(input, 'select-build{Enter}')
    await userEvent.type(input, '2')

    rerender(
      <CommandRuntimeProvider commands={[command]} state={battleState}>
        <CommandListContainer />
        <CommandPromptContainer />
      </CommandRuntimeProvider>,
    )

    await userEvent.type(input, '{Enter}')

    expect(run).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('is no longer available')
  })
})
