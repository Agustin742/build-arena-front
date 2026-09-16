import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { bindNavigate } from '@/app/boot/navigation'

/**
 * Renders nothing. It only hands the router's `navigate` to the `ArenaNavigation` port (D8),
 * since a plain object cannot call a hook, and unbinds it on unmount so a command run after
 * the router itself is gone finds nobody to call.
 */
export function NavigationBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    bindNavigate((path) => {
      navigate(path)
    })

    return () => {
      bindNavigate(null)
    }
  }, [navigate])

  return null
}
