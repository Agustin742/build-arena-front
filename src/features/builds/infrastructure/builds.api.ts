import {
  type BuildList,
  buildListSchema,
  type PublicBuild,
  publicBuildSchema,
} from '@/shared/contracts'
import { type ApiClient } from '@/shared/http'

export interface BuildDraft {
  name: string
  strength: number
  magic: number
  dexterity: number
  constitution: number
  skillCodes: string[]
}

/** Any subset of the draft. The arena merges it into the stored build. */
export type BuildChange = Partial<BuildDraft>

export interface BuildsApi {
  create: (draft: BuildDraft) => Promise<PublicBuild>
  list: () => Promise<BuildList>
  get: (id: string) => Promise<PublicBuild>
  update: (id: string, change: BuildChange) => Promise<PublicBuild>
  remove: (id: string) => Promise<undefined>
}

/**
 * Every route is scoped to the owner, and a build that belongs to somebody else answers
 * 404 rather than 403: whether it exists at all is not the caller's business.
 *
 * A rejected build comes back as 400 with the violation envelope, which `ApiError` already
 * parses. The arena returns the complete array, never just the first problem.
 */
export function createBuildsApi(client: ApiClient): BuildsApi {
  return {
    create: (draft) => client.post('/builds', draft, publicBuildSchema),
    list: () => client.get('/builds', buildListSchema),
    get: (id) => client.get(`/builds/${id}`, publicBuildSchema),
    // The change is merged into the stored build and the result is validated as a whole,
    // so a patch can be refused for a rule the fields it carries never mention.
    update: (id, change) => client.patch(`/builds/${id}`, change, publicBuildSchema),
    remove: (id) => client.del(`/builds/${id}`),
  }
}
