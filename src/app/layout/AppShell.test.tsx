import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppShell } from './AppShell'
import { PromptPortal } from './PromptPortal'

function renderShell(screenContent = <p>lobby</p>) {
  return render(
    <MemoryRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={screenContent} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  it('splits the console into a header, a content area and a prompt footer', () => {
    renderShell()

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders the screen inside the content area', () => {
    renderShell()

    expect(screen.getByRole('main')).toHaveTextContent('lobby')
  })

  it('names the arena in the header', () => {
    renderShell()

    expect(screen.getByRole('banner')).toHaveTextContent('build arena')
  })

  it('lets a screen put its prompt in the footer', () => {
    renderShell(
      <PromptPortal>
        <p>prompt de la pantalla</p>
      </PromptPortal>,
    )

    expect(screen.getByRole('contentinfo')).toHaveTextContent('prompt de la pantalla')
  })

  it('offers a skip link so the keyboard does not walk the header every time', async () => {
    renderShell()

    await userEvent.tab()

    expect(screen.getByRole('link', { name: /ir al contenido/i })).toHaveFocus()
  })
})
