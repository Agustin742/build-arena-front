import { type CommandOption } from '@/shared/commands'
import { type BuildList, type PublicBuild } from '@/shared/contracts'

import { buildSummary } from './build-lines'

const POSITION = /^\d+$/

/** The player's builds as a numbered list. The id travels; the name is what is read. */
export function buildOptions(builds: BuildList): CommandOption[] {
  return builds.map((build, index) => ({
    id: build.id,
    key: String(index + 1),
    label: build.name,
    hint: buildSummary(build),
  }))
}

/**
 * Resolves whatever the player typed: the number the list showed, the name they gave the
 * build, or the id if they happen to have one. The position wins over a name that looks
 * like a number, because the number on screen is what they were told to type.
 */
export function findBuild(builds: BuildList, raw: string): PublicBuild | undefined {
  const answer = raw.trim()

  if (POSITION.test(answer)) {
    const found = builds[Number(answer) - 1]

    if (found !== undefined) {
      return found
    }
  }

  const folded = answer.toLocaleLowerCase()

  return builds.find((build) => build.id === answer || build.name.toLocaleLowerCase() === folded)
}
