import { type QueryClient } from '@tanstack/react-query'

import { type BuildList } from '@/shared/contracts'

import { type BuildsApi } from '../infrastructure/builds.api'

/** Listing is all these helpers need, so that is all they ask for. */
export type BuildsLister = Pick<BuildsApi, 'list'>

export const BUILDS_QUERY_KEY = ['builds'] as const

/** Nested under the list on purpose: invalidating the list reaches every build in it. */
export function buildQueryKey(id: string) {
  return [...BUILDS_QUERY_KEY, id] as const
}

/**
 * The builds of a player only change through this client — the arena scopes every route
 * to the owner and nobody else can write them — so the cache is authoritative until we
 * ourselves change something, and every mutation calls `invalidateBuilds`.
 *
 * `gcTime` matters as much as `staleTime`: commands read this through `query`, and a
 * command is not a subscriber, so the default garbage window would drop the list after
 * five idle minutes and quietly undo the endless cache above it.
 *
 * The assumption breaks in a second tab. A reload fixes it, and nothing is lost.
 */
export function buildsQuery(api: BuildsLister) {
  return {
    queryKey: BUILDS_QUERY_KEY,
    queryFn: () => api.list(),
    staleTime: Infinity,
    gcTime: Infinity,
  }
}

export function fetchBuilds(client: QueryClient, api: BuildsLister): Promise<BuildList> {
  return client.query(buildsQuery(api))
}

/** What is already in memory, without asking for it. */
export function cachedBuilds(client: QueryClient): BuildList | undefined {
  return client.getQueryData<BuildList>(BUILDS_QUERY_KEY)
}

export function invalidateBuilds(client: QueryClient): Promise<void> {
  return client.invalidateQueries({ queryKey: BUILDS_QUERY_KEY })
}
