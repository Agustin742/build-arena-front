import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatBar } from './StatBar'

describe('StatBar', () => {
  it('reads the value out loud as a meter', () => {
    render(<StatBar label="Vos" current={22} max={35} />)

    const meter = screen.getByRole('meter', { name: /vos/i })
    expect(meter).toHaveAttribute('aria-valuenow', '22')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '35')
  })

  it('prints the numbers so the console reader sees them too', () => {
    render(<StatBar label="Vos" current={22} max={35} />)

    expect(screen.getByText('22/35 HP')).toBeInTheDocument()
  })

  it('draws the bar out of filled and empty characters', () => {
    render(<StatBar label="Vos" current={5} max={10} width={10} />)

    expect(screen.getByTestId('stat-bar-track')).toHaveTextContent('█████░░░░░')
  })

  it('never draws an empty bar while there is life left', () => {
    render(<StatBar label="Vos" current={1} max={100} width={10} />)

    expect(screen.getByTestId('stat-bar-track')).toHaveTextContent('█░░░░░░░░░')
  })

  it('draws nothing filled once the combatant is down', () => {
    render(<StatBar label="grace" current={0} max={40} width={10} />)

    expect(screen.getByTestId('stat-bar-track')).toHaveTextContent('░░░░░░░░░░')
  })

  it('clamps a value the server reports above the maximum', () => {
    render(<StatBar label="Vos" current={99} max={10} width={10} />)

    expect(screen.getByTestId('stat-bar-track')).toHaveTextContent('██████████')
  })

  it('survives a maximum of zero without dividing by it', () => {
    render(<StatBar label="Vos" current={0} max={0} width={10} />)

    expect(screen.getByTestId('stat-bar-track')).toHaveTextContent('░░░░░░░░░░')
  })

  it('lists the conditions the combatant carries', () => {
    render(
      <StatBar
        label="grace"
        current={18}
        max={40}
        conditions={[
          { label: 'POISONED', rounds: 2 },
          { label: 'WEAKENED', rounds: 1 },
        ]}
      />,
    )

    expect(screen.getByText('[POISONED 2]')).toBeInTheDocument()
    expect(screen.getByText('[WEAKENED 1]')).toBeInTheDocument()
  })

  it('accepts another unit than hit points', () => {
    render(<StatBar label="kit" current={14} max={18} unit="pts" />)

    expect(screen.getByText('14/18 pts')).toBeInTheDocument()
  })
})
