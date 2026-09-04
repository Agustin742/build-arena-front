# Delta for Command Registry

New capability. No prior `openspec/specs/command-registry/spec.md` exists.

## ADDED Requirements

### Requirement: Registration and Scope Filtering by Intersection
The registry MUST accept a `Command` with `scope: CommandScope[]` and MUST list a command only when its `scope` intersects the caller's `activeScopes: CommandScope[]`.

#### Scenario: Visible via one shared scope
- GIVEN a command with `scope: ['battle', 'reaction-window']`
- WHEN listing with `activeScopes` containing `'battle'`
- THEN the command is included

#### Scenario: Hidden when no scope matches
- GIVEN a command with `scope: ['lobby']`
- WHEN listing with `activeScopes: ['battle']`
- THEN the command is excluded

### Requirement: Duplicate Alias Throws at Registration
The registry MUST throw when a new alias collides with an existing one under an overlapping `scope`, and MUST allow the same alias under disjoint scopes.

#### Scenario: Overlapping scope collides
- GIVEN alias `top` registered with `scope: ['lobby']`
- WHEN a second command registers alias `top` with `scope: ['lobby']`
- THEN registration throws

#### Scenario: Disjoint scope does not collide
- GIVEN alias `attack` registered with `scope: ['battle']`
- WHEN a second command registers alias `attack` with `scope: ['lobby']`
- THEN both registrations succeed

### Requirement: Pure Scope Derivation From State
`deriveScopes(state)` MUST be pure and MUST return `battle` and `reaction-window` together when a reaction window is open during a battle.

#### Scenario: Each state maps to its scopes

| State | Scopes |
|---|---|
| No session | `['anonymous']` |
| Session, no battle | `['lobby']` |
| Active battle, no open reaction | `['battle']` |
| Active battle, open reaction window | contains both `'battle'` and `'reaction-window'` |

- GIVEN the state in a table row above
- WHEN `deriveScopes(state)` runs
- THEN it returns exactly that row's scopes

### Requirement: Availability Makes an Unreasoned Block Unrepresentable
`availability(ctx)` MUST return `{ enabled: true } | { enabled: false, reason: string }`; the type MUST NOT allow a blocked result with no `reason`.

#### Scenario: Blocked result carries its reason into the list item
- GIVEN `availability(ctx)` returns `{ enabled: false, reason: 'necesita MAGIC 14' }`
- WHEN the registry builds the list item
- THEN `lockedReason` equals `'necesita MAGIC 14'`

### Requirement: Alias Resolution and Unknown-Alias Suggestions
`resolve(text, ctx)` MUST map a known alias to its command and parse remaining text into arguments; MUST return similar candidates, not a bare failure, when no alias matches.

#### Scenario: Known alias resolves
- GIVEN `top` is a registered alias in the active scope
- WHEN `resolve('top', ctx)` runs
- THEN it returns the matching command

#### Scenario: Typo yields a suggestion
- GIVEN `attack` is a registered alias
- WHEN `resolve('atack', ctx)` runs
- THEN the result lists `attack` as a candidate, not just an error

### Requirement: Numbered Pick Resolution, Staleness, and Invalidation
A typed numeral MUST resolve against the `number -> id` map from the list last rendered to `CommandList`, never against a fresh `options(ctx)`. That map MUST be replaced on every render, and MUST be cleared on scope change and on command completion. A numeral typed against an invalidated map MUST error explicitly and MUST NOT select whatever now occupies that position.

#### Scenario: Numeral matches what is on screen
- GIVEN `CommandList` last rendered `1) POWER_STRIKE`, `2) FIREBALL`
- WHEN the player types `2`
- THEN the resolved command is `FIREBALL`

#### Scenario: Numeral typed after invalidation
- GIVEN the map was cleared by a scope change, or by a completed command, since the last render
- WHEN the player types `2`
- THEN resolution errors explicitly and selects nothing

### Requirement: Click and Typed Alias Invoke Identically
Selecting a command by click and resolving it by typed alias MUST produce the same `commandId` and the same argument values.

#### Scenario: Same command, same arguments, either path
- GIVEN a one-argument command completed once via click-and-prompt, once via typed alias with a positional argument
- WHEN both flows finish
- THEN their `commandId` and argument values are identical

### Requirement: Multi-Argument Completion by Click or by One Typed Line
Selecting a multi-argument command by click MUST open one prompt per argument, in declaration order, via `advance()` on a `PendingCommand`. The same command MUST also complete from one line where arguments after the alias are read positionally, in declaration order.

#### Scenario: Two-argument command via click
- GIVEN command `challenge` with arguments `rival` then `build`
- WHEN selected by click
- THEN the player is prompted for `rival`, then `build`, and `run` fires only once both are filled

#### Scenario: Same command via one typed line
- GIVEN command `challenge` with arguments `rival` then `build`
- WHEN the player types `challenge alice starter`
- THEN it runs with `rival: alice` and `build: starter`

### Requirement: Optional Arguments Are Prompted With a Skip Exit
The guided flow MUST prompt for optional arguments too, offering an explicit exit to continue without a value.

#### Scenario: Skipping an optional argument
- GIVEN a command with one optional argument
- WHEN the player reaches that prompt and chooses the skip exit
- THEN it runs without a value for that argument

### Requirement: Cancelling a Pending Command
`Esc` or an explicit `cancel` entry MUST drop a `PendingCommand`; an empty submit MUST NOT cancel one.

#### Scenario: Esc or explicit cancel drops it
- GIVEN a `PendingCommand` awaiting an argument
- WHEN the player presses `Esc`, or types `cancel`
- THEN the pending command is dropped and `run` is never invoked

#### Scenario: Empty submit never cancels
- GIVEN a `PendingCommand` awaiting an argument
- WHEN the player submits an empty line
- THEN the pending command remains, unchanged

### Requirement: Disabled Commands Are Shown, Never Hidden
A blocked command MUST still render, dimmed, with its reason; clicking it MUST NOT invoke `run`.

#### Scenario: Blocked command stays visible and inert
- GIVEN a command whose `availability(ctx)` is blocked
- WHEN the registry feeds `CommandList`
- THEN the item renders with `lockedReason` and a click does not invoke `run`
