import { useCallback, useEffect, useRef, useState } from 'react'

export type HealthState = 'waking' | 'ready' | 'unreachable'

interface UseHealthCheckOptions {
  ping: () => Promise<void>
  retryDelayMs?: number
  tickMs?: number
  maxAttempts?: number
}

interface HealthCheck {
  state: HealthState
  elapsedSeconds: number
  retry: () => void
}

const DEFAULT_RETRY_DELAY_MS = 3000
const DEFAULT_TICK_MS = 1000
const DEFAULT_MAX_ATTEMPTS = 40

export function useHealthCheck({
  ping,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  tickMs = DEFAULT_TICK_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: UseHealthCheckOptions): HealthCheck {
  const [state, setState] = useState<HealthState>('waking')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [round, setRound] = useState(0)
  const pingRef = useRef(ping)

  useEffect(() => {
    pingRef.current = ping
  }, [ping])

  const retry = useCallback(() => {
    setState('waking')
    setElapsedSeconds(0)
    setRound((current) => current + 1)
  }, [])

  useEffect(() => {
    if (state !== 'waking') {
      return
    }

    const started = Date.now()
    const ticker = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - started) / 1000))
    }, tickMs)

    let cancelled = false
    const isCancelled = () => cancelled

    async function attempt(remaining: number): Promise<void> {
      try {
        await pingRef.current()

        if (!isCancelled()) {
          setState('ready')
        }
      } catch {
        if (isCancelled()) {
          return
        }

        if (remaining <= 1) {
          setState('unreachable')
          return
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))

        if (!isCancelled()) {
          await attempt(remaining - 1)
        }
      }
    }

    void attempt(maxAttempts)

    return () => {
      cancelled = true
      clearInterval(ticker)
    }
  }, [round, state, retryDelayMs, tickMs, maxAttempts])

  return { state, elapsedSeconds, retry }
}
