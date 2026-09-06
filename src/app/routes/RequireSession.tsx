import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { useSessionStore } from '@/features/auth'

interface RequireSessionProps {
  children: ReactNode
}

export function RequireSession({ children }: RequireSessionProps) {
  const location = useLocation()
  const accessToken = useSessionStore((state) => state.accessToken)
  const refreshToken = useSessionStore((state) => state.refreshToken)

  if (accessToken === null || refreshToken === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
