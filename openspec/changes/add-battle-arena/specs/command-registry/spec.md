# Delta for Command Registry

## MODIFIED Requirements

### Requirement: Cancelling a Pending Command
`Esc` or an explicit `cancel` entry MUST drop a `PendingCommand`; an empty submit MUST NOT
cancel one. `cancelPending(notice?: CommandResult)` MUST accept an optional notice: with no
argument it MUST behave exactly as before (silent drop); when given, it MUST also call
`announce(notice)` so the reason prints into the output box.
(Previously: `cancelPending()` took no argument and could only clear silently.)

#### Scenario: Esc or explicit cancel drops it
- GIVEN a `PendingCommand` awaiting an argument
- WHEN the player presses `Esc`, or types `cancel`
- THEN the pending command is dropped and `run` is never invoked

#### Scenario: Empty submit never cancels
- GIVEN a `PendingCommand` awaiting an argument
- WHEN the player submits an empty line
- THEN the pending command remains, unchanged

#### Scenario: No-argument cancel stays silent
- GIVEN a `PendingCommand` awaiting an argument
- WHEN something calls `cancelPending()` with no argument
- THEN the pending command is dropped and nothing prints to the output box

#### Scenario: Cancel with a notice prints the reason
- GIVEN a `PendingCommand` awaiting an argument
- WHEN an arena-level effect calls `cancelPending({ text: 'La ventana se cerró' })`
- THEN the pending command is dropped and "La ventana se cerró" prints via `announce`

## ADDED Requirements

### Requirement: Announcing an Out-of-Band Result
The command runtime MUST expose `announce(result: CommandResult)`, which prints `result`
into the existing output box (`salida`) without being triggered by a player-run command and
without touching `pending`. A later command's own result MUST replace the announced text,
the same as it replaces any prior result.

#### Scenario: Announce prints without a command run
- GIVEN no command is currently running
- WHEN `announce({ text: 'X aceptó tu desafío. Escribí enter para pelear' })` is called
- THEN the output box shows that text

#### Scenario: Announce does not touch a pending wizard
- GIVEN a `PendingCommand` is awaiting an argument
- WHEN `announce(...)` is called
- THEN the pending command is unaffected

#### Scenario: The next command result replaces the announcement
- GIVEN an announcement is currently shown in the output box
- WHEN the player runs any command that produces a result
- THEN the output box shows that command's result instead
