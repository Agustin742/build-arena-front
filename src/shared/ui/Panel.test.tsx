import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Panel } from './Panel'

describe('Panel', () => {
  it('claims no landmark of its own, so it never competes with the page banner', () => {
    render(
      <>
        <header>the page banner</header>
        <Panel title="comandos" note="una nota">
          <p>contenido</p>
        </Panel>
      </>,
    )

    expect(screen.getByRole('banner')).toHaveTextContent('the page banner')
  })

  it('renders what it is given', () => {
    render(<Panel title="builds">Iron Vanguard</Panel>)

    expect(screen.getByText('Iron Vanguard')).toBeInTheDocument()
  })

  it('is a landmark named after its title, so it can be reached without sight', () => {
    render(<Panel title="builds">content</Panel>)

    expect(screen.getByRole('region', { name: 'builds' })).toBeInTheDocument()
  })

  it('works without a title', () => {
    render(<Panel>content</Panel>)

    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('shows a trailing note next to the title', () => {
    render(
      <Panel title="builds" note="3 de 5">
        content
      </Panel>,
    )

    expect(screen.getByText('3 de 5')).toBeInTheDocument()
  })
})

describe('Panel with a lead line', () => {
  it('shows the lead above what the panel holds', () => {
    render(
      <Panel title="a quién" lead={<span>Elegí a quién desafiar</span>}>
        <p>una opción</p>
      </Panel>,
    )

    expect(screen.getByText('Elegí a quién desafiar')).toBeInTheDocument()
  })

  it('keeps the lead out of the box that scrolls, so the question stays put', () => {
    render(
      <Panel title="a quién" lead={<span>Elegí a quién desafiar</span>} scroll>
        <p>una opción</p>
      </Panel>,
    )

    const scroller = screen.getByText('una opción').parentElement

    expect(scroller).toHaveClass('overflow-y-auto')
    expect(scroller).not.toContainElement(screen.getByText('Elegí a quién desafiar'))
  })

  it('refuses to be squeezed along with the list below it', () => {
    render(
      <Panel title="a quién" lead={<span>Elegí a quién desafiar</span>} scroll>
        <p>una opción</p>
      </Panel>,
    )

    expect(screen.getByText('Elegí a quién desafiar').parentElement).toHaveClass('shrink-0')
  })

  it('takes up no room at all when there is no lead to show', () => {
    const { container } = render(<Panel title="a quién">content</Panel>)

    expect(container.querySelectorAll('.shrink-0')).toHaveLength(1)
  })
})

describe('Panel sharing the height of the console', () => {
  it('starts from the height of what it holds and never grows past it', () => {
    render(
      <Panel title="salida" scroll>
        content
      </Panel>,
    )

    const region = screen.getByRole('region', { name: 'salida' })

    expect(region).toHaveClass('flex', 'flex-col', 'basis-[content]')
    expect(region.className).not.toMatch(/flex-1|grow|max-h-/)
  })

  it('leaves its minimum height automatic, which is what turns its height into a floor', () => {
    render(
      <Panel title="salida" scroll>
        content
      </Panel>,
    )

    const region = screen.getByRole('region', { name: 'salida' })

    expect(region).toHaveClass('h-[var(--panel-floor,auto)]')
    expect(region.className).not.toMatch(/min-h-/)
  })

  it('gives up height in the order the box around it sets', () => {
    render(
      <Panel title="salida" scroll>
        content
      </Panel>,
    )

    expect(screen.getByRole('region', { name: 'salida' })).toHaveClass(
      'shrink-[var(--console-yield,1)]',
    )
  })

  it('publishes the floor it measures from its heading and its first three rows', () => {
    const height = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 20 } as DOMRect)

    render(
      <Panel title="salida" scroll>
        <ul>
          <li>uno</li>
          <li>dos</li>
          <li>tres</li>
          <li>cuatro</li>
        </ul>
      </Panel>,
    )

    // Every box reads 20px here, so nothing sits around the body and only the rows count.
    expect(
      screen.getByRole('region', { name: 'salida' }).style.getPropertyValue('--panel-floor'),
    ).toBe('60px')

    height.mockRestore()
  })

  it('keeps a panel that does not scroll at the height of what it holds', () => {
    render(<Panel title="checklist">content</Panel>)

    const region = screen.getByRole('region', { name: 'checklist' })

    expect(region).not.toHaveClass('flex-1')
    expect(region).not.toHaveClass('shrink-0')
  })
})

describe('Panel that scrolls its own body', () => {
  it('keeps its heading still and scrolls only what it holds', () => {
    render(
      <Panel title="acción 1" scroll>
        <p>una opción</p>
      </Panel>,
    )

    const body = screen.getByText('una opción').parentElement

    expect(body).toHaveClass('overflow-y-auto')
    expect(body).toHaveClass('min-h-0')
    expect(body).toHaveClass('console-scroll')
  })

  it('lets the body shrink below its rows instead of pushing what sits below it off the screen', () => {
    render(
      <Panel title="acción 1" scroll>
        <p>una opción</p>
      </Panel>,
    )

    expect(screen.getByText('una opción').parentElement).toHaveClass('min-h-0', 'flex-1')
  })

  it('leaves a plain panel alone, it grows with what it holds', () => {
    render(<Panel title="comandos">contenido</Panel>)

    expect(screen.getByText('contenido').parentElement).not.toHaveClass('overflow-y-auto')
  })
})
