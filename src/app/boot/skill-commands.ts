import { createSkillsApi, createSkillsCommands } from '@/features/skills'
import { type Command } from '@/shared/commands'

import { apiClient } from './api-client'
import { queryClient } from './query-client'

export const skillCommands: readonly Command[] = createSkillsCommands({
  client: queryClient,
  api: createSkillsApi(apiClient),
})
