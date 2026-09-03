import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from './msw/server'

describe('testing setup', () => {
  it('renders a component into the jsdom document', () => {
    render(<p>arena online</p>)

    expect(screen.getByText('arena online')).toBeInTheDocument()
  })

  it('intercepts network calls with msw instead of hitting the network', async () => {
    server.use(
      http.get('https://build-arena-api.test/health', () => HttpResponse.json({ status: 'ok' })),
    )

    const response = await fetch('https://build-arena-api.test/health')

    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})
