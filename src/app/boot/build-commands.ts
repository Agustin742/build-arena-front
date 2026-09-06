import { createBuildsApi, createBuildsCommands } from '@/features/builds'
import { type Command } from '@/shared/commands'

import { apiClient } from './api-client'
import { queryClient } from './query-client'

export const buildCommands: readonly Command[] = createBuildsCommands({
  client: queryClient,
  api: createBuildsApi(apiClient),
})
