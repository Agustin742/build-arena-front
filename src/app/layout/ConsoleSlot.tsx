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
 * The only place that knows how tall a box in the console may get. The one slot that grows
 * takes whatever height is left over; every other one keeps a capped share and scrolls
 * inside it rather than pushing the prompt off the screen.
 *
 * Two boxes asking for the same leftover is what flexbox splits in proportion to their
 * content — which is how a five line box next to a hundred row list once ended up sixteen
 * pixels tall. Keeping the choice here, fed by one value, is what makes that impossible.
 */
export function ConsoleSlot({ grows, children }: ConsoleSlotProps) {
  // `min-h-0` in both states is what allows the shrinking: a flex item refuses to go below
  // its content height until it is told it may. `empty:hidden` takes a slot whose content
  // rendered nothing out of the column, so the gap around it goes too.
  const height = grows ? 'min-h-0 flex-1' : 'max-h-[30vh] min-h-0 shrink-0'

  return <div className={`flex flex-col gap-4 empty:hidden ${height}`}>{children}</div>
}
