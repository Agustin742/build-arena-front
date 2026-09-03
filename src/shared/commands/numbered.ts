import {
  type CommandOption,
  type NumberedItem,
  type NumberedList,
  type VisibleCommand,
} from './types'

const SKIP_ENTRY_ID = '__skip__'
const CANCEL_ENTRY_ID = '__cancel__'

function buildLookup(items: readonly NumberedItem[]): (key: string) => string | undefined {
  const byKey = new Map(items.map((item) => [item.key, item.id]))

  return (key) => byKey.get(key)
}

export function numberCommands(
  visible: readonly VisibleCommand[],
  generation: number,
): NumberedList {
  const items: NumberedItem[] = visible.map((entry, index) => ({
    key: String(index + 1),
    id: entry.command.id,
    label: entry.command.label,
    ...(entry.command.hint === undefined ? {} : { hint: entry.command.hint }),
    ...(entry.availability.enabled ? {} : { lockedReason: entry.availability.reason }),
  }))

  return { generation, items, lookup: buildLookup(items) }
}

export function numberOptions(
  options: readonly CommandOption[],
  generation: number,
  controls: { skip: boolean },
): NumberedList {
  const items: NumberedItem[] = options.map((option, index) => ({
    key: String(index + 1),
    id: option.id,
    label: option.label,
    ...(option.hint === undefined ? {} : { hint: option.hint }),
  }))

  if (controls.skip) {
    items.push({ key: 's', id: SKIP_ENTRY_ID, label: 'Skip' })
  }

  items.push({ key: 'esc', id: CANCEL_ENTRY_ID, label: 'Cancel' })

  return { generation, items, lookup: buildLookup(items) }
}

export const EMPTY_NUMBERED_LIST: NumberedList = {
  generation: 0,
  items: [],
  lookup: () => undefined,
}
