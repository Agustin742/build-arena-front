import { type CommandRegistry } from './registry'
import { suggest } from './suggest'
import {
  type Command,
  type CommandArg,
  type CommandContext,
  type ParsedArgs,
  type VisibleCommand,
} from './types'

export type ResolveOutcome =
  | { kind: 'begin'; command: Command; seed: ParsedArgs }
  | { kind: 'blocked'; command: Command; reason: string }
  | { kind: 'stale-number'; input: string }
  | { kind: 'unknown'; input: string; suggestions: readonly string[] }
  | { kind: 'empty' }

export interface ResolveOptions {
  typedAtGeneration?: number | undefined
}

const NUMERAL_PATTERN = /^\d+$/

function parsePositional(rest: string, args: readonly CommandArg[]): ParsedArgs {
  const trimmedRest = rest.trim()
  const words = trimmedRest === '' ? [] : trimmedRest.split(/\s+/)
  const seed: Record<string, string> = {}

  args.forEach((arg, index) => {
    const word = words[index]

    if (word !== undefined) {
      seed[arg.name] = word
    }
  })

  return seed
}

interface AliasMatch {
  entry: VisibleCommand
  alias: string
  rest: string
}

function findAliasMatch(
  input: string,
  visible: readonly VisibleCommand[],
): AliasMatch | undefined {
  let best: AliasMatch | undefined

  for (const entry of visible) {
    for (const alias of entry.command.aliases) {
      const isExact = input === alias
      const isPrefixed = input.startsWith(`${alias} `)

      if (!isExact && !isPrefixed) {
        continue
      }

      if (best === undefined || alias.length > best.alias.length) {
        best = { entry, alias, rest: isExact ? '' : input.slice(alias.length + 1) }
      }
    }
  }

  return best
}

function allAliases(visible: readonly VisibleCommand[]): readonly string[] {
  return visible.flatMap((entry) => entry.command.aliases)
}

export function resolve(
  input: string,
  registry: CommandRegistry,
  ctx: CommandContext,
  options?: ResolveOptions,
): ResolveOutcome {
  const trimmed = input.trim()

  if (trimmed === '') {
    return { kind: 'empty' }
  }

  if (NUMERAL_PATTERN.test(trimmed)) {
    if (options?.typedAtGeneration !== ctx.picks.generation) {
      return { kind: 'stale-number', input: trimmed }
    }

    const id = ctx.picks.lookup(trimmed)

    if (id === undefined) {
      return { kind: 'stale-number', input: trimmed }
    }

    const command = registry.get(id)

    if (command === undefined) {
      return { kind: 'stale-number', input: trimmed }
    }

    return { kind: 'begin', command, seed: {} }
  }

  const visible = registry.visible(ctx)
  const match = findAliasMatch(trimmed, visible)

  if (match !== undefined) {
    const { availability, command } = match.entry

    if (!availability.enabled) {
      return { kind: 'blocked', command, reason: availability.reason }
    }

    return { kind: 'begin', command, seed: parsePositional(match.rest, command.args) }
  }

  return { kind: 'unknown', input: trimmed, suggestions: suggest(trimmed, allAliases(visible)) }
}
