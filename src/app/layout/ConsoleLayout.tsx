import { useMemo } from 'react'
import { Outlet } from 'react-router'

import { CommandListContainer } from '@/app/layout/CommandListContainer'
import { CommandPromptContainer } from '@/app/layout/CommandPromptContainer'
import { CommandResultLine } from '@/app/layout/CommandResultLine'
import { CommandTranscript } from '@/app/layout/CommandTranscript'
import { CommandRuntimeProvider } from '@/app/providers/CommandRuntimeProvider'
import { useSessionStore, useThrottleStore } from '@/features/auth'
import { type Command, type CommandState } from '@/shared/commands'
import { Countdown, Panel } from '@/shared/ui'

import { AppShell } from './AppShell'

interface ConsoleLayoutProps {
  commands: readonly Command[]
}

export function ConsoleLayout({ commands }: ConsoleLayoutProps) {
  const accessToken = useSessionStore((session) => session.accessToken)
  const refreshToken = useSessionStore((session) => session.refreshToken)

  const lockedUntil = useThrottleStore((throttle) => throttle.lockedUntil)
  const release = useThrottleStore((throttle) => throttle.release)
  const windowMs = useThrottleStore((throttle) => throttle.windowMs)

  const state = useMemo<CommandState>(
    () => ({
      isAuthenticated: accessToken !== null && refreshToken !== null,
      battleId: null,
      reactionWindowOpen: false,
    }),
    [accessToken, refreshToken],
  )

  return (
    <CommandRuntimeProvider commands={commands} state={state}>
      <AppShell>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <Outlet />

          <Panel title="comandos" note="escribí el comando o su número">
            <CommandListContainer />
          </Panel>

          <CommandResultLine />
          <CommandTranscript />

          {lockedUntil !== null && (
            <Countdown key={lockedUntil} remainingMs={windowMs} onExpire={release} label="Espera" />
          )}
        </div>

        <CommandPromptContainer disabled={lockedUntil !== null} />
      </AppShell>
    </CommandRuntimeProvider>
  )
}
