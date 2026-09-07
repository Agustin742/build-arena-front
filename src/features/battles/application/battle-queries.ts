import { type QueryClient } from '@tanstack/react-query'

import { type BattleList } from '@/shared/contracts'

import { type BattlesApi } from '../infrastructure/battles.api'

export const BATTLES_QUERY_KEY = ['battles'] as const

/** Listing is all these helpers need, so that is all they ask for. */
export type BattlesLister = Pick<BattlesApi, 'list'>

/**
 * Same reasoning as the friendship list: this changes without the player touching
 * anything — somebody challenges them, or accepts, or gives up — so it is stale on
 * arrival and every read goes back to the arena.
 *
 * `gcTime` stays infinite because commands read this through `query` and a command is not
 * a subscriber, so the default garbage window would drop the rows the pickers number.
 */
export function battlesQuery(api: BattlesLister) {
  return {
    queryKey: BATTLES_QUERY_KEY,
    queryFn: () => api.list(),
    staleTime: 0,
    gcTime: Infinity,
  }
}

export function fetchBattles(client: QueryClient, api: BattlesLister): Promise<BattleList> {
  return client.query(battlesQuery(api))
}

/** The rows the numbered list was drawn from, without going to the network for them. */
export function cachedBattles(client: QueryClient): BattleList | undefined {
  return client.getQueryData<BattleList>(BATTLES_QUERY_KEY)
}
