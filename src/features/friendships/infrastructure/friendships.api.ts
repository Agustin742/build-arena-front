import {
  type FriendshipList,
  friendshipListSchema,
  type PublicFriendship,
  publicFriendshipSchema,
} from '@/shared/contracts'
import { type ApiClient } from '@/shared/http'

export interface FriendshipsApi {
  list: () => Promise<FriendshipList>
  request: (addresseeId: string) => Promise<PublicFriendship>
  accept: (id: string) => Promise<PublicFriendship>
  remove: (id: string) => Promise<undefined>
}

/**
 * `GET` answers with every row already oriented to the caller: `direction` says who sent
 * it and `player` is always the other one, so nothing here compares ids.
 *
 * `DELETE` is one route for three different intentions — rejecting, cancelling and
 * unfriending — and the arena decides which one it was from the row itself. Naming it for
 * the player is the console's job, not this client's.
 *
 * A friendship somebody else owns answers 404 rather than 403, because a 403 would confirm
 * that those two players know each other.
 */
export function createFriendshipsApi(client: ApiClient): FriendshipsApi {
  return {
    list: () => client.get('/friendships', friendshipListSchema),
    request: (addresseeId) => client.post('/friendships', { addresseeId }, publicFriendshipSchema),
    accept: (id) => client.patch(`/friendships/${id}/accept`, undefined, publicFriendshipSchema),
    remove: (id) => client.del(`/friendships/${id}`),
  }
}
