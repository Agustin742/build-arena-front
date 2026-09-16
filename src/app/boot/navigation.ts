import { type ArenaNavigation } from '@/features/arena'

type Navigate = (path: string) => void

let activeNavigate: Navigate | null = null

/**
 * Set by `<NavigationBridge/>` once it mounts inside the router, and cleared on unmount. A
 * plain object cannot call `useNavigate`, so this is the one seam that lets it (D8).
 */
export function bindNavigate(navigate: Navigate | null): void {
  activeNavigate = navigate
}

export const navigation: ArenaNavigation = {
  toArena: (battleId) => {
    activeNavigate?.(`/battles/${battleId}`)
  },
  toLobby: () => {
    activeNavigate?.('/')
  },
}
