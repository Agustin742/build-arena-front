import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THROTTLE_FALLBACK_MS, useThrottleStore } from './throttle.store'

describe('useThrottleStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-06T12:00:00.000Z'))
    useThrottleStore.getState().release()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with nothing locked', () => {
    expect(useThrottleStore.getState().remainingMs()).toBe(0)
  })

  it('locks for the window the arena asked for', () => {
    useThrottleStore.getState().lock(30_000)

    expect(useThrottleStore.getState().remainingMs()).toBe(30_000)
  })

  it('falls back to its own window when the arena did not say', () => {
    useThrottleStore.getState().lock(undefined)

    expect(useThrottleStore.getState().remainingMs()).toBe(THROTTLE_FALLBACK_MS)
  })

  it('counts down as time passes', () => {
    useThrottleStore.getState().lock(60_000)

    vi.advanceTimersByTime(20_000)

    expect(useThrottleStore.getState().remainingMs()).toBe(40_000)
  })

  it('reports nothing left once the window is over', () => {
    useThrottleStore.getState().lock(60_000)

    vi.advanceTimersByTime(60_001)

    expect(useThrottleStore.getState().remainingMs()).toBe(0)
  })

  it('keeps the longer window when a second block lands', () => {
    useThrottleStore.getState().lock(60_000)
    vi.advanceTimersByTime(10_000)
    useThrottleStore.getState().lock(20_000)

    expect(useThrottleStore.getState().remainingMs()).toBe(50_000)
  })

  it('publishes the window it locked for, so nothing has to read the clock while rendering', () => {
    useThrottleStore.getState().lock(45_000)

    expect(useThrottleStore.getState().windowMs).toBe(45_000)

    vi.advanceTimersByTime(10_000)
    useThrottleStore.getState().lock(5_000)

    expect(useThrottleStore.getState().windowMs).toBe(35_000)
  })

  it('lets the console back in when released', () => {
    useThrottleStore.getState().lock(60_000)
    useThrottleStore.getState().release()

    expect(useThrottleStore.getState().remainingMs()).toBe(0)
  })
})
