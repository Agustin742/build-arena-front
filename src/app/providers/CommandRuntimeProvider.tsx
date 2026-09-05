import { type ReactNode, useMemo, useState } from 'react'

import {
  advance,
  type AdvanceInput,
  type AdvanceOutcome,
  begin,
  CANCEL_ID,
  type Command,
  type CommandArg,
  type CommandContext,
  type CommandResult,
  type CommandState,
  createCommandRegistry,
  deriveScopes,
  EMPTY_NUMBERED_LIST,
  numberCommands,
  type NumberedList,
  numberOptions,
  type ParsedArgs,
  type PendingCommand,
  resolve,
  type ResolveOutcome,
  SKIP_ID,
} from '@/shared/commands'

import { toGameMessage } from '@/shared/http'

import { CommandRuntimeContext } from './command-runtime'

interface CommandRuntimeProviderProps {
  commands: readonly Command[]
  state: CommandState
  children: ReactNode
}

export function CommandRuntimeProvider({ commands, state, children }: CommandRuntimeProviderProps) {
  const [registry] = useState(() => createCommandRegistry(commands))

  const [pending, setPending] = useState<PendingCommand | null>(null)
  const [promptError, setPromptError] = useState<string | undefined>(undefined)
  const [lastResult, setLastResult] = useState<CommandResult | null>(null)
  const [generation, setGeneration] = useState(0)

  const activeScopes = useMemo(() => deriveScopes(state), [state])

  const [priorScopes, setPriorScopes] = useState(activeScopes)

  if (priorScopes !== activeScopes) {
    setPriorScopes(activeScopes)
    setGeneration((round) => round + 1)
  }

  const pendingArg = useMemo<CommandArg | undefined>(() => {
    if (pending === null) {
      return undefined
    }

    return registry.get(pending.commandId)?.args.find((arg) => arg.name === pending.awaiting)
  }, [pending, registry])

  const picks = useMemo<NumberedList>(() => {
    const baseCtx: CommandContext = { activeScopes, picks: EMPTY_NUMBERED_LIST, state }

    return pendingArg === undefined
      ? numberCommands(registry.visible(baseCtx), generation)
      : numberOptions(pendingArg.options?.(baseCtx) ?? [], generation, {
          skip: !pendingArg.required,
        })
  }, [activeScopes, generation, pendingArg, registry, state])

  const ctx: CommandContext = { activeScopes, picks, state }

  function runCommand(command: Command, args: ParsedArgs) {
    setPending(null)
    setPromptError(undefined)
    setLastResult(null)
    setGeneration((round) => round + 1)

    command.run(args, ctx).then(
      (result) => {
        setLastResult(result)

        if (result.status === 'error') {
          setPromptError(result.message)
        }
      },
      (cause: unknown) => {
        const message = toGameMessage(cause)

        setLastResult({ status: 'error', message })
        setPromptError(message)
      },
    )
  }

  function applyOutcome(outcome: AdvanceOutcome) {
    if (outcome.kind === 'filled') {
      runCommand(outcome.command, outcome.args)
      return
    }

    if (outcome.kind === 'cancelled') {
      setPending(null)
      setPromptError(undefined)
      return
    }

    if (outcome.kind === 'invalid') {
      setPending(outcome.pending)
      setPromptError(outcome.reason)
      return
    }

    setPending(outcome.pending)
    setPromptError(undefined)
  }

  function handleResolveOutcome(outcome: ResolveOutcome) {
    if (outcome.kind === 'empty') {
      setPromptError(undefined)
      return
    }

    if (outcome.kind === 'blocked') {
      setPromptError(outcome.reason)
      return
    }

    if (outcome.kind === 'stale-number') {
      setPromptError(`"${outcome.input}" is no longer available`)
      return
    }

    if (outcome.kind === 'unknown') {
      setPromptError(
        outcome.suggestions.length > 0
          ? `Unknown command. Did you mean ${outcome.suggestions.join(', ')}?`
          : 'Unknown command',
      )
      return
    }

    applyOutcome(begin(outcome.command, outcome.seed))
  }

  function selectItem(id: string) {
    if (pending === null) {
      const command = registry.get(id)

      if (command !== undefined) {
        applyOutcome(begin(command))
      }

      return
    }

    const command = registry.get(pending.commandId)

    if (command === undefined) {
      return
    }

    if (id === CANCEL_ID) {
      applyOutcome({ kind: 'cancelled' })
      return
    }

    const input: AdvanceInput = id === SKIP_ID ? { kind: 'skip' } : { kind: 'pick', optionId: id }
    applyOutcome(advance(command, pending, input, ctx))
  }

  function submitText(raw: string, typedAtGeneration: number | undefined) {
    if (pending === null) {
      handleResolveOutcome(resolve(raw, registry, ctx, { typedAtGeneration }))
      return
    }

    const command = registry.get(pending.commandId)

    if (command === undefined) {
      return
    }

    applyOutcome(advance(command, pending, { kind: 'value', raw }, ctx))
  }

  function cancelPending() {
    setPending(null)
    setPromptError(undefined)
  }

  return (
    <CommandRuntimeContext
      value={{
        ctx,
        registry,
        pending,
        promptError,
        lastResult,
        selectItem,
        submitText,
        cancelPending,
      }}
    >
      {children}
    </CommandRuntimeContext>
  )
}
