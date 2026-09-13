import { type ReactNode } from 'react'

interface ConsoleSlotProps {
  /**
   * Whether this is the box the console is focused on. Decided once, by the layout, for
   * every slot at the same time — never by the box inside.
   */
  focused: boolean
  children: ReactNode
}

/**
 * The order in which the boxes of the console give up height, and nothing else. No box
 * grows: with room to spare every one shows all it holds and the column stays pinned next to
 * the prompt. When the column runs short the boxes waiting their turn yield first, each down
 * to its own floor, and only then the focused one.
 *
 * The slot takes itself out of the layout (`contents`) so the column sizes the panel inside
 * and not a wrapper around it. The panel reads the order from `--console-yield` as its
 * shrink factor: a thousand to one means the waiting boxes absorb the shortage until they
 * hit their floors. Floors belong to the panels, which know their own rows.
 */
export function ConsoleSlot({ focused, children }: ConsoleSlotProps) {
  const order = focused ? '[--console-yield:1]' : '[--console-yield:1000]'

  // `empty:hidden` takes a slot whose content rendered nothing out of the column, so the
  // gap around it goes too.
  return <div className={`contents empty:hidden ${order}`}>{children}</div>
}
