const FILLED = '█'
const EMPTY = '░'
const DEFAULT_WIDTH = 20

export interface StatCondition {
  label: string
  rounds: number
}

interface StatBarProps {
  label: string
  current: number
  max: number
  unit?: string
  width?: number
  conditions?: StatCondition[]
}

function filledCells(current: number, max: number, width: number) {
  if (max <= 0 || current <= 0) {
    return 0
  }

  if (current >= max) {
    return width
  }

  return Math.max(1, Math.round((current / max) * width))
}

function toneFor(current: number, max: number) {
  if (max <= 0 || current <= 0) {
    return 'text-error'
  }

  const ratio = current / max

  if (ratio <= 0.25) {
    return 'text-error'
  }

  if (ratio <= 0.5) {
    return 'text-accent'
  }

  return 'text-success'
}

export function StatBar({
  label,
  current,
  max,
  unit = 'HP',
  width = DEFAULT_WIDTH,
  conditions = [],
}: StatBarProps) {
  const filled = filledCells(current, max, width)
  const tone = toneFor(current, max)

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="min-w-[8ch] text-text">{label}</span>

      <span
        role="meter"
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        data-testid="stat-bar-track"
        className={`tracking-tight ${tone}`}
      >
        {FILLED.repeat(filled)}
        <span className="text-border-strong">{EMPTY.repeat(Math.max(0, width - filled))}</span>
      </span>

      <span className="text-text-dim">{`${String(current)}/${String(max)} ${unit}`}</span>

      {conditions.map((condition) => (
        <span key={condition.label} className="text-error">
          {`[${condition.label} ${String(condition.rounds)}]`}
        </span>
      ))}
    </div>
  )
}
