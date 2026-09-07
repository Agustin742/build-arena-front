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
  /**
   * Scroll the body instead of growing. The heading stays put, and the panel gives up
   * height when the console runs out of it rather than pushing the prompt off the screen.
   */
  scroll?: boolean
}

export function Panel({
  title,
  note,
  children,
  className = '',
  label,
  scroll = false,
}: PanelProps) {
  // `min-h-0` on both the panel and its body is what allows the shrinking: a flex item
  // refuses to go below its content height until it is told it may.
  const bodyClass = scroll ? 'console-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2' : 'px-3 py-2'
  const body = <div className={bodyClass}>{children}</div>
  const frame = `border border-border bg-surface ${scroll ? 'flex min-h-0 flex-col' : ''}`

  if (title === undefined) {
    return <div className={`${frame} ${className}`}>{body}</div>
  }

  return (
    <section aria-label={label ?? title} className={`${frame} ${className}`}>
      <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-border px-3 py-1">
        <h2 className="text-xs font-bold tracking-widest text-accent uppercase">{title}</h2>
        {note !== undefined && <span className="text-xs text-text-dim">{note}</span>}
      </div>
      {body}
    </section>
  )
}
