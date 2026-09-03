import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ColdStartScreen } from './ColdStartScreen'

describe('ColdStartScreen', () => {
  it('explains what is happening instead of showing a frozen screen', () => {
    render(<ColdStartScreen state="waking" elapsedSeconds={12} onRetry={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('12s')
    expect(screen.getByText(/despertando/i)).toBeInTheDocument()
  })

  it('offers no retry while it is still waiting', () => {
    render(<ColdStartScreen state="waking" elapsedSeconds={3} onRetry={vi.fn()} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers a retry once it gave up', async () => {
    const onRetry = vi.fn()
    render(<ColdStartScreen state="unreachable" elapsedSeconds={90} onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('announces the wait politely to a screen reader', () => {
    render(<ColdStartScreen state="waking" elapsedSeconds={5} onRetry={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})
