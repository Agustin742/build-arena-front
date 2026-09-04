import { useState } from 'react'

import { CommandListContainer } from '@/app/layout/CommandListContainer'
import { CommandPromptContainer } from '@/app/layout/CommandPromptContainer'
import { CommandRuntimeProvider } from '@/app/providers/CommandRuntimeProvider'
import { type Command, type CommandState, type ParsedArgs } from '@/shared/commands'
import { Countdown, LogLine, Panel, StatBar } from '@/shared/ui'

const DESIGN_STATE: CommandState = {
  isAuthenticated: true,
  battleId: 'demo-battle',
  reactionWindowOpen: true,
}

function makeDesignCommands(onRun: (commandId: string, args: ParsedArgs) => void): Command[] {
  function ran(commandId: string, args: ParsedArgs) {
    onRun(commandId, args)
    return Promise.resolve({ status: 'ok' as const })
  }

  return [
    {
      id: 'power_strike',
      label: 'POWER_STRIKE',
      hint: '1d8',
      aliases: ['power_strike'],
      args: [],
      scope: ['battle'],
      availability: () => ({ enabled: true }),
      run: (args) => ran('power_strike', args),
    },
    {
      id: 'fireball',
      label: 'FIREBALL',
      hint: '1d12',
      aliases: ['fireball'],
      args: [{ name: 'target', kind: 'text', label: 'Objetivo', required: true }],
      scope: ['battle'],
      availability: () => ({ enabled: true }),
      run: (args) => ran('fireball', args),
    },
    {
      id: 'mind_spike',
      label: 'MIND_SPIKE',
      hint: '1d10',
      aliases: ['mind_spike'],
      args: [],
      scope: ['battle'],
      availability: () => ({ enabled: false, reason: 'necesita MAGIC 14' }),
      run: (args) => ran('mind_spike', args),
    },
    {
      id: 'parry',
      label: 'PARRY',
      hint: 'parte el daño al medio',
      aliases: ['parry'],
      args: [],
      scope: ['reaction-window'],
      availability: () => ({ enabled: true }),
      run: (args) => ran('parry', args),
    },
    {
      id: 'brace',
      label: 'BRACE',
      hint: 'resta tu constitución',
      aliases: ['brace'],
      args: [],
      scope: ['reaction-window'],
      availability: () => ({ enabled: true }),
      run: (args) => ran('brace', args),
    },
  ]
}

export function DesignScreen() {
  const [lastRun, setLastRun] = useState<{ commandId: string; args: ParsedArgs } | null>(null)

  const commands = makeDesignCommands((commandId, args) => {
    setLastRun({ commandId, args })
  })

  return (
    <CommandRuntimeProvider commands={commands} state={DESIGN_STATE}>
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

        <Panel title="CommandList" note="acciones y reacciones">
          <CommandListContainer />
        </Panel>

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

        {lastRun !== null && (
          <Panel>
            <LogLine tone="success">
              {`Ejecutaste ${lastRun.commandId} con ${JSON.stringify(lastRun.args)}`}
            </LogLine>
          </Panel>
        )}

        <CommandPromptContainer />
      </div>
    </CommandRuntimeProvider>
  )
}
