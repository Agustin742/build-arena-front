import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type BattleSocket, useBattleStore } from '@/shared/realtime'

import { ArenaRoute } from './ArenaRoute'

const BATTLE_ID = '44444444-4444-4444-8444-444444444444'
const TOKEN = 'token-a'

function fakeSocket(): BattleSocket {
  return {
    connect: vi.fn(),
    join: vi.fn(),
    declareAction: vi.fn(),
    declareReaction: vi.fn(),
    disconnect: vi.fn(),
  }
}

function renderRoute(socket: BattleSocket) {
  return render(
    <MemoryRouter initialEntries={[`/battles/${BATTLE_ID}`]}>
      <Routes>
        <Route
          path="/battles/:battleId"
          element={<ArenaRoute socket={socket} getToken={() => TOKEN} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ArenaRoute', () => {
  beforeEach(() => {
    useBattleStore.getState().reset()
    useBattleStore.setState({ connection: 'idle' })
  })

  it('shows Conectando… and joins the route battle while the connection is not open yet', () => {
    const socket = fakeSocket()

    renderRoute(socket)

    expect(screen.getByText('Conectando…')).toBeInTheDocument()
    expect(socket.connect).toHaveBeenCalledWith(TOKEN)
    expect(socket.join).toHaveBeenCalledWith(BATTLE_ID)
  })

  it('shows Conectado once the store reports an open connection', () => {
    useBattleStore.setState({ connection: 'open' })
    const socket = fakeSocket()

    renderRoute(socket)

    expect(screen.getByText('Conectado')).toBeInTheDocument()
    expect(screen.queryByText('Conectando…')).not.toBeInTheDocument()
  })
})
