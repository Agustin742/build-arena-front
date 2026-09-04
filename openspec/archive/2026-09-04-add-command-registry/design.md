# Design: Command Registry

## Technical Approach

`src/shared/commands/` is a React-free, pure module ring. A plain factory (`createApiClient` idiom)
holds the command table; every other piece is a free function over explicit arguments. All mutable
runtime state — active scopes, the numbered map, the pending command — lives in one React provider
in `src/app/providers/`, which is the only place that knows React exists.

Click and typed input converge because both funnel through the same two pure functions, `begin()` and
`advance()`, and both terminate in the same `{ kind: 'filled', command, args }` value. The container
therefore has exactly **one** `command.run(...)` call site. That single call site is the mechanical
guarantee behind `overview.md` §3.1, not a convention anyone has to remember.

The shipped `CommandList` and `Prompt` props are untouched. Containers adapt registry output to them.

## Architecture Decisions

Realizes the eleven approved proposal decisions. New decisions forced by the shipped contracts:

| # | Decision | Alternatives rejected | Rationale |
|---|---|---|---|
| A | One `NumberedList` value is both the render source and the `key -> id` map; `numberCommands()` / `numberOptions()` are its only public constructors | Container builds `CommandItem[]` and a separate map | Two arrays drift. Decision 9 says one array; this makes two impossible. `numbered.ts` key-allocation internals stay private, honoring "numbered stays private" |
| B | Every item carries an **explicit** `key`, so `CommandList.withKeys`'s auto-numbering never fires | Let `CommandList` number implicitly | `withKeys` skips explicit keys when counting, so mixing modes desynchronizes display from the map |
| C | Staleness is detected by a `generation` counter compared against `typedAtGeneration`, not by absence from the map | Absence check only | Two different lists both have a "2". Absence alone would silently pick a different entity — the exact failure decision 7 forbids |
| D | `Esc` is captured by a `document` keydown listener in the prompt container, live only while a command is pending | Add `onKeyDown` to `Prompt` | `Prompt`'s props are frozen by scope. This is the only route left; recorded here so apply does not "fix" it by editing `Prompt` |
| E | Skip is a click-only control entry in the numbered list; the typed path skips by omitting trailing words | A literal `skip` keyword | A keyword collides with legitimate values, and empty submit is reserved (decision 10) |
| F | Registry created once via `useRef` in the provider, not a Zustand store | Zustand store in `shared/commands/` | `architecture.md` §3: "se testea entero sin montar un componente". A store would pull a runtime dependency into the innermost ring for no gain — the provider already re-renders on state change |
| G | `CommandContext.state` is a widening `CommandState` interface; Phases 5-9 add fields | Generic `CommandContext<T>` | Generics propagate through every signature in the barrel for a benefit only later phases would use |

## Interfaces / Contracts

### `types.ts`

```ts
export type CommandScope = 'anonymous' | 'lobby' | 'battle' | 'reaction-window'

export interface CommandOption {
  id: string
  label: string
  hint?: string | undefined
}

export interface CommandArg {
  name: string
  kind: 'text' | 'password' | 'number' | 'pick'
  label: string
  required: boolean
  options?: ((ctx: CommandContext) => CommandOption[]) | undefined
}

export type ParsedArgs = Readonly<Record<string, string>>

export type CommandAvailability = { enabled: true } | { enabled: false; reason: string }

export type CommandResult =
  | { status: 'ok'; message?: string | undefined }
  | { status: 'error'; message: string }

export interface CommandState {
  isAuthenticated: boolean
  battleId: string | null
  reactionWindowOpen: boolean
}

export interface CommandContext {
  readonly activeScopes: readonly CommandScope[]
  readonly picks: NumberedList
  readonly state: CommandState
}

export interface Command {
  id: string
  label: string
  hint?: string | undefined
  aliases: readonly string[]
  args: readonly CommandArg[]
  scope: readonly CommandScope[]
  availability: (ctx: CommandContext) => CommandAvailability
  run: (args: ParsedArgs, ctx: CommandContext) => Promise<CommandResult>
}

export interface VisibleCommand {
  command: Command
  availability: CommandAvailability
}
```

### `availability.ts`

```ts
export function available(): CommandAvailability
export function blocked(reason: string): CommandAvailability
```

`blocked` without a reason does not compile. That is the whole point of decision 5.

### `scope.ts`

```ts
export function deriveScopes(state: CommandState): CommandScope[]
```

Pure and total. `!isAuthenticated -> ['anonymous']`; authenticated with `battleId === null -> ['lobby']`;
`battleId !== null -> ['battle']`, plus `'reaction-window'` when `reactionWindowOpen`. The array is
what lets a reaction window co-occur with a battle without double registration (decision 1). No route
is consulted: a reaction window opens on a server event, not a navigation.

### `numbered.ts`

```ts
export interface NumberedItem {
  key: string
  id: string
  label: string
  hint?: string | undefined
  lockedReason?: string | undefined
}

export interface NumberedList {
  readonly generation: number
  readonly items: readonly NumberedItem[]
  lookup: (key: string) => string | undefined
}

export function numberCommands(visible: readonly VisibleCommand[], generation: number): NumberedList
export function numberOptions(
  options: readonly CommandOption[],
  generation: number,
  controls: { skip: boolean },
): NumberedList
export const EMPTY_NUMBERED_LIST: NumberedList
```

`numberCommands` assigns `'1'..'n'` in registry order, including blocked commands (they are dimmed,
not hidden). `numberOptions` numbers the options, then appends the control entries: skip as
`{ key: 's', id: SKIP_ID }` when `controls.skip`, and always `{ key: 'esc', id: CANCEL_ID }`.

### `registry.ts`

```ts
export class DuplicateAliasError extends Error {
  constructor(alias: string, existingId: string, incomingId: string, scope: CommandScope)
}

export interface CommandRegistry {
  register: (command: Command) => void
  visible: (ctx: CommandContext) => VisibleCommand[]
  get: (id: string) => Command | undefined
}

export function createCommandRegistry(commands?: readonly Command[]): CommandRegistry
```

`register` throws `DuplicateAliasError` when an incoming alias or `id` collides with a registered one
whose `scope` array **intersects** the incoming `scope` (decision 2). Same alias in disjoint scopes is
legal and expected. `visible` returns registration order, each command paired with `availability(ctx)`.

### `resolve.ts`

```ts
export type ResolveOutcome =
  | { kind: 'begin'; command: Command; seed: ParsedArgs }
  | { kind: 'blocked'; command: Command; reason: string }
  | { kind: 'stale-number'; input: string }
  | { kind: 'unknown'; input: string; suggestions: readonly string[] }
  | { kind: 'empty' }

export interface ResolveOptions {
  typedAtGeneration?: number | undefined
}

export function resolve(
  input: string,
  registry: CommandRegistry,
  ctx: CommandContext,
  options?: ResolveOptions,
): ResolveOutcome
```

Order of interpretation, given a trimmed input and **no** pending command:

1. `''` -> `empty`. The container turns this into the reaction-window decline command when one exists,
   and into a no-op otherwise. `Prompt`'s shipped test keeps passing untouched.
2. Pure numeral -> if `options.typedAtGeneration !== ctx.picks.generation`, `stale-number`; else
   `ctx.picks.lookup(input)`, and a miss is also `stale-number` (decisions 6 and 7).
3. Longest matching alias -> `blocked` when `availability(ctx).enabled === false`, else `begin` with the
   remaining words parsed positionally into `seed` against `command.args`.
4. Otherwise `unknown` with `suggest()`'s candidates. `suggest.ts` stays private.

### `pending.ts`

```ts
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

export function begin(command: Command, seed?: ParsedArgs): AdvanceOutcome
export function advance(
  command: Command,
  pending: PendingCommand,
  input: AdvanceInput,
  ctx: CommandContext,
): AdvanceOutcome
```

### `index.ts` — public barrel

Exports every type above, plus `createCommandRegistry`, `DuplicateAliasError`, `deriveScopes`,
`resolve`, `begin`, `advance`, `available`, `blocked`, `numberCommands`, `numberOptions`,
`EMPTY_NUMBERED_LIST`, `SKIP_ID`, `CANCEL_ID`.

**Private, never re-exported**: `suggest()`, `numbered.ts`'s key allocator, and every internal helper
in `resolve.ts` / `pending.ts`. Consumers reach `numbered` only through the two constructors.

## The guided flow as a state machine

`PendingCommand` is a partially filled command: `values` holds what is answered, `awaiting` names the
one arg being asked for right now. `begin()` and `advance()` are pure and total.

```
                          begin(cmd, seed)
   click on command  ─────────────┐
                                  ▼
   typed "challenge" ────────► [pending: awaiting=rival] ──── advance(value|pick) ──┐
                                  │  ▲                                              │
                                  │  └──────── invalid (empty submit re-prompts) ───┘
                                  │
                                  ├── advance(skip)   → next arg, or filled
                                  ├── advance(cancel) → cancelled     (Esc, or the esc entry)
                                  ▼
   typed "challenge grace aggro" ──────────────────► [filled: command + args] ──► run()
                          begin(cmd, full seed) skips pending entirely
```

| Transition | Rule |
|---|---|
| `begin` | First arg with no value in `seed` becomes `awaiting`. If none, returns `filled` immediately — this is how a fully typed line and a zero-arg click both short-circuit the guided flow |
| `advance({ kind: 'value' })` | Writes `raw` into `values[awaiting]`, then re-runs `begin`'s rule. `raw === ''` returns `invalid` with a re-prompt reason: **empty submit never cancels** (decision 10) |
| `advance({ kind: 'pick' })` | Same, with `optionId` as the value. `optionId === SKIP_ID` / `CANCEL_ID` is normalized to the skip / cancel input by the container before the call |
| `advance({ kind: 'skip' })` | `invalid` when the awaiting arg is `required`; otherwise no key is written and the flow moves on. Optional args exist for clickers too (decision 11) |
| `advance({ kind: 'cancel' })` | `cancelled`. Sole triggers: the `esc` entry, or the document `Esc` listener |

Convergence proof obligation for tests: `begin(cmd, { rival: 'grace', build: 'aggro' })` and
`advance(advance(begin(cmd), pickRival), pickBuild)` must produce an **identical** `filled` value.

## State shape and ownership

| State | Owner | Written on | Invalidated on |
|---|---|---|---|
| `CommandRegistry` | `useRef` in `CommandRuntimeProvider` | Once at mount | Never |
| `activeScopes` | Provider, `useMemo(deriveScopes)` | Any `CommandState` change | Derived; never stale |
| `NumberedList` (the `key -> id` map) | Provider, `useMemo` over `visible(ctx)` or the pending arg's `options(ctx)` | Every render of a new list; `generation` increments | Scope change and command completion both change the inputs, so the memo yields a new list with a new `generation` |
| `PendingCommand \| null` | Provider `useState` | `begin` / `advance` outcomes | `filled` and `cancelled` both clear it |
| Prompt input string, `typedAtGeneration`, `error` | `CommandPromptContainer` `useState` | On change; `typedAtGeneration` snapshots `picks.generation` when the field goes from `''` to non-empty | Cleared after every submit |

The map lives in the registry **context** (`ctx.picks`), as `architecture.md` line 235 requires — not
in the component that painted the list. The provider is its single writer.

## Wiring — shipped props untouched

```
CommandState ──► deriveScopes ──► activeScopes ─┐
                                                ├──► ctx ──► registry.visible(ctx)
                          picks (NumberedList) ─┘                    │
                                                                     ▼
CommandRuntimeProvider ──────────────────────────────► numberCommands(visible, gen)
        │                                                            │  one array
        ├──► CommandListContainer ──► CommandList  ◄──────────────────┤
        │        maps NumberedItem -> CommandItem                     │
        └──► CommandPromptContainer ──► PromptPortal > Prompt         │
                 resolve / advance ────────────────────────────► filled ──► run()
```

The single adapter, in `CommandListContainer`:

```ts
const items: CommandItem[] = list.items.map((item) => ({
  id: item.id,
  label: item.label,
  key: item.key,
  ...(item.hint === undefined ? {} : { hint: item.hint }),
  ...(item.lockedReason === undefined ? {} : { lockedReason: item.lockedReason }),
}))
```

`lockedReason` comes from `availability`: `enabled ? undefined : reason`. `CommandList` already
disables the button and suppresses `onSelect` for a locked item, so the "dimmed, not hidden" policy
needs no new code. A typed alias for a blocked command takes the parallel path: `resolve` returns
`blocked` and the container feeds the same `reason` to `Prompt`'s `error`.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/shared/commands/types.ts` | Create | Every public type. No imports outside the folder |
| `src/shared/commands/availability.ts` | Create | `available` / `blocked` |
| `src/shared/commands/scope.ts` | Create | `deriveScopes` |
| `src/shared/commands/registry.ts` | Create | `createCommandRegistry`, `DuplicateAliasError` |
| `src/shared/commands/numbered.ts` | Create | `numberCommands`, `numberOptions`, `EMPTY_NUMBERED_LIST` |
| `src/shared/commands/suggest.ts` | Create | Private nearest-alias candidates |
| `src/shared/commands/resolve.ts` | Create | `resolve` |
| `src/shared/commands/pending.ts` | Create | `begin`, `advance`, control ids |
| `src/shared/commands/index.ts` | Create | Barrel; mirrors `src/shared/contracts/index.ts` |
| `src/app/providers/command-runtime.ts` | Create | Context + `useCommandRuntime()`, mirroring `prompt-slot.ts` |
| `src/app/providers/CommandRuntimeProvider.tsx` | Create | Registry, scopes, numbered list, pending state |
| `src/app/layout/CommandListContainer.tsx` | Create | `NumberedItem -> CommandItem` |
| `src/app/layout/CommandPromptContainer.tsx` | Create | `PromptPortal > Prompt`, `Esc` listener |
| `src/app/routes/DesignScreen.tsx` | Modify | Local `useState` replaced by the containers and fixture commands |
| `src/app/routes/DesignScreen.test.tsx` | Modify | Follows the rewiring |
| `docs/design/architecture.md` | Modify | Lines 214-215, see below |
| `src/shared/ui/**` | Untouched | Existing tests must pass unmodified |

## Documentation deviations — exact replacement text

**Line 214**, inside the `Command` block. Replace:

```
  scope: CommandScope
```

with:

```
  scope: CommandScope[]
```

**Line 215**. Replace:

```
  isEnabled: (ctx: CommandContext) => boolean
```

with:

```
  availability: (ctx: CommandContext) => CommandAvailability
```

Two consequential edits in the same block, stated exactly so apply does not improvise. Line 225's
table cell `| \`scope\` | Qué comandos existen en cada estado | \`anonymous\`, \`lobby\`, \`battle\`,
\`reaction-window\` |` keeps its text; its example list is already plural. Line 226's row becomes
`| \`availability\` | Se muestra deshabilitado, no se esconde | sin builds no se puede desafiar |`,
and the paragraph opening at line 238 becomes `\`availability\` devolviendo \`{ enabled: false }\`
**muestra la opción atenuada con su motivo, no la esconde.**` No other line changes.

## Layering justification (`architecture.md` "la flecha apunta hacia adentro")

| Module | Ring | Justification |
|---|---|---|
| `src/shared/commands/**` | Innermost, beside `contracts/` and `domain/` | Imports nothing from `app/`, `features/`, `shared/ui`, or React. Rule 1 holds trivially: nothing points outward. It never imports a command definition — commands are registered from outside, per `architecture.md` §"commands/" |
| `src/app/providers/**`, `src/app/layout/**` | `ui/` | Import inward from `shared/commands` and `shared/ui`. They are the only React-aware code in this change |
| `src/shared/ui/**` | `ui/` primitives | Untouched. Rule 4 ("`shared/ui` no conoce features") survives because the containers, not the primitives, do the mapping |
| `features/*/application/commands.ts` | `application/` (Phases 5-9) | Command definitions land here later and register into the registry at boot. Rule 2 is unaffected: they reach the registry through `@/shared/commands`'s barrel |

No combat rule logic anywhere. `deriveScopes` reads server-reported state (`battleId`,
`reactionWindowOpen`); it decides which commands exist, never what they compute.

## Testing Strategy

Everything below the containers is testable without mounting a component, matching
`config.yaml`'s `commands: Vitest pure` layer.

| Layer | Seam | What to prove |
|---|---|---|
| Pure | `deriveScopes(state)` | Reaction window yields `['battle', 'reaction-window']`; anonymous never sees lobby commands |
| Pure | `createCommandRegistry` | Duplicate alias in intersecting scopes throws; same alias in disjoint scopes registers; `visible` includes blocked commands |
| Pure | `resolve` | Alias and numeral reach the same command with the same args; `typedAtGeneration` mismatch yields `stale-number`; unknown input returns suggestions; `''` returns `empty` |
| Pure | `begin` / `advance` | The convergence assertion above; required-arg skip is `invalid`; empty value re-prompts and does not cancel; `cancel` clears |
| Pure | `numberCommands` | Keys are `'1'..'n'`, `lookup` agrees with `items`, `generation` differs across rebuilds |
| UI | `CommandListContainer` + `CommandPromptContainer` | Click and typed alias each run the command once; blocked command renders dimmed with its reason; `Esc` cancels a pending command |
| UI | `src/shared/ui/*.test.tsx` | Pass **unmodified** — the acceptance signal that props were not touched |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. `deriveScopes` reads client state and does not participate in React
Router navigation.

## Migration / Rollout

No migration. No persisted state, no server contract. Rollback is deleting `src/shared/commands/` and
the three `src/app/` files, then reverting `DesignScreen` and the `architecture.md` block.

## Review budget

**This design does not fit in one 400-line PR.** Estimated authored source is roughly 530 lines plus
tests. Chained PRs are required; the tasks phase should slice as:

| Slice | Contents | Estimate |
|---|---|---|
| 1 | `types.ts`, `availability.ts`, `scope.ts`, `registry.ts`, barrel stub, their tests, the `architecture.md` edit | ~380 |
| 2 | `numbered.ts`, `suggest.ts`, `resolve.ts` + tests | ~390 |
| 3 | `pending.ts`, the three `src/app/` files, `DesignScreen` rewiring + tests | ~400 |

Each slice is independently green: slice 1 ships a usable registry, slice 2 ships typed resolution,
slice 3 ships the guided flow and the wiring.

## Open Questions

- [ ] None blocking.

## Known constraint — deferred to Phase 9

`AppShell` exposes a single prompt-portal slot (`PromptSlotContext`), so an action prompt and a
reaction prompt cannot coexist. Phase 4 designs nothing for it: `CommandPromptContainer` mounts one
`Prompt` and scope decides its content. Recorded here so Phase 9 owns the fix deliberately.
