# Design: Battle Arena (Phase 9 redo)

## Technical Approach

The Phase 8 adapter and store (`src/shared/realtime/`) stay unchanged and own the socket (architecture.md §4: nothing else calls `socket.on`/`emit`). A new `features/arena` feature reads `useBattleStore` through pure derivations. The arena commands follow the `battle-commands.ts` pattern: the feature builds them from injected ports, and `app/boot` wires those ports. Stage, header and BattleLog render inside the existing `'screen'` `ConsoleSlot`. Every notice goes out through the runtime's `announce` into `salida`. The dependency arrow points inward (architecture.md "Reglas de dependencia"): `arena/domain` imports nothing, and `application` uses `shared/*` plus ports. Only `app/` reaches into `app/providers`.

## Architecture Decisions

| # | Topic | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D1 | Socket root | `app/boot/battle-socket.ts`: `createBattleSocket({ url: env.apiUrl, subscribeToAccessToken })`. The port wraps `useSessionStore.subscribe` and forwards only when `accessToken !== prev.accessToken` | Import auth inside `shared/realtime` | Mirrors `api-client.ts`. The session store fires on every `set`, so the equality check belongs here |
| D2 | Connection owner | `useArenaConnection(socket, battleId, getToken)` is the only caller of `connect`/`join`/`disconnect`. It uses a ref guard plus a **deferred release**: cleanup calls `setTimeout(disconnect, 0)`, and a remount with the same id clears that timer. `volver` only navigates | A plain `useRef` "started" flag (StrictMode runs cleanup, so the flag alone leaves the socket disconnected); disconnect inside `volver` (browser Back would skip it) | One owner. StrictMode mount → unmount → remount produces 1 connect, 1 join and 0 disconnects |
| D3 | `CommandState.battleId` | `ConsoleLayout` uses `useMatch('/battles/:battleId')` | `store.battleId` (the proposal wording) | The store gets `battleId` only after `battle:state` (realtime trap #2). Reading the store would leave lobby commands visible while connecting or on `NOT_FOUND`. Off the route it stays `null`, so lobby and menu scoping do not change |
| D4 | Arena locks reach the runtime | `CommandState` gains `battle?: { actionLock: string \| null; reactionLock: string \| null }`. `reactionWindowOpen = openWindow !== null && actorUserId !== self && store.battleId === routeId`. The strings come from `useArenaCommandState()` and are memoized by primitive values | Reading `getState()` inside `availability` | The provider re-renders only when `state` changes. A zustand read inside `availability` would show a stale locked or unlocked row |
| D5 | Lock order | Pure `actionLockOf` in `arena/domain`: `sin conexión` > `la batalla terminó` > `esperando al adversario` > `no es tu turno` | Letting each command decide | One ordered table, tested without React |
| D6 | "Action sent" (17A) | `arena-intent.store.ts` (zustand) holds `{ battleId, round, kind: 'action' \| 'reaction' } \| null`. `ACTUAR`/`REACCIONAR` set it after they emit. It clears when a transition changes the `turns` keys, `lastError` identity, `ended`, `activeUserId`, `battleId`, or when `connection` leaves `open` | `useState` in a component (commands run outside React); a fake ack | The server sends no ack. Only a real server change clears the wait (decision 5) |
| D7 | Conditional steps (16A, 18A, 10A) | New `CommandArg.autofill?: (ctx, values) => string \| undefined`. `begin`/`advance` fill such a step without asking. `begin` gains `ctx` | Two-command confirmation (`enter` then `seguir`); a text list with "type `enter n`" | One small engine change covers three behaviors: a single live battle enters directly, a battle not `ACCEPTED` needs no confirmation, a battle not in progress needs no `volver` confirmation. The checklist already labels answers through `options` |
| D8 | Navigation from commands | `app/boot/navigation.ts` exposes the `ArenaNavigation { toArena(id); toLobby() }` port. `<NavigationBridge/>` inside `ConsoleLayout` sets it from `useNavigate` | Migrating to `createBrowserRouter` | `BrowserRouter` stays. Commands already use ports (`MenuControl`) |
| D9 | Narration | `arena/application/narrate.ts`: `narrateEvent(event, names)` uses an exhaustive `switch` with `assertNever`. `narrateTurn(turn, names)` is the fallback. A "near miss" is `targetValue - total <= 2` (the bonus is folded into the number shown) | Storing text | architecture.md §4 |
| D10 | BattleLog accumulation | A pure `transcriptStep(transcript, prev, next, names)` driven by `useBattleStore.subscribe((next, prev))`. New merge keys `(round, sequence)` with a grown `log` narrate the new log slice. New keys with no log growth narrate those turns. A grown log with a changed `currentRound` narrates the round start. No new key and the same round appends nothing, which covers idempotent re-emits even when they carry events. A shrunk `log` or a changed `battleId` (from `applyState`) rebuilds from the full `turns` | Mapping `store.log` directly | `turn_resolved.turns` is only the resolved round (trap #1), and a re-emit must not duplicate lines |
| D11 | Names (6A) | `namesOf(combatants, self, rival)`: `self` comes from the session `user` (`/auth/me`), `rival` from `cachedBattles` for the route id, with one `fetchBattles` when that cache misses. Fallback name: `Rival` | An API change | There is no API change |
| D12 | 4A auto-cancel | `cancelPending(notice?: CommandResult)` plus `announce(result)` in the runtime. `<ArenaInterruptionWatcher/>` (app layer, inside the provider) compares an `interruptionKey` (route id, `activeUserId`, window `round:actor`, `connection === 'open'`, `ended !== null`) with the previous value in a ref. When `pending !== null`, it calls `cancelPending(interruptionNotice(prev, next))`. The same watcher announces `lastError` changes through `battleErrorCopy` (10 codes, `switch` with `assertNever`) | Generic cancel-on-scope inside the provider | Only the arena needs it, and the pure reason function is testable |
| D13 | Challenger notice (fork a) | `useBattlesPoll(api, enabled)` wraps `useQuery({ ...battlesQuery(api), refetchInterval: 10_000 })`. `enabled` means authenticated and not on the arena route. The pure `acceptedChallenges(prev, next)` returns `CHALLENGER` rows that went `PENDING → ACCEPTED`. The watcher's ref starts empty, so the first snapshot (cache or reload) is only the baseline. Announced ids go into a `Set` | Firing against the cache on mount | A reload never fires the notice. An acceptance that happened while the tab was closed is not announced; `battles` still lists it |
| D14 | Countdowns | Reaction: `<Countdown key={deadline} remainingMs={openWindow.remainingMs}/>`. Expiry sends nothing. Abandonment: `LeftView` has no `remainingMs`, so the value is computed once per `deadline` as `Date.parse(deadline) - Date.now()`. Expiry prints "X abandonó. Actuá para cerrar la batalla" | Ticking against the local clock | Server time is used wherever the contract provides it |
| D15 | Stage layout | `CombatantCard` is a `scroll` `Panel` (7 lines or more, so it gets the 3-line floor). `PanelRow` in `shared/ui` uses `contents sm:flex sm:flex-row sm:basis-[content] sm:shrink-[var(--console-yield,1)]`, and its measured `--panel-floor` is the maximum of its children's floors. `ArenaHeader` has 3 lines or fewer and keeps its natural size | Changing `ConsoleSlot`, or a fifth slot | On a phone each card is a direct column item and the existing mechanics apply. On desktop the row behaves as one box |
| D16 | Arena phase | Pure `arenaPhaseOf`: `connecting` \| `not-found` (`lastError.code === 'NOT_FOUND'` before any state) \| `live` \| `ended` (`ended !== null`, result and rating) \| `finished` (`status === 'FINISHED'` with `ended === null`, or `WRONG_STATUS` before any state) | — | 7A and 20A |

## Data Flow

    battle:* ─→ battle-socket (shared) ─→ useBattleStore ─┬→ useArenaCommandState ─→ ConsoleLayout.state ─→ runtime
                                                          ├→ Stage / ArenaHeader / BattleLog (subscribe)
                                                          └→ ArenaInterruptionWatcher ─→ cancelPending / announce
    ACTUAR/REACCIONAR.run ─→ ArenaGateway.declare* ─→ socket ; arena-intent.store.set
    GET /battles poll ─→ AcceptanceNoticeWatcher ─→ announce

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/boot/battle-socket.ts`, `navigation.ts`, `arena-commands.ts`, `game-commands.ts` | Create/Modify | Composition roots (D1, D8) |
| `src/app/layout/ConsoleLayout.tsx`, `NavigationBridge.tsx`, `ArenaInterruptionWatcher.tsx`, `AcceptanceNoticeWatcher.tsx` | Modify/Create | D3, D4, D12, D13 |
| `src/app/providers/CommandRuntimeProvider.tsx`, `command-runtime.ts` | Modify | `announce`, `cancelPending(notice?)`, `begin(…, ctx)` |
| `src/app/routes/AppRoutes.tsx`, `ArenaRoute.tsx` | Modify/Create | `useParams` → `ArenaScreen` |
| `src/shared/commands/types.ts`, `pending.ts` | Modify | `autofill`, `CommandState.battle` |
| `src/shared/ui/PanelRow.tsx` | Create | D15 |
| `src/shared/realtime/battle-socket.test.ts` | Modify | W1 |
| `src/features/battles/application/battle-queries.ts` (+ `acceptance.ts`) | Modify/Create | D13 |
| `src/features/arena/domain/{types,turn-lock,arena-phase}.ts` | Create | D5, D16 (local types) |
| `src/features/arena/application/{narrate,transcript,names,interruption,battle-error-copy,arena-intent.store,arena.commands,use-arena-connection,use-arena-command-state}.ts` | Create | D2, D4, D6, D9–D12 |
| `src/features/arena/ui/{ArenaScreen,ArenaHeader,Stage,CombatantCard,BattleLog,ArenaResult}.tsx`, `index.ts` | Create | Screen |

## Interfaces / Contracts

```ts
interface ArenaGateway { declareAction(id: string, code: string): void; declareReaction(id: string, code: string | null): void }
interface CommandRuntime { announce(result: CommandResult): void; cancelPending(notice?: CommandResult): void }
```

Arena commands: `enter` (`lobby`, `battles`): `battle` step with autofill when exactly one battle is live, then `confirm` with autofill `yes` unless `ACCEPTED`. `ACTUAR` (`battle`): options are `skillCodes` × catalog filtered to `ACTION` (overview §3.5). `REACCIONAR` (`reaction-window`): `applicableSkillCodes` as received, plus `{ key: '0', id: 'none' }`. `volver` (`battle`): `confirm` with autofill unless `IN_PROGRESS` and no result yet.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | `turn-lock`, `arena-phase`, `narrate` (13 events), `transcript` (re-emit, rebuild, empty events), `acceptedChallenges`, `interruptionNotice`, error copy (10 codes), `autofill` in `pending` | Pure Vitest |
| Integration | `useArenaConnection` (StrictMode remount, deferred release, id change and W1), `ConsoleLayout` scopes on and off the route, commands against a store fixture and the gateway double, BattleLog and Stage | RTL, MSW, the hand-rolled `SocketLike` double from `battle-socket.test.ts` |
| Browser (mandatory per slice) | The proposal's "done when" with two accounts on the real API, at 1280x500 and at phone width | The user plays each slice before merge |

## Slice → Module Map (PRs of 400 lines or fewer, each leaves `main` working)

| PR | Contents |
|---|---|
| 1a | D1, D2, D3, W1, basic `ArenaRoute` ("Conectando…") |
| 1b | D7 `autofill`, D8, `enter`, basic `volver` (no confirmation) |
| 1c | D11, D15, D16 (`connecting`/`live`), `ArenaHeader`, Stage |
| 1d | `announce`, D13 |
| 2a | D9, D10, BattleLog |
| 2b | D4, D5, D6, `ACTUAR` |
| 3 | `REACCIONAR`, reaction countdown, `0) no reaccionar` |
| 4a | D12 (`cancelPending(notice)`, error copy) |
| 4b | Abandonment countdown and expiry line, "Reconectando…", `volver` confirmation |
| 4c | `ended` result, `finished` reload, `not-found` |

## Threat Matrix

N/A: no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration is required. Revert the PRs in reverse order.

## Open Questions

- [ ] Does joining a `FINISHED` battle return `battle:state` or `WRONG_STATUS`? D16 handles both; check against the API in slice 4c.
- [ ] Slice 1 needs 4 PRs, against the proposal's "2–3".
