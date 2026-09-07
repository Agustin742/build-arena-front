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
   * A line that belongs to the panel but must never scroll away with its body — the
   * sentence explaining the question, above a list long enough to scroll. Put it here and
   * the player can still read what is being asked at the bottom of a hundred names.
   */
  lead?: ReactNode
  /**
   * Scroll the body instead of growing. The heading stays put, and the panel gives up
   * height when the console runs out of it rather than pushing the prompt off the screen.
   */
  scroll?: boolean
  /**
   * This is the box the player is working in, so it takes whatever height is left over.
   *
   * Exactly one scrolling panel should claim it at a time. Two of them asking for the same
   * leftover is what flexbox splits in proportion to their content — which is how a five
   * line box next to a hundred row list ends up sixteen pixels tall with a scrollbar on it.
   */
  grow?: boolean
}

/**
 * What a scrolling panel is allowed to take while it is not the one being answered in.
 * Below its own content it never goes; above this it scrolls instead of pushing.
 */
const WAITING_ITS_TURN = 'max-h-[30vh] shrink-0'

export function Panel({
  title,
  note,
  children,
  className = '',
  label,
  lead,
  scroll = false,
  grow = false,
}: PanelProps) {
  // `min-h-0` on both the panel and its body is what allows the shrinking: a flex item
  // refuses to go below its content height until it is told it may.
  const bodyClass = scroll ? 'console-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2' : 'px-3 py-2'
  const body = (
    <>
      {lead !== undefined && (
        <div className="shrink-0 border-b border-border px-3 py-2">{lead}</div>
      )}
      <div className={bodyClass}>{children}</div>
    </>
  )
  const competing = grow ? 'min-h-0 flex-1' : WAITING_ITS_TURN
  const frame = `border border-border bg-surface ${scroll ? `flex flex-col ${competing}` : ''}`

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
