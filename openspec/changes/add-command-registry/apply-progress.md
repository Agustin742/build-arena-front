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
