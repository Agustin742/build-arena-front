import { type ReactNode, useCallback, useEffect, useRef } from 'react'

import { useSessionStore } from '@/features/auth'
import { createSkillsApi, fetchSkillCatalog } from '@/features/skills'

import { apiClient } from './api-client'
import { ColdStartScreen } from './ColdStartScreen'
import { queryClient } from './query-client'
import { useHealthCheck } from './use-health-check'

const skillsApi = createSkillsApi(apiClient)

async function loadSkillCatalog(): Promise<void> {
  await fetchSkillCatalog(queryClient, skillsApi)
}

interface CatalogGateProps {
  children: ReactNode
  loadCatalog?: () => Promise<void>
  retryDelayMs?: number
  maxAttempts?: number
}

/**
 * `/health` answers as soon as the node process is up, but the catalog is the first thing
 * that touches the database, and on a free plan that wakes up second. The console used to
 * open in between, with the build wizard shut and no way to reopen it short of a reload.
 *
 * So the same cold start screen covers both waits. The player sees one load, not two.
 */
export function CatalogGate({
  children,
  loadCatalog = loadSkillCatalog,
  retryDelayMs,
  maxAttempts,
}: CatalogGateProps) {
  const hasSession = useSessionStore((session) => session.accessToken !== null)

  // Nothing to fetch without a session: the catalog sits behind the guard, and asking for
  // it anonymously would answer 401 and cost the visitor the session they do not have.
  const ping = useCallback(
    () => (hasSession ? loadCatalog() : Promise.resolve()),
    [hasSession, loadCatalog],
  )

  const { state, elapsedSeconds, retry } = useHealthCheck({
    ping,
    ...(retryDelayMs === undefined ? {} : { retryDelayMs }),
    ...(maxAttempts === undefined ? {} : { maxAttempts }),
  })

  // A visitor who logs in from the console arrives here already open. The catalog has to
  // be asked for then, or the wizard would stay shut for the rest of the session.
  const hadSession = useRef(hasSession)

  useEffect(() => {
    if (hasSession && !hadSession.current) {
      hadSession.current = true
      retry()
    }
  }, [hasSession, retry])

  // A visitor with no session is not waiting for anything: the login screen needs nothing
  // from behind the guard, so there is no gate to hold them at.
  if (!hasSession || state === 'ready') {
    return children
  }

  return <ColdStartScreen state={state} elapsedSeconds={elapsedSeconds} onRetry={retry} />
}
