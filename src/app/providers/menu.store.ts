import { create } from 'zustand'

import { type CommandMenu } from '@/shared/commands'

interface MenuState {
  menu: CommandMenu | null
  open: (menu: CommandMenu) => void
  close: () => void
}

/**
 * Which menu the console has stepped into. It lives in a store and not in a component
 * because the commands that open and close it run from the prompt, outside React — the
 * same reason the session and the throttle lock live in one.
 */
export const useMenuStore = create<MenuState>()((set) => ({
  menu: null,
  open: (menu) => {
    set({ menu })
  },
  close: () => {
    set({ menu: null })
  },
}))
