import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Prompt } from './Prompt'

describe('Prompt', () => {
  it('is reachable and named for a screen reader', () => {
    render(<Prompt value="" onChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: /comando/i })).toBeInTheDocument()
  })

  it('reports every keystroke', async () => {
    const onChange = vi.fn()
    render(<Prompt value="" onChange={onChange} onSubmit={vi.fn()} />)

    await userEvent.type(screen.getByRole('textbox'), 'b')

    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('submits what was typed when enter is pressed', async () => {
    const onSubmit = vi.fn()
    render(<Prompt value="builds" onChange={vi.fn()} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByRole('textbox'), '{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('builds')
  })

  it('trims what it submits', async () => {
    const onSubmit = vi.fn()
    render(<Prompt value="  builds  " onChange={vi.fn()} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByRole('textbox'), '{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('builds')
  })

  it('submits an empty line too, because enter means decline in a reaction window', async () => {
    const onSubmit = vi.fn()
    render(<Prompt value="" onChange={vi.fn()} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByRole('textbox'), '{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('')
  })

  it('shows the hint that tells the player what is expected', () => {
    render(<Prompt value="" onChange={vi.fn()} onSubmit={vi.fn()} hint="1 o 2, o enter" />)

    expect(screen.getByText('1 o 2, o enter')).toBeInTheDocument()
  })

  it('shows an error without losing what was typed', () => {
    render(<Prompt value="attak" onChange={vi.fn()} onSubmit={vi.fn()} error="No conozco attak" />)

    expect(screen.getByRole('alert')).toHaveTextContent('No conozco attak')
    expect(screen.getByRole('textbox')).toHaveValue('attak')
  })

  it('accepts nothing while it is disabled', async () => {
    const onSubmit = vi.fn()
    render(<Prompt value="" onChange={vi.fn()} onSubmit={onSubmit} disabled />)

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()

    await userEvent.type(input, 'builds{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('masks what is typed when it asks for a password', () => {
    render(
      <Prompt
        value="hunter2hunter2"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        type="password"
        label="Contraseña"
      />,
    )

    const input = screen.getByLabelText('Contraseña')

    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveValue('hunter2hunter2')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('stays a plain text line when no type is given', () => {
    render(<Prompt value="" onChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
  })

  it('blinks the marker while the line is empty and stops once there is text', () => {
    const { rerender } = render(<Prompt value="" onChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByTestId('prompt-marker')).toHaveClass('console-caret')

    rerender(<Prompt value="b" onChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByTestId('prompt-marker')).not.toHaveClass('console-caret')
  })
})
