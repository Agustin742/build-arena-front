import { useState } from 'react'

import { PromptPortal } from '@/app/layout/PromptPortal'
import { CommandList, Countdown, LogLine, Panel, Prompt, StatBar } from '@/shared/ui'

const ACTIONS = [
  { id: 'POWER_STRIKE', label: 'POWER_STRIKE', hint: '1d8' },
  { id: 'FIREBALL', label: 'FIREBALL', hint: '1d12' },
  { id: 'MIND_SPIKE', label: 'MIND_SPIKE', hint: '1d10', lockedReason: 'necesita MAGIC 14' },
]

const REACTIONS = [
  { id: 'PARRY', label: 'PARRY', hint: 'parte el daño al medio' },
  { id: 'BRACE', label: 'BRACE', hint: 'resta tu constitución' },
  { id: 'decline', key: 'enter', label: 'no reaccionar', hint: 'conservás la reacción' },
]

export function DesignScreen() {
  const [command, setCommand] = useState('')
  const [lastChoice, setLastChoice] = useState<string | null>(null)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Panel title="Panel" note="la caja de todo">
        <p className="text-text-dim">
          Borde de un píxel, sin radio, sin sombra. Todo lo demás vive adentro de esto.
        </p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="StatBar" note="vida y condiciones">
          <div className="flex flex-col gap-2">
            <StatBar label="Vos" current={22} max={35} />
            <StatBar
              label="grace"
              current={8}
              max={40}
              conditions={[{ label: 'POISONED', rounds: 2 }]}
            />
            <StatBar label="kit" current={14} max={18} unit="pts" />
          </div>
        </Panel>

        <Panel title="Countdown" note="ventana de reacción">
          <div className="flex flex-col gap-2">
            <Countdown remainingMs={15000} />
            <p className="text-xs text-text-dim">
              Corre contra el tiempo que mandó el servidor, no contra el reloj de tu máquina.
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="CommandList" note="acciones del turno">
          <CommandList items={ACTIONS} onSelect={setLastChoice} />
        </Panel>

        <Panel title="CommandList" note="ventana abierta">
          <CommandList items={REACTIONS} onSelect={setLastChoice} />
        </Panel>
      </div>

      <Panel title="LogLine" note="la narración del combate">
        <div role="log" className="flex flex-col">
          <LogLine tone="round">— Ronda 3 —</LogLine>
          <LogLine tone="dim">Tu reacción está disponible</LogLine>
          <LogLine marker="»">d20: 10 (+2) = 12 vs 11 → impacto</LogLine>
          <LogLine marker="»">PARRY reduce 9 a 4</LogLine>
          <LogLine tone="error">−4 → 18 HP</LogLine>
          <LogLine tone="success">¡COUNTER devuelve 5!</LogLine>
          <LogLine tone="dim">POISONED: quedan 2 rondas</LogLine>
        </div>
      </Panel>

      {lastChoice !== null && (
        <Panel>
          <LogLine tone="success">{`Elegiste ${lastChoice}`}</LogLine>
        </Panel>
      )}

      <PromptPortal>
        <Prompt
          value={command}
          onChange={setCommand}
          onSubmit={(value) => {
            setLastChoice(value === '' ? 'enter' : value)
            setCommand('')
          }}
          hint="1 o 2 para elegir, o escribí el comando. enter para no reaccionar"
        />
      </PromptPortal>
    </div>
  )
}
