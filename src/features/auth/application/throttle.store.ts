import { create } from 'zustand'

export const THROTTLE_FALLBACK_MS = 60_000

interface ThrottleState {
  lockedUntil: number | null
  windowMs: number
  remainingMs: () => number
  lock: (windowMs: number | undefined) => void
  release: () => void
}

export const useThrottleStore = create<ThrottleState>()((set, get) => ({
  lockedUntil: null,
  windowMs: 0,
  remainingMs: () => {
    const { lockedUntil } = get()

    if (lockedUntil === null) {
      return 0
    }

    return Math.max(0, lockedUntil - Date.now())
  },
  lock: (windowMs) => {
    const asked = windowMs ?? THROTTLE_FALLBACK_MS
    const now = Date.now()
    const { lockedUntil } = get()
    const standing = lockedUntil === null ? 0 : Math.max(0, lockedUntil - now)
    const next = Math.max(standing, asked)

    set({ lockedUntil: now + next, windowMs: next })
  },
  release: () => {
    set({ lockedUntil: null, windowMs: 0 })
  },
}))
