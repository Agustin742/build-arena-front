# Design: Battle Realtime Transport and Store

Change: `add-battle-realtime` (Phase 8). Artifact store: hybrid — also persisted to Engram as
`sdd/add-battle-realtime/design`.

**Settled upstream and not reopened here**: scope is transport + store only (no screen, no command
registration — Phase 9); reconnect **closes** an open reaction window and waits for the server; a
rejected handshake is a retryable battle-level error, never a session expiry; token rotation is
handled by option (b), the session store as the channel; `turn_resolved.turns` merges by
`(round, sequence)`; `battle:state` clears `log`; `deadline` is canonical; state survives
`battle:ended`; one battle at a time; `socket.io-client` 4.x in `dependencies`.

This document decides only *how*.

---

## Technical Approach

Two files, one direction of dependency.

```
socket.io  ──▶  battle-socket.ts  ──▶  battle.store.ts  ──▶  (nothing)
                (adapter)               (Zustand)
                     ▲                       │
     subscribeToAccessToken             read by Phase 9
     (port, injected)
```

The adapter is the **only** thing that speaks the wire: it holds the socket, validates every
inbound payload against `@/shared/contracts`, and translates it into exactly one store action.
The store is a pure state container — it holds no socket reference, emits nothing, and imports
nothing but contract types. That asymmetry is what makes the store testable without a socket and
the seam that splits this change into two PRs (see *Delivery Forecast*).

This mirrors `src/shared/http/` one-for-one: `api-client.ts` is the border that touches the
network, `TokenStore` and `fetchImpl` are injected ports, and no feature is imported.

---

## D1 — Connection state machine and subscription ownership

The highest-complexity piece, with no precedent in this codebase to copy.

### The five states

`architecture.md` §4 already fixes the alphabet; this design adds no sixth state.

| State | Meaning | Socket exists? |
|---|---|---|
| `idle` | Never connected since the last `disconnect()` or process start | No |
| `connecting` | A handshake is in flight — first attempt **or** an automatic retry | Yes |
| `open` | Handshake accepted, listeners live | Yes |
| `closed` | Torn down deliberately (by us, or by a server-side disconnect that does not retry) | No |
| `rejected` | Handshake refused by the gateway middleware (`connect_error`) | No |

`rejected` is **terminal under socket.io's own rules**: a middleware error leaves
`socket.active === false`, so the client does not retry on its own. It leaves `rejected` only via
a token rotation (D1.3) or an explicit `connect()`. This is exactly why the decided contract can
treat it as retryable without clearing the session — recovery has a real path.

### D1.1 Transitions

| # | From | Trigger | To | Side effects |
|---|---|---|---|---|
| T1 | `idle` \| `closed` \| `rejected` | `connect(token)` | `connecting` | Create socket, register the seven listeners **once**, subscribe to the token port |
| T2 | `connecting` | socket `connect` | `open` | If `joinedBattleId !== null`, re-emit `battle:join` |
| T3 | `connecting` | socket `connect_error` | `rejected` | Session untouched. No `lastError` write — this is not a `battle:error` |
| T4 | `open` | socket `disconnect`, reason **not** `io client disconnect` / `io server disconnect` | `connecting` | Transport drop; socket.io retries by itself |
| T5 | `connecting` (retry) | socket `connect` | `open` | Same as T2 — the re-join path is one branch, not two |
| T6 | `open` \| `connecting` | socket `disconnect`, reason `io server disconnect` | `closed` | No auto-retry from socket.io |
| T7 | any | `disconnect()` | `closed` | Tear down socket, **unsubscribe the token port**, clear `joinedBattleId`, `store.reset()` |
| T8 | any, `joinedBattleId === null` | token changed | *unchanged* | **No-op.** Covers first login and every rotation outside a battle |
| T9 | `open` \| `connecting` \| `rejected`, `joinedBattleId !== null`, new token non-null | token changed | `connecting` | Replace `socket.auth.token`, force a reconnect cycle; T2 re-emits `battle:join` |
| T10 | any, new token **null** | token changed (session cleared) | `closed` | Same teardown as T7 |

**Every transition out of `open` sets `openWindow: null`.** The rule lives in one place —
`setConnection(next)` clears the window whenever `next !== 'open'` — so T3, T4, T6, T7 and T10 all
honour the decided contract without five copies of it. The window reopens only when the server
re-emits `battle:state.openWindow` or a fresh `battle:reaction_window`.

`join(battleId)` is not a connection transition: it records `joinedBattleId` synchronously and
emits `battle:join` if `connection === 'open'` (otherwise T2 sends it on connect).

### D1.2 Why `joinedBattleId` lives on the adapter, not read from `store.battleId`

`store.battleId` is populated by the server's `battle:state`, which arrives **after** the join is
emitted. A rotation landing in that gap would read `null` and no-op, leaving a socket authenticated
with a dead token inside a battle the player already joined — the exact failure this gate exists to
prevent. The adapter sets `joinedBattleId` in `join()`, before any round trip, so the gate is never
blind.

Same field, same reason, serves T2's re-join. One field, two uses, no divergence.

### D1.3 Subscription ownership — the leak

**The adapter owns the handle. `connect()` subscribes; `disconnect()` unsubscribes. Nothing else
may.**

```ts
export type SubscribeToAccessToken = (
  listener: (accessToken: string | null) => void,
) => () => void
```

Four rules, each with a test:

1. `connect()` stores the returned unsubscribe function in a module-private field. Calling
   `connect()` while already subscribed **reuses** the existing handle — it never subscribes twice.
   A second subscription would fire two reconnects per rotation.
2. `disconnect()` calls the handle and sets it to `null`. It is idempotent: a second
   `disconnect()` is a no-op.
3. The listener body is the T8/T9/T10 three-way branch and nothing else.
4. Nothing outside `battle-socket.ts` ever calls `subscribeToAccessToken`.

**Why a port instead of importing `useSessionStore` directly.** The decided option (b) fixes the
*channel* (the session store), not the *import*. `src/shared/` must not import `src/features/`
(dependency rules 2 and 4), and `shared/http/api-client.ts` already demonstrates the answer:
`TokenStore` is an interface, `sessionTokens` is the adapter, and the composition root wires them.
`SubscribeToAccessToken` is the same move for the same reason, and it makes the Phase 8 test double
a five-line function instead of a real Zustand store.

The composition root (Phase 9) supplies:

```ts
subscribeToAccessToken: (listener) =>
  useSessionStore.subscribe((state, previous) => {
    if (state.accessToken !== previous.accessToken) listener(state.accessToken)
  })
```

**Gotcha to pin.** `session.store.ts` uses only `persist`, not `subscribeWithSelector`, so
`useSessionStore.subscribe(fn)` fires on **every** `set` — including `setUser`. The equality check
above belongs to the composition root, and the adapter's own no-op gate (T8) is the second line of
defence. No change to `session.store.ts` is required.

---

## D2 — Store shape

`architecture.md` §4's `BattleState` sketch, reconciled with the contracts that Phase 1 actually
shipped, plus the decided `ended` slice.

```ts
export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'rejected'

export interface EndedView {
  winnerId: string
  reason: BattleEndReason
  endedAt: string
  ranked: boolean
  ratingChanges: RatingChangeView[]
}

export interface BattleState {
  battleId: string | null
  status: BattleStatus | null
  currentRound: number
  activeUserId: string | null
  combatants: CombatantView[]
  turns: TurnView[]
  log: BattleEvent[]
  openWindow: WindowView | null
  opponentLeft: LeftView | null
  ended: EndedView | null
  lastError: BattleErrorPayload | null
  connection: ConnectionState

  applyState: (payload: BattleStatePayload) => void
  applyRoundStart: (payload: BattleRoundStartPayload) => void
  applyReactionWindow: (payload: BattleReactionWindowPayload) => void
  applyTurnResolved: (payload: BattleTurnResolvedPayload) => void
  applyEnded: (payload: BattleEndedPayload) => void
  applyOpponentLeft: (payload: BattleOpponentLeftPayload) => void
  applyError: (payload: BattleErrorPayload) => void
  setConnection: (next: ConnectionState) => void
  reset: () => void
}
```

Initial slice: `battleId: null`, `status: null`, `currentRound: 0`, `activeUserId: null`, three
empty arrays, four `null`s, `connection: 'idle'`.

### Deviations from the `architecture.md` sketch, and why

| Sketch | This design | Rationale |
|---|---|---|
| `log: LogEntry[]` | `log: BattleEvent[]` | `LogEntry` does not exist. `BattleEvent` is the shipped discriminated union. Storing rendered text would put presentation in `shared/realtime` and freeze the wording before the renderer (Phase 9, a pure `switch` with `assertNever`) exists |
| `openWindow: ReactionWindow \| null` | `WindowView \| null` | Contract name |
| `opponentLeft: OpponentLeft \| null` | `LeftView \| null` | Contract name |
| `lastError: BattleErrorView \| null` | `BattleErrorPayload \| null` | Contract name (`code`, `message`, `event?`) |
| `status: BattleStatus` | `BattleStatus \| null` | Idle has no battle. Defaulting to `'PENDING'` would be a lie — `PENDING` is a real lobby status, so a consumer could not tell "no battle" from "a battle awaiting acceptance" |
| *(absent)* | `ended: EndedView \| null` | Decided. `battle:ended` arrives once and `battle:state` never repeats it |
| `declareAction(id, skillCode: SkillCode)` | `skillCode: string` | Contracts model skill codes as `z.string()`; no branded `SkillCode` type was shipped |

**`docs/design/architecture.md` MUST be updated in this change** — apply-phase task, following the
Phase 4 precedent (`add-command-registry` edited §3 inside its own change). Its prose stays Spanish
and carries no code comments. Replace the §4 `BattleState` sketch with the block above and add:

> `ended` guarda el desenlace (`winnerId`, `reason`, `endedAt`, `ranked`, `ratingChanges`) porque
> `battle:ended` llega una sola vez y `battle:state` no lo repite: sin esa rebanada, reconectar
> después de terminar borraría el resumen. `log` guarda los eventos del contrato, no líneas ya
> renderizadas — traducir evento a texto es una función pura de la pantalla, y guardar el texto
> congelaría la redacción antes de que exista el renderizador.
>
> El adapter no importa `features/auth`: recibe la suscripción al token como puerto desde la raíz
> de composición, igual que el cliente HTTP recibe su `TokenStore`. `shared/` no conoce features.

### `reset()` and the one-battle invariant

`reset()` restores every combat slice plus `ended` and `lastError`, and **leaves `connection`
untouched** — clearing a battle is not tearing down a transport, and `join()` uses `reset()` while
the socket is open.

The adapter enforces one-battle-at-a-time in one place: `join(battleId)` calls `store.reset()` when
`battleId !== joinedBattleId`. **Rejected alternative**: a `battleId` guard inside each of the seven
`apply*` actions — seven branches and seven tests to state one invariant, and blind for the window
between `join()` and the first `battle:state` where `store.battleId` is still `null`.

Test convention (matches `session.store.test.ts`, `menu.store.test.ts`, `throttle.store.test.ts`):
`beforeEach` calls the store's own `reset()` and `setConnection('idle')`. Never
`setState(initial, true)`.

---

## D3 — Event-to-action mapping

Seven server events, seven actions, one action each. Every inbound payload is `safeParse`d against
its contract schema first; **a payload that fails validation is dropped and no action runs**. Half
of a malformed payload applied to combat state is worse than a missed frame, and no
`battleErrorCode` honestly describes contract drift — inventing one would corrupt the enum's
meaning.

| Event → action | Replaces | Merges | Appends | Clears | Untouched |
|---|---|---|---|---|---|
| `battle:state` → `applyState` | `battleId`, `status`, `currentRound`, `activeUserId`, `combatants`, `turns`, `openWindow`, `opponentLeft` | — | — | `log`, `lastError` | `ended`, `connection` |
| `battle:round_start` → `applyRoundStart` | `currentRound`, `activeUserId` | — | `events` → `log` | — | `combatants`, `turns`, `openWindow`, `opponentLeft`, `ended` |
| `battle:reaction_window` → `applyReactionWindow` | `openWindow` | — | — | — | everything else |
| `battle:turn_resolved` → `applyTurnResolved` | `combatants` | `turns` by `(round, sequence)` | `events` → `log` | `openWindow` | `currentRound`, `activeUserId`, `status`, `opponentLeft` |
| `battle:ended` → `applyEnded` | `status` ← `'FINISHED'`, `ended` | — | — | `openWindow`, `activeUserId` | `combatants`, `turns`, `log` |
| `battle:opponent_left` → `applyOpponentLeft` | `opponentLeft` | — | — | — | everything else |
| `battle:error` → `applyError` | `lastError` | — | — | — | **all combat state and `connection`** |

Five points the table encodes and a reader would otherwise get wrong:

1. **`turn_resolved` does not advance the round.** Its `round` is the round that just resolved;
   the server advances `currentRound`/`activeUserId` and announces it with `battle:round_start`.
   Writing them here would double-advance on a re-emit.
2. **The merge keeps `turns` sorted by `(round, sequence)`.** Replace an existing row with the same
   key, else append, then sort. `battle:state.turns` arrives ordered and Phase 9 renders in order;
   an unsorted append would show a reaction before its action.
3. **`applyState` does not clear `ended`.** The server never re-sends the outcome, so clearing it
   would destroy the only copy on a reconnect after the match ended. Cross-battle staleness is
   already impossible — `join()` resets on a battleId change.
4. **`defeatedId` is not stored.** It is derivable from `combatants[].currentHp` and the
   `COMBATANT_DEFEATED` event, and `battle:ended` follows regardless. Storing it is the same
   "derived state stored twice" the empty-`events` decision already rejected.
5. **`battle:error` never ends the session and never touches the connection** (`frontend-guide.md`
   §7.5). `UNAUTHORIZED` in `battleErrorCodeSchema` is an **intentionally defensive superset**: the
   gateway only ever raises it as a handshake `connect_error`, so it is unreachable through
   `battle:error`. This is not drift — do not "fix" it by removing the code.

---

## D4 — Adapter interface and test doubles

```ts
export interface BattleSocket {
  connect: (token: string) => void
  join: (battleId: string) => void
  declareAction: (battleId: string, skillCode: string) => void
  declareReaction: (battleId: string, skillCode: string | null) => void
  disconnect: () => void
}

export interface SocketLike {
  auth: { token: string }
  on: (event: string, listener: (payload: unknown) => void) => void
  emit: (event: string, payload: unknown) => void
  connect: () => void
  disconnect: () => void
}

export interface BattleSocketOptions {
  url: string
  subscribeToAccessToken: SubscribeToAccessToken
  openSocket?: (url: string, auth: { token: string }) => SocketLike
  store?: BattleStore
}

export function createBattleSocket(options: BattleSocketOptions): BattleSocket
```

`openSocket` defaults to `io(url, { transports: ['websocket'], auth })`. **This is the
`ApiClientOptions.fetchImpl` precedent, not a new pattern** — injecting the factory is what lets the
tests avoid `vi.mock()` entirely. `SocketLike` is deliberately minimal so the adapter never depends
on socket.io's full type surface and the double stays small.

`url` comes from `env.apiUrl` (`src/shared/config/env.ts`) at the composition root; the adapter
reads no environment.

### The doubles — hand-rolled literals, per `src/shared/http/refresh.test.ts`

```ts
function fakeSocket() {
  const listeners = new Map<string, (payload: unknown) => void>()
  const emit = vi.fn()
  const disconnect = vi.fn()
  const connect = vi.fn()

  return {
    socket: { auth: { token: '' }, on: (e, l) => listeners.set(e, l), emit, connect, disconnect },
    fire: (event: string, payload?: unknown) => listeners.get(event)?.(payload),
    emit,
    connect,
    disconnect,
  }
}

function fakeSession() {
  let listener: ((token: string | null) => void) | null = null
  const unsubscribe = vi.fn(() => { listener = null })

  return {
    subscribe: (next) => { listener = next; return unsubscribe },
    rotate: (token: string | null) => listener?.(token),
    subscriberCount: () => (listener === null ? 0 : 1),
    unsubscribe,
  }
}
```

`vi.fn()` is used **only** for call-count and argument spying, never to replace a module.
`subscriberCount()` is what makes the leaked-subscription failure mode assertable.

`battle.store.test.ts` needs no double at all: it calls `useBattleStore.getState().apply*()` with
contract-shaped literals, exactly as the three existing store tests do.

---

## Layering check — the arrow points inward

| Rule (`architecture.md` §*Reglas de dependencia*) | Verdict |
|---|---|
| 1. The arrow points inward | ✅ `battle-socket` → `battle.store` → `contracts` (types only). The store references no socket; nothing references the adapter yet |
| 2. A feature imports only another feature's `index.ts` | ✅ `shared/realtime` imports **no** feature. `useSessionStore` enters as the `SubscribeToAccessToken` port, wired at the composition root |
| 3. The network is touched only in infrastructure | ✅ `socket.emit` / `socket.on` exist only in `battle-socket.ts`, the shared-layer border — the established `shared/http/api-client.ts` precedent, unmodified |
| 4. `shared/ui` knows no features | ✅ Untouched by this change |

`src/shared/realtime/index.ts` exports `createBattleSocket`, `useBattleStore`, and the types
`BattleSocket`, `SocketLike`, `BattleSocketOptions`, `SubscribeToAccessToken`, `BattleState`,
`ConnectionState`, `EndedView` — one barrel per module, per convention.

---

## File Changes

| File | Action | Description |
|---|---|---|
| `src/shared/realtime/battle.store.ts` | Create | Zustand store: D2 shape, the seven `apply*`, `setConnection`, `reset` |
| `src/shared/realtime/battle.store.test.ts` | Create | Event-by-event transitions, merge, reconnect window closure, reset |
| `src/shared/realtime/battle-socket.ts` | Create | Adapter: D1 state machine, payload validation, D4 interface |
| `src/shared/realtime/battle-socket.test.ts` | Create | Handshake, rejection, re-join, rotation gate, subscription lifecycle |
| `src/shared/realtime/index.ts` | Create | Module barrel |
| `package.json` | Modify | `socket.io-client` `^4` in `dependencies` |
| `pnpm-lock.yaml` | Modify | Generated |
| `docs/design/architecture.md` | Modify | §4 `realtime/`: the `ended` slice, `BattleEvent` log, contract type names, the session port. Spanish, no code comments |

`src/shared/http/`, `src/features/auth/`, `src/features/battles/` and `src/app/`: **unchanged**. No
existing test file is edited.

---

## Testing Strategy

Strict TDD: a failing test precedes every branch. `pnpm test`.

| Layer | What to test | Approach |
|---|---|---|
| Unit — store | Each of the seven actions against its contract-shaped payload; the scripted sequence of `frontend-guide.md` §7; `(round, sequence)` merge with a duplicate re-emit adding no row and no log line; empty `events` still updating `turns` and `combatants`; `applyState` clearing `log` but not `ended`; `battle:error` leaving combat state and `connection` untouched; `turn_resolved` not advancing the round | `.getState()` only, no rendering. `reset()` + `setConnection('idle')` in `beforeEach` |
| Unit — adapter | T1–T10 one test each; `connect_error` landing `rejected` with no throw and no session call; transport drop → `connecting` → `connect` re-emitting `battle:join` once; rotation with `joinedBattleId === null` emitting nothing and reconnecting nothing; rotation to `null` tearing down; `connect()` twice subscribing once; `disconnect()` unsubscribing and being idempotent; a malformed payload leaving the store untouched | `fakeSocket()` + `fakeSession()` literals, `vi.fn()` for spying, never `vi.mock()` |
| Integration | None. Nothing mounts the adapter until Phase 9 | — |
| E2E | None. Deliberately out of scope | — |

The `openWindow`-closes-on-reconnect contract is asserted at the **adapter** level (drive T4, read
`store.getState().openWindow`), because it is the connection transition that owns it.

---

## Delivery Forecast

Review budget: **400 changed lines**. Strategy: **auto-chain**.

| Slice | Content | Est. authored lines |
|---|---|---|
| A | `battle.store.ts`, `battle.store.test.ts`, `index.ts` (store exports only) | ~440 |
| B | `battle-socket.ts`, `battle-socket.test.ts`, `index.ts` (+adapter exports), `package.json`, `docs/design/architecture.md` | ~365 |
| — | `pnpm-lock.yaml` | generated, excluded from the authored count |

**Total ≈ 800 authored lines. This does NOT fit one PR. Two chained slices.**

**The seam is the store/adapter boundary**, and it is clean for a structural reason, not a
cosmetic one: the store has zero socket dependency and zero knowledge of `connection` beyond a
`setConnection` setter, so slice A is complete, verifiable and revertible on its own. Slice B is
the only slice that touches `package.json`.

Per repo convention both branches base on `main` and merge with a merge commit, never squash; B
opens after A merges. Slice A is ~10% over budget: **if it lands over 400, split at
`applyState`/`setConnection`/`reset` (A1) versus the six incremental event actions (A2)** — that is
the second-cleanest seam and needs no rework of A1.

`sdd-tasks` owns the formal guard lines.

---

## Threat Matrix

**N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary.** This change spawns no process, runs no command, resolves no
repository or ref, and classifies no file. Every row of `references/threat-matrix.md` is
version-control or shell oriented.

The genuine adversarial surface is authentication, and it is answered structurally above rather
than manufactured into irrelevant rows: the token travels only in `handshake.auth`, the client
never invents combat state, and a rejected handshake records `connection: 'rejected'` without
clearing the session — which is precisely the client-side rule that keeps a transport failure from
masquerading as a logout.

---

## Migration / Rollout

No migration. No feature flag. Nothing imports `src/shared/realtime/` until Phase 9, so the module
is inert at runtime the moment it merges. Rollback is deleting the folder and dropping
`socket.io-client`; the `architecture.md` edit reverts with it. No persisted state, no server
contract change.

---

## Open Questions

None blocking. Two assumptions the apply phase must confirm rather than trust:

- [ ] **socket.io v4 does not auto-retry after a middleware `connect_error`** (`socket.active`
      becomes `false`). D1's terminal `rejected` state depends on it. If it does retry, `rejected`
      becomes a transient state that returns to `connecting` — a one-transition amendment, not a
      redesign.
- [ ] **The ~909-test baseline** cited by the exploration was never verified (no shell in that
      session). Run `pnpm test` before quoting it.

Deliberate deviation from the 800-word design budget, matching the Phase 3 and Phase 6 precedents
in the sibling repo: `openspec/config.yaml` `rules.design` requires the store shape and the full
event-to-action mapping, and the phase brief additionally requires the connection state machine,
the adapter interface, the layering check and a delivery forecast.
