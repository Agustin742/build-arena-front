import { type SkillCatalog, skillCatalogSchema } from '@/shared/contracts'
import { type ApiClient } from '@/shared/http'

export interface SkillsApi {
  list: () => Promise<SkillCatalog>
}

export function createSkillsApi(client: ApiClient): SkillsApi {
  return {
    list: () => client.get('/skills', skillCatalogSchema),
  }
}
