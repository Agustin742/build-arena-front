import { type ReactNode, useLayoutEffect, useRef } from 'react'

import { measureFloor } from './panel-floor'

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
   * Scroll the body instead of pushing what sits below off the screen. The panel starts at
   * the height of everything it holds and only gives some up when its column runs short —
   * never below its heading, its lead and its first three rows.
   */
  scroll?: boolean
}

/**
 * The frame of a scrolling panel. Three declarations together make `height` a floor and
 * not a size, so do not read `h-[...]` as a fixed height:
 *
 * - `basis-[content]` sizes the panel from what it holds, so the height never sizes it and
 *   the panel never grows past its content. `flex-basis: content` is supported in every
 *   evergreen browser (Chrome 94, Firefox 61, Safari 11).
 * - No `min-h-*`: the minimum stays automatic, which for a flex item that has a height is
 *   the smaller of that height and its content. A panel whose content is shorter than the
 *   floor keeps its own height and never shrinks.
 * - `h-[var(--panel-floor)]` is the floor itself, measured below. Until it is measured the
 *   height is `auto`, and the panel simply does not shrink.
 *
 * `--console-yield` is the order: whoever places the panel says whether it gives up height
 * before the others or after them. Outside the console nobody sets it and it is 1.
 */
const SCROLL_FRAME =
  'flex basis-[content] flex-col shrink-[var(--console-yield,1)] h-[var(--panel-floor,auto)]'

export function Panel({
  title,
  note,
  children,
  className = '',
  label,
  lead,
  scroll = false,
}: PanelProps) {
  const frameRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  // Runs after every render, because a new list is new rows to measure, and again whenever
  // the panel changes size, because a narrower console wraps the heading and the rows.
  useLayoutEffect(() => {
    const frame = frameRef.current
    const body = bodyRef.current

    if (!scroll || frame === null || body === null) {
      return undefined
    }

    const publish = () => {
      const floor = `${String(measureFloor(frame, body))}px`

      // Writing the same value again would be a style change, and a style change is a
      // resize the observer below would report back: a loop that never settles.
      if (frame.style.getPropertyValue('--panel-floor') !== floor) {
        frame.style.setProperty('--panel-floor', floor)
      }
    }

    publish()

    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }

    let frameRequest = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameRequest)
      frameRequest = requestAnimationFrame(publish)
    })
    observer.observe(frame)

    return () => {
      cancelAnimationFrame(frameRequest)
      observer.disconnect()
    }
  })

  const attachFrame = (element: HTMLElement | null) => {
    frameRef.current = element
  }

  // `min-h-0` on the body is what lets it shrink below its rows inside a panel that did.
  const bodyClass = scroll ? 'console-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2' : 'px-3 py-2'
  const body = (
    <>
      {lead !== undefined && (
        <div className="shrink-0 border-b border-border px-3 py-2">{lead}</div>
      )}
      <div ref={bodyRef} className={bodyClass}>
        {children}
      </div>
    </>
  )
  const frame = `border border-border bg-surface ${scroll ? SCROLL_FRAME : ''}`

  if (title === undefined) {
    return (
      <div ref={attachFrame} className={`${frame} ${className}`}>
        {body}
      </div>
    )
  }

  return (
    <section ref={attachFrame} aria-label={label ?? title} className={`${frame} ${className}`}>
      <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-border px-3 py-1">
        <h2 className="text-xs font-bold tracking-widest text-accent uppercase">{title}</h2>
        {note !== undefined && <span className="text-xs text-text-dim">{note}</span>}
      </div>
      {body}
    </section>
  )
}
