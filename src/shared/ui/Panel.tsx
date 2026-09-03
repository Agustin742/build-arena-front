import { type ReactNode } from 'react'

interface PanelProps {
  title?: string
  note?: string
  children: ReactNode
  className?: string
}

export function Panel({ title, note, children, className = '' }: PanelProps) {
  const body = <div className="px-3 py-2">{children}</div>

  if (title === undefined) {
    return <div className={`border border-border bg-surface ${className}`}>{body}</div>
  }

  return (
    <section aria-label={title} className={`border border-border bg-surface ${className}`}>
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-1">
        <h2 className="text-xs font-bold tracking-widest text-accent uppercase">{title}</h2>
        {note !== undefined && <span className="text-xs text-text-dim">{note}</span>}
      </header>
      {body}
    </section>
  )
}
