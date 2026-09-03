import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useHealthCheck } from './use-health-check'

function deferred() {
  let resolve!: () => void
  let reject!: (reason: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const fast = { retryDelayMs: 5, tickMs: 5, maxAttempts: 3 }

describe('useHealthCheck', () => {
  it('reports the arena as ready when the first ping answers', async () => {
    const ping = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() => useHealthCheck({ ping, ...fast }))

    await waitFor(() => {
      expect(result.current.state).toBe('ready')
    })
    expect(ping).toHaveBeenCalledTimes(1)
  })

  it('stays waking while the ping has not answered yet', async () => {
    const pending = deferred()
    const ping = vi.fn().mockReturnValue(pending.promise)

    const { result } = renderHook(() => useHealthCheck({ ping, ...fast }))

    expect(result.current.state).toBe('waking')

    await act(async () => {
      pending.resolve()
      await pending.promise
    })

    await waitFor(() => {
      expect(result.current.state).toBe('ready')
    })
  })

  it('counts the seconds the player has been waiting', async () => {
    const pending = deferred()
    const ping = vi.fn().mockReturnValue(pending.promise)

    const { result } = renderHook(() => useHealthCheck({ ping, ...fast }))

    expect(result.current.elapsedSeconds).toBe(0)

    await waitFor(
      () => {
        expect(result.current.elapsedSeconds).toBeGreaterThan(0)
      },
      { timeout: 2000 },
    )

    await act(async () => {
      pending.resolve()
      await pending.promise
    })
  })

  it('keeps retrying a ping that fails, because render is only waking up', async () => {
    const ping = vi
      .fn()
      .mockRejectedValueOnce(new Error('cold'))
      .mockRejectedValueOnce(new Error('cold'))
      .mockResolvedValue(undefined)

    const { result } = renderHook(() => useHealthCheck({ ping, ...fast }))

    await waitFor(() => {
      expect(result.current.state).toBe('ready')
    })
    expect(ping).toHaveBeenCalledTimes(3)
  })

  it('gives up once the attempts run out', async () => {
    const ping = vi.fn().mockRejectedValue(new Error('down'))

    const { result } = renderHook(() => useHealthCheck({ ping, ...fast }))

    await waitFor(() => {
      expect(result.current.state).toBe('unreachable')
    })
    expect(ping).toHaveBeenCalledTimes(3)
  })

  it('starts over when the player asks to retry', async () => {
    const ping = vi.fn().mockRejectedValue(new Error('down'))

    const { result } = renderHook(() => useHealthCheck({ ping, ...fast }))

    await waitFor(() => {
      expect(result.current.state).toBe('unreachable')
    })

    ping.mockResolvedValue(undefined)
    act(() => {
      result.current.retry()
    })

    await waitFor(() => {
      expect(result.current.state).toBe('ready')
    })
  })

  it('stops pinging once the component goes away', async () => {
    const ping = vi.fn().mockRejectedValue(new Error('down'))

    const { unmount } = renderHook(() => useHealthCheck({ ping, ...fast }))

    await waitFor(() => {
      expect(ping).toHaveBeenCalled()
    })
    unmount()
    const callsAtUnmount = ping.mock.calls.length

    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(ping.mock.calls.length).toBe(callsAtUnmount)
  })
})
