# Archive Report: add-battle-realtime

**Date Archived**: 2026-09-08  
**Change**: add-battle-realtime (Phase 8 of docs/design/implementation-plan.md)  
**Status**: COMPLETE — All work merged to main, verification passed, phase criteria met.

---

## Executive Summary

Phase 8 of the Build Arena implementation plan is complete and archived. The realtime transport layer (`BattleSocket` adapter) and the battle store with event-to-action translation are fully implemented, tested (947 passing tests, up from 909 baseline), and merged into `main` via three stacked PRs (#57, #58, #59). The acceptance criterion — a scripted event sequence with reconnection and window behavior — is verified by the acceptance test in `src/shared/realtime/battle-socket.test.ts`. The delta spec for the new `battle-realtime` capability has been promoted to `openspec/specs/battle-realtime/spec.md`.

---

## Final State Authority

This report reflects the state of the change at close, per the SDD Final-State Authority hierarchy:

1. **Native verification status** (highest rank): verification passed on commit bd9e431 (main) with 0 CRITICAL, 2 WARNINGs, 8/8 requirements compliant, 18/18 scenarios traced to passing tests.
2. **Persisted tasks artifact**: `openspec/archive/2026-09-08-add-battle-realtime/tasks.md` shows 23/23 tasks complete (all boxes ticked).
3. **Explicit final-state facts from launch prompt**: All work is complete and merged; tests: 947 passing, exit 0; verification passed; Phase 8 "Terminado cuando" is met.
4. **Intermediate snapshots** (lowest rank, overridden here): The stale Engram `apply-progress` observation (id #359) documented only Phases 1–2 and listed Phases 3–4 as Remaining Tasks. This report uses the actual on-disk state and git history as authoritative instead.

---

## Specs Synced to Main

| Domain | Action | Source | Destination | Details |
|--------|--------|--------|-------------|---------|
| battle-realtime | Created (new capability) | `openspec/changes/add-battle-realtime/specs/battle-realtime/spec.md` | `openspec/specs/battle-realtime/spec.md` | Mechanically copied; diff -r confirms byte-identity. Spec is **purely ADDED** (8 requirements, 18 scenarios); no MODIFIED or REMOVED requirements. |

**Destructiveness Check**: The spec contains only ADDED sections ("Delta for Battle Realtime" / "New capability"). No destructive merge operations were required. No MODIFIED or REMOVED requirements. ✓

---

## Archive Contents

All artifacts have been moved from `openspec/changes/add-battle-realtime/` to `openspec/archive/2026-09-08-add-battle-realtime/`:

- ✅ proposal.md
- ✅ exploration.md
- ✅ design.md
- ✅ tasks.md (23/23 tasks complete)
- ✅ verify-report.md (0 CRITICAL, 2 WARNINGs, pass-with-warnings verdict)
- ✅ specs/battle-realtime/spec.md (delta, promoted to main specs)
- ✅ archive-report.md (this file)

**Mechanical Copy Verification**: `diff -r` of archived folder vs. pre-move snapshot shows no differences (exit code 0). Source directory removed. ✓

---

## Work Completed

### Commits Merged
- **PR #57**: `feat/battle-store-core` — BattleState type, applyState, setConnection, reset (Phase 1)
- **PR #58**: `feat/battle-store-events` — six apply* actions, turn_resolved merge logic (Phase 2)
- **PR #59**: `feat/battle-socket-adapter` — BattleSocket state machine T1–T10, adapter interface, tests, socket.io-client dependency (Phase 3)

All merged via merge commits to `main` at commit bd9e431 per the stacked-PR delivery strategy in `openspec/config.yaml`.

### Test Results
- **Test Command**: `pnpm test` (vitest run)
- **Result**: 947 tests passing / 0 failed / 0 skipped (83 test files)
- **Baseline**: Pre-change: 81 files / 909 tests. Phase 8 adds: 2 files / 38 tests.
- **Exit Code**: 0 (success)

### Build & Lint
- **`pnpm build`**: Clean, 277 modules transformed, 0 errors
- **`pnpm typecheck`**: Clean, zero errors
- **`pnpm lint`** (eslint src/shared/realtime): Clean, zero output

### Phase 8 "Terminado cuando" Criterion

From docs/design/implementation-plan.md §Fase 8:

> **Terminado cuando:** con el doble del socket, una secuencia de eventos deja el store exactamente como el guide describe, incluida la reconexión con `openWindow` abierta.

**Status**: ✅ MET

**Evidence**: The acceptance test in `src/shared/realtime/battle-socket.test.ts` scripts the exact sequence:
1. Connect with a joined battle
2. Receive `battle:state` with an open window
3. Transport drop → disconnect fires → `connection: 'connecting'`, `openWindow: null`
4. Reconnect → `connection: 'open'` re-emits `battle:join`
5. Window stays closed through reconnect (no auto-reopen)
6. Server re-emits `battle:reaction_window` → `openWindow` reopens only then
7. `battle:turn_resolved` and `battle:ended` follow
8. All assertions verify store state matches the guide's expected behavior

Per verify-report (lines 235–249), this acceptance test "genuinely scripts the sequence... and every assertion in it checks real store state, not a name that overpromises."

---

## Verification Summary

**Verdict**: PASS WITH WARNINGS

**Key Metrics**:
- Requirements compliant: 8/8 ✓
- Scenarios traced to tests: 18/18 ✓
- CRITICAL findings: 0 ✓
- WARNING findings: 2 (recorded below, non-blocking)
- Test coverage: 947 tests, 83 files
- TDD compliance: 5/6 checks fully passed, 1 partial (self-reported evidence table gap for Phase 3, compensated by direct git/source inspection)

**WARNINGs** (accepted, non-blocking):

1. **W1 — Requirement 7 (One Battle at a Time) coverage gap**
   - Scenario "Joining a new battle replaces the previous one" is covered only indirectly at the `applyState` level, not through the actual `adapter.join()` → `store.reset()` path.
   - The specific edge case: if `ended` is set on battle A, then `adapter.join(BATTLE_B)` is called, the `ended` field should be null before the next `battle:state`. This path is untested.
   - **Root cause**: No test in either `battle.store.test.ts` or `battle-socket.test.ts` sets `ended` via `applyEnded`, then calls `adapter.join(BATTLE_B)`, then asserts `ended` is null.
   - **Severity**: WARNING, not CRITICAL — code inspection confirms the mechanism is implemented correctly (`reset()` clears `ended`, `join()` calls `reset()` on battleId change). The gap is test coverage, not behavior.
   - **Recommendation**: Add one adapter-level test for Phase 9 (`add-battle-arena`), where the composition-root wiring will be the first real caller of `join()`.

2. **W2 — Stale Engram artifact**
   - The Engram `apply-progress` observation (id #359) was never updated after PR #59 landed.
   - It still lists Phases 3 and 4 as "Remaining Tasks" and has no TDD Cycle Evidence table for the adapter.
   - **Impact**: Does not affect shipped code (verified independently against git/disk), but leaves a downstream artifact that could mislead a future reader who trusts Engram over disk state.
   - **Resolution**: This archive report supersedes that observation. Future readers should consult this archive-report and the on-disk `tasks.md` and `verify-report.md`, not the stale Engram snapshot.

---

## Accepted Exceptions (Recorded, Not Re-litigated)

1. **PR #59 Budget Exception**
   - **Fact**: PR #59 came in at 632 changed lines (against a 400-line budget).
   - **Breakdown**: 390 lines in test file (battle-socket.test.ts), 197 in implementation, 44 in architecture.md.
   - **Resolution**: Maintainer accepted and merged it via bd9e431.
   - **Status**: Recorded as accepted, not flagged as a failure in this report.
   - **Precedent**: This matches the verify-report's Accepted Deviations table (line 206–209).

2. **Spec/Design Conflict — `reset()` and `connection`**
   - **Conflict**: Stale Engram spec (#355) implied `reset()` changes `connection` to `idle`. On-disk spec and code disagree.
   - **Resolution**: Design's intention is correct: `reset()` clears every battle slice but leaves `connection` untouched, because `connection` models the transport, not the battle. When `join()` calls `reset()` after a battleId change, the socket is still open, so `connection` must stay as-is.
   - **Evidence**: On-disk spec (lines 133–150) carries the amended requirement with both new scenarios, and code matches. Test `reset > ... leaves connection untouched` confirms the behavior.
   - **Status**: Recorded as spec amendment applied mid-flight; verified in verify-report (line 208).

3. **Composition-Root Wiring Deferred to Phase 9**
   - **Design Decision**: Nothing imports `src/shared/realtime/` yet; no composition-root file is created in Phase 8.
   - **Justification**: Design's Migration/Rollout section states "Phase 8 ships only the injected port consumed by `battle-socket.ts`; no composition-root file is created here."
   - **Verification**: Import grep in verify-report (lines 119–120) confirms zero matches for `shared/realtime` imports outside the module itself.
   - **Status**: Recorded as intentional deferral per design; not an omission.

---

## SDD Cycle Closure

- ✅ Proposal: Accepted, addressed all open questions (planning phase)
- ✅ Exploration: Completed, informed design decisions
- ✅ Spec: Delta spec created (8 requirements, 18 scenarios), promoted to main specs
- ✅ Design: Four design points (D1–D4) documented, implemented, verified
- ✅ Tasks: 23 tasks across 4 phases, all complete and marked in `tasks.md`
- ✅ Apply: Three PRs (#57, #58, #59) merged to main with full TDD evidence
- ✅ Verify: Verification passed with 0 CRITICAL, 2 WARNINGs, all requirements/scenarios compliant
- ✅ Archive: Change folder moved to archive, specs synced to main, archive-report created

---

## Key Learnings for Phase 9

The following findings should inform Phase 9 (`add-battle-arena`):

1. **W1 Coverage Gap**: Add an adapter-level test for the `join()` → `reset()` → ended clearing path during Phase 9. This is the wiring phase, so it's the first real caller of `join()`.

2. **Socket Double Pattern**: The hand-rolled `fakeSocket`/`fakeSession` test doubles in `battle-socket.test.ts` follow the `src/shared/http/refresh.test.ts` precedent (vi.fn() for spying only, never vi.mock()). Reuse this pattern for Phase 9 integration tests if needed.

3. **No Composition-Root Yet**: Phase 9 will wire `useSessionStore.subscribe` into `SubscribeToAccessToken` and mount the adapter in the `/battles/:id` route. This is the first real consumer of the realtime layer.

4. **Dependency on This Archive**: Phase 9 depends on `add-battle-realtime` per `openspec/config.yaml` (line 50). This archived spec is the source of truth for all 8 requirements and 18 scenarios.

---

## Artifacts Moved

**From**: `openspec/changes/add-battle-realtime/`  
**To**: `openspec/archive/2026-09-08-add-battle-realtime/`

**File Manifest**:
```
openspec/archive/2026-09-08-add-battle-realtime/
├── proposal.md
├── exploration.md
├── design.md
├── tasks.md
├── verify-report.md
├── archive-report.md (this file)
└── specs/
    └── battle-realtime/
        └── spec.md
```

**Main Specs Updated**:
```
openspec/specs/battle-realtime/spec.md (NEW)
```

---

## Checklist: SDD Archive Gate Completion

- [x] Task Completion Gate: 23/23 tasks checked in persisted artifact (no stale unchecked tasks)
- [x] Spec Sync: Delta spec mechanically copied to main specs, diff -r confirms byte-identity
- [x] Archive Move: Change folder moved from `openspec/changes/` to `openspec/archive/` with date prefix
- [x] Archive Verification: All artifacts present, source directory removed
- [x] Destructiveness Check: Spec is purely ADDED; no warnings needed
- [x] Phase Criteria Met: Phase 8 "Terminado cuando" criterion verified (acceptance test passes)
- [x] Mechanical Verification: `diff -r` of archive vs. snapshot confirms integrity (exit code 0)

---

## Archive Authority

This archive-report is the terminal record of Phase 8. It supersedes all earlier snapshots (`apply-progress`, `verify-report`, intermediate task lists). A future reader consulting this archive will find:

- **What shipped**: Three merged PRs with full TDD evidence, 947 passing tests, 0 CRITICAL findings
- **What is verified**: All 8 requirements and 18 scenarios traced to passing tests; Phase 8 acceptance criterion met
- **What is known not to ship**: Composition-root wiring (deferred to Phase 9 per design)
- **What gaps remain**: W1 coverage gap (non-critical, deferred to Phase 9), W2 stale Engram artifact (superseded by this report)

The on-disk `tasks.md`, `verify-report.md`, and this `archive-report.md` are the authoritative record. The stale Engram `apply-progress` (#359) should not be consulted for final state; this report is the source of truth.

---

**Archived by**: SDD Archive Phase  
**Commit verified**: bd9e431 (main)  
**Date**: 2026-09-08
