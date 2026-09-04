# Apply Progress: Command Registry (Phase 4)

## Slice 1 — Registry core: COMPLETE (tasks 1.1-1.7)

Branch `feat/add-command-registry`, based on `main`. All 7 slice-1 tasks done, in order, following
strict TDD (failing test commit before implementation commit for every unit of behavior).

### Completed Tasks

- [x] 1.1 `src/shared/commands/types.ts` — every public type from design.md's Interfaces section
- [x] 1.2 `src/shared/commands/availability.ts` — `available()` / `blocked(reason)`
- [x] 1.3 `src/shared/commands/scope.ts` — `deriveScopes(state)`
- [x] 1.4 `src/shared/commands/registry.ts` — `createCommandRegistry`, `DuplicateAliasError`
- [x] 1.5 `src/shared/commands/index.ts` — slice-1 barrel stub
- [x] 1.6 `docs/design/architecture.md` — lines 214-215, 226, 238 corrected verbatim
- [x] 1.7 Slice 1 green check — `pnpm test` and `pnpm build` both pass

### Files Changed

| File | Action | What Was Done |
|---|---|---|
| `src/shared/commands/types.ts` | Created | `CommandScope`, `CommandOption`, `CommandArg`, `ParsedArgs`, `CommandAvailability`, `CommandResult`, `CommandState`, `NumberedItem`, `NumberedList`, `CommandContext`, `Command`, `VisibleCommand` |
| `src/shared/commands/availability.ts` | Created | `available()` returns `{ enabled: true }`; `blocked(reason)` returns `{ enabled: false, reason }` |
| `src/shared/commands/availability.test.ts` | Created | 3 tests: enabled shape, blocked with reason, second reason (triangulation) |
| `src/shared/commands/scope.ts` | Created | `deriveScopes(state)`, pure and total over the 4-row state table |
| `src/shared/commands/scope.test.ts` | Created | 4 tests, one per state-table row |
| `src/shared/commands/registry.ts` | Created | `createCommandRegistry`, `DuplicateAliasError`; collision check treats `[id, ...aliases]` as one identifier set per scope-intersection |
| `src/shared/commands/registry.test.ts` | Created | 5 tests: alias collision throws, disjoint scope allows reuse, id collision throws, scope-filtered `visible()`, blocked command stays in `visible()` with its reason |
| `src/shared/commands/index.ts` | Created | Barrel — `export * from` `availability`, `registry`, `scope`, `types` (mirrors `src/shared/contracts/index.ts`) |
| `docs/design/architecture.md` | Modified | Lines 214-215 (`scope: CommandScope[]`, `availability: (ctx) => CommandAvailability`), line 226 table row, line 238 paragraph — exact text from design.md's Documentation deviations section |
| `openspec/changes/add-command-registry/tasks.md` | Modified | Marked tasks 1.1-1.7 `[x]`, recorded the `NumberedItem`/`NumberedList` placement deviation and the extra id-collision test for slice 2's implementer |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | N/A (type-only) | Type | N/A (new) | N/A — task explicitly skips test commit; correctness enforced by `tsc` + every downstream test | N/A | Triangulation skipped: purely structural type file, zero branching, per strict-tdd.md's structural exception | ➖ None needed |
| 1.2 | `availability.test.ts` | Unit | N/A (new) | ✅ Written (import to non-existent `./availability` failed) | ✅ Passed (3/3) | ✅ 2 cases (`available` shape, two distinct `blocked` reasons) | ➖ None needed |
| 1.3 | `scope.test.ts` | Unit | N/A (new) | ✅ Written (import to non-existent `./scope` failed) | ✅ Passed (4/4) | ✅ 4 cases (all 4 state-table rows) | ➖ None needed |
| 1.4 | `registry.test.ts` | Unit | N/A (new) | ✅ Written (import to non-existent `./registry` failed) | ✅ Passed (5/5) | ✅ 5 cases (alias collision, disjoint reuse, id collision, scope filtering, blocked-stays-visible) | ✅ Extracted `identifiersOf` / `intersectingScope` / `scopesIntersect` helpers; re-ran full commands suite green after each step |

### Test Summary

- **Total tests written**: 12 (3 + 4 + 5)
- **Total tests passing**: 12/12 in `src/shared/commands/`; 233/233 project-wide
- **Layers used**: Unit (12), Integration (0), E2E (0)
- **Approval tests** (refactoring): None — no refactoring tasks in this slice
- **Pure functions created**: 5 (`available`, `blocked`, `deriveScopes`, `identifiersOf`, `intersectingScope`/`scopesIntersect`) plus one factory (`createCommandRegistry`) whose returned methods are all synchronous and side-effect-free except the intentional in-memory `registered` array

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm vitest run src/shared/commands` → 3 test files, 12/12 passing |
| Runtime harness command/scenario and exact result | N/A — `src/shared/commands/` is React-free pure logic (design.md's stated constraint); no runtime/UI boundary exists in slice 1. Full-suite `pnpm test` (25 files, 233/233) and `pnpm build` (`tsc -b && vite build`, succeeded, `dist/` emitted) both re-run as the closest integration proof and both green |
| Rollback boundary | Revert commits `977758a`..`56a5f2d` (11 commits, this slice only) or delete `src/shared/commands/` and revert the 4-line `docs/design/architecture.md` block and the `tasks.md` progress edit — no other file touched |

### Deviations from Design

1. **`NumberedItem` / `NumberedList` placement.** design.md's Interfaces section lists these under `numbered.ts` (slice 2), but `CommandContext.picks: NumberedList` (design.md, `types.ts` section) must typecheck standalone for slice 1's own green check (task 1.7), and `types.ts` is constrained to "no imports outside the folder" with no `numbered.ts` yet to import from in slice 1. Both interfaces were defined in `types.ts` instead. Recorded prominently in `tasks.md` so slice 2's `numbered.ts` (task 2.1) imports `{ type NumberedItem, type NumberedList }` from `./types` and adds only `numberCommands`, `numberOptions`, `EMPTY_NUMBERED_LIST` — it must NOT redefine the interfaces, which would collide with `types.ts`'s exports through the `export *` barrel.
2. **`registry.ts` id-collision test.** design.md's registry.ts prose says register "throws `DuplicateAliasError` when an incoming alias or `id` collides with a registered one" but task 1.4.1's scenario list only enumerates alias-collision cases explicitly. Implemented and tested the `id`-collision path too (one extra triangulation test), since the design's own prose requires it and the `DuplicateAliasError` constructor signature (`existingId`, `incomingId`) is shaped for either identifier type. No spec requirement was skipped; this is an addition matching design intent, not a scope cut.

Neither deviation touches `src/shared/ui/**`, changes public signatures from design.md, or adds combat rule logic.

### Issues Found

None.

### Remaining Tasks (as of end of Slice 1 — see the Slice 2 section below for what happened next)

Slice 2 (tasks 2.1-2.5) is recorded as its own section further down this document, now complete.
Slice 3 (tasks 3.1-3.9) remains not started — see "Remaining Tasks" under the Slice 2 section for
the current list.

### Workload / PR Boundary

- Mode: chained/stacked PR slice (`auto-chain`, `stacked-to-main` per tasks.md's Branch plan)
- Current work unit: Slice 1 — Registry core
- Boundary: starts from `main` (post-PR #22 SDD artifacts merge), ends with a self-contained,
  independently green `src/shared/commands/` registry core plus the `architecture.md` correction.
  Slice 2 branches locally from this branch's tip (commit `56a5f2d`) per the Branch plan; on GitHub
  both PRs base on `main`.
- Estimated review budget impact: ~314 changed lines (310 insertions + 4 deletions across 9 files),
  under the 400-line budget (design.md estimated ~380). No `size:exception` needed.

### Status

7/7 slice-1 tasks complete. Merged into `main` via PR #23.

## Slice 2 — Text resolver: COMPLETE (tasks 2.1-2.5)

Branch `feat/commands-text-resolver`, branched locally from `feat/add-command-registry` (post-merge,
now tracking `main` via PR #23). All 5 slice-2 tasks done, in order, following strict TDD (failing
test commit before implementation commit for every unit of behavior).

### Completed Tasks

- [x] 2.1 `src/shared/commands/numbered.ts` — `numberCommands`, `numberOptions`, `EMPTY_NUMBERED_LIST`
- [x] 2.2 `src/shared/commands/suggest.ts` — private nearest-alias candidates (Levenshtein distance)
- [x] 2.3 `src/shared/commands/resolve.ts` — `resolve()` text/numeral entry point
- [x] 2.4 Barrel extended with `resolve`, `numberCommands`, `numberOptions`, `EMPTY_NUMBERED_LIST`
- [x] 2.5 Slice 2 green check — `pnpm test` and `pnpm build` both pass

### Files Changed (Slice 2)

| File | Action | What Was Done |
|---|---|---|
| `src/shared/commands/numbered.ts` | Created | `numberCommands` (keys `'1'..'n'` in registry order incl. blocked), `numberOptions` (numbers options then appends skip/cancel control entries), `EMPTY_NUMBERED_LIST`. Imports `NumberedItem`/`NumberedList` from `./types` per slice 1's documented deviation — does not redefine them |
| `src/shared/commands/numbered.test.ts` | Created | 6 tests: key allocation incl. blocked, `lookup` agreement, generation differs across rebuilds, option numbering before control entries, skip entry conditional, cancel entry always present |
| `src/shared/commands/suggest.ts` | Created | Private `suggest(input, aliases)` — Levenshtein distance, filters `<= 2`, sorts ascending, caps at 3 candidates. Not re-exported from the barrel |
| `src/shared/commands/suggest.test.ts` | Created | 3 tests: near-miss becomes a candidate, nothing close returns `[]`, closer candidate ranks first |
| `src/shared/commands/resolve.ts` | Created | `resolve(input, registry, ctx, options?)` — order of interpretation: `''` → `empty`; pure numeral checked against `typedAtGeneration !== ctx.picks.generation` first (stale), then `ctx.picks.lookup` (miss also stale); longest matching alias → `blocked` or `begin` with positionally parsed `seed`; otherwise `unknown` with `suggest()`'s candidates |
| `src/shared/commands/resolve.test.ts` | Created | 7 tests: blank input, stale via generation mismatch, stale via lookup miss, matching numeral resolves, known alias with positional args, blocked alias carries reason, unmatched alias returns suggestions |
| `src/shared/commands/index.ts` | Modified | Added `export * from './numbered'` and `export * from './resolve'`. `suggest.ts` and `numbered.ts`'s key allocator stay private, never re-exported |
| `openspec/changes/add-command-registry/tasks.md` | Modified | Marked tasks 2.1-2.5 `[x]`, recorded slice 2 green-check evidence |

### TDD Cycle Evidence (Slice 2)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `numbered.test.ts` | Unit | ✅ 28/28 (baseline before this file) | ✅ Written (import to non-existent `./numbered` failed) | ✅ Passed (6/6) | ✅ 6 cases (key allocation, blocked inclusion, lookup agreement, generation difference, option numbering, skip/cancel entries) | ➖ None needed |
| 2.2 | `suggest.test.ts` | Unit | ✅ (numbered.ts green) | ✅ Written (import to non-existent `./suggest` failed) | ✅ Passed (3/3) | ✅ 3 cases (near-miss, no-match, ranking) | ✅ Replaced 2D-array Levenshtein with a `Map`-keyed implementation after `noUncheckedIndexedAccess` lint failures on direct array indexing; re-ran green after the change |
| 2.3 | `resolve.test.ts` | Unit | ✅ (numbered.ts + suggest.ts green) | ✅ Written (import to non-existent `./resolve` failed) | ✅ Passed (7/7) | ✅ 7 cases covering all 4 interpretation branches plus both `stale-number` sub-cases and the `blocked` case | ✅ Narrowed a test fixture's `availability` callback type from a duplicated `ReturnType<...>` union to `CommandAvailability` after a `no-duplicate-type-constituents` lint failure |

### Test Summary (Slice 2)

- **Total tests written**: 16 (6 + 3 + 7)
- **Total tests passing**: 28/28 in `src/shared/commands/` (12 from slice 1 + 16 from slice 2); 249/249 project-wide
- **Layers used**: Unit (16), Integration (0), E2E (0)
- **Approval tests** (refactoring): None — no refactoring tasks in this slice
- **Pure functions created**: `numberCommands`, `numberOptions`, `suggest` (private), `resolve`, plus private helpers `buildLookup`, `levenshteinDistance`, `parsePositional`, `findAliasMatch`, `allAliases`

### Work Unit Evidence (Slice 2)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm vitest run src/shared/commands` → 6 test files, 28/28 passing |
| Runtime harness command/scenario and exact result | N/A — `src/shared/commands/` is React-free pure logic (design.md's stated constraint); no runtime/UI boundary exists in slice 2. Full-suite `pnpm test` (28 files, 249/249) and `pnpm build` (`tsc -b && vite build`, succeeded, `dist/` emitted) both re-run as the closest integration proof and both green |
| Rollback boundary | Revert commits `7d6deb1`..`b4636d4` (this slice only, 8 commits) or delete `numbered.ts`, `suggest.ts`, `resolve.ts` and their tests, and revert `index.ts`'s two added export lines plus the `tasks.md` progress edit — no other file touched |

### Deviations from Design

None — `numbered.ts` imports `NumberedItem`/`NumberedList` from `./types` per slice 1's documented
deviation instead of redefining them, exactly as instructed. `resolve.ts`'s alias matching only
checks `command.aliases` (not `command.id`), matching the spec's and design's exact wording
("Longest matching alias") and task 2.3.1's scenario list, which name only alias cases (unlike
`registry.ts`'s duplicate-detection scope in slice 1, which explicitly covers `id` too).

### Issues Found

1. `noUncheckedIndexedAccess` (enabled in `tsconfig.app.json`) rejects direct 2D-array indexing
   (`matrix[row][col]`) as `number | undefined` under `@typescript-eslint/restrict-plus-operands`.
   Rewrote `suggest.ts`'s Levenshtein distance with a `Map<string, number>` keyed by `"row,col"`
   instead of a nested array, avoiding the indexing ambiguity entirely.
2. `@typescript-eslint/no-duplicate-type-constituents` rejected a test fixture typed as
   `ReturnType<typeof available> | ReturnType<typeof blocked>` because both resolve to the same
   `CommandAvailability` union. Fixed by importing and using `CommandAvailability` directly.

Neither issue touches production behavior — both are type-level fixes caught by lint/typecheck
before the GREEN commit landed.

### Review Budget — Actual vs. Estimate (Risk)

design.md's Review budget section estimated slice 2 at ~390 authored lines. The actual authored
diff for `src/shared/commands/` in this slice (`numbered.ts` + `.test.ts`, `suggest.ts` + `.test.ts`,
`resolve.ts` + `.test.ts`, `index.ts`'s two added lines) is **447 insertions, 0 deletions, across 7
files** — over the 400-line PR review budget by 47 lines. All work is one coherent, independently
green deliverable (typed resolution: numbered picks, alias suggestions, `resolve()`), and no task
was implemented partially to hit a line count. Flagging this explicitly rather than silently
absorbing it, per this session's instructions: **the user/orchestrator should decide before opening
the PR** whether to accept `size:exception` for this slice (single logical unit, all tests green,
57 lines over the design estimate but only 47 over the hard 400-line PR budget) or split it further
(e.g., `resolve.ts` + its test, at 240 of the 447 lines, is the largest single unit and the most
likely candidate for its own follow-on PR if the maintainer wants to stay under 400).

### Remaining Tasks (slice 3 — NOT started, out of scope for this apply batch)

- [ ] 3.1 `pending.ts` — `begin`, `advance`, `SKIP_ID`, `CANCEL_ID`
- [ ] 3.2 Barrel final surface
- [ ] 3.3 `src/app/providers/command-runtime.ts`
- [ ] 3.4 `src/app/providers/CommandRuntimeProvider.tsx`
- [ ] 3.5 `src/app/layout/CommandListContainer.tsx`
- [ ] 3.6 `src/app/layout/CommandPromptContainer.tsx`
- [ ] 3.7 `DesignScreen` rewiring
- [ ] 3.8 Regression check: `src/shared/ui/**` untouched
- [ ] 3.9 Slice 3 green check

### Workload / PR Boundary (Slice 2)

- Mode: chained/stacked PR slice (`auto-chain`, `stacked-to-main` per tasks.md's Branch plan)
- Current work unit: Slice 2 — Text resolver
- Boundary: starts from `feat/add-command-registry`'s tip (merged into `main` via PR #23), ends with
  a self-contained, independently green `numbered.ts` + `suggest.ts` + `resolve.ts` plus the barrel
  extension. Slice 3 branches locally from this branch's tip per the Branch plan; on GitHub the PR
  bases on `main`.
- Estimated review budget impact: 447 changed lines (447 insertions, 0 deletions across 7 files) —
  **over the 400-line budget by 47 lines**, see "Review Budget — Actual vs. Estimate" above.

### Status (Cumulative)

12/26 tasks project-wide complete (7 slice-1 + 5 slice-2). Slice 1 merged into `main` (PR #23).
Slice 2 ready for the next apply batch (slice 3) or for `sdd-verify` to check slice 2 in isolation.
**Risk requiring a decision before opening slice 2's PR**: actual diff (447 lines) exceeds the
400-line budget by 47 lines — see the Review Budget section above.

## Slice 3 — Guided flow and wiring: IN PROGRESS (tasks 3.1-3.4 done, 3.5-3.9 remain)

Branch `feat/commands-runtime-wiring`, branched locally from `feat/commands-text-resolver` (merged
into `main` via PR #25). This apply batch completed only the pure module and the provider unit before
hitting the 400-line PR review budget; it stopped at a deliberate, clean cut point rather than
continuing past budget, per this session's explicit instruction.

### Completed Tasks (this batch)

- [x] 3.1 `src/shared/commands/pending.ts` — `begin`, `advance`, `SKIP_ID`, `CANCEL_ID`
- [x] 3.2 Barrel final surface — `pending.ts` exports added to `index.ts`
- [x] 3.3 `src/app/providers/command-runtime.ts` — `CommandRuntimeContext`, `useCommandRuntime()`
- [x] 3.4 `src/app/providers/CommandRuntimeProvider.tsx` — registry/scopes/picks/pending state

### Files Changed (this batch)

| File | Action | What Was Done |
|---|---|---|
| `src/shared/commands/pending.ts` | Created | `begin(command, seed?)` finds the first arg missing from `seed`/`values` (index-scan from a resume point, not a plain "first absent" re-scan, so `skip` correctly moves past an unfilled optional arg instead of re-selecting it); `advance(command, pending, input, _ctx)` handles `value`/`pick` (write the value, continue from the next index), `skip` (invalid on a required arg, otherwise continue without writing a key), and `cancel` (always `cancelled`); `SKIP_ID`/`CANCEL_ID` literals match `numbered.ts`'s private `SKIP_ENTRY_ID`/`CANCEL_ENTRY_ID` strings exactly (`'__skip__'`/`'__cancel__'`), the opaque string contract task 3.1 inherits from task 2.1 |
| `src/shared/commands/pending.test.ts` | Created | 8 tests: `begin` fills first missing arg / returns `filled` immediately with a full seed / returns `filled` immediately for a zero-arg command; `advance` empty-value is `invalid` and keeps `pending` unchanged, skip on a required arg is `invalid`, skip on an optional arg advances without writing a key, `cancel` returns `cancelled`, and the click/typed convergence assertion (`begin` with a full seed equals two chained `advance` calls) |
| `src/shared/commands/index.ts` | Modified | Added `export * from './pending'` |
| `src/app/providers/command-runtime.ts` | Created | `CommandRuntime` interface (`ctx`, `registry`, `pending`, `promptError`, `selectItem`, `submitText`, `cancelPending`), `CommandRuntimeContext`, `useCommandRuntime()` (throws when used outside the provider — mirrors `prompt-slot.ts`'s context+hook shape, but throws instead of returning `null` since every container in this slice requires the runtime) |
| `src/app/providers/CommandRuntimeProvider.tsx` | Created | Registry via a lazy `useState` initializer (once per mount); `activeScopes` via `useMemo(deriveScopes)`; `picks: NumberedList` via `useMemo` over `visible(ctx)` (no pending) or `numberOptions(pendingArg.options?.(ctx) ?? [], ...)` (pending, whether or not the current arg defines `options` — an unspecified-by-design case filled in so a text-kind pending arg still gets a numbered skip/cancel affordance); `pending`/`promptError` via `useState`; a single `applyOutcome`/`runCommand` pair is the one `command.run(...)` call site, reached from both `selectItem` (click path) and `submitText` (typed path) |
| `src/app/providers/CommandRuntimeProvider.test.tsx` | Created | 3 tests using a `Probe` consumer component and a `seen: CommandRuntime[]` capture array: scope change bumps `ctx.picks.generation`; completing a (zero-arg, fixture) command clears `pending` and also bumps `generation`; the registry instance stays `===` across re-renders |

### TDD Cycle Evidence (this batch)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `pending.test.ts` | Unit | ✅ 28/28 (baseline before this file) | ✅ Written (import to non-existent `./pending` failed) | ✅ Passed (8/8) after fixing 2 real logic bugs surfaced by the first GREEN run (see Issues Found) | ✅ 8 cases (begin with missing arg, begin fully seeded, begin zero-arg, empty-value invalid, required-skip invalid, optional-skip advances, cancel, convergence) | ➖ None needed |
| 3.3 | N/A (thin context) | Type/Context | N/A (new) | N/A — task explicitly skips a test commit; a context object and a hook with a single throw branch, covered indirectly by 3.4's test | N/A | Triangulation skipped: purely structural, one throw branch with no meaningful alternate input, per strict-tdd.md's structural exception | ➖ None needed |
| 3.4 | `CommandRuntimeProvider.test.tsx` | Integration (RTL) | ✅ (3.1-3.3 green) | ✅ Written (import to non-existent `./CommandRuntimeProvider` failed) | ✅ Passed (3/3) after fixing the ref/purity lint violations forced by `eslint-plugin-react-hooks`'s newer rules (see Deviations) | ✅ 3 cases (scope-change generation bump, completion clears pending + bumps generation, registry identity stable) | ➖ None needed |

### Test Summary (this batch)

- **Total tests written**: 11 (8 + 0 + 3)
- **Total tests passing**: `src/shared/commands` 36/36 (28 prior + 8 new); project-wide 30 files / 260
  tests (baseline before this batch: 28 files / 249 tests)
- **Layers used**: Unit (8), Integration (3), E2E (0)
- **Approval tests** (refactoring): None — no refactoring tasks in this batch
- **Pure functions created**: `begin`, `advance` (`pending.ts`, both pure); `CommandRuntimeProvider`
  is a stateful React component by necessity (design decision F — registry/scope/pending state must
  live somewhere React-aware), but every pure decision inside it (`applyOutcome`, `handleResolveOutcome`)
  is a plain function operating on already-computed values, not scattered inline logic

### Work Unit Evidence (this batch)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm vitest run src/shared/commands/pending.test.ts` → 8/8 passing; `pnpm vitest run src/app/providers` → 1 file, 3/3 passing |
| Runtime harness command/scenario and exact result | `pnpm vitest run` (full suite) → 30 files / 260 tests passing (up from the 28/249 baseline); `pnpm exec tsc -b` → clean; `npx eslint src/shared/commands/pending.ts src/shared/commands/pending.test.ts src/app/providers` → clean after the ref/purity/import-sort fixes below |
| Rollback boundary | Revert commits `3292a58`..`4f9c360` (6 commits, this batch only — `pending.ts`+test, barrel export, `command-runtime.ts`, `CommandRuntimeProvider.tsx`+test) or delete the 4 new files and revert `index.ts`'s one added export line — no other file touched |

### Deviations from Design (this batch)

1. **`registry` via lazy `useState`, not `useRef`.** design.md's task 3.4 prose says "registry via
   `useRef`", but this project's `eslint-plugin-react-hooks` install enforces the React-Compiler-era
   `react-hooks/refs` rule, which errors on reading `ref.current` (or any value derived from it, e.g.
   `registry.visible(...)`, or putting it in a context `value={}`) anywhere in a render or `useMemo`
   body — refs may only be touched from event handlers/effects. `useState(() =>
   createCommandRegistry(commands))` (lazy initializer, setter never called) gives the identical
   "created once, stable identity" guarantee and is what task 3.4.1's "registry instance stable across
   re-renders" test verifies.
2. **`generation` is explicit `useState`, not a ref counter, and does *not* increment on every list
   render — only on scope change and command completion, exactly as design.md's "Invalidated on"
   column states.** The same `eslint-plugin-react-hooks` install also enforces `react-hooks/purity`,
   which rejects calling `performance.now()`/`Date.now()` inside `useMemo` (impure value source during
   render). Scope-change bumps use React's own documented "adjust state during render" pattern
   (`if (priorScopes !== activeScopes) { setPriorScopes(activeScopes); setGeneration(g => g+1) }`);
   command-completion bumps call `setGeneration` from inside `runCommand`, which only ever runs from
   an event handler (`selectItem`/`submitText`), not from render — always lint-safe.
3. **Typed input while a command is pending is *not* resolved against `ctx.picks`' numeral lookup in
   this batch.** design.md's `resolve()` numeral-staleness logic (decisions C/6/7) is specified for
   the *top-level* prompt only (no pending command); once a command is pending, `submitText` in
   `CommandRuntimeProvider` feeds typed text straight to `advance(command, pending, { kind: 'value',
   raw }, ctx)`, the same as it would for a `text`-kind arg. This is sufficient for every scenario
   task 3.6.1 lists (typed full line resolves via top-level `resolve()`, bare alias opens the guided
   flow, `Esc`/`cancel` drop it) and keeps `CommandListContainer`'s click path as the sole route for
   `numberOptions`-backed numeral picks in this slice. Flagged here so a later phase does not assume
   typed numeral entry mid-guided-flow already works — it does not yet.
4. **`ctx.picks` fed into `availability(ctx)`/`options(ctx)` computations is the stable
   `EMPTY_NUMBERED_LIST` constant, not the previous render's real picks.** Computing the *new* `picks`
   value needs *some* `CommandContext` to pass into `registry.visible(ctx)` / `arg.options(ctx)`, but
   `ctx.picks` is exactly the field being computed — an unavoidable one-step lag design.md does not
   resolve explicitly. A ref-tracked "previous picks" value was the first attempt, but the same
   `react-hooks/refs` rule rejects writing to a ref inside `useMemo` too. Using the empty constant is
   correct for every fixture in this slice (none of them read `ctx.picks` from inside `availability`
   or `options`); noted here in case a later phase's command definitions ever need that field to
   reflect the real, current numbered list.

### Issues Found (this batch)

1. **`pending.ts`'s first `advance` implementation used a plain "first arg absent from `values`"
   re-scan for both the initial `begin` call and every subsequent `advance` call.** This passed 6/8
   tests but failed the "advances without writing a key when skipping an optional argument" case: since
   `skip` deliberately does not write a key, a fresh "first absent" scan re-selects the *same* just-
   skipped arg forever instead of moving to the next one. Fixed by scanning from an explicit resume
   index (the position after the arg just answered or skipped) instead of restarting from position 0
   every time. Caught by the GREEN run before the implementation commit, per Strict TDD's GREEN
   execution gate.
2. **A same-shape/different-reference `toEqual` failure** on the "returns filled immediately when no
   argument is missing from seed" test: the test called `makeCommand()` twice (once for the `begin()`
   argument, once for the expected `command` field), producing two structurally-identical but
   reference-distinct `Command` objects whose function properties (`availability`, `run`) differ by
   identity; `toEqual`'s diff printed "no visual difference" for the mismatched functions. Fixed by
   capturing a single `command` variable and reusing it in both places — a test-fixture bug, not a
   production-code bug.
3. **`eslint-plugin-react-hooks`'s `react-hooks/refs` and `react-hooks/purity` rules** (see Deviations
   #1, #2, #4 above) rejected the first `CommandRuntimeProvider` draft in 4 separate places (reading
   `registryRef.current`, reading/writing `picksRef.current`, and calling `performance.now()` inside
   `useMemo`). All four are React-Compiler-era rules new to this codebase's installed
   `eslint-plugin-react-hooks` version; none of slices 1-2's pure `src/shared/commands/` code could
   have surfaced them since that module has no React at all.

Neither the design deviations nor the issues touch `src/shared/ui/**`, add combat rule logic, or
change any public signature from design.md's literal code blocks (`pending.ts`'s exports match
design.md exactly; `command-runtime.ts`/`CommandRuntimeProvider.tsx` have no design.md code block to
diverge from, only prose).

### Review Budget — Actual vs. Estimate (Slice 3, RISK — decision needed before continuing)

design.md's Review budget section estimated *all* of slice 3 (`pending.ts` + the three `src/app/`
files + `DesignScreen` rewiring, tasks 3.1-3.9) at ~400 authored lines. This batch alone — tasks
3.1-3.4 only, none of `CommandListContainer`, `CommandPromptContainer`, or `DesignScreen` started —
already produced:

| File | Lines |
|---|---|
| `src/shared/commands/pending.ts` | 82 |
| `src/shared/commands/pending.test.ts` | 158 |
| `src/shared/commands/index.ts` | 1 |
| `src/app/providers/command-runtime.ts` | 25 |
| `src/app/providers/CommandRuntimeProvider.tsx` | 180 |
| `src/app/providers/CommandRuntimeProvider.test.tsx` | 112 |
| **Total (`git diff --stat origin/main..HEAD -- src/`)** | **555** |

**555 lines already exceeds the 400-line PR review budget by 155 lines, before three more files
(`CommandListContainer.tsx`+test, `CommandPromptContainer.tsx`+test, `DesignScreen.tsx` rewiring+test)
that design.md itself expected to be the *larger* remaining share of the slice.** Per this session's
explicit instruction ("If the total crosses 400, STOP at the last complete unit... do NOT keep
going"), apply stopped here rather than continuing past budget.

**Recommended further split for the next apply batch(es)**, in priority order:

- Slice 3a (this batch, already committed): `pending.ts` + barrel + `command-runtime.ts` +
  `CommandRuntimeProvider.tsx` — 555 lines. Already over 400 on its own; if a hard 400 cap is
  non-negotiable per PR, `pending.ts`+test (240 lines) and the provider unit (317 lines) are each
  independently green and could ship as two separate PRs instead of one.
- Slice 3b: `CommandListContainer.tsx` + test (task 3.5) — estimated ~70-100 lines based on the
  precedent set by `CommandList.test.tsx`'s existing test density.
- Slice 3c: `CommandPromptContainer.tsx` + test (task 3.6) — the most complex remaining unit (resolve
  routing, guided-flow submission, the `Esc` `document` listener); likely the largest single remaining
  file, similar to how `resolve.ts` was slice 2's largest unit.
- Slice 3d: `DesignScreen` rewiring + test + tasks 3.8 (`shared/ui` regression check) + 3.9 (slice 3
  green check) — the acceptance-level integration task, should land last since it depends on 3b and 3c
  both existing.

**The user/orchestrator must decide before continuing**: accept this 4-way split (worst case, four PRs
for one design-estimated ~400-line slice, on top of the two slices already shipped) or accept
`size:exception` for one or more of the remaining groups.

### Remaining Tasks (slice 3 continuation)

- [ ] 3.5 `src/app/layout/CommandListContainer.tsx` + test
- [ ] 3.6 `src/app/layout/CommandPromptContainer.tsx` + test
- [ ] 3.7 `DesignScreen` rewiring + test
- [ ] 3.8 Regression check: `src/shared/ui/**` untouched
- [ ] 3.9 Slice 3 green check

### Workload / PR Boundary (this batch)

- Mode: chained/stacked PR slice (`auto-chain`, `stacked-to-main` per tasks.md's Branch plan) — but
  slice 3 itself needs further internal splitting, see Review Budget above
- Current work unit: Slice 3a — pending command state machine + command runtime provider
- Boundary: starts from `feat/commands-text-resolver`'s tip (merged into `main` via PR #25), ends with
  a self-contained, independently green `pending.ts` + `CommandRuntimeProvider` (registry, scopes,
  numbered picks, pending state, the single `command.run(...)` call site) — no UI containers, no
  `DesignScreen` change yet
- Estimated review budget impact: 555 changed lines (all insertions, across 6 files) — **over the
  400-line budget by 155 lines**, see "Review Budget — Actual vs. Estimate" above

### Status (Cumulative, end of this batch)

16/30 tasks project-wide complete (7 slice-1 + 5 slice-2 + 4 slice-3a — tasks renumbered nowhere,
this counts 3.1-3.4 of slice 3's 9 tasks). Slices 1-2 merged into `main` (PRs #23, #25). Slice 3 is
IN PROGRESS on `feat/commands-runtime-wiring`, not yet ready for a PR: tasks 3.5-3.9 remain, and the
Review Budget section above needs a decision before any further apply batch continues past the
current 555-line diff.

### Slice 3a delivery — resolved by splitting into two PRs

The 555-line risk above was resolved before any PR was opened. Neither branch had been published,
so the work was reorganised into two, each verified green on its own:

| Branch | Contents | Authored `src/**` lines | Tests |
|---|---|---|---|
| `feat/commands-pending-flow` | `pending.ts` + tests, barrel export (tasks 3.1-3.2) | 238 | 257 passing, 29 files |
| `feat/commands-runtime-wiring` | `command-runtime.ts`, `CommandRuntimeProvider.tsx` + tests (tasks 3.3-3.4) | 317 | 260 passing, 30 files |

Both PRs open with base `main` per the hard git rule. `feat/commands-runtime-wiring` shows the full
555 lines until `feat/commands-pending-flow` is integrated, after which it shows its own 317.

Tasks 3.5-3.9 (`CommandListContainer`, `CommandPromptContainer`, `DesignScreen` rewiring, the
`shared/ui` regression check, and the slice-3 green check) remain unstarted.

## Slice 3b — Containers: COMPLETE (tasks 3.5-3.6)

Branch `feat/commands-containers`, based on `main` (tasks 3.1-3.4 already merged via PRs #26/#27).
Ships the two `src/app/layout/` containers that consume `CommandRuntimeProvider`.

### Completed Tasks (this batch)

- [x] 3.5 `src/app/layout/CommandListContainer.tsx` — maps `ctx.picks.items` onto `CommandList`
- [x] 3.6 `src/app/layout/CommandPromptContainer.tsx` — `PromptPortal > Prompt`, `Esc` listener,
  typed numeral mid-flow pick resolution, typed `cancel` keyword

### Files Changed (this batch)

| File | Action | What Was Done |
|---|---|---|
| `src/app/layout/CommandListContainer.tsx` | Created | `useCommandRuntime()` → maps every `NumberedItem` in `ctx.picks.items` onto a `CommandItem` (`id`, `label`, `key`, optional `hint`, optional `lockedReason`) and renders `<CommandList items={...} onSelect={selectItem} />`. Blocked-click prevention needs no extra logic: `CommandList` already sets `disabled={locked}` on the button, so a native disabled button never fires `onClick` |
| `src/app/layout/CommandListContainer.test.tsx` | Created | 3 tests: exact adapter mapping (numbered key + label + hint), blocked command renders dimmed with its reason and a click never calls `run`, an enabled click reaches the single `command.run(...)` call site |
| `src/app/layout/CommandPromptContainer.tsx` | Created | `PromptPortal > Prompt`; owns `value`/`typedAtGeneration`/`localError` state (per design.md's ownership table); a `document` `keydown` listener for `Escape`, attached only while `runtime.pending !== null` (decision D — `Prompt`'s props are frozen, untouched here); `handleSubmit` checks, in order: (1) pending + raw === `'cancel'` → `runtime.cancelPending()`; (2) pending + the `awaiting` arg is `kind: 'pick'` + raw is a bare numeral → resolve through `runtime.ctx.picks.lookup(raw)` with the same `typedAtGeneration !== ctx.picks.generation` staleness check used at the top level, then `runtime.selectItem(optionId)`; (3) otherwise → `runtime.submitText(raw, typedAtGeneration)`. `value`/`typedAtGeneration` reset after every submit; `typedAtGeneration` is snapshotted on the empty→non-empty `onChange` transition |
| `src/app/layout/CommandPromptContainer.test.tsx` | Created | 6 tests (see TDD Cycle Evidence) using a local `PromptSlotHarness` (mirrors `AppShell`'s footer-ref slot pattern) and a `renderPrompt(ui)` helper (`render(ui, { wrapper: PromptSlotHarness })`) |
| `openspec/changes/add-command-registry/tasks.md` | Modified | Marked 3.5-3.6 `[x]`, recorded the gap-closing note and the branch-plan split (3a/3b) |

### TDD Cycle Evidence (this batch)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.5 | `CommandListContainer.test.tsx` | Integration (RTL) | ✅ 32/32 project files green pre-batch (30 files/260 tests baseline) | ✅ Written (import to non-existent `./CommandListContainer` failed — confirmed via `pnpm vitest run`) | ✅ Passed (3/3) on first implementation, no fix cycle needed | ✅ 3 cases (mapping, blocked+click, enabled+click) | ➖ None needed — `eslint --fix` only reordered an import |
| 3.6 | `CommandPromptContainer.test.tsx` | Integration (RTL) | ✅ (3.5 green) | ✅ Written (import to non-existent `./CommandPromptContainer` failed) | ✅ Passed (7/7 initial cases) after adding the `PromptSlotHarness` (first run failed with "Unable to find role textbox" because `PromptPortal` renders `null` with no slot in context — not a production bug, a missing test fixture) | ✅ 7 cases covering all of 3.6.1's list plus the mid-flow numeral gap-closing pair (resolves, and stale-rejects) | ✅ Merged 2 near-duplicate tests (Esc-drop, typed-cancel-drop) into 1 multi-assertion test to trim the line budget; re-ran green after the merge; also fixed an `exactOptionalPropertyTypes` `tsc` error by conditionally spreading the `error` prop instead of always passing `string \| undefined` |

### Test Summary (this batch)

- **Total tests written**: 9 (3 + 6, after the Esc/cancel merge — originally 10 before merging 2 into 1)
- **Total tests passing**: `src/app/layout` 9/9 new; project-wide 32 files / 269 tests (baseline before
  this batch: 30 files / 260 tests)
- **Layers used**: Unit (0), Integration (9, RTL), E2E (0)
- **Approval tests** (refactoring): None — no refactoring tasks in this batch
- **Pure functions created**: 0 new pure functions — both containers are necessarily React components
  (design decision F); `CommandPromptContainer`'s `pendingPickArg()`/`resetInput()` are plain
  functions closing over hook state, not exported

### Work Unit Evidence (this batch)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm vitest run src/app/layout/CommandListContainer.test.tsx` → 3/3 passing; `pnpm vitest run src/app/layout/CommandPromptContainer.test.tsx` → 6/6 passing |
| Runtime harness command/scenario and exact result | `pnpm vitest run` (full suite) → 32 files / 269 tests passing (up from the 30/260 baseline); `pnpm exec tsc -b --noEmit` → clean; `pnpm exec eslint` on all changed files → clean; `pnpm build` (`tsc -b && vite build`) → succeeded, `dist/` emitted; `pnpm vitest run src/shared/ui` → 6 files / 47 tests passing, unmodified (task 3.8's regression check, run early as a dependency confirmation — task 3.8 itself is not yet marked done since it is its own task) |
| Rollback boundary | Revert commits `46eb65b`..`769580c` (6 commits, this batch only: `CommandListContainer.tsx`+test, `CommandPromptContainer.tsx`+test, and the test-trimming follow-ups) — no other file touched, `src/shared/ui/**` untouched |

### Deviations from Design (this batch)

None from design.md's literal code/wiring description. One addition beyond the letter of task 3.6's
own scenario list, flagged per this session's explicit request:

1. **Typed `cancel` keyword now works mid-guided-flow, closing a gap task 3.4 left documented.**
   `CommandRuntimeProvider.submitText` (already merged, task 3.4) only ever calls
   `advance(command, pending, { kind: 'value', raw }, ctx)` for typed input while pending — there is
   no typed-keyword branch there, only a click-driven `CANCEL_ID` special-case in `selectItem`. Without
   a fix, typing the word `cancel` while a command is pending would have been treated as the literal
   value for the awaiting argument (e.g. `build: 'cancel'`), contradicting the spec's "Cancelling a
   Pending Command" requirement's explicit "types `cancel`" scenario. `CommandPromptContainer`
   intercepts this case itself, before calling `submitText`, and routes it to `runtime.cancelPending()`
   instead. This is a container-level fix, not a `CommandRuntimeProvider`/`pending.ts` change — neither
   of those already-merged files was touched.
2. **Typed numeral mid-flow now resolves through the numbered pick map, closing the other gap task 3.4
   left documented.** Same root cause: `submitText`'s pending branch always calls `advance(... { kind:
   'value', raw } ...)`, never checking whether `raw` is a numeral or whether `ctx.picks` (which,
   while pending, is `numberOptions(...)` per `CommandRuntimeProvider`'s own `picks` computation) has a
   matching entry. `CommandPromptContainer` now checks, before delegating: is the current `awaiting`
   argument `kind: 'pick'`, and is `raw` a bare numeral? If so, it applies the exact same
   `typedAtGeneration !== ctx.picks.generation` staleness check used by `resolve.ts` at the top level,
   looks the numeral up via `ctx.picks.lookup(raw)`, and calls `runtime.selectItem(optionId)` — never
   `runtime.submitText` — for a match. A stale or unmatched numeral sets an explicit local error
   (`"{raw}" is no longer available"`) and selects nothing, exactly mirroring the top-level
   `stale-number` outcome's user-facing behavior. Verified by the `'resolves a typed numeral mid-flow
   against the pending pick options'` test (success path) and `'gives an explicit error and selects
   nothing when a pending pick numeral goes stale'` (staleness path, using a `state` prop change on
   `rerender` to bump `generation` between the keystroke and the submit).

Neither addition touches `src/shared/commands/**`, `src/app/providers/**`, or `src/shared/ui/**` —
both live entirely inside the new `CommandPromptContainer.tsx`.

### Issues Found (this batch)

1. **First `CommandPromptContainer.test.tsx` run failed all 7 cases with "Unable to find an accessible
   element with the role textbox".** Cause: `PromptPortal` (already-shipped, `src/app/layout/`)
   returns `null` when `usePromptSlot()` resolves to `null`, and the tests were not wrapping
   `CommandRuntimeProvider` in a `PromptSlotContext` provider. Not a production defect — `AppShell`
   already supplies the slot in the real app; the test suite needed its own minimal slot harness.
   Fixed by adding a local `PromptSlotHarness` component (a `useState<HTMLElement | null>` plus a
   `<div ref={setSlot} />`, mirroring `AppShell`'s own footer-ref pattern) and a `renderPrompt(ui)`
   helper using Testing Library's `render(ui, { wrapper })` option (confirmed via the installed
   `@testing-library/react@16.3` source that `rerender` reuses the same `wrapper` closure, so the
   slot harness survives the stale-numeral test's mid-test `rerender` call).
2. **`tsc -b` failed with `TS2375` under `exactOptionalPropertyTypes: true`** when always passing
   `error={localError ?? runtime.promptError}` (typed `string | undefined`) to `Prompt`'s `error?:
   string` prop. Fixed by conditionally spreading: `{...(error === undefined ? {} : { error })}`,
   the same pattern already used elsewhere in this codebase for optional-prop objects.
3. **Initial diff measured 414 authored `src/` lines against `origin/main`, 14 over the 400-line
   budget**, because the review-budget check was run only after both containers and both test files
   were already written, not before each unit as instructed. Trimmed back under budget without
   removing coverage: replaced 7 repeated `<PromptSlotHarness>...</PromptSlotHarness>` wrapper blocks
   with the single `renderPrompt`/`{ wrapper }` helper (saves ~24 lines), then merged the near-duplicate
   Esc-drop and typed-cancel-drop tests into one multi-assertion test (saves ~15 lines), landing at
   **390 lines**. Flagged here as a process deviation from the stated stop-before-crossing procedure,
   not silently absorbed.

### Review Budget — Actual vs. Estimate (Slice 3b)

| File | Lines |
|---|---|
| `src/app/layout/CommandListContainer.tsx` | 16 |
| `src/app/layout/CommandListContainer.test.tsx` | 74 |
| `src/app/layout/CommandPromptContainer.tsx` | 104 |
| `src/app/layout/CommandPromptContainer.test.tsx` | 196 |
| **Total (`git diff --stat origin/main..HEAD -- src/`)** | **390** |

**390 lines — under the 400-line PR review budget.** No `size:exception` needed. This slice combined
tasks 3.5 and 3.6 into one PR-sized unit per this session's explicit instruction ("if only task 3.5
fits, deliver only task 3.5" — both fit).

### Remaining Tasks (slice 3 continuation)

- [ ] 3.7 `DesignScreen` rewiring + test
- [ ] 3.8 Regression check: `src/shared/ui/**` untouched (re-run and record formally as its own gate;
  already confirmed green as part of this batch's Runtime harness evidence above)
- [ ] 3.9 Slice 3 green check (full three-slice branch `pnpm test` + `pnpm build`, and the "Terminado
  cuando" acceptance check — depends on 3.7 existing first)

### Workload / PR Boundary (this batch)

- Mode: chained/stacked PR slice (`auto-chain`, `stacked-to-main` per tasks.md's Branch plan)
- Current work unit: Slice 3b — `CommandListContainer` + `CommandPromptContainer`
- Boundary: starts from `main` (tasks 3.1-3.4 already merged via PRs #26/#27), ends with both
  containers wired to `CommandRuntimeProvider` and independently green — `DesignScreen` itself is
  untouched, still using its local `useState` (task 3.7's job)
- Estimated review budget impact: 390 changed lines (all insertions, across 4 files) — under the
  400-line budget

### Status (Cumulative, end of this batch)

18/30 tasks project-wide complete (7 slice-1 + 5 slice-2 + 6 slice-3 [3.1-3.6]). Slices 1-2 and slice
3a (tasks 3.1-3.4) merged into `main` (PRs #23, #25, #26, #27). Slice 3b (tasks 3.5-3.6, this batch)
is on branch `feat/commands-containers`, based on `main`, not yet opened as a PR — that remains the
user's own step. Tasks 3.7-3.9 remain for a further slice 3c. The runtime attempt ledger's 1000-line
cap (SDD process docs + `src/`) was not measured against for this settle; only the 400-line PR review
budget on `src/**` was tracked per this session's explicit instruction.
