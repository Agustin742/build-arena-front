# Proposal: Battle Realtime Transport and Store

## Intent

A player can accept a battle but cannot fight one: `src/shared/realtime/` does not exist
(`architecture.md` §4 `realtime/`). Phase 1 froze the wire in `contracts/`, so what is missing is not
types — it is the store's own rules, which no contract states. `overview.md` §3.3 classifies socket
traffic as **stream state**: it arrives once, cannot be refetched, and accumulates. Getting that
accumulation wrong stays invisible until Phase 9 renders it.

## Scope

### In Scope

- `src/shared/realtime/`: `battle-socket.ts` (adapter), `battle.store.ts`, `index.ts`, tests.
- `socket.io-client` on the **4.x** line in `dependencies` (server runs `socket.io ^4.8.3`; a v2/v3 client is protocol-incompatible).
- Handshake with the token in `auth`, `connect_error` handling, auto-reconnect + `battle:join` re-send.
- Reconnect after token rotation.

### Out of Scope

- **No screen, no rendering, no command registration.** Nothing mounts the adapter. Phase 9.
- Countdown, expiry UI, narration lines, log reconstruction from `turns`. Phase 9.
- `contracts/` — done in Phase 1. No REST change.

## Capabilities

### New Capabilities
- `battle-realtime`: connection lifecycle, the seven server events mapped to store transitions, reconnection and re-join, rotation-driven reconnect.

### Modified Capabilities
- None.

## Approach

Adapter + Zustand store, per `architecture.md` §4's `BattleSocket` and `BattleState` sketches. No
combat logic: the server is authoritative and the client never invents state.

### Per-field state rules

`architecture.md` §4 settles the headline ("`state` replaces, `turn_resolved` accumulates"). Per
field it resolves to:

| Event | Effect on state |
|---|---|
| `battle:state` | Replaces `battleId`, `status`, `currentRound`, `activeUserId`, `combatants`, `turns`, `openWindow`, `opponentLeft`. Clears `log` and `lastError` |
| `battle:round_start` | Sets `currentRound`, `activeUserId`; appends `events` to `log`. Carries no `combatants`, so it never touches them |
| `battle:reaction_window` | Sets `openWindow` only |
| `battle:turn_resolved` | Hybrid: `combatants` **replaces**; `turns` **merges by `(round, sequence)`**; `events` **appends**; `openWindow` closes |
| `battle:ended` | Sets `status` and a new `ended` slice (`winnerId`, `reason`, `ranked`, `ratingChanges`); closes `openWindow` |
| `battle:opponent_left` | Sets `opponentLeft` only |
| `battle:error` | Sets `lastError` only. Never touches combat state, never ends the session (`frontend-guide.md` §7.5) |

Three consequences worth naming:

1. **`turn_resolved.turns` is not the history.** The gateway sends that round's rows
   (`turn-resolution.service.ts`, `resolution.turns`), while `battle:state.turns` is the full
   ordered history (`frontend-guide.md` §7.3). Replacing would destroy the log; blind appending
   would duplicate it on an idempotent re-emit. Merge on `(round, sequence)` is the only rule that
   is correct for both.
2. **A fresh `battle:state` clears `log`.** It carries `turns` but no `events`, and
   `frontend-guide.md` §8.5.5 says the history already lives in `turns`. Keeping a pre-disconnect
   in-memory log beside a replaced `turns` would render the same round twice.
3. **`deadline` is canonical, `remainingMs` informational.** `deadline` is absolute and survives a
   backgrounded tab or a reconnect gap; a stored `remainingMs` snapshot does not. Phase 9 counts
   against `deadline`.

### Decided: reconnection with an open window

**On reconnect the store closes `openWindow` and waits for the server.** It reopens only when the
server re-emits it, via `battle:state.openWindow` or a fresh `battle:reaction_window`. The client
never invents combat state (`overview.md` §1).

Accepted tradeoff: a slow reconnect can cost the player the reaction turn with no window shown. That
is the correct failure — the alternative is a UI offering a reaction the server already resolved,
which earns a `NO_OPEN_WINDOW` and looks like a bug the player caused.

### Decided: token refresh ↔ socket reconnect

The handshake token is validated once and never revalidated, so a reconnect with an expired token
bounces (`frontend-guide.md` §8.5.3). `ApiClientOptions` exposes only `onSessionExpired` — there is
no rotation hook. Two options:

| Option | Verdict |
|---|---|
| (a) Add `onTokensRotated` to `ApiClientOptions`, wired at the composition root | Rejected |
| (b) Realtime subscribes to `useSessionStore.subscribe()` and reconnects on `accessToken` change | **Chosen** |

Why (b):

- `overview.md` §3.3 already states the session store exists as a store "because both the HTTP client
  and the socket need it, and neither is a React component". (b) uses the documented channel; (a)
  invents a second one.
- `architecture.md` §"Qué sí se comparte" lists session/token sharing as **composition** — a store
  read from outside — not as a callback threaded through a generic layer.
- Dependency rule 1 (arrow points inward) is satisfied either way, but (a) widens the generic HTTP
  client's option surface for one consumer's concern, and that widening is the thing the section
  "Por qué no hay un `useApi` genérico" argues against.

The cost of (b) is that the subscription fires on any `accessToken` change, first login included. The
design must specify a `connection` state machine where a rotation-driven reconnect is a **no-op
unless a battle is joined**, and must state who owns subscribe/unsubscribe. That is this change's
hardest piece and gets its own design section.

### Decided: empty `events` on `turn_resolved`

The store records no marker. `turns` and `combatants` are already updated and are the contract
(`architecture.md` §4); Phase 9 detects the empty array at render time. A flag would be derived
state stored twice.

### Noted, not a defect

`battleErrorCodeSchema` carries 10 codes; the guide and the API's `WsErrorCode` list 9.
`UNAUTHORIZED` only ever surfaces as a handshake `connect_error`, never as a `battle:error`. The
superset is **intentionally defensive**, not drift. Spec and design must say so, so a later reader
does not "fix" it.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/realtime/` | New | `battle-socket.ts`, `battle.store.ts`, `index.ts`, `*.test.ts` |
| `package.json` | Modified | `socket.io-client` ^4 in `dependencies` |
| `src/shared/http/` | Unchanged | Option (b) requires no edit; existing tests stay untouched |
| `src/features/auth/` | Unchanged | Read via `useSessionStore.subscribe()`, no new export needed |
| `src/app/` | Unchanged | Mounting is Phase 9 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rotation subscription reconnects a socket that was never open | High | `connection` state machine gates it on a joined battle; a test asserts the no-op |
| `(round, sequence)` merge assumes uniqueness | Low | It is the server's own turn key; a re-emit test covers the duplicate |
| Store shape ships without a consumer, so Phase 9 finds it wrong | Med | Store fields are the `BattleState` sketch plus one `ended` slice; deviations land in this change's design |
| Reconnect that closes the window is read as a bug | Med | Decided tradeoff, recorded above and specified as behavior |

## Rollback Plan

Delete `src/shared/realtime/` and drop `socket.io-client` from `package.json`. Nothing imports it —
no screen, no route, no command. No persisted state, no server contract, no migration.

## Dependencies

- Phases 0-7 (shipped). `contracts/` battle wire (Phase 1).
- `socket.io-client` ^4 — the one new runtime dependency.
- Blocks Phase 9 (`add-battle-arena`), which requires this change archived.

## Success Criteria

- [ ] A scripted event sequence through the socket double leaves the store exactly as `frontend-guide.md` §7 describes
- [ ] Reconnect with an open window closes it and reopens only on the server's re-emit
- [ ] A duplicated `turn_resolved` adds no duplicate turn and no duplicate log entry
- [ ] `turn_resolved` with empty `events` still updates `turns` and `combatants`
- [ ] A rejected handshake lands `connection: 'rejected'` with no thrown error
- [ ] A token rotation with no joined battle reconnects nothing
- [ ] `battle:error` leaves the connection open and combat state untouched
- [ ] `pnpm test` passes with no change to any existing test file
- [ ] Phase 8 "Terminado cuando" met

## Open Questions

None blocking. The reconnect-with-open-window fork was put to the user and is decided above.
Everything else is answered by `frontend-guide.md`, `architecture.md`, `overview.md`, or the
decisions in this proposal.
