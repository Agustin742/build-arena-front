import { useCallback, useEffect, useRef, useState } from 'react'

import { useCommandRuntime } from '@/app/providers/command-runtime'
import { type CommandArg } from '@/shared/commands'
import { Prompt } from '@/shared/ui'

import { PromptPortal } from './PromptPortal'

const NUMERAL_PATTERN = /^\d+$/
const CANCEL_KEYWORD = 'cancel'

export function CommandPromptContainer() {
  const runtime = useCommandRuntime()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [typedAtGeneration, setTypedAtGeneration] = useState<number | undefined>(undefined)
  const [localError, setLocalError] = useState<string | undefined>(undefined)

  const holdKeyboard = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node
    node?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
        return
      }

      const active = document.activeElement

      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        return
      }

      inputRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (runtime.pending === null) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        runtime.cancelPending()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [runtime])

  function handleChange(next: string) {
    if (value === '' && next !== '') {
      setTypedAtGeneration(runtime.ctx.picks.generation)
    }

    setValue(next)
  }

  function pendingArg(): CommandArg | undefined {
    const pending = runtime.pending

    if (pending === null) {
      return undefined
    }

    const command = runtime.registry.get(pending.commandId)

    return command?.args.find((arg) => arg.name === pending.awaiting)
  }

  function pendingPickArg(): CommandArg | undefined {
    const arg = pendingArg()

    return arg?.kind === 'pick' ? arg : undefined
  }

  function resetInput() {
    setValue('')
    setTypedAtGeneration(undefined)
  }

  function handleSubmit(raw: string) {
    if (runtime.pending !== null && raw === CANCEL_KEYWORD) {
      setLocalError(undefined)
      runtime.cancelPending()
      resetInput()
      return
    }

    const pickArg = pendingPickArg()

    if (pickArg !== undefined && NUMERAL_PATTERN.test(raw)) {
      const optionId =
        typedAtGeneration === runtime.ctx.picks.generation
          ? runtime.ctx.picks.lookup(raw)
          : undefined

      if (optionId === undefined) {
        setLocalError(`"${raw}" is no longer available`)
        resetInput()
        return
      }

      setLocalError(undefined)
      runtime.selectItem(optionId)
      resetInput()
      return
    }

    setLocalError(undefined)
    runtime.submitText(raw, typedAtGeneration)
    resetInput()
  }

  const error = localError ?? runtime.promptError
  const awaiting = pendingArg()

  return (
    <PromptPortal>
      <Prompt
        ref={holdKeyboard}
        value={value}
        onChange={handleChange}
        onSubmit={handleSubmit}
        {...(awaiting === undefined
          ? {}
          : {
              type: awaiting.kind === 'password' ? ('password' as const) : ('text' as const),
              hint: `${awaiting.label}:`,
              label: awaiting.label,
            })}
        {...(error === undefined ? {} : { error })}
      />
    </PromptPortal>
  )
}
