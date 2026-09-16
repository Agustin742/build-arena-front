import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode, StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type BattleSocket } from '@/shared/realtime'

import { useArenaConnection } from './use-arena-connection'

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

function strictWrapper({ children }: { children: ReactNode }) {
  return createElement(StrictMode, null, children)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useArenaConnection', () => {
  it('yields exactly one live connection when StrictMode invokes the mount effect twice', () => {
    const socket = fakeSocket()
    const getToken = () => TOKEN

    renderHook(
      () => {
        useArenaConnection(socket, BATTLE_ID, getToken, true)
      },
      { wrapper: strictWrapper },
    )

    expect(socket.connect).toHaveBeenCalledTimes(1)
    expect(socket.connect).toHaveBeenCalledWith(TOKEN)
    expect(socket.join).toHaveBeenCalledTimes(1)
    expect(socket.join).toHaveBeenCalledWith(BATTLE_ID)
    expect(socket.disconnect).not.toHaveBeenCalled()
  })
})
