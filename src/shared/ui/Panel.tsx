import { type ReactNode } from 'react'

interface PanelProps {
  title?: string
  note?: string
  children: ReactNode
  className?: string
  /**
   * The accessible name of the region, when the visible title is not a good one. A panel
   * titled after the question it is asking would otherwise collide with the input that
   * asks it: two different things answering to the same name.
   */
  label?: string
}

export function Panel({ title, note, children, className = '', label }: PanelProps) {
  const body = <div className="px-3 py-2">{children}</div>

  if (title === undefined) {
    return <div className={`border border-border bg-surface ${className}`}>{body}</div>
  }

  return (
    <section aria-label={label ?? title} className={`border border-border bg-surface ${className}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-1">
        <h2 className="text-xs font-bold tracking-widest text-accent uppercase">{title}</h2>
        {note !== undefined && <span className="text-xs text-text-dim">{note}</span>}
      </div>
      {body}
    </section>
  )
}
