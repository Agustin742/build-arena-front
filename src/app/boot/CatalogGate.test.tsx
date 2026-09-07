import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/features/auth'

import { CatalogGate } from './CatalogGate'

const pair = { accessToken: 'access-1', refreshToken: 'refresh-1' }

describe('CatalogGate', () => {
  beforeEach(() => {
    useSessionStore.getState().clear()
  })

  it('lets a visitor with no session straight through, there is nothing to load yet', () => {
    const load = vi.fn<() => Promise<void>>()

    render(<CatalogGate loadCatalog={load}>la consola</CatalogGate>)

    expect(screen.getByText('la consola')).toBeInTheDocument()
    expect(load).not.toHaveBeenCalled()
  })

  it('holds the console shut while the catalog is still on its way', () => {
    useSessionStore.getState().setTokens(pair)

    render(<CatalogGate loadCatalog={() => new Promise(() => undefined)}>la consola</CatalogGate>)

    expect(screen.queryByText('la consola')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Esperando/)
  })

  it('opens it once the catalog lands', async () => {
    useSessionStore.getState().setTokens(pair)

    render(<CatalogGate loadCatalog={() => Promise.resolve()}>la consola</CatalogGate>)

    expect(await screen.findByText('la consola')).toBeInTheDocument()
  })

  it('keeps trying instead of giving up on the first refusal', async () => {
    useSessionStore.getState().setTokens(pair)
    const load = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('todavía durmiendo'))
      .mockResolvedValue(undefined)

    render(
      <CatalogGate loadCatalog={load} retryDelayMs={1}>
        la consola
      </CatalogGate>,
    )

    expect(await screen.findByText('la consola')).toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('gives the player a way out when the arena never wakes up', async () => {
    useSessionStore.getState().setTokens(pair)
    const load = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('caída'))

    render(
      <CatalogGate loadCatalog={load} retryDelayMs={1} maxAttempts={2}>
        la consola
      </CatalogGate>,
    )

    expect(await screen.findByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    expect(screen.queryByText('la consola')).not.toBeInTheDocument()
  })

  it('tries again when the player asks it to', async () => {
    useSessionStore.getState().setTokens(pair)
    const load = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('caída'))
      .mockResolvedValue(undefined)

    render(
      <CatalogGate loadCatalog={load} retryDelayMs={1} maxAttempts={1}>
        la consola
      </CatalogGate>,
    )

    await userEvent.click(await screen.findByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('la consola')).toBeInTheDocument()
  })

  it('loads the catalog when the session arrives later, on the way in', async () => {
    const load = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    render(<CatalogGate loadCatalog={load}>la consola</CatalogGate>)
    expect(load).not.toHaveBeenCalled()

    act(() => {
      useSessionStore.getState().setTokens(pair)
    })

    await waitFor(() => {
      expect(load).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText('la consola')).toBeInTheDocument()
  })
})
