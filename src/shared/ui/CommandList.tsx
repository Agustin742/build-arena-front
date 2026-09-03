export interface CommandItem {
  id: string
  label: string
  key?: string
  hint?: string
  lockedReason?: string
}

interface CommandListProps {
  items: CommandItem[]
  onSelect: (id: string) => void
  emptyMessage?: string
}

function withKeys(items: CommandItem[]) {
  let next = 1

  return items.map((item) => {
    if (item.key !== undefined) {
      return { item, key: item.key }
    }

    const key = String(next)
    next += 1

    return { item, key }
  })
}

export function CommandList({ items, onSelect, emptyMessage }: CommandListProps) {
  if (items.length === 0) {
    return <p className="text-text-dim">{emptyMessage ?? 'Nada por acá'}</p>
  }

  return (
    <ul className="flex flex-col">
      {withKeys(items).map(({ item, key }) => {
        const locked = item.lockedReason !== undefined

        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                onSelect(item.id)
              }}
              className="flex w-full items-baseline gap-3 px-1 py-0.5 text-left enabled:hover:bg-border/40 disabled:cursor-not-allowed disabled:text-text-dim"
            >
              <span
                className={`min-w-[5ch] text-right ${locked ? 'text-border-strong' : 'text-accent'}`}
              >
                {`${key})`}
              </span>
              <span className={`min-w-[18ch] ${locked ? 'line-through' : 'text-text'}`}>
                {item.label}
              </span>
              {item.hint !== undefined && <span className="text-text-dim">{item.hint}</span>}
              {locked && <span className="text-error">{item.lockedReason}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
