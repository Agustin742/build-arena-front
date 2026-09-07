import { type QueryClient } from '@tanstack/react-query'

import { cachedSkillCatalog } from '@/features/skills'
import {
  available,
  blocked,
  type Command,
  type CommandArg,
  type CommandOption,
  type CommandResult,
  type MenuControl,
  type ParsedArgs,
} from '@/shared/commands'
import { type SkillCatalog } from '@/shared/contracts'
import { ApiError, toGameMessage, toViolationMessages } from '@/shared/http'

import { adviseBuild } from '../domain/advice'
import { estimateDerivedStats } from '../domain/derived-stats'
import { KIT_BUDGET, kitCost } from '../domain/kit'
import { ATTRIBUTE_KEYS } from '../domain/types'
import { type BuildDraft, type BuildsApi } from '../infrastructure/builds.api'
import { adviceMessage } from './build-messages'
import { invalidateBuilds } from './build-queries'
import { createBuildCrudCommands } from './builds.crud'
import {
  ATTRIBUTE_GROUP,
  ATTRIBUTE_STEP_LABEL,
  ATTRIBUTE_STEP_PROMPT,
  attributeBudgetNote,
  attributeOptions,
  chosenSkills,
  KIT_GROUP,
  KIT_STEPS,
  kitBudgetNote,
  skillOptions,
  spreadFrom,
} from './wizard-steps'

export interface BuildCommandDeps {
  client: QueryClient
  api: BuildsApi
  menu: MenuControl
}

const CONFIRM_YES = 'yes'
const CATALOG_MISSING = 'el catálogo todavía no llegó'
const NAME_TAKEN = 'Ya tenés una build con ese nombre'
const REFUSED = 'La arena rechazó la build'
const DISCARDED = 'Build descartada'

function confirmOptions(catalog: SkillCatalog, values: ParsedArgs): CommandOption[] {
  const spread = spreadFrom(values)
  const chosen = chosenSkills(catalog, values)
  const discard = { id: 'no', label: 'DESCARTAR', hint: 'volvés al lobby sin guardar' }

  if (spread === null) {
    return [{ id: CONFIRM_YES, label: 'GUARDAR' }, discard]
  }

  const { armorClass, maxHp } = estimateDerivedStats(spread)
  const spent = kitCost(chosen)

  return [
    {
      id: CONFIRM_YES,
      label: 'GUARDAR',
      hint: `CA ${String(armorClass)} · ${String(maxHp)} PV · kit ${String(spent)}/${String(KIT_BUDGET)}`,
    },
    discard,
  ]
}

function wizardArgs(catalogOf: () => SkillCatalog): CommandArg[] {
  const attributes: CommandArg[] = ATTRIBUTE_KEYS.map((attribute) => ({
    name: attribute,
    kind: 'pick',
    label: ATTRIBUTE_STEP_LABEL[attribute],
    prompt: ATTRIBUTE_STEP_PROMPT[attribute],
    group: ATTRIBUTE_GROUP,
    required: true,
    describe: (values) => attributeBudgetNote(values, attribute),
    options: (_ctx, values) => attributeOptions(values, attribute),
  }))

  const kit: CommandArg[] = KIT_STEPS.map((step) => ({
    name: step.name,
    kind: 'pick',
    label: step.label,
    prompt: step.prompt,
    group: KIT_GROUP,
    required: true,
    describe: (values) => kitBudgetNote(catalogOf(), values, step.name),
    options: (_ctx, values) => skillOptions(catalogOf(), values, step.type),
  }))

  return [
    {
      name: 'name',
      kind: 'text',
      label: 'Nombre',
      prompt: 'Poné un nombre a la build, de 3 a 40 caracteres',
      required: true,
    },
    ...attributes,
    ...kit,
    {
      name: 'confirm',
      kind: 'pick',
      label: '¿Guardamos?',
      prompt: 'Revisá la build antes de guardarla',
      required: true,
      options: (_ctx, values) => confirmOptions(catalogOf(), values),
    },
  ]
}

function draftFrom(values: ParsedArgs): BuildDraft {
  return {
    name: values.name ?? '',
    strength: Number(values.strength),
    magic: Number(values.magic),
    dexterity: Number(values.dexterity),
    constitution: Number(values.constitution),
    skillCodes: KIT_STEPS.map((step) => values[step.name] ?? ''),
  }
}

/** Advisory lines about a build that is legal but spends badly. Never blocking. */
function adviceLines(catalog: SkillCatalog, values: ParsedArgs): string[] {
  const spread = spreadFrom(values)

  if (spread === null) {
    return []
  }

  return adviseBuild(spread, chosenSkills(catalog, values)).map(adviceMessage)
}

function refusalOf(error: unknown): CommandResult {
  const violations = toViolationMessages(error)

  // The arena answers with the complete array, never just the first problem, so the
  // player fixes everything in one pass instead of discovering the rules one at a time.
  if (violations.length > 0) {
    return { status: 'error', message: REFUSED, lines: violations }
  }

  if (error instanceof ApiError && error.status === 409) {
    return { status: 'error', message: NAME_TAKEN }
  }

  return { status: 'error', message: toGameMessage(error) }
}

export function createBuildsCommands({ client, api, menu }: BuildCommandDeps): Command[] {
  // Read at the moment a step is drawn, not when the command is registered: the catalog
  // lands asynchronously and the wizard outlives the request that warmed it.
  const catalogOf = () => cachedSkillCatalog(client) ?? []

  return [
    {
      id: 'build-new',
      label: 'BUILD NEW',
      hint: 'armar una build',
      aliases: ['build new'],
      args: wizardArgs(catalogOf),
      scope: ['builds'],
      availability: () =>
        cachedSkillCatalog(client) === undefined ? blocked(CATALOG_MISSING) : available(),
      run: async (values): Promise<CommandResult> => {
        if (values.confirm !== CONFIRM_YES) {
          return { status: 'ok', message: DISCARDED }
        }

        let created

        try {
          created = await api.create(draftFrom(values))
        } catch (error) {
          return refusalOf(error)
        }

        await invalidateBuilds(client)

        return {
          status: 'ok',
          message: `Build "${created.name}" creada`,
          lines: adviceLines(catalogOf(), values),
        }
      },
    },
    ...createBuildCrudCommands({ client, api, menu }),
  ]
}
