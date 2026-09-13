# Battle Arena Specification

## Purpose

The screen that plays a live battle at `/battles/:battleId`: entry, Stage, BattleLog
narration, action/reaction prompts, and the wait/reconnect/abandon/error/end states around
them. Command-driven, read-only against `useBattleStore` (`battle-realtime`), no combat
rules computed client-side. Requirements are tagged `(Slice: N)` per the proposal's 4
delivery slices for 1:1 task mapping.

## Narration Table (guide §7.4 event types) — USER-REVIEW

Perspective rule: `{actor}`/`{target}` render as `Vos` when that combatant is the viewer,
else their username (decision 6A). Pronoun flips: viewer-as-target uses `te`/`vos`;
viewer-as-actor uses `le`/`se`. "Por poco" = miss with `targetValue - total <= 2`; the shown
number is `total` (roll **plus** modifiers already folded in), never raw `attackRoll` alone.
Advantage/disadvantage renders both dice from `rolls`, marking the `kept` one.

| Event | Template |
|---|---|
| `ROUND_STARTED` | `— Ronda {round} —` |
| `REACTION_RECHARGED` | `Tu reacción está disponible` (self) / `La reacción de {combatant} está disponible` |
| `CONDITION_TICKED` | `{combatant} sigue {condition}: quedan {roundsRemaining} rondas` |
| `CONDITION_EXPIRED` | `Se te pasó {condition}` (self) / `A {combatant} se le pasó {condition}` |
| `CONDITION_APPLIED` | `¡{target} queda {condition} por {rounds} rondas!` |
| `TURN_SKIPPED` | `{combatant} está aturdido y pierde el turno` |
| `REACTION_IGNORED` | `{skillName} no sirve contra ese ataque` |
| `ATTACK_ROLLED` single, hit | `{actor} tiró un dado de 20 y salió {total}: {le das / te da}` |
| `ATTACK_ROLLED` single, critical | `{actor} sacó 20 natural: ¡crítico! {le das / te da}` |
| `ATTACK_ROLLED` single, miss ≤2 | `{actor} tiró un dado de 20 y salió {total}: por poco {le das / te da}` |
| `ATTACK_ROLLED` single, miss >2 | `{actor} tiró un dado de 20 y salió {total}: no {le da / te da}` |
| `ATTACK_ROLLED` adv/disadv | `{actor} tiró dos dados de 20 ({r1} y {r2}, se queda con el {kept}) y salió {total}: {outcome as above}` |
| `SAVE_ROLLED` | `{defender} tiró un dado de 20 y salió {total} contra dificultad {difficulty}: {te salvás/se salva} de la mitad` / `no {te salvás/se salva}, se lleva todo` |
| `DAMAGE_MITIGATED` | `{skillName} reduce el golpe de {before} a {after}` |
| `DAMAGE_APPLIED` | `Quedás en {currentHp} HP (−{amount})` (self) / `{target} queda en {currentHp} HP (−{amount})` |
| `COUNTER_ATTACKED` | `¡{actor} contragolpea con {skillName} y hace {damage}!` |
| `COMBATANT_DEFEATED` | `Caés derrotado` (self) / `{combatant} cae derrotado` |

## Error Copy Table (all 10 `battleErrorCodeSchema` codes) — USER-REVIEW

Errors MUST NOT end the session: the socket stays open, the message shows once, commands
unlock again.

| Code | Spanish text |
|---|---|
| `UNAUTHORIZED` | Handshake-only (never an in-session `battle:error`); shown as a connection banner, not command output: `No se pudo conectar: la sesión no es válida` |
| `NOT_FOUND` | `Esa batalla no existe o no es tuya` + `volver` |
| `WRONG_STATUS` | `Esa batalla no está en el estado necesario para eso` |
| `NOT_YOUR_TURN` | `No es tu turno` |
| `ALREADY_DECLARED` | `Ya declaraste tu acción esta ronda` |
| `NO_OPEN_WINDOW` | `No hay ninguna ventana abierta para vos` |
| `SKILL_NOT_IN_KIT` | `Esa habilidad no está en tu kit de esta pelea` |
| `WRONG_SKILL_TYPE` | `Esa habilidad no es del tipo que corresponde acá` |
| `REACTION_UNAVAILABLE` | `Ya gastaste tu reacción esta ronda` |
| `TURN_ALREADY_RECORDED` | `Ese turno ya quedó registrado` |

## Requirements

### Slice 1 — Enter, See Combatants and Turn

#### Requirement: Composition Root Opens One Socket Per Mount (Slice: 1)
`src/app/boot/battle-socket.ts` MUST wire `subscribeToAccessToken` to the session store,
mirroring `api-client.ts`. The route mount effect MUST use the `useSessionBootstrap`
`useRef` guard so React 19 StrictMode's double-invoke opens exactly one socket connection.

##### Scenario: StrictMode double mount opens one socket
- GIVEN the arena route mounts under StrictMode
- WHEN the mount effect runs twice synchronously
- THEN exactly one `connect()`/`join()` pair is issued, not two

##### Scenario: Unmount then remount reconnects cleanly
- GIVEN the arena route unmounted and disconnected
- WHEN it mounts again for the same `battleId`
- THEN it reconnects and re-joins without a leaked prior connection

#### Requirement: `ConsoleLayout` Feeds Live Battle State (Slice: 1)
`ConsoleLayout` MUST derive `battleId` and `reactionWindowOpen` from `useBattleStore`
instead of the hardcoded `null`/`false`, without changing scope behavior when no battle is
joined.

##### Scenario: Outside a battle, scope is unaffected
- GIVEN no battle is joined
- WHEN `ConsoleLayout` builds `CommandState`
- THEN `battleId` is `null` and `reactionWindowOpen` is `false`, as before

##### Scenario: Joining a battle updates scope inputs
- GIVEN a battle is joined and its store `battleId` is set
- WHEN `ConsoleLayout` rebuilds `CommandState`
- THEN `battleId` matches the store and `battle` scope becomes active

#### Requirement: Entering a Battle by Command (Slice: 1)
An `enter` command MUST list the caller's live (`ACCEPTED`/`IN_PROGRESS`) battles. With
exactly one, it MUST enter directly. With more than one, it MUST open a numbered picker.
Entering a battle still `ACCEPTED` MUST warn before joining, since `battle:join` starts it.

##### Scenario: One live battle enters directly
- GIVEN the player has exactly one live battle
- WHEN they run `enter`
- THEN the socket joins that battle without a picker

##### Scenario: Several live battles open a picker
- GIVEN the player has two or more live battles
- WHEN they run `enter`
- THEN a numbered list of battles is shown and a number resolves the choice

##### Scenario: Entering an ACCEPTED battle warns first
- GIVEN the chosen battle's status is `ACCEPTED`, not yet `IN_PROGRESS`
- WHEN the player confirms entry
- THEN "Entrar arranca la batalla. ¿Seguimos?" is shown before `battle:join` is sent

#### Requirement: Challenger Sees an Acceptance Notice Without Navigating (Slice: 1)
While authenticated and outside a battle, the client MUST poll `GET /battles` on an
interval and, on a `PENDING → ACCEPTED` transition where the player's `role` is
`CHALLENGER`, print a notice into the output box via `announce`. It MUST NOT navigate and
MUST NOT touch an open wizard.

##### Scenario: Acceptance notice prints without navigating
- GIVEN the player challenged someone and the battle is `PENDING`
- WHEN the poll observes it become `ACCEPTED`
- THEN "X aceptó tu desafío. Escribí `enter` para pelear" prints via `announce`
- AND the player's current screen does not change

##### Scenario: Notice does not disturb a pending wizard
- GIVEN the player is mid-wizard on an unrelated command
- WHEN the acceptance notice fires
- THEN the pending wizard is unaffected

#### Requirement: Stage Shows Every Combatant Field (Slice: 1)
Stage MUST render, per combatant: display name (own via `/auth/me`, rival's via `GET
/battles` `rival.username` — decision 6A, no API change), HP as bar and number,
conditions with remaining rounds, reaction availability, attributes, armor class, and
initiative. On desktop the two combatant panels render side by side; on phone they stack.

##### Scenario: Desktop shows both panels side by side
- GIVEN a viewport at desktop width
- WHEN Stage renders
- THEN both combatant panels are laid out in the same row

##### Scenario: Phone stacks the panels
- GIVEN a viewport at phone width
- WHEN Stage renders
- THEN both combatant panels stack vertically

> Known risk (out of scope): very short screens may still cut a box below its 3-line floor;
> not solved by this change.

#### Requirement: Turn Header Shows Whose Turn It Is (Slice: 1)
The header MUST show "Tu turno" or "Turno de {rival}" from `activeUserId`, and MUST lock
`ACTUAR` with a stated reason whenever it is not the viewer's turn.

##### Scenario: Own turn unlocks ACTUAR
- GIVEN `activeUserId` equals the viewer
- WHEN the header renders
- THEN it reads "Tu turno" and `ACTUAR` is enabled

##### Scenario: Opponent's turn locks ACTUAR with a reason
- GIVEN `activeUserId` is the rival
- WHEN the header renders
- THEN it reads "Turno de {rival}" and `ACTUAR` is shown locked with a reason

### Slice 2 — Act and See the Result in Log

#### Requirement: BattleLog Narrates Events With Auto-Scroll (Slice: 2)
A `BattleLog` component inside `features/arena` MUST accumulate one line per event from
`battle:turn_resolved`/`battle:round_start` `events`, in order, per the Narration Table, and
MUST auto-scroll to the newest line.

##### Scenario: New turn appends narrated lines
- GIVEN BattleLog shows prior lines
- WHEN a `battle:turn_resolved` with non-empty `events` arrives
- THEN one line per event appends in order, and the view scrolls to the newest

#### Requirement: Empty `events` Reconstructs From `turns`/`combatants` (Slice: 2)
When `battle:turn_resolved.events` is empty (idempotent re-emit), BattleLog MUST synthesize
a line from the `turns`/`combatants` deltas instead of showing nothing, and MUST NOT
duplicate a line already shown for that `(round, sequence)`.

##### Scenario: Idempotent re-emit still shows a line once
- GIVEN a turn `(round: 2, sequence: 1)` was already narrated
- WHEN the same turn re-emits with `events: []`
- THEN BattleLog shows exactly one line for that turn, not zero and not two

#### Requirement: History Merges by `(round, sequence)`, Never Replaces (Slice: 2)
BattleLog and any turn-derived view MUST treat `turns` as the merged history from
`battle-realtime` and MUST NOT reconstruct history from only the latest
`battle:turn_resolved` payload.

##### Scenario: Reading `turns` shows every prior round
- GIVEN three prior rounds are already resolved in `turns`
- WHEN a new `battle:turn_resolved` arrives for round 4
- THEN BattleLog can still render rounds 1–4, not round 4 alone

#### Requirement: `ACTUAR` Offers the Frozen Kit's Actions (Slice: 2)
`ACTUAR` MUST list the viewer's `skillCodes` (from `battle:state`/`turn_resolved`
`combatants`) filtered to `type: 'ACTION'` against the cached catalog. It MUST NOT call
`GET /builds`.

##### Scenario: Only frozen actions are offered
- GIVEN the frozen kit has 2 actions and 2 reactions
- WHEN `ACTUAR` opens
- THEN exactly the 2 action skill codes are offered, named from the catalog

#### Requirement: No Ack — Wait, Then Narrate or Error (Slice: 2)
After `battle:action`, the client MUST show "Esperando al adversario…" and lock arena
commands. It MUST NOT print any declared/success text until the server responds; it MUST
narrate on `battle:turn_resolved` and MUST show the error text on `battle:error`, in either
case unlocking commands.

##### Scenario: No premature confirmation
- GIVEN the player just sent `battle:action`
- WHEN no server response has arrived yet
- THEN no "acción declarada" text is shown and commands stay locked

##### Scenario: Resolution unlocks and narrates
- GIVEN the wait state is active
- WHEN `battle:turn_resolved` arrives
- THEN the wait message clears, BattleLog narrates, and commands unlock

##### Scenario: Error unlocks with the error text
- GIVEN the wait state is active
- WHEN `battle:error` arrives
- THEN the wait message clears, the matching error text shows, and commands unlock

### Slice 3 — React With Countdown

#### Requirement: `REACCIONAR` Offers a 15s Countdown and a Decline Row (Slice: 3)
On `battle:reaction_window`, `REACCIONAR` MUST list `applicableSkillCodes` plus one extra
numbered row `0) no reaccionar`, and MUST show a 15-second `Countdown`. Selecting the
decline row or letting it expire MUST send nothing to the server.

##### Scenario: Declining sends nothing
- GIVEN a reaction window is open
- WHEN the player picks `0) no reaccionar`
- THEN no `battle:reaction` is emitted and the window UI closes

##### Scenario: Expiry sends nothing
- GIVEN a reaction window is open and untouched
- WHEN the 15s countdown reaches zero
- THEN no `battle:reaction` is emitted

##### Scenario: A chosen reaction emits its code
- GIVEN `applicableSkillCodes` includes `PARRY`
- WHEN the player picks `PARRY`
- THEN `battle:reaction { battleId, skillCode: 'PARRY' }` is emitted

#### Requirement: Reconnect Re-Shows the Prompt Only if the Server Re-Sends It (Slice: 3)
On reconnect, the reaction prompt MUST NOT reappear from client-held state; it MUST reappear
only when the server re-emits `battle:reaction_window` or a fresh `battle:state` carries a
non-null `openWindow`.

##### Scenario: Reconnect without a server re-emit stays closed
- GIVEN a window was open before a disconnect
- WHEN the socket reconnects and `battle:state.openWindow` is `null`
- THEN no reaction prompt is shown

##### Scenario: Reconnect with a server-confirmed window re-shows it
- GIVEN a window was open before a disconnect
- WHEN `battle:state.openWindow` arrives non-null with a `remainingMs`
- THEN the prompt re-shows with a countdown resuming from `remainingMs`

### Slice 4 — Errors, Abandonment, End

#### Requirement: Pending Wizard Auto-Cancels With a Printed Reason (Slice: 4)
An arena-level effect MUST call `cancelPending(notice)` whenever turn, reaction window,
battle, or connection state changes while a wizard step is pending, printing why (e.g. "La
ventana se cerró").

##### Scenario: Turn change cancels an open wizard with a reason
- GIVEN the player has a pending argument prompt for a now-stale action
- WHEN the turn changes because `battle:turn_resolved` arrived
- THEN the pending command is dropped and its reason prints via `announce`

#### Requirement: Reconnecting Locks Actions With a Stated Reason (Slice: 4)
While the socket is reconnecting, the header MUST show "Reconectando…" and `ACTUAR` MUST be
locked with reason "sin conexión".

##### Scenario: Disconnect locks ACTUAR
- GIVEN a connected battle drops its socket
- WHEN reconnection begins
- THEN the header shows "Reconectando…" and `ACTUAR` is locked with "sin conexión"

#### Requirement: Voluntary Exit Warns About the 2-Minute Forfeit (Slice: 4)
`volver` during an in-progress battle MUST ask for confirmation warning "Si no volvés en 2
minutos, perdés" before leaving the screen; it MUST NOT disconnect the socket.

##### Scenario: Confirming volver leaves the screen only
- GIVEN an in-progress battle
- WHEN the player runs `volver` and confirms
- THEN the screen navigates away and the socket connection is not closed

#### Requirement: Opponent Abandonment Shows the Countdown, Then the Closing Notice (Slice: 4)
On `battle:opponent_left`, the client MUST show the rival's 2-minute countdown. When it
expires, it MUST show "X abandonó. Actuá para cerrar la batalla" and MUST NOT auto-send any
message to close the battle itself.

##### Scenario: Countdown expiry shows the closing notice without auto-acting
- GIVEN `battle:opponent_left` fired with a `deadline`
- WHEN that deadline passes with no rival reconnect
- THEN "X abandonó. Actuá para cerrar la batalla" is shown and no message is auto-sent

#### Requirement: `battle:ended` Shows the Full Result (Slice: 4)
On a live `battle:ended`, the client MUST show won/lost and the rating change for both
players from `ratingChanges`.

##### Scenario: Live end shows outcome and rating
- GIVEN the viewer is in an active battle
- WHEN `battle:ended` arrives
- THEN won/lost and the viewer's rating change are both shown

#### Requirement: Reloading a Finished Battle Blocks Re-Entry (Slice: 4)
Entering a battle whose REST status is `FINISHED` MUST show "Esta batalla ya terminó" plus
a `volver` command, and MUST NOT open a socket connection.

##### Scenario: Reloading a finished battle shows the closing message
- GIVEN a battle's REST status is `FINISHED`
- WHEN the player navigates to `/battles/:battleId`
- THEN "Esta batalla ya terminó" shows with `volver`, and no socket connects

#### Requirement: `NOT_FOUND` Shows a Dedicated Exit (Slice: 4)
A `NOT_FOUND` `battle:error`, or a REST 404 on the battle, MUST show "Esa batalla no existe
o no es tuya" plus a `volver` command.

##### Scenario: Unknown or foreign battle exits cleanly
- GIVEN the battle id does not exist or is not the viewer's
- WHEN it is requested
- THEN the `NOT_FOUND` text shows with `volver`

#### Requirement: Every Error Code Shows Spanish Text and Keeps the Session (Slice: 4)
Every `battle:error` code MUST map to the Error Copy Table's Spanish text; showing it MUST
NOT close the socket or end the arena session.

##### Scenario: An error shows its text and the session continues
- GIVEN a `battle:error` with code `NOT_YOUR_TURN` arrives
- WHEN it is shown
- THEN "No es tu turno" prints and the socket stays connected
