import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { usePromptSlot } from './prompt-slot'

interface PromptPortalProps {
  children: ReactNode
}

export function PromptPortal({ children }: PromptPortalProps) {
  const slot = usePromptSlot()

  if (slot === null) {
    return null
  }

  return createPortal(children, slot)
}
