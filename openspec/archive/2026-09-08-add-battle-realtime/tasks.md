# Tasks: Battle Realtime Transport and Store

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~850 authored (lock file excluded) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (store core) → PR 2 (store events) → PR 3 (socket adapter) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

```
main
 └─ feat/battle-store-core          PR 1  base: main
      └─ feat/battle-store-events        PR 2  base: main (cut from PR 1)
           └─ feat/battle-socket-adapter      PR 3  base: main (cut from PR 2)
```

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Store core: types, `applyState`, `setConnection`, `reset` (D2) | PR 1 | `pnpm test battle.store` | N/A — pure store, no socket | Delete `battle.store.ts`/`.test.ts`/`index.ts`; unused by anything |
| 2 | Store events: six remaining `apply*` + `(round,sequence)` merge (D3) | PR 2 | `pnpm test battle.store` | N/A — pure store | Revert the six added actions; PR 1 baseline stays valid |
| 3 | Adapter: `battle-socket.ts` state machine T1–T10, doubles, deps, docs (D1, D4) | PR 3 | `pnpm test battle-socket` | N/A — hand-rolled `fakeSocket`/`fakeSession`; nothing mounts the adapter until Phase 9 | Delete `battle-socket.ts`/`.test.ts`, drop `socket.io-client`, revert adapter exports and `architecture.md` |

## Phase 1: Store Core — branch `feat/battle-store-core` (PR 1)

- [x] 1.1 RED `battle.store.test.ts` — `applyState` replaces D2 fields, clears `log`/`lastError`, leaves `ended`/`connection` untouched
- [x] 1.2 RED `battle.store.test.ts` — `setConnection` clears `openWindow` on every transition away from `open`
- [x] 1.3 RED `battle.store.test.ts` — `reset()` restores every slice to its initial value
- [x] 1.4 GREEN `battle.store.ts` — full `BattleState` type (D2), initial state, `applyState`, `setConnection`, `reset`
- [x] 1.5 `index.ts` — barrel-export `useBattleStore` and D2 types

## Phase 2: Store Events — branch `feat/battle-store-events`, cut from `feat/battle-store-core` (PR 2)

- [x] 2.1 RED `battle.store.test.ts` — `applyRoundStart` sets round/`activeUserId`, appends `log`, leaves `combatants` untouched
- [x] 2.2 RED `battle.store.test.ts` — `applyReactionWindow` sets `openWindow` only
- [x] 2.3 RED `battle.store.test.ts` — `applyTurnResolved`: append, idempotent re-emit, empty `events` still updates `turns`/`combatants`
- [x] 2.4 RED `battle.store.test.ts` — `applyEnded` sets `ended`/`status`, preserves `combatants`/`turns`/`log`
- [x] 2.5 RED `battle.store.test.ts` — `applyOpponentLeft` sets `opponentLeft` only
- [x] 2.6 RED `battle.store.test.ts` — `applyError` sets `lastError` only, connection/combat untouched; a new error replaces the old
- [x] 2.7 GREEN `battle.store.ts` — implement the six actions per D3's replace/merge/append table

## Phase 3: Socket Adapter — branch `feat/battle-socket-adapter`, cut from `feat/battle-store-events` (PR 3)

- [x] 3.1 Verify against socket.io-client v4 that a middleware `connect_error` sets `socket.active = false` (no auto-retry); amend T3 to `connecting` if it retries instead (open question)
- [x] 3.2 `package.json` — add `socket.io-client` `^4` to `dependencies`; regenerate `pnpm-lock.yaml`
- [x] 3.3 RED `battle-socket.test.ts` — T1–T3: single listener registration, `connect` → `open` re-emits `battle:join`, `connect_error` → `rejected` with no session call
- [x] 3.4 RED `battle-socket.test.ts` — T4–T7: transport-drop retry, server-disconnect → `closed`, `disconnect()` tears down + unsubscribes + resets store, idempotent `disconnect()`
- [x] 3.5 RED `battle-socket.test.ts` — T8–T10: rotation no-op when `joinedBattleId === null`, rotation reconnects + rejoins when joined, rotation to `null` tears down
- [x] 3.6 RED `battle-socket.test.ts` — double `connect()` reuses one token subscription; a malformed payload is dropped, no store action runs
- [x] 3.7 GREEN `battle-socket.ts` — `createBattleSocket` per D1/D4: injected `SocketLike`/`SubscribeToAccessToken` ports, `@/shared/contracts` `safeParse` at the wire boundary, adapter-owned `joinedBattleId`
- [x] 3.8 `index.ts` — barrel-export `createBattleSocket`, `BattleSocket`, `SocketLike`, `BattleSocketOptions`, `SubscribeToAccessToken`
- [x] 3.9 `docs/design/architecture.md` §4 — replace the `BattleState` sketch with D2's block and add the `ended`/`log`/port-injection paragraph (design's exact Spanish prose)

## Phase 4: Verification

- [x] 4.1 Run `pnpm test` on each PR branch standalone; suite must stay green above the 909-test/81-file baseline
- [x] 4.2 Confirm Phase 8 "Terminado cuando": the scripted event sequence matches `frontend-guide.md` §7, including reconnect-with-open-window closing and reopening only from a server re-emit

**Composition-root note**: wiring `useSessionStore.subscribe` into `SubscribeToAccessToken` is Phase 9's job — design's Migration/Rollout states nothing imports `src/shared/realtime/` until Phase 9. Phase 8 ships only the injected port consumed by `battle-socket.ts`; no composition-root file is created here.
