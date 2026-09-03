import { createContext, use } from 'react'

export const PromptSlotContext = createContext<HTMLElement | null>(null)

export function usePromptSlot() {
  return use(PromptSlotContext)
}
