import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Panel } from './Panel'

describe('Panel', () => {
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
