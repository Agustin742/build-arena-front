import { useCommandRuntime } from '@/app/providers/command-runtime'
import { type CommandItem, CommandList } from '@/shared/ui'

export function CommandListContainer() {
  const { ctx, selectItem } = useCommandRuntime()

  const items: CommandItem[] = ctx.picks.items.map((item) => ({
    id: item.id,
    label: item.label,
    key: item.key,
    ...(item.hint === undefined ? {} : { hint: item.hint }),
    ...(item.lockedReason === undefined ? {} : { lockedReason: item.lockedReason }),
  }))

  return <CommandList items={items} onSelect={selectItem} />
}
