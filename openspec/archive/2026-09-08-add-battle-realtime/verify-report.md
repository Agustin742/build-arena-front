```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:29eb62b25272b7b523f33feea7f32b2e104176b9c1b31be551c0cbb034c0b5c5
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 8/8
scenarios: 18/18
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:82b6ffdc745a6dca2debd54591f587988b45d1089a6ed8d472f60b9167a46eef
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:27ca038cd4c5d550dfe7a975700645fffa0ea4ed56ba7d787b5a16411b7b728b
```

## Verification Report

**Change**: add-battle-realtime (Phase 8 of docs/design/implementation-plan.md)
**Version**: openspec/changes/add-battle-realtime/specs/battle-realtime/spec.md (delta, new capability)
**Mode**: Strict TDD
**Commit verified**: bd9e431 (main, PRs #57, #58, #59 merged via merge commits)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 23 boxed items across Phase 1-4 |
| Tasks complete | 23/23, all boxes ticked in tasks.md, confirmed against real commits |
| Tasks incomplete | 0 |

Note: the Engram apply-progress artifact (topic sdd/add-battle-realtime/apply-progress) is stale.
It only documents Phase 1/PR 1 and Phase 2/PR 2 and marks Phase 3/Phase 4 as Remaining Tasks.
The on-disk tasks.md and the actual merged commit history (PR #59, feat/battle-socket-adapter)
show Phase 3 and Phase 4 fully complete. This verification trusts the disk artifact and git
history over the un-refreshed Engram observation, and every Phase 3/4 box was independently
confirmed against real files and commits below.

### Build & Tests Execution
**Build**: Passed
```text
$ tsc -b && vite build
- 277 modules transformed.
dist/index.html                   0.78 kB
dist/assets/index-DZ_VRJpp.css   14.83 kB
dist/assets/index-DTWec-0l.js   407.03 kB
built in 662ms
```

**Typecheck**: tsc -b --noEmit -- clean, zero errors.

**Tests**: 947 passed / 0 failed / 0 skipped (83 test files)
```text
$ vitest run
 Test Files  83 passed (83)
      Tests  947 passed (947)
   Duration  135.46s
```
Independently re-run in this verify pass (not reused from a cached number): result matches the
baseline the orchestrator and the previous verify attempt reported (83 files / 947 tests, up from
the pre-change 81/909 baseline), confirming the count a third time rather than assuming it.

**Coverage**: not available -- no coverage tool configured in package.json. Skipped, not a failure.

### Spec Compliance Matrix

| # | Requirement | Scenario | Test | Result |
|---|---|---|---|---|
| 1 | Handshake authenticates via auth.token, rejection stays retryable | Rejected handshake stays retryable | battle-socket.test.ts > T1-T3: handshake > sets rejected on connect_error and leaves the session subscription alone | COMPLIANT |
| 2 | battle:join sent on every successful connect | Join re-sent after reconnect | battle-socket.test.ts > T4-T7 > returns to connecting on a transport drop, and re-emits battle:join once the retry connects | COMPLIANT |
| 3 | Per-event store effects | Fresh battle:state clears the log | battle.store.test.ts > applyState > clears log and lastError | COMPLIANT |
| 3 | Per-event store effects | round_start never touches combatants | battle.store.test.ts > applyRoundStart > sets currentRound and activeUserId, appends events to log, leaves combatants untouched | COMPLIANT |
| 3 | Per-event store effects | Opponent leaving sets opponentLeft only | battle.store.test.ts > applyOpponentLeft > sets opponentLeft only, leaving every other field untouched | COMPLIANT |
| 3 | Per-event store effects | battle:error leaves combat state and connection untouched | battle.store.test.ts > applyError > sets lastError only, leaving connection and combat state untouched | COMPLIANT |
| 3 | Per-event store effects | A new error replaces the previous one | battle.store.test.ts > applyError > replaces the previous error with the new one | COMPLIANT |
| 3 | Per-event store effects | State survives battle:ended | battle.store.test.ts > applyEnded > sets status and ended, closes openWindow and activeUserId, preserves combatants, turns and log | COMPLIANT |
| 4 | turn_resolved merges turns by (round, sequence) | Normal turn appends | battle.store.test.ts > applyTurnResolved > appends a new entry for a turn with a new (round, sequence) key | COMPLIANT |
| 4 | turn_resolved merges turns by (round, sequence) | Idempotent re-emit does not duplicate | battle.store.test.ts > applyTurnResolved > replaces the matching entry instead of duplicating it on an idempotent re-emit | COMPLIANT |
| 4 | turn_resolved merges turns by (round, sequence) | Empty events still updates turns and combatants | battle.store.test.ts > applyTurnResolved > updates turns and combatants from an empty events array without adding a log entry | COMPLIANT |
| 5 | Reconnect closes the reaction window and waits for the server | Window closes on reconnect | battle-socket.test.ts > acceptance: scripted event sequence > leaves the store as the guide describes... (asserts connection: connecting and openWindow: null right after the transport-drop disconnect fire) | COMPLIANT |
| 5 | Reconnect closes the reaction window and waits for the server | Window reopens only from a server re-emit | Same acceptance test -- asserts openWindow stays null through the connect re-fire, then becomes the payload value only after battle:reaction_window fires | COMPLIANT |
| 6 | Token rotation reconnects only a joined battle | Rotation with a joined battle reconnects | battle-socket.test.ts > T8-T10 > reconnects and rejoins when a battle is joined, even before battle:state has ever arrived | COMPLIANT |
| 6 | Token rotation reconnects only a joined battle | Rotation with no joined battle is a no-op | battle-socket.test.ts > T8-T10 > is a no-op when no battle is joined, including the token set on first login | COMPLIANT |
| 7 | One battle at a time | Joining a new battle replaces the previous one | battle.store.test.ts > applyState > replaces a previous battle entirely on a second applyState, leaving no residue | COMPLIANT (see finding W1 for a narrower untested edge case) |
| 8 | Domain reset action restores initial battle state | Reset clears every battle slice | battle.store.test.ts > reset > restores every combat slice to its initial value but leaves connection untouched | COMPLIANT |
| 8 | Domain reset action restores initial battle state | Reset leaves the transport alone | Same test -- asserts connection still reads open after reset() | COMPLIANT |

**Compliance summary**: 18/18 scenarios compliant (see finding W1 for a narrower untested edge case within a compliant scenario).

**Finding W1 (WARNING) -- Req 7 scenario passes as literally written, but the ended-field residue path through join() is untested.**

The spec's own scenario text is: battle:join succeeds for battle B and battle:state arrives. The
only covering test calls useBattleStore.getState().applyState() twice directly -- it never calls
adapter.join(). That matters because applyState already overwrites every field it lists (battleId,
status, currentRound, activeUserId, combatants, turns, openWindow, opponentLeft) and clears
log/lastError regardless of whether reset() ran first. The one field applyState explicitly does
not touch is ended (by design, to survive a reconnect after a finished battle) -- which is exactly
the field that would leak from battle A into battle B if join()'s store.getState().reset() call
(in battle-socket.ts: join calls store.reset() when battleId differs from joinedBattleId) were
missing or broken. No test in either file sets ended on battle A, calls adapter.join(BATTLE_B),
and asserts ended is null before the next battle:state.

Reading the code, the mechanism is implemented correctly (reset() clears ended and join() calls it
on every battleId change), so this is not a functional defect -- but it is a real coverage gap on
the one scenario that exists specifically to guard against that residue. Severity: WARNING, not
CRITICAL, because the covering test that exists does pass and does verify no residue for every
field that a mid-battle battle:state payload can independently overwrite anyway.

### Correctness (Static Evidence)
| Requirement / Design Point | Status | Notes |
|---|---|---|
| D1 -- five-state connection machine, T1-T10 | Implemented | battle-socket.ts registers all 10 listeners once (registerListeners); T1 (connect), T2/T5 (connect to open plus re-join), T3 (connect_error to rejected), T4 (transport-drop disconnect to connecting), T6 (io server disconnect to closed), T7 (disconnect() to teardown plus unsubscribe plus store.reset()), T8 (joinedBattleId null no-op), T9 (rotation reconnect plus re-join), T10 (token to null to teardown) all present, each with a dedicated passing test |
| D1.2 -- rotation gate reads adapter-owned joinedBattleId, not store.battleId | Implemented | handleTokenChange guards on joinedBattleId === null, never on store.getState().battleId. Test reconnects and rejoins when a battle is joined, even before battle:state has ever arrived drives exactly the gap this guards: join() is called, store.battleId is still null (asserted), then rotation still reconnects |
| D1.3 -- subscription ownership | Implemented | connect() uses unsubscribeToken ??= subscribeToAccessToken(...) (subscribe-once idiom); disconnect()/performTeardown() calls the handle and nulls it. Tests: double connect() subscribes once; disconnect() unsubscribes once and is idempotent |
| D2 -- BattleState shape | Implemented | battle.store.ts matches the design's interface field-for-field, including EndedView and ConnectionState |
| D3 -- event-to-action table | Implemented | All seven apply* actions match the replace/merge/append/clear/untouched columns; applyTurnResolved does not touch currentRound/activeUserId (tested); applyState does not clear ended (tested); applyEnded preserves combatants/turns/log (tested) |
| D4 -- adapter interface plus test doubles | Implemented | BattleSocket, SocketLike, BattleSocketOptions, SubscribeToAccessToken match the design exactly; openSocket is injectable (defaults to io(...)), doubles are hand-rolled literals with vi.fn() used only for spying, never vi.mock() |
| reset() leaves connection untouched | Implemented, spec amended to match | battle.store.ts reset() sets only ...initialCombatSlice, which excludes connection. The on-disk spec explicitly states the reset action MUST NOT change connection -- this is the amended text; the stale Engram spec observation (#355) still has the older wording implying connection resets too. The on-disk file is authoritative and matches the code. Tested by reset > ... leaves connection untouched, which sets connection: open before calling reset() and asserts it is still open after |
| src/shared/realtime/ imports nothing from src/features/ | Confirmed | grep for @/features or relative ../../features imports in src/shared/realtime/*.ts returns zero matches |
| No composition-root wiring shipped | Confirmed | grep -r shared/realtime src/ (excluding the module itself) returns zero matches -- nothing in src/app, src/features, or anywhere else imports createBattleSocket or useBattleStore yet. Phase 9 remains the wiring point |
| socket.io-client dependency | Present | package.json line 28: socket.io-client ^4.8.3 in dependencies (not devDependencies) |
| docs/design/architecture.md section 4 updated | Present | Section 4. realtime/ -- el adapter de socket y el store de batalla carries the D2 block, the ended/log/port-injection paragraph in Spanish prose, no code comments |

### Coherence (Design)
| Decision | Followed? | Notes |
|---|---|---|
| D1 state machine (T1-T10) | Yes | See Correctness table above |
| D1.2 joinedBattleId ownership | Yes | See Correctness table above |
| D1.3 subscription single-owner rule | Yes | See Correctness table above |
| D2 store shape | Yes | Field-for-field match |
| D3 event-to-action table, including the three explicitly flagged traps (turn_resolved non-advancing round, applyEnded preservation, applyReactionWindow stripping the extra battleId field) | Yes | All three traps have dedicated passing tests |
| D4 adapter interface plus doubles | Yes | Matches; fakeSocket/fakeSession follow the src/shared/http/refresh.test.ts precedent (hand-rolled literals, vi.fn() for spying only) |
| Migration/Rollout -- no composition-root wiring until Phase 9 | Yes | Confirmed by import grep |
| Delivery Forecast -- chained PRs, stacked-to-main | Yes | Three PRs (#57, #58, #59) merged in the designed order, each based on main per the repo's stacked-PR convention |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | Partial | Engram apply-progress (#359) has a complete TDD Cycle Evidence table for Phase 1/2 only; Phase 3 (the adapter) has no equivalent table in that artifact because it predates PR #59. The evidence for Phase 3 was reconstructed here directly from git history and source, not from a self-reported table |
| All tasks have tests | Yes | Every implementation file (battle.store.ts, battle-socket.ts) has a co-located .test.ts file, both created before their implementation commit |
| RED confirmed (tests exist) | 2/2 test files verified | battle.store.test.ts, battle-socket.test.ts both exist and both were added by a commit preceding their implementation's GREEN commit |
| GREEN confirmed (tests pass) | 947/947 | Full suite passes at the verified commit, including both files |
| Triangulation adequate | Adequate | applyTurnResolved alone has 5 distinct cases (combined effect, non-advancing round, new-key append, idempotent replace, empty-events update); T1-T10 each have a dedicated case; no single-scenario requirement is under-tested |
| Safety Net for modified files | Yes | Each RED commit's message and structure show existing tests in the file were preserved and re-run (battle.store.test.ts grew from 12 to 24 tests across Phase 1/2) |

**TDD Compliance**: 5/6 checks fully passed, 1 partial (self-reported evidence table gap for Phase 3, compensated by direct git/source inspection in this report)

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 37 (23 in battle.store.test.ts, 14 in battle-socket.test.ts) | 2 | Vitest, hand-rolled doubles (fakeSocket, fakeSession) |
| Integration | 0 | 0 | Not used -- nothing mounts the adapter yet (Phase 9) |
| E2E | 0 | 0 | Not used -- deliberately out of scope per design |
| Total | 37 | 2 | |

Matches the roughly 38-test delta between the pre-change baseline (909) and this change's total (947).

### Changed File Coverage
Coverage analysis skipped -- no coverage tool detected in package.json (vitest run has no
--coverage flag configured, no c8/istanbul dependency).

### Assertion Quality
No CRITICAL or WARNING assertion-quality issues found. Every test in both files calls production
code (useBattleStore.getState().apply*() or drives the adapter through fakeSocket/fakeSession) and
asserts specific field values, not tautologies or smoke checks. No expect(true).toBe(true), no
bare toBeDefined()-only assertions, no ghost loops. vi.fn() is used only for call-count/argument
spying (sock.emit, sock.connect, session.unsubscribe), never for vi.mock() module replacement --
matches the design's stated convention.

**Assertion quality**: All assertions verify real behavior

### Quality Metrics
**Linter**: No errors (pnpm eslint src/shared/realtime -- clean, zero output)
**Type Checker**: No errors (pnpm typecheck -- clean)

### Strict TDD Git History Audit

All three PRs (#57 feat/battle-store-core, #58 feat/battle-store-events, #59
feat/battle-socket-adapter) were inspected via git log --name-only. RED precedes GREEN in every
case, and each commit touches one file, with one documented exception:

| Commit | Files | RED/GREEN | One file? |
|---|---|---|---|
| ae4d3a9 | battle.store.test.ts | RED | Yes |
| ea38b65 | battle.store.ts | GREEN | Yes |
| 9420219 | index.ts | export | Yes |
| b67166d | battle.store.test.ts | RED | Yes |
| f7db35c | battle.store.ts | GREEN | Yes |
| 2655fd1 | package.json, pnpm-lock.yaml | dependency | Yes (one logical change, generated lockfile companion) |
| 85e9a12 | battle-socket.test.ts | RED | Yes |
| 3233737 | battle-socket.ts, battle-socket.test.ts | GREEN | No -- two files, see judgment below |
| 06d99e2 | index.ts | export | Yes |
| c1572a0 | docs/design/architecture.md | docs | Yes |

**Judgment on 3233737**: the commit message claims the test-file change is "Fixes the import order
in battle-socket.test.ts flagged by simple-import-sort once the module it imports existed." The
actual diff on the test file is exactly two changes: (1) reordering two import lines
alphabetically, and (2) removing an unused BATTLE_B constant. No assertion, no test body, no test
case was added, removed, or changed. This is defensible: it is a lint-driven mechanical fix that
could only be applied after battle-socket.ts existed (the RED commit 85e9a12 necessarily imports a
module that does not yet exist, so its import-sort order cannot be validated against the real
export shape until the module is created), and it changes zero test semantics. Judged as within
the spirit of strict TDD -- the test's behavior was fully written and frozen in the RED commit; the
GREEN commit's touch on the test file is cosmetic lint compliance, not new test-writing.

### Accepted Deviations (verified applied, not re-litigated)
| Deviation | Verified | Evidence |
|---|---|---|
| reset()/connection spec amended mid-flight | Applied | On-disk spec (lines 133-150) carries the amended requirement and both new scenarios; code matches |
| PR #59 at 632 changed lines vs. 400 budget (390 in the test file), maintainer-accepted exception | Recorded as accepted, not re-flagged | Merged via bd9e431; not treated as a budget failure in this report |
| Composition-root wiring deferred to Phase 9 | Applied | Confirmed by import grep -- nothing wires createBattleSocket yet |

### Issues Found

**CRITICAL**: None

**WARNING**:
- W1 -- Requirement 7 (One Battle at a Time) scenario is covered only indirectly, at the
  applyState level, not through the actual adapter.join() to store.reset() path, and not for the
  ended field that this mechanism specifically exists to protect. Code inspection confirms the
  mechanism is implemented correctly; the gap is in test coverage, not behavior. Recommend adding
  one adapter-level test: set ended via applyEnded on battle A, call adapter.join(BATTLE_B), assert
  ended is null before the next battle:state.
- W2 -- The Engram apply-progress artifact (topic sdd/add-battle-realtime/apply-progress) was
  never updated after Phase 3/PR #59 landed; it still lists Phase 3 and Phase 4 as Remaining Tasks
  and has no TDD Cycle Evidence table for the adapter. This does not affect the shipped code
  (verified independently against git/disk) but leaves a stale downstream artifact that could
  mislead a future reader who trusts Engram over disk state. Recommend refreshing that observation
  before archive.

**SUGGESTION**: None

### Verdict
**PASS WITH WARNINGS**

Phase 8's "Terminado cuando" criterion -- con el doble del socket, una secuencia de eventos deja el
store exactamente como el guide describe, incluida la reconexion con openWindow abierta -- is
satisfied. battle-socket.test.ts's acceptance test genuinely scripts the sequence (connect, join,
battle:state with an open window, transport-drop disconnect asserting the window closed
immediately and the connection state is connecting, reconnect asserting the window is still
closed proving it does not auto-reopen, a server re-emit of battle:reaction_window asserting the
window reopens only then, battle:turn_resolved, battle:ended), and every assertion in it checks
real store state, not a name that overpromises. All 8 requirements and 18/18 scenarios trace
to passing tests; Req 7's covering test satisfies the scenario as literally written, though a
narrower ended-field residue edge case through join() is untested (finding W1), a real but
non-blocking coverage gap, not a functional defect, since direct code inspection confirms the
underlying join()/reset() mechanism is implemented as designed. Full suite (947/947), typecheck,
lint, and build are all
clean at the verified commit bd9e431. Two WARNINGs are recorded (a coverage gap and a stale
downstream Engram artifact); neither blocks archive.
