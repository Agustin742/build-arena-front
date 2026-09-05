import { useState } from 'react'
import { Outlet } from 'react-router'

import { PromptSlotContext } from './prompt-slot'

export function AppShell() {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  return (
    <div className="flex min-h-full flex-col bg-background font-mono text-text">
      <a
        href="#console-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:border focus:border-accent focus:bg-surface focus:px-2 focus:py-1 focus:text-accent"
      >
        Ir al contenido
      </a>

      <header className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-2">
        <span className="font-bold tracking-widest text-accent uppercase">build arena</span>
        <span className="text-xs text-text-dim">consola de duelos</span>
      </header>

      <main id="console-content" className="flex flex-1 flex-col px-4 py-4">
        <div className="mt-auto">
          <PromptSlotContext value={slot}>
            <Outlet />
          </PromptSlotContext>
        </div>
      </main>

      <footer
        ref={setSlot}
        className="border-t border-border px-4 py-2 empty:border-0 empty:py-0"
      />
    </div>
  )
}
