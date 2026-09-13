import { type PendingStep } from '@/app/providers/command-runtime'
import { type CommandResult } from '@/shared/commands'

/** The box in the console that gets the leftover height. There is always exactly one. */
export type ConsoleFocus = 'screen' | 'question' | 'output'

/**
 * Whether the output box has anything to print. Shared by the box that prints it and by the
 * layout that sizes it, so the console never focuses a box that renders nothing.
 */
export function hasOutput(lastResult: CommandResult | null): lastResult is CommandResult {
  if (lastResult === null) {
    return false
  }

  return lastResult.message !== undefined || (lastResult.lines ?? []).length > 0
}

/**
 * While a step is open the options are what the player is working in. Between questions the
 * output is what they came to read — a catalog of twelve skills lands there. With neither,
 * the screen itself has the room.
 */
export function focusOf(
  pendingStep: PendingStep | null,
  lastResult: CommandResult | null,
): ConsoleFocus {
  if (pendingStep !== null) {
    return 'question'
  }

  return hasOutput(lastResult) ? 'output' : 'screen'
}
