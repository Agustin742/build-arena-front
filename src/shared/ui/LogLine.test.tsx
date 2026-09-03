import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LogLine } from './LogLine'

describe('LogLine', () => {
  it('writes the line', () => {
    render(<LogLine>grace ataca con POWER_STRIKE</LogLine>)

    expect(screen.getByText('grace ataca con POWER_STRIKE')).toBeInTheDocument()
  })

  it('marks a hit as good news', () => {
    render(<LogLine tone="success">Impacto</LogLine>)

    expect(screen.getByText('Impacto')).toHaveClass('text-success')
  })

  it('marks damage taken as bad news', () => {
    render(<LogLine tone="error">Cae derrotado</LogLine>)

    expect(screen.getByText('Cae derrotado')).toHaveClass('text-error')
  })

  it('keeps a plain line plain', () => {
    render(<LogLine>d20: 10 (+2) = 12 vs 11</LogLine>)

    expect(screen.getByText('d20: 10 (+2) = 12 vs 11')).toHaveClass('text-text')
  })

  it('puts a round separator apart from the narration', () => {
    render(<LogLine tone="round">— Ronda 3 —</LogLine>)

    expect(screen.getByText('— Ronda 3 —')).toHaveClass('text-accent')
  })

  it('aligns a marker in the character grid', () => {
    render(<LogLine marker="»">COUNTER devuelve 5</LogLine>)

    expect(screen.getByText('»')).toBeInTheDocument()
  })
})
