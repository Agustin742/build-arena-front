# Tasks: Battle Arena (Phase 9 redo)

> **IMPLEMENTATION GATE**: Do NOT start `sdd-apply` on any PR below until the user has
> reviewed `proposal.md`, `specs/battle-arena/spec.md`, `specs/command-registry/spec.md`,
> and `design.md`, and explicitly approved them. This tasks.md is a plan, not a go-ahead.

## Git Rules (binding for every PR below)

- One file per commit: `git add <file>`. Never `git add -A`, `.`, or `--all`.
- Conventional Commits (`feat:`, `test:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- NO AI attribution trailers, ever: no `Co-Authored-By`, no `Claude-Session` line, no
  generated-by footer. This is a hard project rule independent of any session default.
- Strict TDD pair per behavior: commit the RED test alone first (must fail for the
  right reason), then a separate commit for the GREEN implementation.
- Every PR branches from `main`. All 18 PRs merge bottom-up into `main` with a merge
  commit (`--no-ff`), never squash, in the exact order listed below. Never rebase or
  force-push a published branch.
- The user reviews and merges every PR; the apply agent only opens it.
- `pnpm format:check` currently FAILS on `main` (commit `a314511`) for 3 pre-existing
  `src/shared/realtime/` files — known drift, not introduced by this change. Do not
  "fix" those files as a drive-by; only format files this change actually touches.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3200–4200 total across 18 PRs (150–380 each) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 18 PRs: 1a→1h (slice 1), 2a→2f (slice 2), 3 (slice 3), 4a→4c (slice 4) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Single live connection per mounted battle + W1 | PR 1a | `pnpm exec vitest run src/features/arena/application/use-arena-connection.test.ts src/shared/realtime/battle-socket.test.ts --maxWorkers=2` | N/A — hook unused by any screen yet | Revert 1a's merge commit; nothing else imports the hook |
| 2 | Route-derived battle scope, port, bridge, basic `volver`, connecting screen | PR 1b | `pnpm exec vitest run src/app/layout/ConsoleLayout.test.tsx src/app/routes/ArenaRoute.test.tsx --maxWorkers=2` | Two accounts, one opens `/battles/:id`, sees "Conectando…"/"Conectado", runs `volver` | Revert 1b; route falls back to placeholder |
| 3 | Autofill engine (generic, no consumer) | PR 1c | `pnpm exec vitest run src/shared/commands/pending.test.ts --maxWorkers=2` | N/A — pure engine, no command uses it yet | Revert 1c; `pending.ts` returns to today's shape |
| 4 | `enter` command with picker/autofill | PR 1d | `pnpm exec vitest run src/app/boot/arena-commands.test.ts --maxWorkers=2` | Two accounts: A challenges B, B accepts, A runs `enter` | Revert 1d; `enter` disappears, autofill engine stays unused |
| 5 | `Panel`/`PanelRow` floor measuring | PR 1e | `pnpm exec vitest run src/shared/ui/Panel.test.tsx src/shared/ui/PanelRow.test.tsx --maxWorkers=2` | N/A — `PanelRow` not rendered by any screen yet | Revert 1e; existing `Panel` tests stay green |
| 6 | Stage renders both combatants | PR 1f | `pnpm exec vitest run src/features/arena/ui/Stage.test.tsx src/features/arena/ui/CombatantCard.test.tsx --maxWorkers=2` | Both accounts in an active battle at 1280x720 and 400x800 | Revert 1f; Stage/CombatantCard removed |
| 7 | Header + arena phase + screen fragment | PR 1g | `pnpm exec vitest run src/features/arena/domain/arena-phase.test.ts src/features/arena/ui/ArenaHeader.test.tsx --maxWorkers=2` | Both accounts see "Tu turno"/"Turno de X" | Revert 1g |
| 8 | Challenger acceptance notice + `announce` | PR 1h | `pnpm exec vitest run src/app/providers/command-runtime.test.ts src/features/battles/application/acceptance.test.ts --maxWorkers=2` | A challenges B, B accepts; A sees the notice without navigating | Revert 1h |
| 9 | Narration table (pure) | PR 2a | `pnpm exec vitest run src/features/arena/application/narrate.test.ts --maxWorkers=2` | N/A — nothing renders it yet | Revert 2a |
| 10 | Transcript accumulation (pure) | PR 2b | `pnpm exec vitest run src/features/arena/application/transcript.test.ts --maxWorkers=2` | N/A — nothing renders it yet | Revert 2b |
| 11 | BattleLog wired, stick-to-bottom | PR 2c | `pnpm exec vitest run src/features/arena/ui/BattleLog.test.tsx --maxWorkers=2` | Both accounts see narrated opponent turns; scroll test at 1280x500 | Revert 2c |
| 12 | Turn-lock domain + `CommandState.battle` wiring | PR 2d | `pnpm exec vitest run src/features/arena/domain/turn-lock.test.ts src/app/layout/ConsoleLayout.test.tsx --maxWorkers=2` | N/A — no command reads the field yet | Revert 2d |
| 13 | Intent store + error copy + announcer | PR 2e | `pnpm exec vitest run src/features/arena/application/battle-error-copy.test.ts src/app/layout/ArenaErrorAnnouncer.test.tsx --maxWorkers=2` | Force a `battle:error` (e.g. reject a stale action) and see the Spanish text | Revert 2e |
| 14 | `ACTUAR` command + wait state | PR 2f | `pnpm exec vitest run src/app/boot/arena-commands.test.ts --maxWorkers=2` | Both accounts complete one full action round | Revert 2f |
| 15 | `REACCIONAR` + countdown | PR 3 | `pnpm exec vitest run src/app/boot/arena-commands.test.ts src/features/arena/ui/*Countdown*.test.tsx --maxWorkers=2` | B gets the reaction window, reacts and lets one expire | Revert 3 |
| 16 | Auto-cancel pending wizard | PR 4a | `pnpm exec vitest run src/features/arena/application/interruption.test.ts --maxWorkers=2` | Start an argument prompt, force a turn change, see it cancel with a reason | Revert 4a |
| 17 | Abandonment + reconnect + `volver` confirm | PR 4b | `pnpm exec vitest run src/features/arena/ui/ArenaHeader.test.tsx src/app/boot/arena-commands.test.ts --maxWorkers=2` | Close B's tab, watch A's countdown then closing notice | Revert 4b |
| 18 | End result + finished gate + not-found | PR 4c | `pnpm exec vitest run src/features/arena/domain/arena-phase.test.ts src/features/arena/ui/ArenaResult.test.tsx --maxWorkers=2` | Finish a battle live, then reload it from both accounts | Revert 4c |

## Browser Verification Protocol (referenced by each player-visible PR)

Two Chrome profiles/contexts, `test1@gmail.com` and `test2@gmail.com`, against the local
API. Pass `CORS_ORIGIN` on the command line if the dev port isn't 5173. Measure in real
Chrome (jsdom proves nothing about layout) at 1280x720, 1280x500 and 400x800. The window
cannot go narrower than ~502px, so use Chrome device emulation for 1280x500 and 400x800.
Measure box heights with `getBoundingClientRect` / `clientHeight` / `scrollHeight`, not by eye. Save a
screenshot per viewport to `.capturas/pr-<id>-<viewport>.png`.

---

## Slice 1 — Enter, See Combatants and Turn

### PR 1a — Socket root + `useArenaConnection` + W1
Branch: `feat/arena-connection` · Base: `main`
Spec: battle-arena "Exactly One Live Connection Per Mounted Battle" (all 3 scenarios);
`battle-realtime` W1 debt (`join()` → `reset()` clears a previous `ended`).
Files: `src/app/boot/battle-socket.ts` (new), `src/features/arena/application/use-arena-connection.ts` (new), `src/shared/realtime/battle-socket.test.ts` (modify).

- [x] 1a.1 RED — `battle-socket.test.ts`: `join()` after a prior `ended` clears it before `reset()` fires (W1). Commit alone. **Deviation**: this passed immediately against current code (15/15 green) — owed coverage, not a failed RED. Committed as `test(realtime): ...` alone.
- [x] 1a.2 GREEN — implement/fix `reset()` ordering so the test passes. **Skipped**: no production change needed; behavior already existed per Phase 8 (`join()` already calls `reset()` when `battleId !== joinedBattleId`).
- [x] 1a.3 RED — `use-arena-connection.test.ts`: mount effect invoked twice synchronously (StrictMode) yields exactly one `connect`+`join`. Commit alone.
- [x] 1a.4 GREEN — `useArenaConnection(socket, battleId, getToken, enabled)` with a ref guard. **Deviation**: implemented D2's full deferred-release mechanism directly instead of a plain ref guard, per explicit instruction (a plain ref flag is documented to leave the socket disconnected under StrictMode).
- [x] 1a.5 RED — leaving the route (unmount) closes the connection; commit alone. **Deviation**: passed immediately against the 1a.4 implementation — owed coverage, not a failed RED.
- [x] 1a.6 GREEN — cleanup calls `disconnect` directly (no timer needed on a real leave, since remount clears the deferred path below). **Skipped**: already satisfied by 1a.4's deferred-release mechanism; no separate production change.
- [x] 1a.7 RED — same-`battleId` remount without leaving keeps a single connection, no visible disconnect. Commit alone. **Deviation**: passed immediately against the 1a.4 implementation — owed coverage, not a failed RED.
- [x] 1a.8 GREEN — deferred release: cleanup schedules `setTimeout(disconnect, 0)`; a remount with the same id clears that timer before it fires. **Skipped**: already implemented at 1a.4 (module-scoped `WeakMap<BattleSocket, ...>` ownership, not `useRef`, since a genuine route unmount+remount destroys refs but the design's own scenario 3 requires state to survive it).
- [x] 1a.9 `src/app/boot/battle-socket.ts`: `createBattleSocket({ url, subscribeToAccessToken })` wired to `useSessionStore.subscribe`, forwarding only on `accessToken` change (D1).
- [x] 1a.10 No browser verification — the hook has no importer yet (matches design's "No" for 1a).

### PR 1b — Route scope, navigation port, basic `volver`, connecting screen
Branch: `feat/arena-route-scope` · Base: `main`
Spec: battle-arena "`ConsoleLayout` Derives Battle Scope From the Route" (all 4 scenarios).
Files: `src/app/layout/ConsoleLayout.tsx`, `src/app/layout/NavigationBridge.tsx` (new), `src/features/arena/application/ports.ts` (new), `src/app/boot/navigation.ts` (new), `src/app/boot/arena-commands.ts` (new, `volver` only), `src/app/routes/AppRoutes.tsx`, `src/app/routes/ArenaRoute.tsx` (new).

- [x] 1b.1 RED — off the arena route, `battleId` is `null` and `reactionWindowOpen` is `false` (regression guard). Commit alone. **Deviation**: passed immediately against the current hardcoded implementation (owed coverage, not a failed RED, same pattern as 1a.1/1a.5/1a.7).
- [x] 1b.2 RED — on `/battles/:id` with no `battle:state` yet, `battle` scope is already active, driven by `useMatch`, not the store (D3). Commit alone.
- [x] 1b.3 RED — `battle` scope stays active on a `NOT_FOUND` error before any state. Commit alone.
- [x] 1b.4 RED — `reactionWindowOpen` still follows the store's open window while on the route. Commit alone.
- [x] 1b.5 GREEN — `ConsoleLayout` reads `useMatch('/battles/:battleId')` for `battleId` (D3); passes all four RED tests.
- [x] 1b.6 GREEN — `ArenaNavigation` port in `features/arena/application/ports.ts`; `app/boot/navigation.ts` implements it; `NavigationBridge` inside `ConsoleLayout` supplies `useNavigate` (D8). **Deviation**: also created `features/arena/index.ts` (originally scheduled for PR 1g) — the `no-restricted-imports` rule forbids deep `@/features/*/*` imports, and both `ArenaRoute` and `app/boot/arena-commands.ts` need to consume the feature from outside it.
- [x] 1b.7 GREEN — `ArenaRoute` renders `<ScreenPlaceholder>`-replacing text ("Conectando…"/"Conectado") and calls `useArenaConnection` (PR 1a's hook, now consumed for the first time). **Deviation**: `socket`/`getToken` are injectable props defaulting to the real singleton and the session store, matching the `HealthGate`/`CatalogGate` DI pattern — needed to keep the component testable without a real websocket.
- [x] 1b.8 GREEN — minimal `volver` command (scope `battle`) that calls `toLobby()`, no confirmation logic yet (added in PR 4b). **Deviation**: the command logic lives in `features/arena/application/arena.commands.ts` (`createArenaCommands`, DI'd and unit-testable, per design's own file table), with `app/boot/arena-commands.ts` as the thin untested composition root — mirrors `battle-commands.ts`/`createBattlesCommands`.
- [x] 1b.9 GREEN — `AppRoutes.tsx`: `/battles/:battleId` renders `ArenaRoute` instead of the placeholder.
- [ ] 1b.10 Browser verification (protocol above): both accounts open `/battles/:id` for a live battle, see "Conectando…" then "Conectado"; run `volver`, confirm it returns to the lobby with no confirmation prompt. Screenshot at all 3 viewports. **Blocked**: the chrome-devtools MCP tools (and `ToolSearch`) were not available in the apply session's toolset, so this could not be attempted. The local API and dev server were started and confirmed healthy (both cleanly stopped afterward, `pnpm exec vitest run`/`typecheck`/`lint` all still green), but no browser interaction was possible. Needs a session with chrome-devtools MCP access to complete.

### PR 1c — Autofill engine (generic, no consumer yet)
Branch: `feat/arena-autofill-engine` · Base: `main`
Spec: command-registry "A Pending Step Autofills When Its Value Is Already Determined by
Context" — only the generic scenario ("a step without autofill behaves exactly as today").
Files: `src/shared/commands/types.ts`, `src/shared/commands/pending.ts`, `src/app/providers/CommandRuntimeProvider.tsx`, `src/app/providers/command-runtime.ts`.

- [x] 1c.1 RED — `pending.test.ts`: a fixture step with an `autofill` returning a value skips the prompt when `begin` runs. Commit alone. Confirmed failing (`begin` returned `pending`, expected `filled`) before the GREEN commit.
- [x] 1c.2 RED — `pending.test.ts`: a fixture step with an `autofill` returning `undefined` prompts normally (condition not met). Commit alone. **Deviation**: passed immediately (owed coverage, same pattern as 1a.1/1a.5/1a.7/1b.1) — `begin` already returned `pending` for an unhandled step before autofill existed.
- [x] 1c.3 RED — `pending.test.ts`: a step with no `autofill` behaves exactly as before (regression guard). Commit alone. **Deviation**: passed immediately — same owed-coverage pattern, existing behavior unaffected by the new optional `ctx` parameter.
- [x] 1c.4 GREEN — add `CommandArg.autofill?: (ctx, values) => string | undefined` to `types.ts`.
- [x] 1c.5 GREEN — `begin` and `advance` in `pending.ts` call `autofill` before prompting; both take a new `ctx` argument (D7). **Deviation**: `ctx` is an optional third parameter (not required) on `begin`, so every pre-existing call site in `pending.test.ts` keeps compiling and passing unchanged; `advance` already took `ctx` from before this PR.
- [x] 1c.6 GREEN — `CommandRuntimeProvider.tsx`: thread `ctx` into both `begin(...)` call sites (`handleResolveOutcome`, `selectItem`). `command-runtime.ts` needed no change (it only defines the context/type, no `begin` call).
- [x] 1c.7 No browser verification — inert per design (nothing wires `ctx`/autofill into a real command yet).

### PR 1d — `enter` command (picker + autofill + ACCEPTED confirm)
Branch: `feat/arena-enter-command` · Base: `main`
Spec: battle-arena "Entering a Battle by Command" (all 3 scenarios); command-registry
autofill scenarios for `enter`'s `battle` and `confirm` steps.
Files: `src/app/boot/arena-commands.ts` (modify), `src/features/battles/application/battle-queries.ts` (reuse live-battles list).

- [ ] 1d.1 RED — exactly one live battle: `enter`'s `battle` step autofills without a picker. Commit alone.
- [ ] 1d.2 RED — two+ live battles: `enter` opens a numbered picker. Commit alone.
- [ ] 1d.3 RED — chosen battle is `ACCEPTED`: `confirm` step does NOT autofill, prompts "Entrar arranca la batalla. ¿Seguimos?". Commit alone.
- [ ] 1d.4 RED — chosen battle is `IN_PROGRESS`: `confirm` step autofills, no prompt. Commit alone.
- [ ] 1d.5 GREEN — implement `enter` (scopes `lobby`, `battles`) with `battle` and `confirm` steps using PR 1c's `autofill`; confirmed entry calls `toArena(battleId)`.
- [ ] 1d.6 Browser verification (protocol above): A has exactly one live battle with B, runs `enter`, joins directly; separately, with two live battles, `enter` shows a picker.

### PR 1e — `Panel`/`PanelRow` floor measuring
Branch: `refactor/panel-row-floor` · Base: `main`
Spec: supports battle-arena "Stage Shows Every Combatant Field" (desktop/phone layout
mechanics only; Stage itself lands in PR 1f). No screen renders `PanelRow` yet.
Files: `src/shared/ui/Panel.tsx` (modify), `src/shared/ui/PanelRow.tsx` (new).

- [ ] 1e.1 RED — `Panel.test.tsx`: existing default `scroll` boolean behavior stays green after adding `scroll: boolean | 'narrow'` (regression guard). Commit alone.
- [ ] 1e.2 GREEN — `Panel` accepts `scroll="narrow"`; frame/body get `data-panel-frame`/`data-panel-body` (D15).
- [ ] 1e.3 RED — `PanelRow.test.tsx`: with stubbed `getBoundingClientRect`, the row's `--panel-floor` equals the LARGEST card floor, not the first or an average. Commit alone.
- [ ] 1e.4 RED — validator-flagged case: after mount, a card's frame height changes (e.g. a card grows) WITHOUT `PanelRow` re-rendering for an unrelated reason; `--panel-floor` still updates. Stub `getBoundingClientRect` per card and trigger the `ResizeObserver` callback manually in the test. Commit alone.
- [ ] 1e.5 GREEN — `PanelRow` finds each card via `querySelectorAll('[data-panel-frame]')`, computes `max(measureFloor(frame, body))` per card, and attaches ONE `ResizeObserver` PER CARD FRAME (not only a container-level observer), so any single card's floor change re-measures the row — this is the fix for the "floor can go stale" risk. Effect re-measures on every commit (no stale-dependency array), mirroring `Panel.tsx:61-63`.
- [ ] 1e.6 No browser verification — `PanelRow` has no importer yet (Stage wires it in PR 1f).

### PR 1f — Stage + `CombatantCard`
Branch: `feat/arena-stage` · Base: `main`
Spec: battle-arena "Stage Shows Every Combatant Field" (both scenarios).
Files: `src/features/arena/application/names.ts` (new), `src/features/arena/ui/CombatantCard.tsx` (new), `src/features/arena/ui/Stage.tsx` (new).

- [ ] 1f.1 RED — `names.test.ts`: `namesOf` returns the session user's own name and the rival's from the cached `GET /battles` row, falling back to "Rival" on a cache miss (D11). Commit alone.
- [ ] 1f.2 GREEN — implement `namesOf(combatants, self, rival)`.
- [ ] 1f.3 RED — `CombatantCard.test.tsx`: renders all 7 field groups (name, HP bar+number, conditions+rounds, reaction availability, attributes, AC, initiative) from a fixture combatant. Commit alone.
- [ ] 1f.4 GREEN — implement `CombatantCard` as a `Panel` (non-scrolling desktop, `scroll="narrow"` below `sm`, per D15).
- [ ] 1f.5 RED — `Stage.test.tsx`: desktop viewport renders both `PanelRow` items in one row; phone viewport stacks them (assert on the `contents`/row classes, not exact pixels — pixels are proven in the browser step). Commit alone.
- [ ] 1f.6 GREEN — implement `Stage` composing two `CombatantCard`s inside `PanelRow`.
- [ ] 1f.7 Browser verification (protocol above): both accounts in a live battle; confirm both combatant boxes show every field, are not cut when there's room, and stack correctly on the 400x800 viewport.

### PR 1g — `ArenaHeader`, arena phase, `ArenaScreen` fragment
Branch: `feat/arena-header-phase` · Base: `main`
Spec: battle-arena "Turn Header Shows Whose Turn It Is" (both scenarios).
Files: `src/features/arena/domain/arena-phase.ts` (new), `src/features/arena/ui/ArenaHeader.tsx` (new), `src/features/arena/ui/ArenaScreen.tsx` (new), `src/features/arena/index.ts` (new).

- [ ] 1g.1 RED — `arena-phase.test.ts`: `arenaPhaseOf` returns `connecting` before `battle:state`, `live` once combatants exist (D16, `connecting`/`live` only — `ended`/`finished`/`not-found` land in PR 4c). Commit alone.
- [ ] 1g.2 GREEN — implement the `connecting`/`live` branches of `arenaPhaseOf`.
- [ ] 1g.3 RED — `ArenaHeader.test.tsx`: `activeUserId === viewer` shows "Tu turno"; `activeUserId === rival` shows "Turno de {rival}". Commit alone.
- [ ] 1g.4 GREEN — implement `ArenaHeader`.
- [ ] 1g.5 GREEN — `ArenaScreen` returns a fragment (never a wrapping `div`) with `ArenaHeader` and `Stage` (from PR 1f) as direct children of the `'screen'` slot; wire into `ArenaRoute` (replacing PR 1b's placeholder text once `live`).
- [ ] 1g.6 Browser verification (protocol above): both accounts see the correct "Tu turno"/"Turno de X" line update as the active turn flips.

### PR 1h — `announce` + challenger acceptance notice
Branch: `feat/arena-challenger-notice` · Base: `main`
Spec: battle-arena "Challenger Sees an Acceptance Notice Without Navigating" (both
scenarios); command-registry "Announcing an Out-of-Band Result" (all 3 scenarios).
Files: `src/app/providers/command-runtime.ts` (modify), `src/features/battles/application/battle-queries.ts` (modify), `src/features/battles/application/acceptance.ts` (new), `src/app/layout/AcceptanceNoticeWatcher.tsx` (new).

- [ ] 1h.1 RED — `command-runtime.test.ts`: `announce(result)` prints into `salida` without a command run and without touching `pending`. Commit alone.
- [ ] 1h.2 RED — a later command result replaces the announced text. Commit alone.
- [ ] 1h.3 GREEN — implement `announce(result: CommandResult)` on `CommandRuntime`.
- [ ] 1h.4 RED — `acceptance.test.ts`: `acceptedChallenges(prev, next)` returns rows that went `PENDING → ACCEPTED` where `role === 'CHALLENGER'`; the first snapshot only sets the baseline (no false positive on mount). Commit alone.
- [ ] 1h.5 GREEN — implement `acceptedChallenges`.
- [ ] 1h.6 GREEN — `useBattlesPoll(api, enabled)`: `useQuery({ ...battlesQuery(api), refetchInterval: 10_000 })`, enabled while authenticated and off the arena route (D13); `AcceptanceNoticeWatcher` calls `announce` on a transition, keeping announced ids in a `Set`.
- [ ] 1h.7 Browser verification (protocol above): A challenges B; B accepts; A (still on the lobby screen) sees the notice print without navigating and without losing an open wizard.

---

## Slice 2 — Act and See the Result in Log

### PR 2a — Narration table (pure)
Branch: `feat/arena-narration` · Base: `main`
Spec: supports battle-arena "BattleLog Narrates Events" (content only; nothing renders it
yet — inert PR).
Files: `src/features/arena/application/narrate.ts` (new).

- [ ] 2a.1 RED — `narrate.test.ts`: one case per Narration Table row (13 events), including both `ATTACK_ROLLED` outcomes (hit/critical/miss ≤2/miss >2) and the advantage/disadvantage two-dice rendering with the `kept` roll marked. Commit alone.
- [ ] 2a.2 GREEN — implement `narrateEvent(event, names)` as an exhaustive `switch` ending in `assertNever` (D9).
- [ ] 2a.3 RED — `narrateTurn(turn, names)` fallback test for a turn with no matching event type. Commit alone.
- [ ] 2a.4 GREEN — implement `narrateTurn`.
- [ ] 2a.5 No browser verification — pure module, no renderer yet.

### PR 2b — Transcript accumulation (pure)
Branch: `feat/arena-transcript` · Base: `main`
Spec: supports battle-arena "Empty `events` Reconstructs From `turns`/`combatants`" and
"History Merges by `(round, sequence)`, Never Replaces" (logic only — inert PR, split out
of BattleLog per review-workload guidance to keep PR 2c under budget).
Files: `src/features/arena/application/transcript.ts` (new).

- [ ] 2b.1 RED — `transcript.test.ts`: new `(round, sequence)` key with grown `log` narrates the new log slice. Commit alone.
- [ ] 2b.2 RED — new keys, same `log` length: narrates those turns directly. Commit alone.
- [ ] 2b.3 RED — grown `log` and changed `currentRound`: emits the round-start line. Commit alone.
- [ ] 2b.4 RED — no new key, same round: idempotent re-emit adds nothing even carrying events. Commit alone.
- [ ] 2b.5 RED — empty `events` on a re-emit: synthesizes exactly one line from `turns`/`combatants` deltas, never zero, never two (Requirement: Empty events Reconstructs). Commit alone.
- [ ] 2b.6 RED — shrunk `log` or changed `battleId`: rebuilds from the full `turns` (Requirement: History Merges by (round, sequence)). Commit alone.
- [ ] 2b.7 GREEN — implement `transcriptStep(transcript, prev, next, names)` satisfying all 6 cases (D10).
- [ ] 2b.8 No browser verification — pure module, consumed by PR 2c.

### PR 2c — `bodyRef` + stick-to-bottom + `BattleLog` wired
Branch: `feat/arena-battle-log` · Base: `main`
Spec: battle-arena "BattleLog Narrates Events, Sticking to the Bottom Only at Rest" (all 4
scenarios end-to-end).
Files: `src/shared/ui/Panel.tsx` (modify — new `bodyRef` prop), `src/features/arena/ui/BattleLog.tsx` (new).

- [ ] 2c.1 RED — `Panel.test.tsx`: `bodyRef` exposes the scrollable body element (regression-safe addition). Commit alone.
- [ ] 2c.2 GREEN — add `bodyRef` prop to `Panel` (D17).
- [ ] 2c.3 RED — `BattleLog.test.tsx`: stub `scrollHeight`, `clientHeight`, and one line's height on the body element (jsdom has no real layout — this stub is mandatory per the design's flagged risk); at the bottom, appending 3 lines scrolls the view to follow. Commit alone.
- [ ] 2c.4 RED — with the same stubs, fire a `scroll` event that moves the reader away from the bottom, then append 3 lines: the view does NOT move. Commit alone.
- [ ] 2c.5 RED — first render, and any history rebuild, jump to the bottom regardless of prior scroll position. Commit alone.
- [ ] 2c.6 GREEN — implement `BattleLog`: `atBottom` ref starts `true`; a `scroll` listener updates it via `scrollHeight - scrollTop - clientHeight <= oneLineHeight`; a `useLayoutEffect` on line changes reads the ref BEFORE the append-driven re-render (per D17, not after commit) and force-scrolls when `true`; wire PR 2a's `narrateEvent`/PR 2b's `transcriptStep`.
- [ ] 2c.7 Browser verification (protocol above): both accounts see the opponent's turns narrate with the correct dice number; scroll up mid-turn and confirm new lines don't pull the view away, at 1280x500 (short viewport, log under height pressure).

### PR 2d — Turn-lock domain + `CommandState.battle` wiring
Branch: `feat/arena-turn-lock` · Base: `main`
Spec: supports battle-arena "`ACTUAR` Locks With a Reason Off-Turn" (state plumbing only —
no command reads the field yet, per design's "No" for this slot).
Files: `src/features/arena/domain/turn-lock.ts` (new), `src/features/arena/application/use-arena-command-state.ts` (new), `src/shared/commands/types.ts` (modify — `CommandState.battle`), `src/app/layout/ConsoleLayout.tsx` (modify).

- [ ] 2d.1 RED — `turn-lock.test.ts`: `actionLockOf` returns locks in order `sin conexión` > `la batalla terminó` > `esperando al adversario` > `no es tu turno`, one row per precedence case (D5). Commit alone.
- [ ] 2d.2 GREEN — implement `actionLockOf`.
- [ ] 2d.3 RED — `useArenaCommandState` memoizes on primitive values, not a raw `getState()` read (regression guard against stale-lock risk, D4). Commit alone.
- [ ] 2d.4 GREEN — implement `useArenaCommandState()`; add `CommandState.battle?: { actionLock, reactionLock }` to `types.ts`; wire into `ConsoleLayout`.
- [ ] 2d.5 No browser verification — no command reads `battle` yet (visible only once PR 2f ships `ACTUAR`).

### PR 2e — Intent store + error copy + `ArenaErrorAnnouncer`
Branch: `feat/arena-error-copy` · Base: `main`
Spec: battle-arena "Every Error Code Shows Spanish Text and Keeps the Session" (scenario);
supports "No Ack — Wait, Then Narrate or Error" (settlement half only — `ACTUAR` itself
ships in PR 2f).
Files: `src/features/arena/application/arena-intent.store.ts` (new), `src/features/arena/application/battle-error-copy.ts` (new), `src/app/layout/ArenaErrorAnnouncer.tsx` (new).

- [ ] 2e.1 RED — `battle-error-copy.test.ts`: one case per of the 10 `battleErrorCodeSchema` codes maps to its exact Spanish text from the Error Copy Table. Commit alone.
- [ ] 2e.2 GREEN — implement `battleErrorCopy(code)` as a `switch` ending in `assertNever` (D12).
- [ ] 2e.3 RED — `ArenaErrorAnnouncer.test.tsx`: a new `lastError` identity triggers exactly one `announce`; the socket is not closed and the arena session does not end. Commit alone.
- [ ] 2e.4 GREEN — implement `ArenaErrorAnnouncer` (app layer, inside the provider).
- [ ] 2e.5 RED — `arena-intent.store.test.ts`: the intent clears on any transition changing `turns` keys, `lastError` identity, `ended`, `activeUserId`, `battleId`, or `connection` leaving `open` (D6). Commit alone.
- [ ] 2e.6 GREEN — implement `arena-intent.store.ts` (zustand) holding `{ battleId, round, kind } | null`.
- [ ] 2e.7 Browser verification (protocol above): force a `battle:error` (e.g. one account submits a stale/duplicate action) and confirm the Spanish text shows once and the socket stays connected.

### PR 2f — `ACTUAR` + "Esperando al adversario…"
Branch: `feat/arena-actuar` · Base: `main`
Spec: battle-arena "`ACTUAR` Offers the Frozen Kit's Actions", "`ACTUAR` Locks With a
Reason Off-Turn" (full), "No Ack — Wait, Then Narrate or Error" (full, all 3 scenarios).
Files: `src/app/boot/arena-commands.ts` (modify — add `ACTUAR`).

- [ ] 2f.1 RED — `arena-commands.test.ts`: `ACTUAR` lists only the frozen kit's `type: 'ACTION'` skill codes, named from the catalog, without calling `GET /builds`. Commit alone.
- [ ] 2f.2 RED — own turn: `ACTUAR` is enabled; rival's turn: `ACTUAR` is locked with a stated reason (reads PR 2d's `actionLockOf` via `CommandState.battle`). Commit alone.
- [ ] 2f.3 RED — after `battle:action` is sent, no "acción declarada" text appears and commands stay locked until a server response. Commit alone.
- [ ] 2f.4 RED — `battle:turn_resolved` clears the wait message, narrates (PR 2c), and unlocks commands. Commit alone.
- [ ] 2f.5 RED — `battle:error` clears the wait message, shows the matching text (PR 2e), and unlocks commands. Commit alone.
- [ ] 2f.6 GREEN — implement `ACTUAR` (scope `battle`): options from combatant `skillCodes` × catalog filtered to `ACTION`; emits via `ArenaGateway.declareAction`; sets the intent store (PR 2e) after emitting; shows "Esperando al adversario…" while `pending.kind === 'action'`.
- [ ] 2f.7 Browser verification (protocol above): A acts, sees "Esperando al adversario…", then the narrated dice line; B sees the same line and the turn passes to B.

---

## Slice 3 — React With Countdown

### PR 3 — `REACCIONAR` + 15s countdown + decline row
Branch: `feat/arena-reaccionar` · Base: `main`
Spec: battle-arena "`REACCIONAR` Offers a 15s Countdown and a Decline Row" (all 3
scenarios); "Reconnect Re-Shows the Prompt Only if the Server Re-Sends It" (both
scenarios).
Files: `src/app/boot/arena-commands.ts` (modify — add `REACCIONAR`).

- [ ] 3.1 RED — declining (`0) no reaccionar`) sends no `battle:reaction` and closes the window UI. Commit alone.
- [ ] 3.2 RED — letting the 15s countdown expire sends no `battle:reaction`. Commit alone.
- [ ] 3.3 RED — picking an applicable skill code emits `battle:reaction { battleId, skillCode }`. Commit alone.
- [ ] 3.4 RED — after a disconnect, `battle:state.openWindow === null` on reconnect shows no reaction prompt (no client-held re-show). Commit alone.
- [ ] 3.5 RED — after a disconnect, `battle:state.openWindow` arrives non-null with `remainingMs`: the prompt re-shows with the countdown resuming from that value. Commit alone.
- [ ] 3.6 GREEN — implement `REACCIONAR` (scope `reaction-window`): options are `applicableSkillCodes` plus `{ key: '0', id: 'none' }`; renders `<Countdown key={deadline} remainingMs={openWindow.remainingMs}/>` from the server's value only (D14); expiry sends nothing.
- [ ] 3.7 Browser verification (protocol above): B gets the 15s window, reacts once (skill emits), lets a second window expire (nothing sent); confirm A sees the round resolve either way.

---

## Slice 4 — Errors, Abandonment, End

### PR 4a — `cancelPending(notice)` + `ArenaInterruptionWatcher`
Branch: `feat/arena-auto-cancel` · Base: `main`
Spec: command-registry "Cancelling a Pending Command" (modified — the notice-argument
scenarios); battle-arena "Pending Wizard Auto-Cancels With a Printed Reason".
Files: `src/shared/commands/pending.ts` / `src/app/providers/command-runtime.ts` (modify — `cancelPending(notice?)`), `src/features/arena/application/interruption.ts` (new), `src/app/layout/ArenaInterruptionWatcher.tsx` (new).

- [ ] 4a.1 RED — `cancelPending()` with no argument stays silent (regression guard on today's `Esc` behavior). Commit alone.
- [ ] 4a.2 RED — `cancelPending({ message })` drops the pending command AND prints the message via `announce`. Commit alone.
- [ ] 4a.3 GREEN — extend `cancelPending(notice?: CommandResult)` per Fork (b) — no argument keeps silent behavior exactly.
- [ ] 4a.4 RED — `interruption.test.ts`: `interruptionNotice(prev, next)` returns a printable reason on a route id / `activeUserId` / window `round:actor` / `connection` / `ended` change, matching an `interruptionKey` diff. Commit alone.
- [ ] 4a.5 GREEN — implement `interruptionNotice`.
- [ ] 4a.6 RED — `ArenaInterruptionWatcher.test.tsx`: with `pending !== null`, an `interruptionKey` change calls `cancelPending(interruptionNotice(prev, next))` exactly once. Commit alone.
- [ ] 4a.7 GREEN — implement `ArenaInterruptionWatcher`.
- [ ] 4a.8 Browser verification (protocol above): open an argument prompt (e.g. start `ACTUAR`'s skill picker), force a turn change from the other account, confirm the prompt drops with a printed reason.

### PR 4b — Abandonment countdown, reconnect banner, `volver` confirmation
Branch: `feat/arena-abandonment` · Base: `main`
Spec: battle-arena "Reconnecting Locks Actions With a Stated Reason"; "Voluntary Exit Warns
About the 2-Minute Forfeit" (both scenarios); "Opponent Abandonment Shows the Countdown,
Then the Closing Notice".
Files: `src/features/arena/ui/ArenaHeader.tsx` (modify), `src/app/boot/arena-commands.ts` (modify — `volver` confirm step).

- [ ] 4b.1 RED — while reconnecting, the header shows "Reconectando…" and `ACTUAR` is locked with "sin conexión" (reuses PR 2d's `actionLockOf`). Commit alone.
- [ ] 4b.2 GREEN — wire the `connection` state into `ArenaHeader` / `actionLockOf` inputs.
- [ ] 4b.3 RED — `IN_PROGRESS` battle: `volver`'s `confirm` step does NOT autofill, prompts "Si no volvés en 2 minutos, perdés". Commit alone.
- [ ] 4b.4 RED — not `IN_PROGRESS` (or no result yet): `volver` autofills, no prompt (regression guard on PR 1b's minimal `volver`). Commit alone.
- [ ] 4b.5 GREEN — add the `confirm` step + autofill to `volver` (PR 1c's engine).
- [ ] 4b.6 RED — `battle:opponent_left` shows the rival's local-clock countdown from `deadline`; on expiry, shows "X abandonó. Actuá para cerrar la batalla" and auto-sends nothing (D14). Commit alone.
- [ ] 4b.7 GREEN — implement the abandonment countdown and expiry line.
- [ ] 4b.8 Browser verification (protocol above): B closes their tab mid-battle; A confirms the countdown shows, then the closing notice at expiry, with no auto-sent message. Separately, A runs `volver` in an `IN_PROGRESS` battle and confirms the warning shows.

### PR 4c — `battle:ended` result, REST `finished` gate, `NOT_FOUND` exit
Branch: `feat/arena-end-and-finished` · Base: `main`
Spec: battle-arena "`battle:ended` Shows the Full Result"; "Reloading a Finished Battle
Blocks Re-Entry"; "`NOT_FOUND` Shows a Dedicated Exit".
Files: `src/features/arena/domain/arena-phase.ts` (modify — `ended`/`finished`/`not-found`), `src/features/arena/ui/ArenaResult.tsx` (new), `src/app/routes/ArenaRoute.tsx` (modify — REST gate).

- [ ] 4c.1 RED — live `battle:ended` shows won/lost and both players' rating change from `ratingChanges`. Commit alone.
- [ ] 4c.2 GREEN — implement `ArenaResult` and the `ended` branch of `arenaPhaseOf`.
- [ ] 4c.3 RED — REST status `FINISHED` for the route id shows "Esta batalla ya terminó" + `volver`, with `enabled = false` so no socket connects (D16, D11). Commit alone.
- [ ] 4c.4 GREEN — `ArenaRoute` checks the cached `GET /battles` row (fetching once on a cache miss) before connecting; `finished` branch of `arenaPhaseOf`.
- [ ] 4c.5 RED — a missing row, or `NOT_FOUND`/`WRONG_STATUS` arriving before any state, shows "Esa batalla no existe o no es tuya" + `volver`. Commit alone.
- [ ] 4c.6 GREEN — implement the `not-found` branch of `arenaPhaseOf` and its screen state.
- [ ] 4c.7 Browser verification (protocol above): finish a battle live and confirm both accounts see the result and rating change; reload the same battle URL and confirm "Esta batalla ya terminó"; navigate to a random/foreign battle id and confirm the `NOT_FOUND` exit.

## Open Items Carried From Design (not blocking, track before/at PR 4c)

- [ ] Confirm against the real API whether joining a `FINISHED` battle returns
  `battle:state` or `WRONG_STATUS` (affects PR 4c's gate).
- [ ] Confirm acceptable clock-skew tolerance for PR 4b's local-clock abandonment
  countdown.
