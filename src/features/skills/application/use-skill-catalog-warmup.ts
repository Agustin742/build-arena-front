import { type QueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { type SkillsApi } from '../infrastructure/skills.api'
import { fetchSkillCatalog } from './skill-catalog'

interface UseSkillCatalogWarmupOptions {
  client: QueryClient
  api: SkillsApi
  hasSession: boolean
}

/**
 * The catalog is fetched once the player has a session, so that by the time the build
 * wizard draws its first kit step the twelve skills are already in memory. Options are
 * built synchronously and cannot wait for a request.
 *
 * A failure is swallowed on purpose: nobody asked for this request, so nothing should be
 * reported. The wizard stays blocked with its own reason until the catalog lands, and any
 * command that needs it will ask for it again.
 */
export function useSkillCatalogWarmup({
  client,
  api,
  hasSession,
}: UseSkillCatalogWarmupOptions): void {
  const asked = useRef(false)

  useEffect(() => {
    if (!hasSession || asked.current) {
      return
    }

    asked.current = true

    fetchSkillCatalog(client, api).catch(() => {
      asked.current = false
    })
  }, [api, client, hasSession])
}
