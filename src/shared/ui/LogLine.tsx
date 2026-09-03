import { type ReactNode } from 'react'

export type LogTone = 'neutral' | 'dim' | 'round' | 'success' | 'error'

const TONE_CLASS: Record<LogTone, string> = {
  neutral: 'text-text',
  dim: 'text-text-dim',
  round: 'text-accent',
  success: 'text-success',
  error: 'text-error',
}

interface LogLineProps {
  children: ReactNode
  tone?: LogTone
  marker?: string
}

export function LogLine({ children, tone = 'neutral', marker }: LogLineProps) {
  return (
    <p className="flex items-baseline gap-2">
      <span aria-hidden="true" className="min-w-[2ch] text-right text-border-strong">
        {marker ?? ''}
      </span>
      <span className={TONE_CLASS[tone]}>{children}</span>
    </p>
  )
}
