import { type CommandOption, findOption } from '@/shared/commands'
import { uuidSchema } from '@/shared/contracts'

/**
 * A resolved player, or the words to refuse with. Both commands that address a player —
 * adding a friend and sending a challenge — need the same answer and, more importantly,
 * the same refusal: two different explanations for one missing feature would read like
 * two different rules.
 */
export type PlayerAnswer = { id: string } | { refusal: { message: string; lines: string[] } }

const HINT = [
  'La arena no tiene buscador: elegí de la lista, o pegá el id que te hayan pasado',
  'Cada uno consigue el suyo con el comando me',
]

/**
 * What the player typed, turned back into an id. The offered rows come first — a number or
 * a username is what anybody would actually type — and a raw id is let through only when
 * it really is one, so somebody outside every list can still be reached.
 *
 * Anything else is refused here rather than sent, because the arena would answer a name
 * with a validation error naming a field the player never saw.
 */
export function resolvePlayerAnswer(offered: readonly CommandOption[], raw: string): PlayerAnswer {
  const chosen = findOption(offered, raw)

  if (chosen !== undefined) {
    return { id: chosen.id }
  }

  const answer = raw.trim()

  if (uuidSchema.safeParse(answer).success) {
    return { id: answer }
  }

  return { refusal: { message: `No encontré a nadie que se llame "${answer}"`, lines: HINT } }
}
