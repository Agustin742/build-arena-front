import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { gameCommands } from '@/app/boot/game-commands'
import { queryClient } from '@/app/boot/query-client'
import { useSessionStore, useThrottleStore } from '@/features/auth'
import { server } from '@/test/msw/server'

import { ConsoleLayout } from './ConsoleLayout'

const baseUrl = 'https://api.test'

const profile = {
  id: '3b9a1c4e-2f5d-4c8b-9a7e-6d5c4b3a2f1e',
  email: 'ada@arena.dev',
  username: 'ada',
  rating: 1200,
  createdAt: '2026-09-04T10:15:00.000Z',
}

const pair = { accessToken: 'access-1', refreshToken: 'refresh-1' }

const catalog = [
  {
    code: 'POWER_STRIKE',
    name: 'Golpe potente',
    description: 'Un mandoble que abre la guardia',
    type: 'ACTION',
    cost: 4,
    requiredAttribute: 'STRENGTH',
    requiredValue: 12,
    damageDice: '1d8',
    appliesCondition: null,
    conditionRounds: null,
  },
  {
    code: 'BRACE',
    name: 'Aguantar',
    description: 'Planta los pies y encaja',
    type: 'REACTION',
    cost: 3,
    requiredAttribute: 'CONSTITUTION',
    requiredValue: 12,
    damageDice: null,
    appliesCondition: null,
    conditionRounds: null,
  },
]

function renderConsole(path = '/lobby') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ConsoleLayout commands={gameCommands} />}>
          <Route path="/lobby" element={<p>the lobby screen</p>} />
          <Route path="/builds" element={<p>the builds screen</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ConsoleLayout', () => {
  beforeEach(() => {
    useSessionStore.getState().clear()
    useThrottleStore.getState().release()
    queryClient.clear()
  })

  it('keeps the console on a screen that has nothing to do with auth', () => {
    useSessionStore.getState().setTokens(pair)

    renderConsole('/builds')

    expect(screen.getByText('the builds screen')).toBeInTheDocument()
    expect(screen.getByText('ME')).toBeInTheDocument()
    expect(screen.getByText('LOGOUT')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('locks the line and counts the wait down when the arena throttles the attempts', async () => {
    server.use(
      http.post(
        `${baseUrl}/auth/login`,
        () =>
          new HttpResponse(JSON.stringify({ statusCode: 429, message: 'ThrottlerException' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
          }),
      ),
    )
    renderConsole()

    await userEvent.type(screen.getByRole('textbox'), 'login{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada@arena.dev{Enter}')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'hunter2hunter2{Enter}')

    expect(await screen.findByRole('timer')).toHaveTextContent('60s')
    expect(screen.getByLabelText('Comando')).toBeDisabled()
  })

  it('leaves the line open when the failure was not a throttle', async () => {
    server.use(
      http.post(`${baseUrl}/auth/login`, () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
      ),
    )
    renderConsole()

    await userEvent.type(screen.getByRole('textbox'), 'login{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada@arena.dev{Enter}')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrongpassword{Enter}')

    await screen.findByRole('alert')

    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).not.toBeDisabled()
  })

  it('offers the anonymous commands and nothing that needs a session', () => {
    renderConsole()

    expect(screen.getByText('LOGIN')).toBeInTheDocument()
    expect(screen.getByText('REGISTER')).toBeInTheDocument()
    expect(screen.queryByText('LOGOUT')).not.toBeInTheDocument()
  })

  it('swaps to the session commands once the player is inside', () => {
    useSessionStore.getState().setTokens(pair)

    renderConsole()

    expect(screen.getByText('LOGOUT')).toBeInTheDocument()
    expect(screen.getByText('ME')).toBeInTheDocument()
    expect(screen.queryByText('LOGIN')).not.toBeInTheDocument()
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

  it('reports wrong credentials and keeps the session empty', async () => {
    server.use(
      http.post(`${baseUrl}/auth/login`, () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
      ),
    )
    renderConsole()

    await userEvent.type(screen.getByRole('textbox'), 'login{Enter}')
    await userEvent.type(screen.getByRole('textbox'), 'ada@arena.dev{Enter}')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrongpassword{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent(/email o contraseña incorrectos/i)
    expect(useSessionStore.getState().accessToken).toBeNull()
  })
  it('prints the catalog split by type when the player asks for the skills', async () => {
    useSessionStore.getState().setTokens(pair)
    server.use(http.get(`${baseUrl}/skills`, () => HttpResponse.json(catalog)))
    renderConsole()

    await userEvent.type(screen.getByRole('textbox'), 'skills{Enter}')

    expect(await screen.findByText(/POWER_STRIKE/)).toBeInTheDocument()
    expect(screen.getByText('ACCIONES')).toBeInTheDocument()
    expect(screen.getByText('REACCIONES')).toBeInTheDocument()
    expect(screen.getByText(/BRACE/)).toBeInTheDocument()
  })

  it('asks the arena for the catalog once, however many times it is listed', async () => {
    const asked = vi.fn()
    useSessionStore.getState().setTokens(pair)
    server.use(
      http.get(`${baseUrl}/skills`, () => {
        asked()
        return HttpResponse.json(catalog)
      }),
    )
    renderConsole()

    await userEvent.type(screen.getByRole('textbox'), 'skills{Enter}')
    await screen.findByText(/POWER_STRIKE/)
    await userEvent.type(screen.getByRole('textbox'), 'skills{Enter}')
    await screen.findByText(/POWER_STRIKE/)

    expect(asked).toHaveBeenCalledTimes(1)
  })

  it('keeps the catalog out of reach of a player with no session', () => {
    renderConsole()

    expect(screen.queryByText('SKILLS')).not.toBeInTheDocument()
  })
})
