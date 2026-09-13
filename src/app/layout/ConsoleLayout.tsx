import { type ReactNode, useMemo } from 'react'
import { Outlet } from 'react-router'

import { CommandChecklist } from '@/app/layout/CommandChecklist'
import { CommandPanel } from '@/app/layout/CommandPanel'
import { CommandPromptContainer } from '@/app/layout/CommandPromptContainer'
import { CommandResultLine } from '@/app/layout/CommandResultLine'
import { focusOf } from '@/app/layout/console-focus'
import { ConsoleSlot } from '@/app/layout/ConsoleSlot'
import { useCommandRuntime } from '@/app/providers/command-runtime'
import { CommandRuntimeProvider } from '@/app/providers/CommandRuntimeProvider'
import { useMenuStore } from '@/app/providers/menu.store'
import { useSessionStore, useThrottleStore } from '@/features/auth'
import { type Command, type CommandState } from '@/shared/commands'
import { Countdown } from '@/shared/ui'

import { AppShell } from './AppShell'

interface ConsoleLayoutProps {
  commands: readonly Command[]
}

interface ConsoleStackProps {
  /** What sits under the boxes at its natural height, like the throttle countdown. */
  children?: ReactNode
}

/**
 * The column of boxes, and the one place that decides which of them is the last to give up
 * height. It reads the runtime, so it has to live inside the provider the layout renders.
 *
 * The focus is a single value handed to every slot at once. It never makes a box grow; it
 * only decides who yields first when the column runs short, so two boxes can never both
 * hold on to their height at the expense of the rest.
 */
function ConsoleStack({ children }: ConsoleStackProps) {
  const { pendingStep, lastResult } = useCommandRuntime()
  const focus = focusOf(pendingStep, lastResult)

  return (
    // `min-h-0` all the way down, or no box ever gets the chance to give up height. The
    // slots say in which order they yield; each panel says how far down it may go.
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-col gap-4">
      <ConsoleSlot focused={focus === 'screen'}>
        <Outlet />
      </ConsoleSlot>

      {/* The checklist sits above the question on purpose: what is being asked reads next
          to what was already answered and what is still ahead. It is never the focus and
          has a slot of its own, so a long run of steps yields before the options do. */}
      <ConsoleSlot focused={false}>
        <CommandChecklist />
      </ConsoleSlot>

      <ConsoleSlot focused={focus === 'question'}>
        <CommandPanel />
      </ConsoleSlot>

      <ConsoleSlot focused={focus === 'output'}>
        <CommandResultLine />
      </ConsoleSlot>

      {children}
    </div>
  )
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
        <ConsoleStack>
          {lockedUntil !== null && (
            <Countdown key={lockedUntil} remainingMs={windowMs} onExpire={release} label="Espera" />
          )}
        </ConsoleStack>

        <CommandPromptContainer disabled={lockedUntil !== null} />
      </AppShell>
    </CommandRuntimeProvider>
  )
}
