import { type QueryClient } from '@tanstack/react-query'

import { available, type Command, type CommandResult } from '@/shared/commands'
import { toGameMessage } from '@/shared/http'

import { type SkillsApi } from '../infrastructure/skills.api'
import { catalogLines } from './catalog-lines'
import { fetchSkillCatalog } from './skill-catalog'

export interface SkillCommandDeps {
  client: QueryClient
  api: SkillsApi
}

export function createSkillsCommands({ client, api }: SkillCommandDeps): Command[] {
  return [
    {
      id: 'skills',
      label: 'SKILLS',
      hint: 'el catálogo de habilidades',
      aliases: ['skills'],
      args: [],
      scope: ['lobby'],
      availability: available,
      run: async (): Promise<CommandResult> => {
        try {
          const catalog = await fetchSkillCatalog(client, api)

          return {
            status: 'ok',
            message: `Catálogo: ${String(catalog.length)} habilidades`,
            lines: catalogLines(catalog),
          }
        } catch (error) {
          return { status: 'error', message: toGameMessage(error) }
        }
      },
    },
  ]
}
