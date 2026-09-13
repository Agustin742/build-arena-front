import { type ReactNode } from 'react'

interface ConsoleSlotProps {
  /**
   * Whether this is the box the console is focused on. Decided once, by the layout, for
   * every slot at the same time — never by the box inside.
   */
  grows: boolean
  children: ReactNode
}

/**
 * How low the box being worked in may go: a panel heading (26px), the lead sentence (39px),
 * the body padding (16px) and three option rows of 26px, measured in Chrome — 159px. Below
 * this a question is a scrollbar around nothing.
 */
const FOCUSED_FLOOR = 'h-[10rem]'

/**
 * How low a box waiting its turn may go: a panel heading, the body padding and one line —
 * 68px. Enough to say what the box is, so it never becomes a sliver of its own.
 */
const RESTING_FLOOR = 'h-[4.25rem]'

/**
 * The only place that knows how tall a box in the console may get. No box has a cap: with
 * room to spare every one shows all it holds. When the console runs short, the boxes waiting
 * their turn give up height first, down to their floor, and only then the focused one.
 *
 * The floor is a floor and not a size because of how three declarations meet. The basis is
 * the content, so the height never sizes the box; the minimum height stays automatic, which
 * for a flex item is the smaller of its height and its content. A box shorter than its
 * floor keeps its own height instead of being padded out to it.
 *
 * Two boxes growing at once is what once left a five line box sixteen pixels tall next to a
 * hundred row list. Keeping the choice here, fed by one value, is what makes that impossible.
 */
export function ConsoleSlot({ grows, children }: ConsoleSlotProps) {
  // `empty:hidden` takes a slot whose content rendered nothing out of the column, so the
  // gap around it goes too.
  const height = grows ? `grow ${FOCUSED_FLOOR}` : `shrink-[1000] ${RESTING_FLOOR}`

  return <div className={`flex basis-[content] flex-col empty:hidden ${height}`}>{children}</div>
}
