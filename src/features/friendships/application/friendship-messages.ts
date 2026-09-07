import { canAccept, type Removal } from '../domain/relation'
import { type FriendshipFacts } from '../domain/types'

/**
 * What the player is about to do, in their own words. The rules decide which of the three
 * applies; this only says it out loud, because "eliminar" on a request nobody answered yet
 * would be the console lying about what the button does.
 */
export const REMOVAL_LABEL: Record<Removal, string> = {
  reject: 'rechazar la solicitud',
  cancel: 'cancelar la solicitud',
  unfriend: 'eliminar de tus amigos',
}

const DONE: Record<Removal, (username: string) => string> = {
  reject: (username) => `Rechazaste la solicitud de ${username}`,
  cancel: (username) => `Cancelaste la solicitud que le mandaste a ${username}`,
  unfriend: (username) => `${username} ya no está entre tus amigos`,
}

export function removalDone(removal: Removal, username: string): string {
  return DONE[removal](username)
}

/**
 * Why a row cannot be accepted. Locked rows stay on the list instead of disappearing from
 * it: the numbering has to match the list the player just read, and a row that vanishes
 * teaches nothing about why.
 */
export function acceptLock(facts: FriendshipFacts): string | undefined {
  if (canAccept(facts)) {
    return undefined
  }

  return facts.status === 'ACCEPTED'
    ? 'Ya son amigos'
    : 'Esta la mandaste vos: la tiene que aceptar la otra persona'
}
