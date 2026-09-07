import { type ReactNode } from 'react'

import { createAuthApi, useSessionBootstrap, useSessionStore } from '@/features/auth'
import { createSkillsApi, useSkillCatalogWarmup } from '@/features/skills'
import { type PublicUser } from '@/shared/contracts'

import { apiClient } from './api-client'
import { queryClient } from './query-client'

const authApi = createAuthApi(apiClient)
const skillsApi = createSkillsApi(apiClient)

interface SessionGateProps {
  children: ReactNode
  fetchProfile?: () => Promise<PublicUser>
}

export function SessionGate({ children, fetchProfile = authApi.me }: SessionGateProps) {
  const hasSession = useSessionStore((session) => session.accessToken !== null)

  useSessionBootstrap({ fetchProfile })
  // The catalog goes behind the guard, so it is only asked for once a session exists.
  // Requesting it without one would answer 401 and cost the player their session.
  useSkillCatalogWarmup({ client: queryClient, api: skillsApi, hasSession })

  return children
}
