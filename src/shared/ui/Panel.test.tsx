import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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

describe('Panel competing for the height of the console', () => {
  it('takes the leftover space when it is the box being answered in', () => {
    render(
      <Panel title="a quién" scroll grow>
        content
      </Panel>,
    )

    expect(screen.getByRole('region', { name: 'a quién' })).toHaveClass('flex-1')
  })

  it('refuses to be squeezed when it is not the one being answered in', () => {
    render(
      <Panel title="salida" scroll>
        content
      </Panel>,
    )

    const region = screen.getByRole('region', { name: 'salida' })

    expect(region).toHaveClass('shrink-0')
    expect(region).not.toHaveClass('flex-1')
  })

  it('still refuses to outgrow a share of the console while it waits its turn', () => {
    render(
      <Panel title="salida" scroll>
        content
      </Panel>,
    )

    expect(screen.getByRole('region', { name: 'salida' })).toHaveClass('max-h-[30vh]')
  })

  it('lets the growing one off that leash, because the leftover space is already its limit', () => {
    render(
      <Panel title="a quién" scroll grow>
        content
      </Panel>,
    )

    expect(screen.getByRole('region', { name: 'a quién' })).not.toHaveClass('max-h-[30vh]')
  })

  it('keeps a panel that does not scroll out of the competition entirely', () => {
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

  it('lets the panel shrink instead of pushing what sits below it off the screen', () => {
    render(
      <Panel title="acción 1" scroll>
        <p>una opción</p>
      </Panel>,
    )

    expect(screen.getByRole('region', { name: 'acción 1' })).toHaveClass('min-h-0')
  })

  it('leaves a plain panel alone, it grows with what it holds', () => {
    render(<Panel title="comandos">contenido</Panel>)

    expect(screen.getByText('contenido').parentElement).not.toHaveClass('overflow-y-auto')
  })
})
