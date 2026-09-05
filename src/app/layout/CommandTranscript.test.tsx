import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactElement, type ReactNode, useState } from 'react'
import { describe, expect, it } from 'vitest'

import { CommandRuntimeProvider } from '@/app/providers/CommandRuntimeProvider'
import { type Command, type CommandState } from '@/shared/commands'

import { CommandPromptContainer } from './CommandPromptContainer'
import { CommandTranscript } from './CommandTranscript'
import { PromptSlotContext } from './prompt-slot'

const lobbyState: CommandState = {
  isAuthenticated: true,
  battleId: null,
  reactionWindowOpen: false,
}

const ok = () => Promise.resolve({ status: 'ok' as const })

const registerCommand: Command = {
  id: 'register',
  label: 'REGISTER',
  aliases: ['register'],
  args: [
    { name: 'email', kind: 'text', label: 'Email', required: true },
    { name: 'username', kind: 'text', label: 'Usuario', required: true },
    { name: 'password', kind: 'password', label: 'Contraseña', required: true },
  ],
  scope: ['lobby'],
  availability: () => ({ enabled: true }),
  run: ok,
}

function PromptSlotHarness({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  return (
    <>
      <div ref={setSlot} />
      <PromptSlotContext value={slot}>{children}</PromptSlotContext>
    </>
  )
}

function renderTranscript(ui: ReactElement) {
  return render(ui, { wrapper: PromptSlotHarness })
}

function mounted() {
  return renderTranscript(
    <CommandRuntimeProvider commands={[registerCommand]} state={lobbyState}>
      <CommandTranscript />
      <CommandPromptContainer />
    </CommandRuntimeProvider>,
  )
}

describe('CommandTranscript', () => {
  it('shows nothing while no command is running', () => {
    mounted()

    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })

  it('echoes the running command and every answer given so far', async () => {
    mounted()
    const input = screen.getByRole('textbox')

    await userEvent.type(input, 'register{Enter}')
    await userEvent.type(input, 'ada@arena.dev{Enter}')

    const log = screen.getByRole('log')

    expect(log).toHaveTextContent('register')
    expect(log).toHaveTextContent('Email: ada@arena.dev')
  })

  it('never echoes a password, not even once it was answered', async () => {
    mounted()

    await userEvent.type(screen.getByRole('textbox'), 'register{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada@arena.dev{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada{Enter}')

    const masked = screen.getByLabelText('Contraseña')
    await userEvent.type(masked, 'hunter2hunter2')

    expect(screen.getByRole('log')).not.toHaveTextContent('hunter2hunter2')
    expect(document.body.textContent).not.toContain('hunter2hunter2')
  })

  it('clears itself once the command stops running', async () => {
    mounted()
    const input = screen.getByRole('textbox')

    await userEvent.type(input, 'register{Enter}')
    expect(screen.getByRole('log')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })
})
