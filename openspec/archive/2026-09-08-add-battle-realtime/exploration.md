## Exploration: Phase 8 — add-battle-realtime (BattleSocket transport + battle store, no screen)

### Current State

**Server contract — verified against the sibling API repo, no drift found.**
`docs/frontend-guide.md` §7 and `C:/_dev/actividades-integratec/_Proyectos/4-agosto/src/ws/battle-events.ts` + `battle.gateway.ts` match byte-for-byte:

- Client → server: `battle:join {battleId}`, `battle:action {battleId, skillCode}`, `battle:reaction {battleId, skillCode: string|null}` (`null` = decline).
- Server → client (the seven): `battle:state`, `battle:round_start`, `battle:reaction_window`, `battle:turn_resolved`, `battle:ended`, `battle:opponent_left`, `battle:error`.
- Handshake: `io(API_URL, { transports: ['websocket'], auth: { token: accessToken } })`. Rejected handshake → `connect_error` only; the socket never exists, no app-level error event for this case.
- `battle:ended` payload includes `ratingChanges` (both players, `change: 0` for unranked — never absent). Confirmed present in `toEndedPayload` in the gateway.
- One documented discrepancy: front's `battleErrorCodeSchema` (src/shared/contracts/enums.ts) has 10 values including `UNAUTHORIZED`; the guide's `battle:error` table and the API's `WsErrorCode` union both list only 9 (no `UNAUTHORIZED` — that code only ever surfaces as a handshake `connect_error`, never as an application `battle:error` event). Harmless superset, but the design should note it's defensive, not reachable via `battle:error`.
- Sibling API's own SDD design for this exact feature exists at `4-agosto/openspec/changes/archive/2026-09-01-add-realtime-battle/design.md` — directly useful cross-reference for the "two sides of the same problem" framing in the plan's rationale.

**What already exists in `src/`:**
- `src/shared/realtime/` does **not exist** — confirmed empty, this phase creates it from scratch.
- `src/shared/contracts/` **already fully defines** the battle wire: `battle-wire.ts` (CombatantView, TurnView, WindowView, LeftView, RatingChangeView, BattleStatePayload, BattleRoundStartPayload, BattleReactionWindowPayload, BattleTurnResolvedPayload, BattleEndedPayload, BattleOpponentLeftPayload, plus the three client-emit payload schemas) and `battle-events.ts` (discriminated union of the 13 narration event types with `battleEventListSchema`). Phase 1 (`feat/battle-domain`) landed all of this — Phase 8 does zero contract work, it only consumes `@/shared/contracts`.
- `src/features/battles/` has `domain/types.ts` (BattleStatus, BattleRole, BattleOutcome, BattleFacts — REST-oriented, no realtime), `application/` (battle-queries, battle-picker, battle-messages, battle-lines, battles.commands — all REST/command-registry, nothing socket-related), `infrastructure/battles.api.ts` (REST only). No realtime code lives here; per `architecture.md` it belongs in `src/shared/realtime/`, mirroring `src/shared/http/`.
- `src/shared/http/api-client.ts` implements the single-flight refresh exactly as `architecture.md` describes: `refreshOnce()` memoizes `refreshInFlight`, a 401 triggers a wait-then-retry-once, a failed refresh calls `endSession()` (clears tokens + `onSessionExpired?.()`). **Gap confirmed**: `ApiClientOptions` exposes only `onSessionExpired`, there is no `onTokensRotated`/`onRefreshed` hook. Nothing today notifies a socket to reconnect after a successful rotation — this is a real, unresolved fork (see below).
- `src/features/auth/application/session.store.ts`: Zustand + `persist` middleware, localStorage key `build-arena.session`, holds `accessToken | refreshToken | user`, exposes `isAuthenticated()`, `setTokens()`, `setUser()`, `clear()`. A parallel `sessionTokens` object wraps `useSessionStore.getState()` calls specifically for non-React consumers — this is the established pattern a `BattleSocket` adapter should reuse to read the token without a hook.

**Zustand store conventions already in the repo (3 existing stores: `menu.store.ts`, `throttle.store.ts`, `session.store.ts`):**
- All created as `create<State>()((set, get) => ({...}))`; no middleware except `session.store.ts`'s `persist`.
- Reset-between-tests convention is a **domain action**, never a generic `setState(initial, true)`: tests call the store's own `clear()`/`close()`/`release()` in `beforeEach`. The battle store should expose an equivalent (e.g. `reset()`) rather than inventing a different reset mechanism.
- Tests read/act purely through `.getState()`, no component rendering needed to test store logic.

**Open forks — what the guide/API/architecture.md actually answer vs. what is genuinely undecided:**

1. **Replace vs. accumulate, event by event.** `architecture.md` already settles the headline rule ("`battle:state` reemplaza; `battle:turn_resolved` acumula") — this is NOT open. What's undecided: `turn_resolved` is actually a *hybrid* — its `combatants`/`turns` fields **replace** those slices of state (same `CombatantView` shape as `battle:state`, "skillCodes incluido"), while only the **derived narration log** accumulates by appending `events`. The proposal must state this precisely per field, not just per event name. `round_start`, `reaction_window`, `opponent_left`, and `error` also need an explicit per-field replace/set rule (e.g. does `round_start` merge into `combatants` or leave them untouched since it carries no `combatants` field at all).
2. **Reconnection with an open window and running `remainingMs`.** The wire gives both `deadline` (absolute ISO timestamp) and `remainingMs` (snapshot at emit time). Genuinely undecided: should the store persist `remainingMs` as a static number (Phase 9 would then need its own clock-drift correction) or should the store derive/store `deadline` as canonical and treat `remainingMs` as informational only? `deadline` survives tab-backgrounding/reconnect gaps that a stored `remainingMs` snapshot does not.
3. **`turn_resolved` with empty `events` (idempotent re-emit).** `architecture.md` already decides the fallback source ("cae a `turns` y `combatants`") — not open. What IS open for Phase 8 specifically (since rendering itself is Phase 9's job): does the store still push some marker/flag when `events` is empty so Phase 9 knows to reconstruct, or does it store nothing extra and let Phase 9 detect the empty array itself at render time?
4. **Coordinating token refresh with socket reconnect.** Confirmed **unresolved** — no hook exists today. Two real options: (a) extend `ApiClientOptions` with an `onTokensRotated` callback that the app wires to the socket adapter's `connect()`, or (b) have the realtime layer subscribe directly to `useSessionStore.subscribe()` and reconnect whenever `accessToken` changes. Both are legitimate; the proposal must pick one and justify it against the "composition over generic hook" principle in `architecture.md`.
5. **What's preserved from the accumulated log when `battle:state` replaces state.** Not explicitly answered anywhere. The frontend-guide (§8.5 point 5) says "el historial ya está en `turns`... podés re-renderizar todo el chat desde ahí" — which implies the log should be **reconstructed from `turns`** on every full `battle:state`, not preserved from whatever was accumulated in memory before a disconnect (since `battle:state` carries no `events` field at all, only `turns`). This is a real design decision for the Phase 8 store: does a fresh `battle:state` wipe the in-memory narration log to be rebuilt (later, by Phase 9) from `turns`, or does the store keep the pre-disconnect log around alongside the new `turns`?

**Dependency gap — confirmed.** `socket.io-client` is absent from `package.json` (`dependencies`: only `@tanstack/react-query`, `react`, `react-dom`, `react-router`, `zod`, `zustand`). The sibling API pins `socket.io: ^4.8.3` on the server (Socket.IO v4 protocol), and its own design.md explicitly warns to pin `@nestjs/websockets`/`@nestjs/platform-socket.io` to exact major 11 for ESM/CommonJS reasons — that pin is server-only and does not constrain the client version choice, but it does confirm the client must speak the Socket.IO **v4 protocol**, i.e. `socket.io-client` must be on the 4.x line (a v2/v3 client is protocol-incompatible).

**Testing approach.** No `BattleSocket` file exists yet. The repo's established double style (seen in `src/shared/http/refresh.test.ts`'s `trackedTokenStore`) is a **hand-rolled literal object** implementing the interface, with `vi.fn()` used only for call-count/argument spying — never `vi.mock()` on a module. This matches the init record's plan for a literal `BattleSocket` test double. Store tests (`session.store.test.ts`, `menu.store.test.ts`, `throttle.store.test.ts`) never render a component; they call `.getState()` directly and reset via the store's own action in `beforeEach`. Realtime tests would live at `src/shared/realtime/*.test.ts`, co-located flat like `src/shared/http/`.

**Could not verify**: the "~909 passing tests" baseline claimed in the init record. This exploration session had no command-execution tool available (only Read/Grep/Glob/codegraph/mem/web tools), so `pnpm test` could not be run. This must be confirmed by whichever phase has shell access before being cited as a hard baseline.

### Affected Areas (net-new, nothing existing is modified)
- `src/shared/realtime/battle-socket.ts` — new: the `BattleSocket` adapter (interface already sketched in `architecture.md`: `connect`, `join`, `declareAction`, `declareReaction`, `disconnect`).
- `src/shared/realtime/battle.store.ts` — new: the Zustand battle store (shape already sketched in `architecture.md`'s `BattleState`).
- `src/shared/realtime/index.ts` — new: feature barrel, per the one-index-per-module convention.
- `src/shared/realtime/*.test.ts` — new: hand-rolled `BattleSocket` double + event-to-store-transition tests.
- `package.json` — add `socket.io-client` to `dependencies` (not touched by this exploration, flagged for the apply phase).
- `src/shared/http/api-client.ts` / `ApiClientOptions` — likely touched to add a token-rotation hook, pending the design's answer to fork #4.

### Approaches

1. **Extend `ApiClientOptions` with `onTokensRotated`** — the app wires this callback to `battleSocket.connect(newToken)` at composition root.
   - Pros: explicit, testable in isolation, keeps `http/` and `realtime/` decoupled via composition (matches architecture.md's "Qué sí se comparte, y cómo" table).
   - Cons: couples the generic HTTP client's option surface to a battle-specific concern, even if only by an optional generic-sounding callback.
   - Effort: Low.

2. **Realtime layer subscribes directly to `useSessionStore.subscribe()`** and reconnects whenever `accessToken` changes.
   - Pros: zero changes to `http/`; realtime reacts to the same session store the HTTP client already reads from, no new coupling surface.
   - Cons: reconnect fires on ANY `accessToken` change, including the very first login (not just refresh-triggered rotation) and needs care to avoid reconnecting a socket that was never open; subscription lifecycle (subscribe/unsubscribe) needs explicit ownership.
   - Effort: Low-Medium.

### Recommendation

Approach 2 (subscribe to the session store) fits `architecture.md`'s stated preference for composition over generic hooks and needs no change to the already-tested `http/` module. It does require careful design of the store's `connection` state machine so a subscribe-triggered reconnect is a no-op when there's no active battle. This exact tradeoff, plus the four other forks above, is precisely why the plan routes this phase through SDD — worth carrying into the proposal as the design's first decision.

### Risks
- The "~909 passing tests" baseline is unverified in this session (no exec tool available) — confirm with `pnpm test` before relying on it in tasks/verify.
- The `battle:error` code superset (`UNAUTHORIZED` in front schema vs. 9 codes in guide/API) could mask a future contract drift if not annotated as intentionally defensive.
- Fork #4 (refresh/reconnect coordination) is the highest-complexity decision in this phase and has no precedent elsewhere in the codebase to copy from — needs its own design section, not a one-line call.

### Ready for Proposal
Yes. Contracts are fully done (Phase 1), the API's own SDD design for the identical problem is available as a direct cross-reference, and all five forks named in the plan have been narrowed from "vague question" to "two concrete options with a real tradeoff" — proposal and design should be able to move fast.
