# Proposal: Battle Arena (Phase 9 redo)

## Intent

A player can accept a battle but cannot fight it: `/battles/:battleId` renders `<ScreenPlaceholder name="arena" />` and the Phase 8 realtime layer has no importer. The first Phase 9 attempt met 12/12 requirements on paper, never reached `main`, and was unusable in the browser, so it was deleted. Success now means the user plays each slice against the real local API with two accounts, from `main`.

References: `docs/design/implementation-plan.md` §Fase 9, §Fase 10; `docs/design/overview.md` §3.1, §3.2, §3.5, §3.6, §3.8; `docs/frontend-guide.md` §7–§8; `openspec/specs/battle-realtime/`.

## Scope

### In Scope (user decisions 1–20, encoded, not re-opened)

- Socket composition root (`SubscribeToAccessToken` wired to the session store, mirroring `app/boot/api-client.ts`); `ConsoleLayout` takes `battleId` from the `/battles/:battleId` route and `reactionWindowOpen` from `useBattleStore` (see design D3).
- Entry by command (2, 16A, 18A): one live battle enters directly, several open a numbered picker, `ACCEPTED` warns "Entrar arranca la batalla. ¿Seguimos?".
- Stage (19B): per combatant name (6A), HP bar + number, conditions + rounds, reaction available, attributes, AC, initiative; two boxes side by side on desktop, stacked on phone.
- Header "Tu turno / Turno de X" with `ACTUAR` locked with a reason (3A), "Reconectando…" + "sin conexión" (15A).
- `ACTUAR` from `skillCodes` × catalog (overview §3.5); "Esperando al adversario…" with commands locked until `turn_resolved` or `battle:error` (5, 17A).
- `REACCIONAR` with 15s `Countdown`, `0) no reaccionar` row (12A); expiry sends nothing.
- BattleLog inside `features/arena` (8A), auto-scroll, narrative lines keeping dice numbers (14); events-empty reconstruction from `turns` / `combatants` deltas.
- Spanish copy for all 10 `battleErrorCodeSchema` codes (13A, 20A); abandonment notice + expiry line (11A); `volver` confirmation (10A).
- Live `battle:ended` result with won/lost + rating; reload of a finished battle shows "Esta batalla ya terminó" + `volver` (7A).
- Pending wizard auto-cancel with a printed reason (4A).
- Challenger acceptance notice (1).
- Owed Phase 8 test W1: `join()` → `reset()` clears a previous `ended`.

### Out of Scope

- ASCII combatant models (Stage stays swappable per overview §3.2).
- Phase 10 query invalidation (leaderboard, profile) and a lobby result view beyond 7A.
- A generic shared `LogPanel` (8A rejected it).
- A policy for console overflow on very short screens (left open by the user).
- Any API change; any user-level socket channel.

## Capabilities

### New Capabilities
- `battle-arena`: entry, Stage, BattleLog narration, action/reaction prompts, wait/reconnect/abandon/error/end states, challenger notice.

### Modified Capabilities
- `command-registry`: "Cancelling a Pending Command" gains a programmatic cancel that prints a reason; the runtime gains an out-of-band notice into `salida`.
- `battle-realtime`: None at requirement level (W1 is test debt under the existing reset requirement).

## Approach

Command-driven arena, as everywhere else. Stage and BattleLog are read-only `useBattleStore` subscribers rendered inside the existing `'screen'` `ConsoleSlot` (natural-size Stage, scrolling BattleLog, both under the user's height rule: natural size, 3-line floor, focused yields last). Prompts are `battle` / `reaction-window` scoped commands. Mount uses the `useSessionBootstrap` `useRef` guard.

### Fork (a): challenger notice surface — resolved

Poll `GET /battles` (`refetchInterval` on `battlesQuery`, ~10s, reviewable) while authenticated and outside a battle; a `PENDING → ACCEPTED` transition where the player is `CHALLENGER` prints "X aceptó tu desafío. Escribí `enter` para pelear" in the existing `salida` box through a new runtime `announce(result: CommandResult)`. It does not navigate and does not touch an open wizard.
- Tradeoff: the next command's output replaces the notice; accepted because `battles` still lists it, and no new box competes for height on short screens. Rejected: a fifth console slot (height pressure) and a silent next-read (fails "notify").

### Fork (b): `cancelPending` reason — resolved

`cancelPending(notice?: CommandResult)`: clears `pending` and, when given, calls `announce(notice)`. No argument keeps today's silent `Esc` behavior. An arena-level effect calls it on turn / window / battle / connection change ("La ventana se cerró").
- Tradeoff: a full `CommandResult` instead of a `string` lets the same channel carry error tone (`battle:error`) without a second API; slightly wider than 4A strictly needs.

## Delivery (9A)

Spec artifacts land first as their own PR from `docs/add-battle-arena-spec`. Then four playable slices, in order. Every PR bases on `main`, merges bottom-up with a merge commit (never squash), one file per commit, red test committed alone. Each PR leaves `main` working.

| # | Slice | Likely PRs | Done when (user, browser, real API, two accounts) |
|---|-------|-----------|------|
| 1 | Enter + see combatants and turn | 2–3 (socket root + layout wiring + W1; entry/picker; Stage + header) | From A, `enter` a battle accepted by B: both see both Stages with names and "Tu turno / Turno de X"; challenger got the acceptance notice |
| 2 | Act + see result in log | 2 (BattleLog + narration; `ACTUAR` + wait state) | A acts, sees "Esperando al adversario…", then a narrated line with the dice number; B sees the same line and the turn passes |
| 3 | React with countdown | 1–2 | B gets the 15s window, reacts or picks `0) no reaccionar`; letting it expire sends nothing and the round resolves |
| 4 | Errors, abandonment, end | 2–3 (error copy + 4A; abandon + `volver` + reconnect; end + finished reload + `NOT_FOUND`) | Closing B's tab shows the 2-minute notice then "B abandonó. Actuá para cerrar la batalla"; a finished battle shows result and rating; reloading it says "Esta batalla ya terminó" |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/boot/battle-socket.ts` | New | Socket composition root |
| `src/app/layout/ConsoleLayout.tsx` | Modified | Battle state into `CommandState` |
| `src/app/providers/CommandRuntimeProvider.tsx`, `command-runtime.ts` | Modified | `announce`, `cancelPending(notice?)` |
| `src/app/boot/` (arena commands) | New | `enter`, `ACTUAR`, `REACCIONAR`, `volver` |
| `src/features/arena/` | New | Stage, BattleLog, narration, error copy, notices |
| `src/features/battles/application/battle-queries.ts` | Modified | Poll + acceptance detection |
| `src/app/routes/AppRoutes.tsx` | Modified | Placeholder replaced |
| `src/shared/realtime/battle-socket.test.ts` | Modified | W1 test |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Passing tests, unusable screen (the deleted attempt) | High | Browser "done when" per slice, user plays before merge |
| 400-line budget: slices exceed one PR | High | 2–3 PRs per slice, each usable |
| Short-screen overflow worsened by BattleLog | Med | Out of scope; measure at 1280x500 and phone, report |
| StrictMode double mount of a live socket | Med | `useRef` guard + mount/unmount/remount test |
| `battleId` wiring regresses lobby scoping | Med | Keep `ConsoleLayout` / `scope` tests green |
| Polling cost / stale notice | Low | Poll only outside battles; interval reviewable |

## Rollback Plan

Revert slice PRs in reverse order (merge commits keep this clean). The route falls back to the placeholder, the poll stops, `cancelPending()` returns to silent. No schema, API, or persisted state changes.

## Dependencies

- `add-battle-realtime` archived (#60); `refactor/console-focus-layout` merged into `main` before slice 1.
- Real local API running with two accounts (`build-arena-entornos`).

## Success Criteria

- [ ] Each slice's "done when" confirmed by the user in the browser from `main`.
- [ ] A full round (action, window, resolution, next round) plays by clicks only and by keyboard only.
- [ ] Reaction expiry sends nothing; all 10 error codes show Spanish copy and keep the session.
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` pass on every PR.

## Proposal question round

Execution mode is auto; these are reviewable defaults, not blockers:
1. "por poco" means missed by 2 or less, and the attack bonus is folded into the shown number (14).
2. Error copy table for the 10 codes (13A) is drafted in spec for the user to edit; `UNAUTHORIZED` is handshake-only.
3. Acceptance poll interval ~10s, notice in `salida` (fork a).
