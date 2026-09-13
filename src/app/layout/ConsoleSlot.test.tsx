import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConsoleSlot } from './ConsoleSlot'

describe('ConsoleSlot', () => {
  it('renders what it is given', () => {
    render(<ConsoleSlot grows>la salida</ConsoleSlot>)

    expect(screen.getByText('la salida')).toBeInTheDocument()
  })

  it('takes the leftover height when it is the one the console is focused on', () => {
    const { container } = render(<ConsoleSlot grows>content</ConsoleSlot>)

    const slot = container.firstElementChild

    expect(slot).toHaveClass('flex-1')
    expect(slot).toHaveClass('min-h-0')
    expect(slot).not.toHaveClass('shrink-0')
    expect(slot).not.toHaveClass('max-h-[30vh]')
  })

  it('holds a capped share of the console while it waits its turn', () => {
    const { container } = render(<ConsoleSlot grows={false}>content</ConsoleSlot>)

    const slot = container.firstElementChild

    expect(slot).toHaveClass('shrink-0')
    expect(slot).toHaveClass('max-h-[30vh]')
    expect(slot).toHaveClass('min-h-0')
    expect(slot).not.toHaveClass('flex-1')
  })

  it('lays its content out as a column, so a scrolling panel can fill it in either state', () => {
    const growing = render(<ConsoleSlot grows>content</ConsoleSlot>).container.firstElementChild
    const waiting = render(<ConsoleSlot grows={false}>content</ConsoleSlot>).container
      .firstElementChild

    expect(growing).toHaveClass('flex', 'flex-col')
    expect(waiting).toHaveClass('flex', 'flex-col')
  })

  it('disappears when what it holds renders nothing, so it leaves no gap behind', () => {
    const { container } = render(<ConsoleSlot grows>{null}</ConsoleSlot>)

    const slot = container.firstElementChild

    expect(slot).toBeEmptyDOMElement()
    expect(slot).toHaveClass('empty:hidden')
  })
})
