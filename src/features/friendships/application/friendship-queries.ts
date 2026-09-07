import { type QueryClient } from '@tanstack/react-query'

import { type FriendshipList } from '@/shared/contracts'

import { type FriendshipsApi } from '../infrastructure/friendships.api'

export const FRIENDSHIPS_QUERY_KEY = ['friendships'] as const

/** Listing is all these helpers need, so that is all they ask for. */
export type FriendshipsLister = Pick<FriendshipsApi, 'list'>

/**
 * Unlike the builds of a player, this list changes without the player touching anything:
 * somebody else sends a request, or accepts one, and the rows are already different. So it
 * is stale on arrival and every read goes back to the arena — there is no invalidation
 * helper here because there is nothing to invalidate.
 *
 * `gcTime` is still infinite: commands read this through `query` and a command is not a
 * subscriber, so the default garbage window would drop the rows the pickers number.
 */
export function friendshipsQuery(api: FriendshipsLister) {
  return {
    queryKey: FRIENDSHIPS_QUERY_KEY,
    queryFn: () => api.list(),
    staleTime: 0,
    gcTime: Infinity,
  }
}

export function fetchFriendships(
  client: QueryClient,
  api: FriendshipsLister,
): Promise<FriendshipList> {
  return client.query(friendshipsQuery(api))
}

/** The rows the numbered list was drawn from, without going to the network for them. */
export function cachedFriendships(client: QueryClient): FriendshipList | undefined {
  return client.getQueryData<FriendshipList>(FRIENDSHIPS_QUERY_KEY)
}
