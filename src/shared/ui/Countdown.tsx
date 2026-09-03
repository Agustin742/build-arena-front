import { useEffect, useRef, useState } from 'react'

const FILLED = '█'
const EMPTY = '░'
const TICK_MS = 100
const WARNING_RATIO = 0.3

interface CountdownProps {
  remainingMs: number
  onExpire?: () => void
  width?: number
  label?: string
}

export function Countdown({ remainingMs, onExpire, width = 20, label = 'Tiempo' }: CountdownProps) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    const startedAt = Date.now()
    let expired = false

    const ticker = setInterval(() => {
      const elapsed = Date.now() - startedAt
      setElapsedMs(elapsed)

      if (elapsed >= remainingMs && !expired) {
        expired = true
        clearInterval(ticker)
        onExpireRef.current?.()
      }
    }, TICK_MS)

    return () => {
      clearInterval(ticker)
    }
  }, [remainingMs])

  const left = Math.max(0, remainingMs - elapsedMs)
  const seconds = Math.ceil(left / 1000)
  const ratio = remainingMs <= 0 ? 0 : left / remainingMs
  const filled = Math.round(ratio * width)
  const tone = ratio <= WARNING_RATIO ? 'text-error' : 'text-accent'

  return (
    <div className="flex items-baseline gap-3">
      <span
        role="timer"
        aria-label={label}
        aria-live="off"
        className={`min-w-[4ch] text-right font-bold ${tone}`}
      >
        {`${String(seconds)}s`}
      </span>

      <span data-testid="countdown-track" className={`tracking-tight ${tone}`}>
        {FILLED.repeat(filled)}
        <span className="text-border-strong">{EMPTY.repeat(Math.max(0, width - filled))}</span>
      </span>
    </div>
  )
}
