# Design: Battle Arena (Phase 9 redo)

## Technical Approach

The Phase 8 adapter and store (`src/shared/realtime/`) stay unchanged and own the socket (architecture.md §4: nothing else calls `socket.on`/`emit`). A new `features/arena` feature reads `useBattleStore` through pure derivations. The feature builds the arena commands from injected ports, and `app/boot` implements and wires those ports (the `battle-commands.ts` / `MenuControl` pattern). The dependency arrow points inward (architecture.md "Reglas de dependencia", lines 121–124): `arena/domain` imports nothing, `application` uses `shared/*` and its own ports, and no feature imports `app/`. Every notice goes out through the runtime's `announce` into `salida`.

**Screen composition.** `ArenaScreen` returns a **fragment**, never a wrapper `div`. The `'screen'` `ConsoleSlot` is `display: contents` (`ConsoleSlot.tsx:28`), so `ArenaHeader`, `PanelRow` (Stage) and `BattleLog` each become a direct item of the console column. They all read the same `--console-yield`, and each carries its own floor.

## Architecture Decisions

| # | Topic | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D1 | Socket root | `app/boot/battle-socket.ts`: `createBattleSocket({ url: env.apiUrl, subscribeToAccessToken })`. The port wraps `useSessionStore.subscribe` and forwards only when `accessToken !== prev.accessToken` | Importing auth inside `shared/realtime` | Mirrors `api-client.ts`. The session store fires on every `set`, so the equality check belongs here |
| D2 | Connection owner | `useArenaConnection(socket, battleId, getToken, enabled)` is the only caller of `connect`/`join`/`disconnect`. It combines a ref guard with a **deferred release**: cleanup schedules `setTimeout(disconnect, 0)`, and a remount with the same id clears that timer. `volver` only navigates, and the route unmount releases the socket | A plain `useRef` "already started" flag (StrictMode runs the cleanup, which leaves the socket disconnected); disconnecting inside `volver` (browser Back would skip it) | One owner. A StrictMode mount → unmount → remount does 1 connect, 1 join and 0 disconnects |
| D3 | `CommandState.battleId` | `ConsoleLayout` reads `useMatch('/battles/:battleId')` | `store.battleId` | The store only gets `battleId` after `battle:state` (realtime trap #2). Off the route it stays `null`, so lobby and menu scopes do not change. **Ships together with `volver` and D8**, because the `battle` scope hides every lobby command |
| D4 | Arena locks reach the runtime | `CommandState` gains `battle?: { actionLock: string \| null; reactionLock: string \| null }`. `reactionWindowOpen = openWindow !== null && actorUserId !== self && store.battleId === routeId`. The strings come from `useArenaCommandState()`, memoized on primitive values | Reading `getState()` inside `availability` | The provider only re-renders when `state` changes, so a zustand read inside `availability` would show a stale lock |
| D5 | Lock order | Pure `actionLockOf` in `arena/domain`: `sin conexión` > `la batalla terminó` > `esperando al adversario` > `no es tu turno` | A lock per command | One ordered table, tested without React |
| D6 | "Action sent" (17A) | `arena-intent.store.ts` (zustand) holds `{ battleId, round, kind: 'action' \| 'reaction' } \| null`. `ACTUAR`/`REACCIONAR` set it after they emit. It clears on any transition that changes the `turns` keys, the `lastError` identity, `ended`, `activeUserId` or `battleId`, or when `connection` leaves `open` | `useState` in a component (commands run outside React); a fake ack | The server sends no ack, so only a real server change ends the wait (decision 5) |
| D7 | Conditional steps (16A, 18A, 10A) | New `CommandArg.autofill?: (ctx, values) => string \| undefined`. `begin` and `advance` fill such steps without asking, and `begin` gains `ctx` | A two-command confirmation; typing "`enter n`" from a text list | One engine change covers three decisions. The checklist already labels answers through `options` |
| D8 | Navigation from commands | The `ArenaNavigation { toArena(id): void; toLobby(): void }` port is **declared in `features/arena/application/ports.ts`** and **implemented in `app/boot/navigation.ts`**. A `<NavigationBridge/>` inside `ConsoleLayout` hands it `useNavigate` | Declaring the port in `app/`, which features cannot import; migrating to `createBrowserRouter` | Same shape as `MenuControl` (`battle-commands.ts:38`). `BrowserRouter` stays |
| D9 | Narration | `arena/application/narrate.ts`: `narrateEvent(event, names)` is an exhaustive `switch` ending in `assertNever`, with `narrateTurn(turn, names)` as the fallback. The wording follows the spec's Narration Table | Storing rendered text | architecture.md §4 |
| D10 | BattleLog accumulation | A pure `transcriptStep(transcript, prev, next, names)`, fed by `useBattleStore.subscribe((next, prev))`. New `(round, sequence)` keys with a grown `log` → narrate the new log slice. New keys, same `log` → narrate those turns. Grown `log` and changed `currentRound` → the round start. No new key and same round → nothing, so an idempotent re-emit adds nothing even when it carries events. Shrunk `log` or changed `battleId` → rebuild from the full `turns` | Mapping `store.log` directly | `turn_resolved.turns` holds only the resolved round (trap #1) |
| D11 | Names (6A) and REST row | `namesOf(combatants, self, rival)`. `self` is the session `user` (`/auth/me`). `rival` and the REST `status` come from the `cachedBattles` row for the route id, with one `fetchBattles` if the cache misses. The fallback name is `Rival` | An API change | No API change is needed |
| D12 | Errors and 4A | **Error copy (PR 2d):** `battleErrorCopy(code)`, a `switch` over the 10 codes ending in `assertNever`. `<ArenaErrorAnnouncer/>` (app layer, inside the provider) announces each new `lastError` identity. `UNAUTHORIZED` shows as a header banner when the connection is `rejected`. **Auto-cancel (PR 4a):** `cancelPending(notice?: CommandResult)`. `<ArenaInterruptionWatcher/>` compares an `interruptionKey` (route id, `activeUserId`, window `round:actor`, `connection === 'open'`, `ended !== null`) with the previous value held in a ref. When `pending !== null` it calls `cancelPending(interruptionNotice(prev, next))` | A generic cancel-on-scope inside the provider | Without the copy, a rejected `ACTUAR` in slices 2–3 would unlock silently. Only the arena needs auto-cancel |
| D13 | Challenger notice (fork a) | `useBattlesPoll(api, enabled)` = `useQuery({ ...battlesQuery(api), refetchInterval: 10_000 })`, enabled while authenticated and off the arena route. The pure `acceptedChallenges(prev, next)` returns `CHALLENGER` rows that went `PENDING → ACCEPTED`. The first snapshot only sets the baseline, and announced ids are kept in a `Set` | Firing against the cache on mount | A reload never fires the notice |
| D14 | Countdowns | **Reaction:** `<Countdown key={deadline} remainingMs={openWindow.remainingMs}/>` from the server's value. Expiry sends nothing. **Abandonment:** `LeftView` carries only `deadline` (`battle-wire.ts:60-63`), so it necessarily uses the local clock: `Date.parse(deadline) - Date.now()`, computed once per `deadline`. Clock skew is accepted as a known risk. On expiry the screen shows "X abandonó. Actuá para cerrar la batalla" | Tracking the reaction window on the local clock | The server's time is used wherever the contract provides it |
| D15 | Stage layout | `CombatantCard` is a **non-scrolling** `Panel` on desktop and `Panel scroll="narrow"` below `sm`. **Desktop:** `PanelRow` is the single column box (`sm:flex sm:flex-row sm:items-start sm:basis-[content] sm:shrink-[var(--console-yield,1)] sm:h-[var(--panel-floor,auto)] sm:overflow-y-auto`). Its floor is the largest `measureFloor(card, cardBody)` of its cards. With room, the row is as tall as the taller card and nothing is cut. When short, the row shrinks to that floor and scrolls both cards together. **Phone:** `PanelRow` is `contents`, so each card is a direct column item with its own 3-line floor (`max-sm:` variants of the scrolling frame). Name and HP of both combatants stay visible | Scrolling cards inside a row, where `height` sits on the cross axis and turns the floor into a fixed 3-row box; a single scrolling stack on phone, which would hide the rival's HP | The floor only works as a floor along the column's main axis, so the row owns it on desktop and each card owns its own on phone |
| D16 | Arena phase | Pure `arenaPhaseOf`: `connecting` \| `live` \| `ended` (`ended !== null`, live result and rating) \| `finished` \| `not-found`. PR 4c gates on the REST row (D11) before connecting: `FINISHED` → `finished`, with `enabled = false` so no socket opens. A missing row → `not-found`. `NOT_FOUND` or `WRONG_STATUS` arriving before any state are also mapped | — | 7A and 20A |
| D17 | BattleLog scroll (8A) | `BattleLog` is a `Panel scroll`. A new `Panel` `bodyRef` prop exposes the body. The log **sticks to the bottom only while the reader is already there** (`scrollHeight - scrollTop - clientHeight <= one line`, sampled before each append in `useLayoutEffect`). The first render and every rebuild jump to the bottom | Always forcing the view to the bottom | A player scrolling back to reread a roll is not pulled away mid-read. At rest the log follows new lines |

## Data Flow

    battle:* ─→ battle-socket (shared) ─→ useBattleStore ─┬→ useArenaCommandState ─→ ConsoleLayout.state ─→ runtime
                                                          ├→ ArenaHeader / PanelRow(Stage) / BattleLog  (fragment in 'screen')
                                                          ├→ ArenaErrorAnnouncer ─→ announce
                                                          └→ ArenaInterruptionWatcher ─→ cancelPending(notice)
    ACTUAR/REACCIONAR.run ─→ ArenaGateway.declare* ─→ socket ; arena-intent.store.set
    enter/volver.run ─→ ArenaNavigation (port in arena, impl in app/boot) ─→ useNavigate
    GET /battles poll ─→ AcceptanceNoticeWatcher ─→ announce

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/boot/battle-socket.ts`, `navigation.ts`, `arena-commands.ts`, `game-commands.ts` | Create/Modify | Composition roots and port implementations (D1, D8) |
| `src/app/layout/ConsoleLayout.tsx`, `NavigationBridge.tsx`, `ArenaErrorAnnouncer.tsx`, `ArenaInterruptionWatcher.tsx`, `AcceptanceNoticeWatcher.tsx` | Modify/Create | D3, D4, D12, D13 |
| `src/app/providers/CommandRuntimeProvider.tsx`, `command-runtime.ts` | Modify | `announce`, `cancelPending(notice?)`, `begin(…, ctx)` |
| `src/app/routes/AppRoutes.tsx`, `ArenaRoute.tsx` | Modify/Create | `useParams` → `ArenaScreen` |
| `src/shared/commands/types.ts`, `pending.ts` | Modify | `autofill`, `CommandState.battle` |
| `src/shared/ui/Panel.tsx`, `PanelRow.tsx` | Modify/Create | `scroll: boolean \| 'narrow'`, `bodyRef` (D15, D17) |
| `src/shared/realtime/battle-socket.test.ts` | Modify | W1 |
| `src/features/battles/application/battle-queries.ts`, `acceptance.ts` | Modify/Create | D13 |
| `src/features/arena/domain/{types,turn-lock,arena-phase}.ts` | Create | D5, D16 (local types) |
| `src/features/arena/application/{ports,narrate,transcript,names,interruption,battle-error-copy,arena-intent.store,arena.commands,use-arena-connection,use-arena-command-state}.ts` | Create | D2, D4, D6, D8–D12 |
| `src/features/arena/ui/{ArenaScreen,ArenaHeader,Stage,CombatantCard,BattleLog,ArenaResult}.tsx`, `index.ts` | Create | The screen |

## Interfaces / Contracts

```ts
// features/arena/application/ports.ts
interface ArenaGateway { declareAction(id: string, code: string): void; declareReaction(id: string, code: string | null): void }
interface ArenaNavigation { toArena(battleId: string): void; toLobby(): void }
// app/providers/command-runtime.ts
interface CommandRuntime { announce(result: CommandResult): void; cancelPending(notice?: CommandResult): void }
```

**Arena commands**
- **`enter`** (scopes `lobby`, `battles`): a `battle` step that autofills when exactly one battle is live, then a `confirm` step that autofills `yes` unless the battle is `ACCEPTED`.
- **`ACTUAR`** (`battle`): options are the combatant's `skillCodes` crossed with the catalog and filtered to `ACTION` (overview §3.5).
- **`REACCIONAR`** (`reaction-window`): `applicableSkillCodes` as received, plus `{ key: '0', id: 'none' }`.
- **`volver`** (`battle`): a `confirm` step that autofills unless the battle is `IN_PROGRESS` with no result yet.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | `turn-lock`, `arena-phase`, `narrate` (13 events), `transcript` (re-emit, rebuild, empty events), `acceptedChallenges`, `interruptionNotice`, error copy (10 codes), `autofill`, `PanelRow` floor (max of the card floors) | Pure Vitest |
| Integration | `useArenaConnection` (StrictMode remount, deferred release, id change, W1); `ConsoleLayout` scopes on and off the route; commands against a store fixture and the gateway double; BattleLog stick-to-bottom with a stubbed `scrollHeight`; Stage | RTL + MSW + the hand-rolled `SocketLike` double |
| Browser (mandatory per player-visible PR) | Two accounts on the real API, at 1280x500 and at phone width. Measure that Stage cards are not cut when there is room and that the log follows new lines | The user plays it before merge. Layout is measured in the browser, since jsdom cannot prove layout |

## Slice → PR Map (≤400 changed lines each; every PR leaves `main` usable)

| PR | Slice | Contents | Player-visible? |
|---|---|---|---|
| 1a | 1 | D1 socket root, W1 test, D2 `useArenaConnection` + tests | No. Nothing imports the hook yet, so runtime behavior is unchanged |
| 1b | 1 | D3 route scope, D8 port + bridge, basic `volver`, `ArenaRoute` mounting the connection ("Conectando…" / "Conectado") | Yes. Opening `/battles/:id` connects, and `volver` returns to the lobby, so the player is never stuck |
| 1c | 1 | D7 `autofill` + `enter` (picker, `ACCEPTED` confirmation) | Yes |
| 1d | 1 | D11 names, `Panel scroll="narrow"`, `PanelRow`, `CombatantCard`, Stage | Yes |
| 1e | 1 | `ArenaHeader` ("Tu turno / Turno de X"), D16 `connecting`/`live`, `ArenaScreen` fragment | Yes |
| 1f | 1 | `announce`, D13 challenger notice | Yes |
| 2a | 2 | D9 narration for all 13 events, plus `narrateTurn` | No. A pure module that nothing renders yet |
| 2b | 2 | D10 transcript, D17 `bodyRef`, BattleLog | Yes. The opponent's turns narrate even before the viewer can act |
| 2c | 2 | D4 `CommandState.battle`, D5 lock order, D6 intent store + settlement | No. The field is optional and has no consumer, so scopes are unchanged |
| 2d | 2 | `ACTUAR`, "Esperando al adversario…", D12 error copy + `ArenaErrorAnnouncer` | Yes |
| 3 | 3 | `REACCIONAR`, D14 reaction countdown, `0) no reaccionar` | Yes |
| 4a | 4 | `cancelPending(notice)`, `ArenaInterruptionWatcher` | Yes |
| 4b | 4 | D14 abandonment countdown and expiry line, "Reconectando…", `volver` confirmation | Yes |
| 4c | 4 | `ended` result, REST `finished` gate (no connection), `not-found` | Yes |

## Threat Matrix

N/A: no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration is required. Revert the PRs in reverse order.

## Open Questions

- [ ] Does joining a `FINISHED` battle return `battle:state` or `WRONG_STATUS`? The REST gate in PR 4c avoids depending on it, but this still needs checking against the API.
- [ ] The abandonment countdown uses the local clock. How much skew is tolerable?
