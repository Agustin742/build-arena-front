# Tasks: Command Registry (Phase 4)

Three chained PRs, all based on `main`. Strict TDD: for every unit of behavior the failing test
commit lands before the implementation commit. Scopes and phrasing follow
`docs/design/git-workflow.md` and the Conventional Commit sketch in
`docs/design/implementation-plan.md` §Fase 4.

## HARD GIT RULE — read before opening any PR in this stack

**Every PR in this stack is opened with base `main`, including slice 2 and slice 3.** This is not
the ordinary "retarget after merge" stacking pattern.

- Branch slice 2 off slice 1's branch **locally**, and slice 3 off slice 2's branch **locally**, so
  each branch's diff only shows its own new work.
- On GitHub, every PR's **base** is `main` — never a sibling feature branch. PR compare links take
  the form `compare/main...<branch>?expand=1`.
- Pointing a PR's base at the branch below merges that work **inside** the lower branch instead of
  into `main`, and it disappears with no visible error. This already cost this project real work:
  PRs #4 and #5 merged inside `chore/testing-setup` and `main` shipped without `AppShell` or
  `vercel.json`.
- Integrate bottom-up, one PR at a time, **with a merge commit, never squash** — this is the
  documented "pilas de pull requests" exception in `docs/design/git-workflow.md`, not the default
  squash flow.
- **Never rebase a branch that is already published** (pushed and opened as a PR).
- Verify the deployment is green after each integration before opening/continuing the next PR in
  the stack.
- Apply/verify does not merge PRs. The user opens and merges every PR in this stack himself.

## Branch plan

| Slice | Branch | Local base | PR base (GitHub) | Estimate |
|---|---|---|---|---|
| 1 | `feat/add-command-registry` (fixed, already checked out) | `main` | `main` | ~380 lines |
| 2 | `feat/commands-text-resolver` | `feat/add-command-registry` | `main` | ~390 lines |
| 3 | `feat/commands-runtime-wiring` | `feat/commands-text-resolver` | `main` | ~400 lines |

Naming follows the project's existing pattern (`feat/console-theme`, `feat/ui-panel-statbar`,
`feat/ui-command-list-prompt`), scoped to the `commands` folder per
`docs/design/git-workflow.md`'s scope table.

### Chain Overview

```text
main
 └── #NNN feat/add-command-registry        (slice 1 — registry core)
      └── 📍 #NNN feat/commands-text-resolver   (slice 2 — resolver)
           └── #NNN feat/commands-runtime-wiring (slice 3 — wiring)
```

## Requirement / scenario traceability

Every scenario in `specs/command-registry/spec.md` maps to at least one task below.

| Requirement | Scenario | Slice.Task |
|---|---|---|
| Registration and Scope Filtering by Intersection | Visible via one shared scope | 1.4 |
| Registration and Scope Filtering by Intersection | Hidden when no scope matches | 1.4 |
| Duplicate Alias Throws at Registration | Overlapping scope collides | 1.4 |
| Duplicate Alias Throws at Registration | Disjoint scope does not collide | 1.4 |
| Pure Scope Derivation From State | Each state maps to its scopes | 1.3 |
| Availability Makes an Unreasoned Block Unrepresentable | Blocked result carries its reason into the list item | 1.2, 1.4 |
| Alias Resolution and Unknown-Alias Suggestions | Known alias resolves | 2.3 |
| Alias Resolution and Unknown-Alias Suggestions | Typo yields a suggestion | 2.2, 2.3 |
| Numbered Pick Resolution, Staleness, and Invalidation | Numeral matches what is on screen | 2.1, 2.3 |
| Numbered Pick Resolution, Staleness, and Invalidation | Numeral typed after invalidation | 2.1, 2.3 |
| Click and Typed Alias Invoke Identically | Same command, same arguments, either path | 3.1, 3.7 |
| Multi-Argument Completion by Click or by One Typed Line | Two-argument command via click | 3.1, 3.6 |
| Multi-Argument Completion by Click or by One Typed Line | Same command via one typed line | 3.1, 3.6 |
| Optional Arguments Are Prompted With a Skip Exit | Skipping an optional argument | 3.1, 3.6 |
| Cancelling a Pending Command | Esc or explicit cancel drops it | 3.1, 3.6 |
| Cancelling a Pending Command | Empty submit never cancels | 3.1, 3.6 |
| Disabled Commands Are Shown, Never Hidden | Blocked command stays visible and inert | 1.4, 3.5 |

The rough five-commit sketch in `implementation-plan.md` §Fase 4 (`test(commands): cover click and
typed input...`, `feat(commands): add command registry...`, `feat(commands): add text resolver...`,
`feat(commands): add numbered listing context...`, `feat(ui): wire command list and prompt...`)
maps onto this breakdown as: task 3.7 (the click/typed convergence test), tasks 1.2–1.4, tasks
2.1–2.3, task 2.1, and tasks 3.5–3.6 respectively. This breakdown is finer-grained to honor
Strict TDD per file and the 400-line review budget; it does not change the intended scope.

---

## Slice 1 — Registry core

Branch `feat/add-command-registry`. Ships a usable registry: types, availability, scope derivation,
registration with scope-intersection filtering and duplicate-alias rejection, plus the
`architecture.md` correction.

**Status: ✅ Complete — tasks 1.1-1.7 done.** `pnpm test` 25 files / 233 tests passing (baseline was
22 files / 221 tests). `pnpm build` green. Total authored diff: 310 insertions / 4 deletions across
9 files (~314 lines), under the 400-line budget.

### [x] 1.1 — `types.ts`
Create `src/shared/commands/types.ts` with every public type from design.md's Interfaces section
(`CommandScope`, `CommandOption`, `CommandArg`, `ParsedArgs`, `CommandAvailability`, `CommandResult`,
`CommandState`, `CommandContext`, `Command`, `VisibleCommand`). No imports outside the folder.
Type-only; no runtime behavior, so no test commit — correctness is enforced by `tsc` and by every
downstream test that imports these types.

- Commit: `feat(commands): add command types`

> **Deviation (documented, not silent)**: `NumberedItem` and `NumberedList` — design.md places them
> under `numbered.ts` (slice 2) — were defined in `types.ts` instead, because `CommandContext.picks:
> NumberedList` must typecheck standalone for slice 1's own green check (task 1.7), and `types.ts`
> is constrained to "no imports outside the folder" with no `numbered.ts` yet to import from. Slice 2's
> `numbered.ts` (task 2.1) should `import { type NumberedItem, type NumberedList } from './types'`
> and add only `numberCommands`, `numberOptions`, `EMPTY_NUMBERED_LIST` — not redefine the interfaces.
> The barrel already re-exports both via `export * from './types'`.

### [x] 1.2 — `availability.ts`
Requirement: Availability Makes an Unreasoned Block Unrepresentable.

- 1.2.1 Test: `available()` returns `{ enabled: true }`; `blocked(reason)` returns
  `{ enabled: false, reason }`.
  Commit: `test(commands): cover availability helpers`
- 1.2.2 Implement `available` / `blocked` per design.md.
  Commit: `feat(commands): add availability helpers`

### [x] 1.3 — `scope.ts`
Requirement: Pure Scope Derivation From State.

- 1.3.1 Test: the four-row `deriveScopes(state)` table from the spec (no session → `anonymous`;
  session, no battle → `lobby`; battle, no reaction → `battle`; battle + open reaction →
  `['battle', 'reaction-window']`).
  Commit: `test(commands): cover deriveScopes state table`
- 1.3.2 Implement `deriveScopes` per design.md (pure, total, no route lookup).
  Commit: `feat(commands): add deriveScopes state derivation`

### [x] 1.4 — `registry.ts`
Requirements: Registration and Scope Filtering by Intersection; Duplicate Alias Throws at
Registration; (integration half of) Availability — blocked items still appear in `visible()`.

- 1.4.1 Test: registering with overlapping scope + colliding alias throws `DuplicateAliasError`;
  same alias under disjoint scopes registers cleanly; `visible(ctx)` includes a command only when
  `activeScopes` intersects `command.scope`; `visible(ctx)` includes a blocked command paired with
  its `availability(ctx)` result (not omitted).
  Commit: `test(commands): cover registry scope filtering and duplicate alias`
- 1.4.2 Implement `createCommandRegistry` and `DuplicateAliasError` per design.md.
  Commit: `feat(commands): add command registry with scope filtering`

> Note: added one extra triangulation test for an `id` collision (not just alias) under overlapping
> scope, matching design.md's registry.ts prose ("an incoming alias or id collides"). Implementation
> treats `[command.id, ...command.aliases]` as the identifier set collision-checked per scope.

### [x] 1.5 — Barrel (slice-1 surface)
Create `src/shared/commands/index.ts` re-exporting the types from 1.1, `available`/`blocked` from
1.2, `deriveScopes` from 1.3, `createCommandRegistry`/`DuplicateAliasError` from 1.4. Mirrors
`src/shared/contracts/index.ts`'s barrel shape. Extended in slices 2 and 3.

- Commit: `feat(commands): add command registry barrel`

### [x] 1.6 — `architecture.md` correction
Exact replacement text from design.md's "Documentation deviations" section — apply verbatim, do not
improvise:

- Line 214: `scope: CommandScope` → `scope: CommandScope[]`
- Line 215: `isEnabled: (ctx: CommandContext) => boolean` → `availability: (ctx: CommandContext) =>
  CommandAvailability`
- Line 226 row becomes: `| \`availability\` | Se muestra deshabilitado, no se esconde | sin builds
  no se puede desafiar |`
- Paragraph opening at line 238 becomes: `` `availability` devolviendo `{ enabled: false }` **muestra
  la opción atenuada con su motivo, no la esconde.** ``
- Line 225's table cell keeps its existing text unchanged (already plural).

Commit: `docs(design): correct command scope and availability signatures`

### [x] 1.7 — Slice 1 green check
Run `pnpm test` and `pnpm build`; both must pass with only slice 1's files. No task, no commit —
a verification gate before opening the PR.

Verified: `pnpm test` → 25 test files / 233 tests passing (baseline before this slice: 22 files /
221 tests; +3 files, +12 tests, all in `src/shared/commands/`). `pnpm build` → `tsc -b && vite build`
succeeded, `dist/` emitted. `src/shared/ui/**` untouched, not part of this diff.

---

## Slice 2 — Text resolver

Branch `feat/commands-text-resolver`, branched locally from `feat/add-command-registry`. Ships typed
resolution: numbered picks, alias suggestions, and the `resolve()` entry point.

**Status: ✅ Complete — tasks 2.1-2.5 done.** `pnpm test` 28 files / 249 tests passing (baseline was
25 files / 233 tests). `pnpm build` green. Total authored diff across 6 new/modified files
(`numbered.ts`, `numbered.test.ts`, `suggest.ts`, `suggest.test.ts`, `resolve.ts`, `resolve.test.ts`,
`index.ts`), under the 400-line budget.

### [x] 2.1 — `numbered.ts`
Requirement: Numbered Pick Resolution, Staleness, and Invalidation (rendering half — key allocation,
lookup, generation).

- 2.1.1 Test: `numberCommands` assigns `'1'..'n'` in registry order including blocked commands;
  `numberOptions` appends `{ key: 's', id: SKIP_ID }` only when `controls.skip`, and always
  `{ key: 'esc', id: CANCEL_ID }`; `lookup(key)` agrees with `items`; `generation` differs across
  rebuilds of the same input.
  Commit: `test(commands): cover numbered list allocation and generation`
- 2.1.2 Implement `numberCommands`, `numberOptions`, `EMPTY_NUMBERED_LIST` per design.md. Key
  allocator stays private (not re-exported).
  Commit: `feat(commands): add numbered listing for pick arguments`

Note: `SKIP_ID`/`CANCEL_ID` themselves are defined in `pending.ts` (slice 3, task 3.1); `numbered.ts`
only references the ids as opaque strings agreed by contract with design.md.

### [x] 2.2 — `suggest.ts`
Requirement: Alias Resolution and Unknown-Alias Suggestions (typo scenario).

- 2.2.1 Test: a near-miss alias (e.g. `atack` vs. `attack`) yields `attack` as a candidate.
  Commit: `test(commands): cover nearest-alias suggestion candidates`
- 2.2.2 Implement the private nearest-alias candidate function. Never re-exported from the barrel.
  Commit: `feat(commands): add alias suggestion candidates`

### [x] 2.3 — `resolve.ts`
Requirement: Alias Resolution and Unknown-Alias Suggestions (known-alias scenario); Numbered Pick
Resolution, Staleness, and Invalidation (`stale-number` outcome).

- 2.3.1 Test, covering the four interpretation branches in design.md's order-of-interpretation list:
  `''` → `empty`; a pure numeral with `typedAtGeneration !== ctx.picks.generation` → `stale-number`;
  a numeral with a `lookup` miss → `stale-number`; a matching numeral → `begin` with the looked-up
  command; a known alias → `begin` with positionally parsed `seed`; a blocked alias → `blocked` with
  its reason; an unmatched alias → `unknown` with `suggest()`'s candidates.
  Commit: `test(commands): cover alias resolution, stale numerals, and suggestions`
- 2.3.2 Implement `resolve` per design.md, consuming `numbered.ts`'s `NumberedList` and
  `suggest.ts`'s candidates.
  Commit: `feat(commands): add text resolver with alias suggestions`

### [x] 2.4 — Barrel (extend)
Add `resolve`, `numberCommands`, `numberOptions`, `EMPTY_NUMBERED_LIST` to `index.ts`. `suggest` and
`numbered.ts`'s key allocator stay private.

- Commit: `feat(commands): export resolver and numbered list from barrel`

### [x] 2.5 — Slice 2 green check
Run `pnpm test` and `pnpm build` on the branch (slice 1 + slice 2 files); both must pass.

Verified: `pnpm test` → 28 test files / 249 tests passing (baseline before this slice: 25 files /
233 tests; +3 files, +16 tests, all in `src/shared/commands/`). `pnpm build` → `tsc -b && vite build`
succeeded, `dist/` emitted. `src/shared/ui/**` untouched, not part of this diff.

---

## Slice 3 — Guided flow and wiring

Branch `feat/commands-runtime-wiring`, branched locally from `feat/commands-text-resolver`. Ships
the pending-command state machine and the React wiring; `DesignScreen` becomes the first consumer.

**Status: IN PROGRESS — tasks 3.1-3.4 done (this apply batch); 3.5-3.9 remain for the next batch.**
Stopped at a clean cut point after task 3.4 because the running authored diff for `src/` against
`origin/main` reached 555 lines (241 for the pure module `pending.ts` + barrel, 317 for the React
wiring's `command-runtime.ts` + `CommandRuntimeProvider.tsx` + its test), already over the 400-line
PR review budget before `CommandListContainer`, `CommandPromptContainer`, or the `DesignScreen`
rewiring were even started. See apply-progress.md's "Review Budget — Actual vs. Estimate" note for
slice 3 for the full breakdown and the recommended further split.

### [x] 3.1 — `pending.ts`
Requirements: Click and Typed Alias Invoke Identically (pure convergence proof); Multi-Argument
Completion by Click or by One Typed Line; Optional Arguments Are Prompted With a Skip Exit;
Cancelling a Pending Command.

- 3.1.1 Test, covering design.md's state-machine transition table and its convergence obligation:
  `begin(cmd, seed)` fills the first argument absent from `seed` as `awaiting`, or returns `filled`
  immediately when none is missing; `advance({ kind: 'value', raw: '' })` returns `invalid` and does
  **not** clear the pending command (empty submit never cancels); `advance({ kind: 'skip' })` on a
  required arg returns `invalid`, on an optional arg advances without writing a key; `advance({ kind:
  'cancel' })` returns `cancelled`; and the convergence assertion itself —
  `begin(cmd, { rival: 'grace', build: 'aggro' })` produces the identical `filled` value as
  `advance(advance(begin(cmd), pickRival), pickBuild)`.
  Commit: `test(commands): cover pending command convergence, skip, and cancel`
- 3.1.2 Implement `begin`, `advance`, `SKIP_ID`, `CANCEL_ID` per design.md.
  Commit: `feat(commands): add guided pending command flow`

### [x] 3.2 — Barrel (final surface)
Add `begin`, `advance`, `SKIP_ID`, `CANCEL_ID` to `index.ts`. This completes the barrel described in
design.md's "public barrel" section.

- Commit: `feat(commands): export pending command flow from barrel`

### [x] 3.3 — `src/app/providers/command-runtime.ts`
Create the context object and `useCommandRuntime()` hook, mirroring the shape of the existing
`prompt-slot.ts` provider file. No test commit — a thin context definition with no branching logic;
covered indirectly by 3.4's and 3.5/3.6's tests.

- Commit: `feat(providers): add command runtime context`

### [x] 3.4 — `src/app/providers/CommandRuntimeProvider.tsx`
Per design.md's "State shape and ownership" table: registry via `useRef` (created once), `activeScopes`
via `useMemo(deriveScopes)`, the `NumberedList` via `useMemo` over `visible(ctx)` (new `generation` on
scope change or command completion), `PendingCommand | null` via `useState`.

- 3.4.1 Test (React Testing Library, render-hook or a minimal consumer component): scope change
  produces a new `NumberedList` with an incremented `generation`; command completion clears the
  pending command and also bumps `generation`; the registry instance is stable across re-renders.
  Commit: `test(providers): cover command runtime provider state transitions`
- 3.4.2 Implement `CommandRuntimeProvider`.
  Commit: `feat(providers): add command runtime provider`

> **Deviation (documented, not silent)**: design.md's prose says "registry via `useRef`", but the
> project's installed `eslint-plugin-react-hooks` enforces the React Compiler-era `react-hooks/refs`
> and `react-hooks/purity` rules, which reject reading or writing a `ref.current` anywhere in a
> render/`useMemo` body (only event handlers/effects may touch refs) and reject impure calls like
> `performance.now()` inside `useMemo`. `registry` is created once via a lazy `useState(() =>
> createCommandRegistry(commands))` initializer instead — same one-instance-per-mount guarantee as
> `useRef`, verified by task 3.4.1's "registry instance stable across re-renders" test, but expressed
> as state so the linter accepts reading it during render. `generation` is a `useState<number>`
> counter bumped explicitly: inside `runCommand` (event-handler context, always safe) for command
> completion, and via a guarded synchronous state update during render — `if (priorScopes !==
> activeScopes) { setPriorScopes(activeScopes); setGeneration(g => g + 1) }` — for scope changes, which
> is React's own documented "adjust state during render" pattern and not flagged as impure. The
> previous-picks value fed into `options(ctx)`/`availability(ctx)` computations uses the stable
> `EMPTY_NUMBERED_LIST` constant instead of a ref-tracked previous list, since none of this slice's
> fixture commands read `ctx.picks` from inside `availability` or `options` — flagged here in case a
> later phase's command definitions ever need that value to be real.

### 3.5 — `src/app/layout/CommandListContainer.tsx`
Requirements: Registration and Scope Filtering by Intersection (rendered output); Disabled Commands
Are Shown, Never Hidden.

- 3.5.1 Test: renders one `CommandItem` per `NumberedList` item with the exact adapter mapping from
  design.md (`id`, `label`, `key`, optional `hint`, optional `lockedReason`); a blocked item renders
  dimmed with its `lockedReason` and a click on it does not call `command.run`; a click on an enabled
  item invokes the single `command.run(...)` call site.
  Commit: `test(ui): cover command list container rendering and blocked click`
- 3.5.2 Implement `CommandListContainer`.
  Commit: `feat(ui): wire command list to the registry`

### 3.6 — `src/app/layout/CommandPromptContainer.tsx`
Requirements: Alias Resolution and Unknown-Alias Suggestions (unknown-alias path through `Prompt`);
Numbered Pick Resolution, Staleness, and Invalidation (typed numeral path); Multi-Argument Completion
by Click or by One Typed Line (positional typed line); Optional Arguments Are Prompted With a Skip
Exit; Cancelling a Pending Command (`Esc` listener — decision D, a `document` keydown listener live
only while a command is pending, not a new `Prompt` prop).

- 3.6.1 Test: typing a full line (`challenge alice starter`) resolves and runs with both arguments
  positionally parsed; typing a bare alias with missing arguments opens the guided prompt sequence
  in declaration order; a blocked alias feeds `Prompt`'s `error` with the block reason; `Esc` while a
  command is pending drops it without calling `run`; an explicit `cancel` entry does the same;
  `typedAtGeneration` is snapshotted when the field goes from empty to non-empty and cleared after
  every submit.
  Commit: `test(ui): cover command prompt resolution, guided flow, and Esc cancel`
- 3.6.2 Implement `CommandPromptContainer` (`PromptPortal > Prompt`, the `document` `Esc` listener).
  Commit: `feat(ui): wire command prompt to the resolver`

### 3.7 — `DesignScreen` rewiring
Requirement: Click and Typed Alias Invoke Identically (the acceptance-level integration test named
in Phase 4's "Terminado cuando").

- 3.7.1 Test (update `DesignScreen.test.tsx`): with a fixture multi-argument command registered,
  completing it once by click-and-prompt and once by typed alias with a positional argument produces
  an identical `commandId` and identical argument values.
  Commit: `test(ui): cover click and typed input resolving to same command`
- 3.7.2 Replace `DesignScreen`'s local `useState` with `CommandRuntimeProvider`,
  `CommandListContainer`, `CommandPromptContainer`, and fixture commands.
  Commit: `feat(ui): rewire design screen to the command runtime`

### 3.8 — Regression check: `src/shared/ui/**` untouched
No code change. Run the existing `src/shared/ui/*.test.tsx` suite and confirm every test still
passes unmodified — design.md's stated acceptance signal that `CommandList`/`Prompt` props were
never touched. Record the exact `pnpm test` output for these files as evidence; if any of them
needed a change, that is a design violation to flag, not a fix to apply silently.

### 3.9 — Slice 3 green check
Run `pnpm test` and `pnpm build` on the full three-slice branch; both must pass. Confirm Phase 4's
"Terminado cuando" from `implementation-plan.md`: a test proves click and alias invoke the same
command with the same arguments (3.7.1), and a disabled command shows its reason instead of hiding
(3.5.1, 1.4.1).

---

## Review Workload Forecast

| Slice | Estimated changed lines (design.md) | Chained PR? | Decision needed before apply? |
|---|---|---|---|
| 1 — Registry core | ~380 | Yes | No |
| 2 — Text resolver | ~390 | Yes | No |
| 3 — Guided flow and wiring | ~400 | Yes | No |

Total estimated authored source is ~530 lines plus tests across the three files' worth of modules;
none of the three slices fits together in one 400-line PR, so chained PRs are required — this
matches `chained-pr` and `work-unit-commits`' `auto-chain` delivery strategy for this session. Each
slice individually sits at or under the 400-line budget, so **no per-slice `size:exception` is
needed** and no further slicing decision is required before `sdd-apply` runs. If actual authored
lines exceed a slice's estimate during apply (e.g. slice 3's provider/container tests run long),
split task 3.6 (`CommandPromptContainer`) into its own follow-on PR rather than exceeding 400 lines
in slice 3 — flag that split as a risk if it happens, do not silently absorb it.

## Delivery — chained PR checklist (per skill `chained-pr`)

Every PR in the stack must state, per `cognitive-doc-design`'s review-empathy guidance:

- What to review first (the module under `1.x`/`2.x`/`3.x` that carries the new behavior).
- What is intentionally out of scope (real commands land in Phases 5-9; this change ships fixtures
  only).
- The Chain Context table from `chained-pr`'s reference (`chaining-details.md`), with the current PR
  marked `📍` in the Chain Overview.
- Links to the previous and next PR in the stack.

Out of scope for `sdd-apply`/`sdd-verify`: opening PRs on GitHub, merging PRs, and retargeting bases
after a merge. Those are the user's own steps, per this session's instructions.
