import { type ReactNode, useState } from 'react'
import { Outlet } from 'react-router'

import { PromptSlotContext } from './prompt-slot'
import { useStickToBottom } from './use-stick-to-bottom'

interface AppShellProps {
  children?: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const content = useStickToBottom<HTMLElement>()

  return (
    // `h-full` and not `min-h-full`: the console is exactly the window, and only the
    // content in the middle scrolls. Letting the page grow instead pushed the prompt
    // below the fold as soon as a command printed a long answer.
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

      {/* `min-h-0` is what lets a flex child shrink below its content and scroll at all. */}
      <main
        id="console-content"
        ref={content}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4"
      >
        {/* Pins short content to the bottom, next to the prompt, and gets out of the way
            once there is enough of it to scroll. */}
        <div className="mt-auto">
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
