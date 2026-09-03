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

### Remaining Tasks (slices 2 and 3 — NOT started, out of scope for this apply batch)

- [ ] 2.1 `numbered.ts` — `numberCommands`, `numberOptions`, `EMPTY_NUMBERED_LIST` (must import `NumberedItem`/`NumberedList` from `./types`, per the deviation above)
- [ ] 2.2 `suggest.ts` — private nearest-alias candidates
- [ ] 2.3 `resolve.ts` — `resolve()`
- [ ] 2.4 Barrel extend (resolver exports)
- [ ] 2.5 Slice 2 green check
- [ ] 3.1 `pending.ts` — `begin`, `advance`, `SKIP_ID`, `CANCEL_ID`
- [ ] 3.2 Barrel final surface
- [ ] 3.3 `src/app/providers/command-runtime.ts`
- [ ] 3.4 `src/app/providers/CommandRuntimeProvider.tsx`
- [ ] 3.5 `src/app/layout/CommandListContainer.tsx`
- [ ] 3.6 `src/app/layout/CommandPromptContainer.tsx`
- [ ] 3.7 `DesignScreen` rewiring
- [ ] 3.8 Regression check: `src/shared/ui/**` untouched
- [ ] 3.9 Slice 3 green check

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

7/7 slice-1 tasks complete (11/26 tasks project-wide, counting 1.1-1.7 + the 2.x/3.x tasks still
pending). Ready for the next apply batch (slice 2) or for `sdd-verify` to check slice 1 in isolation,
per the orchestrator's delivery strategy.
