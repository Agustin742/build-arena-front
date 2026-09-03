import { type ReactNode } from 'react'

import { pingHealth } from './api-client'
import { ColdStartScreen } from './ColdStartScreen'
import { useHealthCheck } from './use-health-check'

interface HealthGateProps {
  children: ReactNode
  ping?: () => Promise<void>
}

export function HealthGate({ children, ping = pingHealth }: HealthGateProps) {
  const { state, elapsedSeconds, retry } = useHealthCheck({ ping })

  if (state === 'ready') {
    return children
  }

  return <ColdStartScreen state={state} elapsedSeconds={elapsedSeconds} onRetry={retry} />
}
