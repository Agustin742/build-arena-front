import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { type ReactNode, useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { PromptSlotContext } from '@/app/layout/prompt-slot'
import { server } from '@/test/msw/server'

import { useSessionStore } from '../application/session.store'
import { AuthConsole } from './AuthConsole'

const baseUrl = 'https://api.test'

const profile = {
  id: '3b9a1c4e-2f5d-4c8b-9a7e-6d5c4b3a2f1e',
  email: 'ada@arena.dev',
  username: 'ada',
  rating: 1200,
  createdAt: '2026-09-04T10:15:00.000Z',
}

const pair = { accessToken: 'access-1', refreshToken: 'refresh-1' }

function PromptSlotHarness({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  return (
    <>
      <div ref={setSlot} />
      <PromptSlotContext value={slot}>{children}</PromptSlotContext>
    </>
  )
}

function renderConsole() {
  return render(<AuthConsole title="acceso" />, { wrapper: PromptSlotHarness })
}

describe('AuthConsole', () => {
  beforeEach(() => {
    useSessionStore.getState().clear()
  })

  it('offers the anonymous commands and nothing that needs a session', () => {
    renderConsole()

    expect(screen.getByText('LOGIN')).toBeInTheDocument()
    expect(screen.getByText('REGISTER')).toBeInTheDocument()
    expect(screen.queryByText('LOGOUT')).not.toBeInTheDocument()
  })

  it('walks a login through the guided prompt and lands the session', async () => {
    server.use(
      http.post(`${baseUrl}/auth/login`, () => HttpResponse.json(pair)),
      http.get(`${baseUrl}/auth/me`, () => HttpResponse.json(profile)),
    )
    renderConsole()

    await userEvent.type(screen.getByRole('textbox'), 'login{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada@arena.dev{Enter}')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'hunter2hunter2{Enter}')

    expect(await screen.findByText(/bienvenido, ada/i)).toBeInTheDocument()
    expect(useSessionStore.getState().accessToken).toBe('access-1')
    expect(useSessionStore.getState().user).toEqual(profile)
  })

  it('creates the account and chains the login in one pass', async () => {
    server.use(
      http.post(`${baseUrl}/auth/register`, () => HttpResponse.json(profile, { status: 201 })),
      http.post(`${baseUrl}/auth/login`, () => HttpResponse.json(pair)),
    )
    renderConsole()

    await userEvent.type(screen.getByRole('textbox'), 'register{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada@arena.dev{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada{Enter}')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'hunter2hunter2{Enter}')

    expect(await screen.findByText(/cuenta creada/i)).toBeInTheDocument()
    expect(useSessionStore.getState().accessToken).toBe('access-1')
  })

  it('reports wrong credentials on the prompt and keeps the session empty', async () => {
    server.use(
      http.post(`${baseUrl}/auth/login`, () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
      ),
    )
    renderConsole()

    await userEvent.type(screen.getByRole('textbox'), 'login{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada@arena.dev{Enter}')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrongpassword{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent(/sesión terminó/i)
    expect(useSessionStore.getState().accessToken).toBeNull()
  })

  it('swaps to the session commands once the player is inside', () => {
    useSessionStore.getState().setTokens(pair)

    renderConsole()

    expect(screen.getByText('LOGOUT')).toBeInTheDocument()
    expect(screen.getByText('ME')).toBeInTheDocument()
    expect(screen.queryByText('LOGIN')).not.toBeInTheDocument()
  })
})
