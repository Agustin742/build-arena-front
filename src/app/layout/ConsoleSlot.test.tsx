import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConsoleSlot } from './ConsoleSlot'

/**
 * These pin the classes the slot hands out. They do not prove the heights land — that takes
 * a real browser — only that the slot, and nothing inside it, is the one deciding them.
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
    render(<ConsoleSlot grows>la salida</ConsoleSlot>)

    expect(screen.getByText('la salida')).toBeInTheDocument()
  })

  it('starts from the height of what it holds in either state, so nothing is clipped with room to spare', () => {
    const growing = slotOf(render(<ConsoleSlot grows>content</ConsoleSlot>).container)
    const waiting = slotOf(render(<ConsoleSlot grows={false}>content</ConsoleSlot>).container)

    expect(growing).toHaveClass('basis-[content]')
    expect(waiting).toHaveClass('basis-[content]')
  })

  it('puts no fixed cap on any box, focused or not', () => {
    const growing = slotOf(render(<ConsoleSlot grows>content</ConsoleSlot>).container)
    const waiting = slotOf(render(<ConsoleSlot grows={false}>content</ConsoleSlot>).container)

    expect(growing.className).not.toMatch(/max-h-/)
    expect(waiting.className).not.toMatch(/max-h-/)
  })

  it('keeps a floor of about three options under the box being worked in', () => {
    const slot = slotOf(render(<ConsoleSlot grows>content</ConsoleSlot>).container)

    expect(slot).toHaveClass('h-[10rem]')
    expect(slot).toHaveClass('grow')
    expect(slot).not.toHaveClass('shrink-[1000]')
  })

  it('makes a box waiting its turn the first to give up height, down to a heading and a line', () => {
    const slot = slotOf(render(<ConsoleSlot grows={false}>content</ConsoleSlot>).container)

    expect(slot).toHaveClass('h-[4.25rem]')
    expect(slot).toHaveClass('shrink-[1000]')
    expect(slot).not.toHaveClass('grow')
  })

  it('leaves the minimum height automatic, which is what turns its height into a floor', () => {
    const growing = slotOf(render(<ConsoleSlot grows>content</ConsoleSlot>).container)
    const waiting = slotOf(render(<ConsoleSlot grows={false}>content</ConsoleSlot>).container)

    expect(growing.className).not.toMatch(/min-h-/)
    expect(waiting.className).not.toMatch(/min-h-/)
  })

  it('lays its content out as a column, so a scrolling panel can fill it in either state', () => {
    const growing = slotOf(render(<ConsoleSlot grows>content</ConsoleSlot>).container)
    const waiting = slotOf(render(<ConsoleSlot grows={false}>content</ConsoleSlot>).container)

    expect(growing).toHaveClass('flex', 'flex-col')
    expect(waiting).toHaveClass('flex', 'flex-col')
  })

  it('disappears when what it holds renders nothing, so it leaves no gap behind', () => {
    const slot = slotOf(render(<ConsoleSlot grows>{null}</ConsoleSlot>).container)

    expect(slot).toBeEmptyDOMElement()
    expect(slot).toHaveClass('empty:hidden')
  })
})
