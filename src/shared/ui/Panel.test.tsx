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
