import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type Command, type CommandState } from '@/shared/commands'

import { type CommandRuntime, useCommandRuntime } from './command-runtime'
import { CommandRuntimeProvider } from './CommandRuntimeProvider'

function makePing(): Command {
  return {
    id: 'ping',
    label: 'ping',
    aliases: ['ping'],
    args: [],
    scope: ['lobby', 'battle'],
    availability: () => ({ enabled: true }),
    run: () => Promise.resolve({ status: 'ok' }),
  }
}

function Probe({ onRuntime }: { onRuntime: (runtime: CommandRuntime) => void }) {
  onRuntime(useCommandRuntime())
  return null
}

function latestOf(seen: readonly CommandRuntime[]): CommandRuntime {
  const runtime = seen.at(-1)

  if (runtime === undefined) {
    throw new Error('expected at least one runtime snapshot')
  }

  return runtime
}

const lobbyState: CommandState = { isAuthenticated: true, battleId: null, reactionWindowOpen: false }
const battleState: CommandState = { isAuthenticated: true, battleId: 'b1', reactionWindowOpen: false }

describe('CommandRuntimeProvider', () => {
  it('bumps the numbered list generation when the active scope changes', () => {
    const seen: CommandRuntime[] = []
    const { rerender } = render(
      <CommandRuntimeProvider commands={[makePing()]} state={lobbyState}>
        <Probe
          onRuntime={(runtime) => {
            seen.push(runtime)
          }}
        />
      </CommandRuntimeProvider>,
    )
    const before = latestOf(seen).ctx.picks.generation

    rerender(
      <CommandRuntimeProvider commands={[makePing()]} state={battleState}>
        <Probe
          onRuntime={(runtime) => {
            seen.push(runtime)
          }}
        />
      </CommandRuntimeProvider>,
    )

    expect(latestOf(seen).ctx.picks.generation).toBeGreaterThan(before)
  })

  it('clears the pending command and bumps generation when it completes', () => {
    const seen: CommandRuntime[] = []
    render(
      <CommandRuntimeProvider commands={[makePing()]} state={lobbyState}>
        <Probe
          onRuntime={(runtime) => {
            seen.push(runtime)
          }}
        />
      </CommandRuntimeProvider>,
    )
    const before = latestOf(seen).ctx.picks.generation

    act(() => {
      latestOf(seen).selectItem('ping')
    })

    expect(latestOf(seen).pending).toBeNull()
    expect(latestOf(seen).ctx.picks.generation).toBeGreaterThan(before)
  })

  it('keeps the same registry instance across re-renders', () => {
    const seen: CommandRuntime[] = []
    const { rerender } = render(
      <CommandRuntimeProvider commands={[makePing()]} state={lobbyState}>
        <Probe
          onRuntime={(runtime) => {
            seen.push(runtime)
          }}
        />
      </CommandRuntimeProvider>,
    )
    const first = latestOf(seen).registry

    rerender(
      <CommandRuntimeProvider commands={[makePing()]} state={{ ...lobbyState }}>
        <Probe
          onRuntime={(runtime) => {
            seen.push(runtime)
          }}
        />
      </CommandRuntimeProvider>,
    )

    expect(latestOf(seen).registry).toBe(first)
  })
})
