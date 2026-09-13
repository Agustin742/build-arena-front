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

### Requirement: A Pending Step Autofills When Its Value Is Already Determined by Context
A `PendingCommand` step MAY declare an `autofill` that supplies its value from context
instead of asking the player, used only when that value is already determined without
ambiguity (e.g. a single live battle to enter, or a confirmation not actually needed). A
step's ordinary prompt-and-wait behavior MUST be unchanged when no autofill applies or when
its condition for skipping is not met.

#### Scenario: A single live battle enters directly without a picker
- GIVEN the player has exactly one live battle
- WHEN `enter`'s `battle` step evaluates its autofill
- THEN that battle is selected without prompting a numbered picker

#### Scenario: Entering an ACCEPTED battle still asks for confirmation
- GIVEN the chosen battle's status is `ACCEPTED`
- WHEN `enter`'s `confirm` step evaluates its autofill
- THEN no autofill applies and the player is prompted to confirm

#### Scenario: Entering an already IN_PROGRESS battle needs no confirmation
- GIVEN the chosen battle's status is `IN_PROGRESS`
- WHEN `enter`'s `confirm` step evaluates its autofill
- THEN it autofills and the player is not prompted

#### Scenario: `volver` from an IN_PROGRESS battle still asks for confirmation
- GIVEN the current battle's status is `IN_PROGRESS`
- WHEN `volver`'s `confirm` step evaluates its autofill
- THEN no autofill applies and the player is prompted to confirm

#### Scenario: `volver` outside an in-progress battle needs no confirmation
- GIVEN the current battle's status is not `IN_PROGRESS`, or there is no result yet
- WHEN `volver`'s `confirm` step evaluates its autofill
- THEN it autofills and the player is not prompted

#### Scenario: A step without autofill behaves exactly as today
- GIVEN a step declares no `autofill`
- WHEN the pending command reaches that step
- THEN the player is prompted exactly as before, with no behavior change
