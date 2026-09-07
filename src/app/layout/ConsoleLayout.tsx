import { useMemo } from 'react'
import { Outlet } from 'react-router'

import { CommandChecklist } from '@/app/layout/CommandChecklist'
import { CommandPanel } from '@/app/layout/CommandPanel'
import { CommandPromptContainer } from '@/app/layout/CommandPromptContainer'
import { CommandResultLine } from '@/app/layout/CommandResultLine'
import { CommandRuntimeProvider } from '@/app/providers/CommandRuntimeProvider'
import { useMenuStore } from '@/app/providers/menu.store'
import { useSessionStore, useThrottleStore } from '@/features/auth'
import { type Command, type CommandState } from '@/shared/commands'
import { Countdown } from '@/shared/ui'

import { AppShell } from './AppShell'

interface ConsoleLayoutProps {
  commands: readonly Command[]
}

export function ConsoleLayout({ commands }: ConsoleLayoutProps) {
  const accessToken = useSessionStore((session) => session.accessToken)
  const refreshToken = useSessionStore((session) => session.refreshToken)

  const menu = useMenuStore((state) => state.menu)

  const lockedUntil = useThrottleStore((throttle) => throttle.lockedUntil)
  const release = useThrottleStore((throttle) => throttle.release)
  const windowMs = useThrottleStore((throttle) => throttle.windowMs)

  const state = useMemo<CommandState>(
    () => ({
      isAuthenticated: accessToken !== null && refreshToken !== null,
      battleId: null,
      reactionWindowOpen: false,
      menu,
    }),
    [accessToken, menu, refreshToken],
  )

  return (
    <CommandRuntimeProvider commands={commands} state={state}>
      <AppShell>
        {/* `min-h-0` all the way down, or the messages panel never gets the chance to
            give up height. Every other box keeps its natural size: the squeeze lands on
            the one box whose content can be arbitrarily long. */}
        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-col gap-4">
          <Outlet />

          {/* The checklist sits above the question on purpose: what is being asked reads
              next to what was already answered and what is still ahead. */}
          <CommandChecklist />
          <CommandPanel />

          <CommandResultLine />

          {lockedUntil !== null && (
            <Countdown key={lockedUntil} remainingMs={windowMs} onExpire={release} label="Espera" />
          )}
        </div>

        <CommandPromptContainer disabled={lockedUntil !== null} />
      </AppShell>
    </CommandRuntimeProvider>
  )
}
