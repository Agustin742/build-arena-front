import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppShell } from '@/app/layout/AppShell'

import { DesignScreen } from './DesignScreen'

function renderDesign() {
  return render(
    <MemoryRouter initialEntries={['/design']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/design" element={<DesignScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('DesignScreen', () => {
  it('shows every primitive of the kit', () => {
    renderDesign()

    expect(screen.getByRole('region', { name: /panel/i })).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: /vos/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
    expect(screen.getByRole('timer')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /comando/i })).toBeInTheDocument()
    expect(screen.getByText('— Ronda 3 —')).toBeInTheDocument()
  })

  it('puts its prompt in the shell footer, not in the middle of the screen', () => {
    renderDesign()

    expect(screen.getByRole('contentinfo')).toContainElement(screen.getByRole('textbox'))
  })

  it('walks the whole screen with the keyboard and ends on the prompt', async () => {
    renderDesign()

    const reachable: string[] = []

    for (let step = 0; step < 40; step += 1) {
      await userEvent.tab()
      const active = document.activeElement

      if (active === null || active === document.body) {
        break
      }

      reachable.push(active.tagName)

      if (active === screen.getByRole('textbox')) {
        break
      }
    }

    expect(reachable).toContain('BUTTON')
    expect(document.activeElement).toBe(screen.getByRole('textbox'))
  })

  it('reaches the locked command without being able to run it', () => {
    renderDesign()

    expect(screen.getByRole('button', { name: /MIND_SPIKE/ })).toBeDisabled()
  })

  it('runs the same command with the same arguments whether triggered by click or by a typed alias', async () => {
    renderDesign()
    const input = screen.getByRole('textbox')

    await userEvent.click(screen.getByRole('button', { name: /FIREBALL/ }))
    await userEvent.type(input, 'dragon{Enter}')

    const afterClick = screen.getByText(/Ejecutaste fireball/i).textContent

    await userEvent.type(input, 'fireball dragon{Enter}')

    const afterTyped = screen.getByText(/Ejecutaste fireball/i).textContent

    expect(afterClick).toContain('"target":"dragon"')
    expect(afterClick).toBe(afterTyped)
  })
})
