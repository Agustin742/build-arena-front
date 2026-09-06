import { type QueryClient } from '@tanstack/react-query'

import { type SkillCatalog } from '@/shared/contracts'

import { type SkillsApi } from '../infrastructure/skills.api'

export const SKILLS_QUERY_KEY = ['skills'] as const

/**
 * Twelve seeded skills that do not change between deployments, so the catalog is asked
 * for once and read from memory forever after.
 *
 * `gcTime` matters as much as `staleTime` here: the catalog is read by commands through
 * `fetchQuery`, and a command is not a subscriber. With the default garbage window an
 * unwatched query is dropped after five idle minutes and the next `builds` would go back
 * to the network for a list that never moves.
 */
export function skillCatalogQuery(api: SkillsApi) {
  return {
    queryKey: SKILLS_QUERY_KEY,
    queryFn: () => api.list(),
    staleTime: Infinity,
    gcTime: Infinity,
  }
}

export function fetchSkillCatalog(client: QueryClient, api: SkillsApi): Promise<SkillCatalog> {
  return client.fetchQuery(skillCatalogQuery(api))
}

/** What is already in memory, without asking for it. */
export function cachedSkillCatalog(client: QueryClient): SkillCatalog | undefined {
  return client.getQueryData<SkillCatalog>(SKILLS_QUERY_KEY)
}
