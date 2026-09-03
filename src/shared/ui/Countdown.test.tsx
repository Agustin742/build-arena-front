import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Countdown } from './Countdown'

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts from the milliseconds the server said were left', () => {
    render(<Countdown remainingMs={15000} />)

    expect(screen.getByRole('timer')).toHaveTextContent('15s')
  })

  it('counts down as time passes', () => {
    render(<Countdown remainingMs={15000} />)

    advance(3000)

    expect(screen.getByRole('timer')).toHaveTextContent('12s')
  })

  it('never shows a negative number', () => {
    render(<Countdown remainingMs={2000} />)

    advance(10000)

    expect(screen.getByRole('timer')).toHaveTextContent('0s')
  })

  it('reports the expiry exactly once', () => {
    const onExpire = vi.fn()
    render(<Countdown remainingMs={2000} onExpire={onExpire} />)

    advance(5000)
    advance(5000)

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('does not report an expiry that has not happened', () => {
    const onExpire = vi.fn()
    render(<Countdown remainingMs={15000} onExpire={onExpire} />)

    advance(3000)

    expect(onExpire).not.toHaveBeenCalled()
  })

  it('warns visually once the window is nearly gone', () => {
    render(<Countdown remainingMs={15000} />)

    expect(screen.getByRole('timer')).toHaveClass('text-accent')

    advance(11000)

    expect(screen.getByRole('timer')).toHaveClass('text-error')
  })

  it('draws the window draining as a bar', () => {
    render(<Countdown remainingMs={10000} width={10} />)

    advance(5000)

    expect(screen.getByTestId('countdown-track')).toHaveTextContent('█████░░░░░')
  })

  it('restarts from scratch when the server opens a new window, which is keyed apart', () => {
    const { rerender } = render(<Countdown remainingMs={15000} />)

    advance(10000)
    expect(screen.getByRole('timer')).toHaveTextContent('5s')

    rerender(<Countdown remainingMs={15000} key="second-window" />)

    expect(screen.getByRole('timer')).toHaveTextContent('15s')
  })

  it('stops ticking when it goes away', () => {
    const onExpire = vi.fn()
    const { unmount } = render(<Countdown remainingMs={2000} onExpire={onExpire} />)

    unmount()
    advance(5000)

    expect(onExpire).not.toHaveBeenCalled()
  })
})
