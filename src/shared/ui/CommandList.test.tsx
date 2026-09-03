import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CommandList } from './CommandList'

const actions = [
  { id: 'POWER_STRIKE', label: 'POWER_STRIKE', hint: '1d8' },
  { id: 'FIREBALL', label: 'FIREBALL', hint: '1d12' },
]

describe('CommandList', () => {
  it('numbers the options, because nobody types a uuid in a console', () => {
    render(<CommandList items={actions} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: /1\).*POWER_STRIKE/s })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2\).*FIREBALL/s })).toBeInTheDocument()
  })

  it('shows the hint of each option', () => {
    render(<CommandList items={actions} onSelect={vi.fn()} />)

    expect(screen.getByText('1d12')).toBeInTheDocument()
  })

  it('reports the option that was clicked', async () => {
    const onSelect = vi.fn()
    render(<CommandList items={actions} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: /FIREBALL/ }))

    expect(onSelect).toHaveBeenCalledWith('FIREBALL')
  })

  it('reaches every option with the keyboard alone', async () => {
    const onSelect = vi.fn()
    render(<CommandList items={actions} onSelect={onSelect} />)

    await userEvent.tab()
    expect(screen.getByRole('button', { name: /POWER_STRIKE/ })).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: /FIREBALL/ })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('FIREBALL')
  })

  it('shows a locked option with the reason it is locked', () => {
    render(
      <CommandList
        items={[{ id: 'MIND_SPIKE', label: 'MIND_SPIKE', lockedReason: 'necesita MAGIC 14' }]}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('necesita MAGIC 14')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /MIND_SPIKE/ })).toBeDisabled()
  })

  it('does not report a locked option that was clicked anyway', async () => {
    const onSelect = vi.fn()
    render(
      <CommandList
        items={[{ id: 'MIND_SPIKE', label: 'MIND_SPIKE', lockedReason: 'necesita MAGIC 14' }]}
        onSelect={onSelect}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /MIND_SPIKE/ }))

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('lets an option name its own key instead of a number', () => {
    render(
      <CommandList
        items={[{ id: 'decline', key: 'enter', label: 'no reaccionar' }]}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /enter\).*no reaccionar/s })).toBeInTheDocument()
  })

  it('keeps numbering the options that do not name their own key', () => {
    render(
      <CommandList
        items={[
          { id: 'PARRY', label: 'PARRY' },
          { id: 'BRACE', label: 'BRACE' },
          { id: 'decline', key: 'enter', label: 'no reaccionar' },
        ]}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /1\).*PARRY/s })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2\).*BRACE/s })).toBeInTheDocument()
  })

  it('says so when there is nothing to choose', () => {
    render(<CommandList items={[]} onSelect={vi.fn()} emptyMessage="No hay comandos acá" />)

    expect(screen.getByText('No hay comandos acá')).toBeInTheDocument()
  })

  it('is a list, so a screen reader announces how many options there are', () => {
    render(<CommandList items={actions} onSelect={vi.fn()} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
