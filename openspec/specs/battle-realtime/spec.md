# Delta for Battle Realtime

New capability. No prior `openspec/specs/battle-realtime/spec.md` exists.

Non-Goal: no screen, no rendering, no command-registry wiring. Nothing mounts the adapter in this
change — that is Phase 9 (`add-battle-arena`).

## ADDED Requirements

### Requirement: Handshake Authenticates via `auth.token` and a Rejection Stays Retryable
The adapter MUST open the socket with `auth: { token: accessToken }`. A rejected handshake
(`connect_error`) MUST set `connection: 'rejected'` in the store and MUST NOT clear the session or
trigger a session-expiry redirect.

#### Scenario: Rejected handshake stays retryable
- GIVEN a connect attempt with an invalid or expired token
- WHEN the server rejects it with `connect_error`
- THEN the store sets `connection: 'rejected'`
- AND the session store is left untouched

### Requirement: `battle:join` Is Sent on Every Successful Connect
The adapter MUST emit `battle:join { battleId }` immediately after every successful connect,
including reconnects, for the currently joined battle.

#### Scenario: Join re-sent after reconnect
- GIVEN a battle was joined before a disconnect
- WHEN the socket reconnects successfully
- THEN `battle:join` is emitted again with the same `battleId`

### Requirement: Per-Event Store Effects
Each server event MUST update only the fields listed below; fields not listed MUST remain
unchanged.

| Event | Effect |
|---|---|
| `battle:state` | Replaces `battleId`, `status`, `currentRound`, `activeUserId`, `combatants`, `turns`, `openWindow`, `opponentLeft`; clears `log` and `lastError` |
| `battle:round_start` | Sets `currentRound`, `activeUserId`; appends `events` to `log`; `combatants` untouched |
| `battle:reaction_window` | Sets `openWindow` only |
| `battle:turn_resolved` | Replaces `combatants`; merges `turns` by `(round, sequence)`; appends `events` to `log`; closes `openWindow` |
| `battle:ended` | Sets `status` and a new `ended` slice (`winnerId`, `reason`, `ranked`, `ratingChanges`); closes `openWindow`; `combatants`, `turns`, `log` are preserved |
| `battle:opponent_left` | Sets `opponentLeft` only |
| `battle:error` | Sets `lastError` only; connection stays open; no combat field changes |

#### Scenario: Fresh `battle:state` clears the log
- GIVEN a store with a populated `log`
- WHEN `battle:state` arrives
- THEN `log` is empty and every listed field matches the payload

#### Scenario: `round_start` never touches combatants
- GIVEN a store with existing `combatants`
- WHEN `battle:round_start` arrives
- THEN `combatants` is unchanged and `currentRound`/`activeUserId`/`log` update

#### Scenario: Opponent leaving sets `opponentLeft` only
- GIVEN an active battle with no `opponentLeft` set
- WHEN `battle:opponent_left` arrives
- THEN `opponentLeft` is set from the payload and no other field changes

#### Scenario: `battle:error` leaves combat state and connection untouched
- GIVEN an open connection mid-battle
- WHEN `battle:error` arrives
- THEN `lastError` is set, the connection stays open, and no other field changes

#### Scenario: A new error replaces the previous one
- GIVEN `lastError` already holds a prior `battle:error`
- WHEN a new `battle:error` arrives
- THEN `lastError` holds only the new error

#### Scenario: State survives `battle:ended`
- GIVEN a store with populated `combatants`, `turns`, `log`
- WHEN `battle:ended` arrives
- THEN `combatants`, `turns`, `log` remain intact and `ended` is populated

### Requirement: `turn_resolved` Merges `turns` by `(round, sequence)`
The store MUST merge `battle:turn_resolved.turns` into the existing `turns` array using
`(round, sequence)` as the identity key: a matching key replaces that entry in place; a new key
appends.

#### Scenario: Normal turn appends
- GIVEN `turns` has no entry for `(round: 2, sequence: 1)`
- WHEN `battle:turn_resolved` carries a turn with that key
- THEN `turns` gains exactly one new entry with that key

#### Scenario: Idempotent re-emit does not duplicate
- GIVEN `turns` already has an entry for `(round: 2, sequence: 1)`
- WHEN `battle:turn_resolved` re-emits a turn with the same key
- THEN `turns` still has exactly one entry for that key, and its content matches the re-emit

#### Scenario: Empty `events` still updates turns and combatants
- GIVEN a `battle:turn_resolved` payload with `events: []`
- WHEN it is applied
- THEN `turns` and `combatants` update per the merge/replace rules and `log` gains no entry

### Requirement: Reconnect Closes the Reaction Window and Waits for the Server
On every reconnect, the store MUST close `openWindow` immediately and MUST NOT reopen it until the
server re-emits it via `battle:state.openWindow` or a fresh `battle:reaction_window`. The store
MUST NOT derive or invent a reaction window locally.

#### Scenario: Window closes on reconnect
- GIVEN `openWindow` is set before a disconnect
- WHEN the socket reconnects
- THEN `openWindow` becomes `null` before any new event is applied

#### Scenario: Window reopens only from a server re-emit
- GIVEN a reconnect closed `openWindow`
- WHEN the server re-emits `battle:reaction_window`, or a fresh `battle:state` carries a non-null
  `openWindow`
- THEN `openWindow` is set from that payload

### Requirement: Token Rotation Reconnects Only a Joined Battle
The realtime layer MUST subscribe to `useSessionStore` and reconnect the socket whenever
`accessToken` changes, but MUST be a no-op when no battle is currently joined.

#### Scenario: Rotation with a joined battle reconnects
- GIVEN a battle is joined and connected
- WHEN `accessToken` changes in the session store
- THEN the socket reconnects with the new token and re-sends `battle:join`

#### Scenario: Rotation with no joined battle is a no-op
- GIVEN no battle is joined, including the token set on first login
- WHEN `accessToken` changes in the session store
- THEN no connect attempt is made and `connection` is unchanged

### Requirement: One Battle at a Time
The store MUST hold at most one battle's state. Joining a second battle MUST replace all state
from the first.

#### Scenario: Joining a new battle replaces the previous one
- GIVEN the store holds state for battle A
- WHEN `battle:join` succeeds for battle B and `battle:state` arrives
- THEN every field reflects battle B only, with no residue from battle A

### Requirement: Domain Reset Action Restores Initial Battle State
The store MUST expose its own reset action that returns every battle slice to its initial value.
Consumers and tests MUST use that action instead of replacing state directly.

The reset action MUST NOT change `connection`. That slice reflects the transport, not the battle:
joining a second battle resets the battle while the socket stays open, so a reset that forced
`connection` back to `idle` would report a closed socket that is in fact connected. Moving the
transport between states is `setConnection`'s job and only its job.

#### Scenario: Reset clears every battle slice
- GIVEN a store with populated `combatants`, `turns`, `log`, and `ended`
- WHEN the store's reset action runs
- THEN every battle slice returns to its initial value

#### Scenario: Reset leaves the transport alone
- GIVEN a store whose `connection` reads `open` because the socket is connected
- WHEN the store's reset action runs
- THEN `connection` still reads `open`, because no socket was closed
