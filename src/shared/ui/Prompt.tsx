import { useId } from 'react'

interface PromptProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  type?: 'text' | 'password'
  hint?: string
  error?: string
  disabled?: boolean
  label?: string
}

export function Prompt({
  value,
  onChange,
  onSubmit,
  type = 'text',
  hint,
  error,
  disabled = false,
  label = 'Comando',
}: PromptProps) {
  const inputId = useId()

  return (
    <div className="flex flex-col gap-1">
      {hint !== undefined && <p className="text-xs text-text-dim">{hint}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault()

          if (!disabled) {
            onSubmit(value.trim())
          }
        }}
        className="flex items-baseline gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>

        <span
          aria-hidden="true"
          data-testid="prompt-marker"
          className={`text-accent ${value === '' && !disabled ? 'console-caret' : ''}`}
        >
          {'>'}
        </span>

        <input
          id={inputId}
          type={type}
          value={value}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            onChange(event.target.value)
          }}
          className="flex-1 bg-transparent text-text caret-accent outline-none placeholder:text-text-dim disabled:cursor-not-allowed disabled:text-text-dim"
        />
      </form>

      {error !== undefined && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
    </div>
  )
}
