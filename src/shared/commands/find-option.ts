import { type CommandOption } from './types'

/**
 * What the player meant by what they typed. A pick step stores the raw answer — clicking a
 * row hands over the id, but typing hands over whatever was in the prompt — so the command
 * has to turn that back into the row it came from.
 *
 * The key wins over the label, because the number on screen is what the player was told to
 * type, and a label that happens to look like a number must not steal it. Locked rows are
 * still found: refusing them is the caller's job, and it needs the row to say why.
 */
export function findOption(
  options: readonly CommandOption[],
  raw: string,
): CommandOption | undefined {
  const answer = raw.trim()

  if (answer === '') {
    return undefined
  }

  const byKey = options.find((option, index) => (option.key ?? String(index + 1)) === answer)

  if (byKey !== undefined) {
    return byKey
  }

  const folded = answer.toLocaleLowerCase()

  return options.find(
    (option) => option.id === answer || option.label.toLocaleLowerCase() === folded,
  )
}
