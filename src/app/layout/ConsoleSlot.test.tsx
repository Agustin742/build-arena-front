import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConsoleSlot } from './ConsoleSlot'

/**
 * These pin the classes the slot hands out. They do not prove the heights land — that takes
 * a real browser — only that the focus decides the order boxes yield in, and nothing else.
 */
function slotOf(container: HTMLElement): Element {
  const slot = container.firstElementChild

  if (slot === null) {
    throw new Error('the slot rendered nothing')
  }

  return slot
}

describe('ConsoleSlot', () => {
  it('renders what it is given', () => {
    render(<ConsoleSlot focused>la salida</ConsoleSlot>)

    expect(screen.getByText('la salida')).toBeInTheDocument()
  })

  it('steps out of the layout, so the column sizes the box it holds and not a wrapper', () => {
    const focused = slotOf(render(<ConsoleSlot focused>content</ConsoleSlot>).container)
    const waiting = slotOf(render(<ConsoleSlot focused={false}>content</ConsoleSlot>).container)

    expect(focused).toHaveClass('contents')
    expect(waiting).toHaveClass('contents')
  })

  it('makes a box waiting its turn yield first when the console runs short', () => {
    const slot = slotOf(render(<ConsoleSlot focused={false}>content</ConsoleSlot>).container)

    expect(slot).toHaveClass('[--console-yield:1000]')
  })

  it('makes the box being worked in the last one to yield', () => {
    const slot = slotOf(render(<ConsoleSlot focused>content</ConsoleSlot>).container)

    expect(slot).toHaveClass('[--console-yield:1]')
    expect(slot).not.toHaveClass('[--console-yield:1000]')
  })

  it('never makes a box grow, cap or floor itself: the focus only decides the order', () => {
    const focused = slotOf(render(<ConsoleSlot focused>content</ConsoleSlot>).container)
    const waiting = slotOf(render(<ConsoleSlot focused={false}>content</ConsoleSlot>).container)

    expect(focused.className).not.toMatch(/grow|flex-1|basis-|h-\[|max-h-|min-h-/)
    expect(waiting.className).not.toMatch(/grow|flex-1|basis-|h-\[|max-h-|min-h-/)
  })

  it('disappears when what it holds renders nothing, so it leaves no gap behind', () => {
    const slot = slotOf(render(<ConsoleSlot focused>{null}</ConsoleSlot>).container)

    expect(slot).toBeEmptyDOMElement()
    expect(slot).toHaveClass('empty:hidden')
  })
})
