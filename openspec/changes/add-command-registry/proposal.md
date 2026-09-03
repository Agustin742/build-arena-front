# Proposal: Command Registry

## Intent

Click and typed input must invoke the same action from one source of truth (`overview.md` §3.1, §3.9;
`architecture.md` §3 `commands/`). Today `src/shared/commands/` does not exist and `DesignScreen`
wires `CommandList`/`Prompt` with local state. Every command in Phases 5-9 hangs off this piece, so
its types are the expensive thing to get wrong.

## Scope

### In Scope

- `src/shared/commands/`: types, registry, text resolver, numbered map, pending-command flow, scope derivation. React-free.
- Containers in `src/app/` feeding the shipped `CommandList`/`Prompt` **without touching their props**.
- `architecture.md` lines 214-215 updated for the two deviations below.
- `DesignScreen` becomes the first registry consumer.

### Out of Scope

- Real commands (Phases 5-9). Only fixtures.
- Simultaneous action + reaction prompts — `AppShell` has one prompt slot. Known constraint, Phase 9.
- Combat rules of any kind.

## Capabilities

### New Capabilities
- `command-registry`: registration, scope filtering, availability, alias resolution, numbered picks, guided arguments.

### Modified Capabilities
- None.

## Approach

Pure factory (`createApiClient` idiom). Decisions:

| # | Decision | Rationale |
|---|---|---|
| 1 | `activeScopes: CommandScope[]` in ctx; `scope: CommandScope[]` per command; `visible()` intersects | A reaction window is inside a battle; flat scope forces double registration (**deviates from `architecture.md` line 214**) |
| 2 | Duplicate alias across co-occurring scopes throws at registration | A test catches it before a player does |
| 3 | Guided multi-arg flow: one prompt per argument on click, positional on typed text | Nobody is forced to type |
| 4 | `deriveScopes(state)` in `scope.ts`, pure, state-driven | A reaction window opens without a route change |
| 5 | `availability(ctx): { enabled: true } \| { enabled: false, reason }` replaces boolean `isEnabled` | `reason` feeds `lockedReason` directly; disabled-without-reason becomes unrepresentable (**deviates from line 215**) |
| 6 | A typed numeral resolves against the last rendered map, never fresh `options(ctx)` | The number means what is on screen |
| 7 | Map replaced per render, cleared on scope change and on completion; stale number errors | Never silently picks a different entity |
| 8 | `PendingCommand { commandId, values, awaiting }` + pure `advance()` | Click and text converge on one filled command |
| 9 | Container passes explicit `key` and stores the same pairs | Numbering and map share one array |
| 10 | `Esc` or an explicit `cancel` entry drops a `PendingCommand`; an empty submit never cancels | Empty submit stays reserved for declining a reaction window, as `Prompt`'s shipped test already asserts |
| 11 | The guided flow prompts for optional arguments too, with a "continue without this" exit | Otherwise optional arguments would exist only for players who type, which breaks the project's core promise |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/commands/` | New | `types.ts`, `scope.ts`, `registry.ts`, `resolve.ts`, `suggest.ts`, `numbered.ts`, `pending.ts`, `index.ts` |
| `src/app/providers/`, `src/app/layout/` | New | Registry provider + `CommandList`/`Prompt` containers |
| `src/shared/ui/` | Unchanged | Existing tests must pass untouched |
| `docs/design/architecture.md` | Modified | Lines 214-215 |
| `src/app/routes/DesignScreen.tsx` | Modified | Local state replaced |

Barrel exports: types, `createCommandRegistry`, `deriveScopes`, `resolve`, `advance`, `available`/`blocked`. `suggest`/`numbered` internals stay private.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `CommandScope` shape ripples into Phases 5-9 | Med | Array intersection absorbs new scopes additively |
| Empty submit is "decline reaction" in `Prompt`'s test | Med | With a pending command, empty submit re-prompts; decline stays a command |
| Silent divergence from `architecture.md` | Low | Both deviations edited in this change |

## Rollback Plan

Delete `src/shared/commands/` and the two `src/app/` containers, revert `DesignScreen` and the
`architecture.md` edit. No migration, no persisted state, no server contract touched.

## Dependencies

- Phases 0-3 (shipped). None external.

## Success Criteria

- [ ] A test proves click and alias run the same command with the same arguments
- [ ] A disabled command renders dimmed with its reason
- [ ] A duplicate alias throws at registration
- [ ] A stale typed numeral errors instead of picking
- [ ] A two-argument command completes by click and by one typed line
- [ ] `CommandList`/`Prompt` tests pass unmodified
- [ ] Phase 4 "Terminado cuando" met

## Open Questions

None blocking. Four were put to the user after this proposal was drafted; all four are resolved and
folded into the decision table above:

| Question | Answer |
|---|---|
| A typed numeral whose list changed since render | Explicit error and re-render — never pick whatever sits at that position now (decision 7) |
| Cancelling a half-filled command | `Esc` or an explicit `cancel`; empty submit never cancels (decision 10) |
| Optional arguments in the guided flow | Prompted with a skip exit, not typed-only (decision 11) |
| Renaming `isEnabled` | Renamed to `availability`; a blocked command with no reason must not compile (decision 5) |

Everything else is answered by `docs/frontend-guide.md`, `architecture.md`, or the decisions above.
