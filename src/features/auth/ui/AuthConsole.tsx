import { useMemo } from 'react'

import { CommandListContainer } from '@/app/layout/CommandListContainer'
import { CommandPromptContainer } from '@/app/layout/CommandPromptContainer'
import { CommandResultLine } from '@/app/layout/CommandResultLine'
import { CommandRuntimeProvider } from '@/app/providers/CommandRuntimeProvider'
import { type Command, type CommandState } from '@/shared/commands'
import { Panel } from '@/shared/ui'

import { useSessionStore } from '../application/session.store'

interface AuthConsoleProps {
  title: string
  commands: readonly Command[]
}

export function AuthConsole({ title, commands }: AuthConsoleProps) {
  const accessToken = useSessionStore((state) => state.accessToken)
  const refreshToken = useSessionStore((state) => state.refreshToken)

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
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Panel title={title} note="escribí el comando o su número">
          <CommandListContainer />
        </Panel>

        <CommandResultLine />
      </div>

      <CommandPromptContainer />
    </CommandRuntimeProvider>
  )
}
