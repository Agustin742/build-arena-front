import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { useSessionStore } from '@/features/auth'

interface GuestOnlyProps {
  children: ReactNode
}

export function GuestOnly({ children }: GuestOnlyProps) {
  const location = useLocation()
  const accessToken = useSessionStore((state) => state.accessToken)
  const refreshToken = useSessionStore((state) => state.refreshToken)

  if (accessToken !== null && refreshToken !== null) {
    const from = (location.state as { from?: string } | null)?.from

    return <Navigate to={from ?? '/'} replace />
  }

  return children
}
