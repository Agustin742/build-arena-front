import { type FriendshipList, type PublicFriendship } from '@/shared/contracts'

import { bucketOf, type FriendshipBucket, sortFriendships } from '../domain/relation'

const NOBODY_ADDED = 'Todavía no agregaste a nadie'
const NOBODY_AT_ALL = 'Nadie te mandó solicitud y vos tampoco'

/** The same columns the ranking uses: the two lists show the same people. */
const NAME_WIDTH = 24
const RATING_WIDTH = 4

const HEADING: Record<FriendshipBucket, string> = {
  incoming: 'TE MANDARON SOLICITUD',
  outgoing: 'MANDASTE SOLICITUD',
  friends: 'AMIGOS',
}

const BUCKETS: readonly FriendshipBucket[] = ['incoming', 'outgoing', 'friends']

/**
 * The one order everything else is built on. The printed list and the pickers both number
 * this array, so the number the player reads and the number they type are the same one.
 */
export function orderedFriendships(list: FriendshipList): PublicFriendship[] {
  return sortFriendships(list)
}

function countIn(list: FriendshipList, bucket: FriendshipBucket): number {
  return list.filter((row) => bucketOf(row) === bucket).length
}

function friends(count: number): string {
  if (count === 0) {
    return 'ningún amigo'
  }

  return count === 1 ? '1 amigo' : `${String(count)} amigos`
}

/**
 * A request somebody else sent is the only row with anything at stake, so it leads. When
 * there is none the headline is just the count, because naming an empty group is noise.
 */
export function friendshipHeadline(list: FriendshipList): string {
  if (list.length === 0) {
    return NOBODY_ADDED
  }

  const waiting = countIn(list, 'incoming')

  if (waiting === 0) {
    return `Tenés ${friends(countIn(list, 'friends'))}`
  }

  const asked = waiting === 1 ? '1 solicitud' : `${String(waiting)} solicitudes`

  return `Tenés ${asked} sin responder · ${friends(countIn(list, 'friends'))}`
}

/**
 * Headings group the rows, but the numbering runs straight through them: a heading is not
 * a row, so counting it would make the third name the fourth number.
 */
export function friendshipLines(ordered: readonly PublicFriendship[]): string[] {
  if (ordered.length === 0) {
    return [NOBODY_AT_ALL]
  }

  const lines: string[] = []

  BUCKETS.forEach((bucket) => {
    const rows = ordered
      .map((row, index) => ({ row, position: index + 1 }))
      .filter((entry) => bucketOf(entry.row) === bucket)

    if (rows.length === 0) {
      return
    }

    lines.push(HEADING[bucket])
    rows.forEach(({ row, position }) => {
      lines.push(
        `${String(position).padStart(2)}) ${row.player.username.padEnd(NAME_WIDTH)}${String(
          row.player.rating,
        ).padStart(RATING_WIDTH)}`,
      )
    })
  })

  return lines
}
