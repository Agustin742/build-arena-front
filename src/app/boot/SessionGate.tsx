import { type ReactNode } from 'react'

import { createAuthApi, useSessionBootstrap } from '@/features/auth'
import { type PublicUser } from '@/shared/contracts'

import { apiClient } from './api-client'

const authApi = createAuthApi(apiClient)

interface SessionGateProps {
  children: ReactNode
  fetchProfile?: () => Promise<PublicUser>
}

export function SessionGate({ children, fetchProfile = authApi.me }: SessionGateProps) {
  useSessionBootstrap({ fetchProfile })

  return children
}
