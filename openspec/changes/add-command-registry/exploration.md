# Exploration — add-command-registry

Phase 4 of `docs/design/implementation-plan.md`. Read-only investigation: this document
frames the open questions, it does not decide them. Decisions belong to the proposal.

## Current state

`src/shared/commands/` does not exist. Phase 4 creates it. What already exists and constrains it:

| Artifact | Contract today | Why it constrains Phase 4 |
| --- | --- | --- |
| `src/shared/ui/CommandList.tsx` | `{ items: CommandItem[], onSelect, emptyMessage? }` where `CommandItem = { id, label, key?, hint?, lockedReason? }` | Auto-numbers items without an explicit `key`, renders `lockedReason` inline with the button disabled, and never fires `onSelect` for a locked item. The "disabled is shown, not hidden" policy is already enforced here. The registry only has to feed it `lockedReason`. |
| `src/shared/ui/Prompt.tsx` | `{ value, onChange, onSubmit, hint?, error?, disabled?, label? }` | Submits the trimmed value on Enter, including the empty string (its test ties empty submit to declining a reaction window). Knows nothing about aliases, scope, or commands. |
| `src/app/layout/prompt-slot.ts`, `PromptPortal.tsx`, `AppShell.tsx` | One footer slot (`PromptSlotContext`) | Exactly one portaled `Prompt` can mount at a time. |
| `src/app/routes/AppRoutes.tsx` | Flat routes, all `ScreenPlaceholder` | No route carries scope metadata. Scope has to be derived from somewhere else. |
| `src/app/routes/DesignScreen.tsx` | Local `useState` feeding `CommandList`/`Prompt` directly | Throwaway wiring. It gets superseded, not extended. |

`docs/design/architecture.md` (lines 199-236) already fixes the interfaces verbatim:

```ts
export interface CommandArg {
  name: string
  kind: 'text' | 'password' | 'number' | 'pick'
  label: string
  required: boolean
  options?: (ctx: CommandContext) => CommandOption[]
}

export interface Command {
  id: string
  label: string
  aliases: string[]
  args: CommandArg[]
  scope: CommandScope
  isEnabled: (ctx: CommandContext) => boolean
  run: (args: ParsedArgs, ctx: CommandContext) => Promise<CommandResult>
}
```

It also fixes, in prose, that the `number -> id` map lives in the registry's context rather than
in the component that rendered the list, and that a disabled command is dimmed with its reason
instead of hidden.

Sibling patterns worth imitating: `src/shared/contracts/` (Zod schema then inferred type, barrel
`index.ts`), `src/features/auth/application/session.store.ts` (Zustand factory behind a thin
facade), `src/shared/http/api-client.ts` (factory function returning a plain interface, not a class).

## The five open questions

### 1. Pick arguments: click versus typed number

The `kind: 'pick'` slot is settled by architecture.md. Genuinely open: does a typed numeral resolve
against the same last-shown numbered map that `CommandList` rendered (single source of truth), or
against a freshly evaluated `arg.options(ctx)` (which can drift from what is on screen)?

Undocumented anywhere and riding alongside: whether a multi-argument command such as
`challenge <rival> <build>` gets a guided sub-prompt flow in this phase at all.

### 2. Home and invalidation of the number map

Home is settled. The refresh mechanism is not: recomputed on every `visible()` call, refreshed by an
explicit action, or owned by its own store. Coupled to question 1.

### 3. An alias that resolves to two commands, or to none

"None" has a documented direction: suggest similar candidates. "Two commands, one alias" is
addressed nowhere. Real fork between a duplicate guard that fails fast at registration time (scoped
per `CommandScope`) and a runtime tiebreak.

### 4. Flat or composed scope

The least settled of the five. architecture.md's example list (`anonymous`, `lobby`, `battle`,
`reaction-window`) reads flat, but a reaction window necessarily co-occurs with a battle in progress
per the event model in `docs/frontend-guide.md`. A flat scope cannot express that without either
duplicating registrations or making `CommandScope` composable. The type does not exist yet.

### 5. Disabled command: always shown, or only when actionable

Policy is settled by both architecture.md and the shipped `CommandList` — always shown, dimmed, with
its reason. What is actually open is only the interface: `isEnabled` returns a bare boolean with no
reason field, so something must bridge it to `CommandList`'s `lockedReason` string. Either
`isEnabled` returns a richer result, or a sibling `disabledReason` function sits next to it.

### Sixth question, implicit

No route carries scope metadata. Where `CommandScope` is derived from is a decision the proposal has
to make even though the plan does not list it.

## Candidate approaches

1. **Plain factory module with `CommandContext` passed explicitly.** Matches the `createApiClient`
   idiom and architecture.md's framing of `commands/` as pure and testable without mounting a
   component. Effort: low to medium.
2. **Registry backed by its own Zustand store.** Buys automatic refresh on render, contradicts the
   "pure module" framing. Effort: medium.

Leaning toward 1 on implementation strategy only. The five questions above are the real forks.

## Risks

- The single prompt-portal slot may not survive a later requirement for a simultaneous action prompt
  and reaction prompt. Flagged here, not solved here.
- `CommandScope`'s shape ripples into every command registered in Phases 5 through 9. It is the most
  expensive question to get wrong.
- Scope derivation has no home yet.

## Ready for proposal

Yes. Confirm without re-litigating: `pick` as a `CommandArg.kind`, the disabled-always-shown policy,
the number map living in registry context, and suggesting candidates for an unknown alias.

Genuine decisions for the proposal: alias-collision policy, the scope composition model, multi-argument
command flow, and scope derivation.
