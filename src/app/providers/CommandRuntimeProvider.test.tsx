import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type Command, type CommandResult, type CommandState } from '@/shared/commands'

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

function makeResulting(result: CommandResult): Command {
  return {
    ...makePing(),
    id: 'login',
    aliases: ['login'],
    run: () => Promise.resolve(result),
  }
}

async function runAlias(seen: readonly CommandRuntime[], alias: string) {
  await act(async () => {
    latestOf(seen).submitText(alias, undefined)
    await Promise.resolve()
  })
}

describe('CommandRuntimeProvider', () => {
  it('surfaces a failed command result instead of swallowing it', async () => {
    const seen: CommandRuntime[] = []
    const failing = makeResulting({ status: 'error', message: 'Credenciales inválidas' })

    render(
      <CommandRuntimeProvider commands={[failing]} state={lobbyState}>
        <Probe
          onRuntime={(runtime) => {
            seen.push(runtime)
          }}
        />
      </CommandRuntimeProvider>,
    )

    await runAlias(seen, 'login')

    expect(latestOf(seen).promptError).toBe('Credenciales inválidas')
    expect(latestOf(seen).lastResult).toEqual({
      status: 'error',
      message: 'Credenciales inválidas',
    })
  })

  it('exposes what a successful command reported, leaving the prompt clean', async () => {
    const seen: CommandRuntime[] = []
    const succeeding = makeResulting({ status: 'ok', message: 'Adentro. Bienvenido, ada' })

    render(
      <CommandRuntimeProvider commands={[succeeding]} state={lobbyState}>
        <Probe
          onRuntime={(runtime) => {
            seen.push(runtime)
          }}
        />
      </CommandRuntimeProvider>,
    )

    await runAlias(seen, 'login')

    expect(latestOf(seen).lastResult).toEqual({
      status: 'ok',
      message: 'Adentro. Bienvenido, ada',
    })
    expect(latestOf(seen).promptError).toBeUndefined()
  })

  it('drops the previous result when the next command starts', async () => {
    const seen: CommandRuntime[] = []
    const failing = makeResulting({ status: 'error', message: 'Credenciales inválidas' })

    render(
      <CommandRuntimeProvider commands={[failing, makePing()]} state={lobbyState}>
        <Probe
          onRuntime={(runtime) => {
            seen.push(runtime)
          }}
        />
      </CommandRuntimeProvider>,
    )

    await runAlias(seen, 'login')
    expect(latestOf(seen).lastResult).not.toBeNull()

    await runAlias(seen, 'ping')

    expect(latestOf(seen).lastResult).toEqual({ status: 'ok' })
  })

  it('reports a command that threw instead of leaving the console silent', async () => {
    const seen: CommandRuntime[] = []
    const throwing: Command = {
      ...makePing(),
      id: 'login',
      aliases: ['login'],
      run: () => Promise.reject(new Error('boom')),
    }

    render(
      <CommandRuntimeProvider commands={[throwing]} state={lobbyState}>
        <Probe
          onRuntime={(runtime) => {
            seen.push(runtime)
          }}
        />
      </CommandRuntimeProvider>,
    )

    await runAlias(seen, 'login')

    expect(latestOf(seen).lastResult?.status).toBe('error')
    expect(latestOf(seen).promptError).toBeDefined()
  })

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
