import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HealthGate } from './HealthGate'

describe('HealthGate', () => {
  it('holds the application back until the arena answers', async () => {
    let answer!: () => void
    const ping = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        answer = resolve
      }),
    )

    render(
      <HealthGate ping={ping}>
        <p>lobby</p>
      </HealthGate>,
    )

    expect(screen.queryByText('lobby')).not.toBeInTheDocument()
    expect(screen.getByText(/despertando/i)).toBeInTheDocument()

    answer()

    await waitFor(() => {
      expect(screen.getByText('lobby')).toBeInTheDocument()
    })
  })
})
