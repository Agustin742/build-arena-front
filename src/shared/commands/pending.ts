import { type Command, type CommandArg, type CommandContext, type ParsedArgs } from './types'

export const SKIP_ID = '__skip__'
export const CANCEL_ID = '__cancel__'

export interface PendingCommand {
  readonly commandId: string
  readonly values: ParsedArgs
  readonly awaiting: string
}

export type AdvanceInput =
  | { kind: 'value'; raw: string }
  | { kind: 'pick'; optionId: string }
  | { kind: 'skip' }
  | { kind: 'cancel' }

export type AdvanceOutcome =
  | { kind: 'pending'; pending: PendingCommand }
  | { kind: 'filled'; command: Command; args: ParsedArgs }
  | { kind: 'cancelled' }
  | { kind: 'invalid'; pending: PendingCommand; reason: string }

function nextMissingArg(
  command: Command,
  values: ParsedArgs,
  fromIndex: number,
): CommandArg | undefined {
  for (let index = fromIndex; index < command.args.length; index += 1) {
    const arg = command.args[index]

    if (arg !== undefined && values[arg.name] === undefined) {
      return arg
    }
  }

  return undefined
}

function continueFrom(command: Command, values: ParsedArgs, fromIndex: number): AdvanceOutcome {
  const missing = nextMissingArg(command, values, fromIndex)

  if (missing === undefined) {
    return { kind: 'filled', command, args: values }
  }

  return { kind: 'pending', pending: { commandId: command.id, values, awaiting: missing.name } }
}

export function begin(command: Command, seed: ParsedArgs = {}): AdvanceOutcome {
  return continueFrom(command, seed, 0)
}

/**
 * A locked option is still numbered and still looked up, because the prompt accepts the
 * number even though the button is disabled. The refusal lives here so that clicking the
 * row, typing its number and typing its name all close the same door.
 *
 * The two inputs part ways on a name the list never offered. A pick comes out of the list,
 * so one that is not in it is a mistake. A typed answer is free text, and the arena is the
 * one that judges it: the list is a courtesy, not the authority.
 */
function refuseLockedAnswer(
  arg: CommandArg | undefined,
  pending: PendingCommand,
  input: { kind: 'value' | 'pick'; answer: string },
  ctx: CommandContext,
): AdvanceOutcome | undefined {
  const options = arg?.options?.(ctx, pending.values)

  if (options === undefined) {
    return undefined
  }

  const option = options.find((candidate) => candidate.id === input.answer)

  if (option === undefined) {
    return input.kind === 'pick'
      ? { kind: 'invalid', pending, reason: `${input.answer} is not on offer` }
      : undefined
  }

  if (option.lockedReason !== undefined) {
    return { kind: 'invalid', pending, reason: option.lockedReason }
  }

  return undefined
}

export function advance(
  command: Command,
  pending: PendingCommand,
  input: AdvanceInput,
  ctx: CommandContext,
): AdvanceOutcome {
  if (input.kind === 'cancel') {
    return { kind: 'cancelled' }
  }

  const currentIndex = command.args.findIndex((candidate) => candidate.name === pending.awaiting)
  const arg = command.args[currentIndex]

  if (input.kind === 'skip') {
    if (arg === undefined || arg.required) {
      return { kind: 'invalid', pending, reason: `${pending.awaiting} is required` }
    }

    return continueFrom(command, pending.values, currentIndex + 1)
  }

  const raw = input.kind === 'value' ? input.raw : input.optionId

  const refusal = refuseLockedAnswer(arg, pending, { kind: input.kind, answer: raw }, ctx)

  if (refusal !== undefined) {
    return refusal
  }

  if (raw === '') {
    return { kind: 'invalid', pending, reason: `${pending.awaiting} cannot be empty` }
  }

  return continueFrom(command, { ...pending.values, [pending.awaiting]: raw }, currentIndex + 1)
}
