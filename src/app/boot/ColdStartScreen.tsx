import { type HealthState } from './use-health-check'

interface ColdStartScreenProps {
  state: HealthState
  elapsedSeconds: number
  onRetry: () => void
}

export function ColdStartScreen({ state, elapsedSeconds, onRetry }: ColdStartScreenProps) {
  const unreachable = state === 'unreachable'

  return (
    <main className="flex min-h-full flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-accent">build arena</h1>

      {unreachable ? (
        <p className="text-error">
          La arena no responde. Puede estar caída, o puede ser tu conexión.
        </p>
      ) : (
        <p className="text-text-dim">
          El servidor está despertando. El plan gratuito lo apaga tras quince minutos sin uso, y el
          primer arranque tarda cerca de un minuto y medio.
        </p>
      )}

      <p aria-live="polite" role="status" className="text-text">
        {unreachable
          ? `Sin respuesta después de ${String(elapsedSeconds)}s`
          : `Esperando… ${String(elapsedSeconds)}s`}
      </p>

      {unreachable && (
        <button
          type="button"
          onClick={onRetry}
          className="w-fit border border-border px-3 py-1 text-accent"
        >
          Reintentar
        </button>
      )}
    </main>
  )
}
