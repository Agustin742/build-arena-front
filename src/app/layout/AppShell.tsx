import { type ReactNode, useState } from 'react'
import { Outlet } from 'react-router'

import { PromptSlotContext } from './prompt-slot'

interface AppShellProps {
  children?: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  return (
    // The console is exactly the window and nothing outside a panel ever scrolls: the
    // header, the prompt and every panel heading stay where the player left them.
    <div className="flex h-full flex-col overflow-hidden bg-background font-mono text-text">
      <a
        href="#console-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:border focus:border-accent focus:bg-surface focus:px-2 focus:py-1 focus:text-accent"
      >
        Ir al contenido
      </a>

      <header className="flex shrink-0 items-baseline justify-between gap-4 border-b border-border px-4 py-2">
        <span className="font-bold tracking-widest text-accent uppercase">build arena</span>
        <span className="text-xs text-text-dim">consola de duelos</span>
      </header>

      {/* `min-h-0` is what lets a flex child shrink below its content, which is what makes
          the panels inside give up height instead of pushing the prompt off the screen. */}
      <main id="console-content" className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4">
        {/* Pins short content to the bottom, next to the prompt, and gets out of the way
            as soon as there is enough of it to fill the console. */}
        <div className="mt-auto flex min-h-0 flex-col">
          <PromptSlotContext value={slot}>{children ?? <Outlet />}</PromptSlotContext>
        </div>
      </main>

      <footer
        ref={setSlot}
        className="shrink-0 border-t border-border px-4 py-2 empty:border-0 empty:py-0"
      />
    </div>
  )
}
