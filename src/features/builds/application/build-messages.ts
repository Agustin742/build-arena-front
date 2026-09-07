import { ATTRIBUTE_NAME } from '@/shared/game-text'

import { type BuildAdvice } from '../domain/advice'
import { ACTION_SLOTS, REACTION_SLOTS, type SkillLock, slotsFor } from '../domain/kit'
import { type AttributeName, type SkillKind } from '../domain/types'

const SLOT_NOUN: Record<SkillKind, string> = {
  ACTION: 'acciones',
  REACTION: 'reacciones',
}

/**
 * The domain answers with structure and this turns it into the sentence the player reads.
 * The reason is never hidden: knowing that attributes unlock skills is half the game.
 */
export function lockMessage(lock: SkillLock): string {
  switch (lock.kind) {
    case 'duplicate':
      return 'ya está en tu kit'
    case 'requirement':
      return `necesita ${named(lock.attribute)} ${String(lock.required)}, tenés ${String(lock.current)}`
    case 'slots':
      return `ya elegiste tus ${String(slotsFor(lock.type))} ${SLOT_NOUN[lock.type]}`
    case 'budget':
      return lock.remaining === 0
        ? `cuesta ${String(lock.cost)} y no te quedan puntos`
        : `cuesta ${String(lock.cost)} y te quedan ${String(lock.remaining)} puntos`
  }
}

/** The domain speaks the wire enum; the player reads the game. */
function named(attribute: AttributeName): string {
  return ATTRIBUTE_NAME[attribute]
}

export function adviceMessage(advice: BuildAdvice): string {
  if (advice.kind === 'no-magic-answer') {
    return 'Tus dos reacciones solo responden a ataques físicos: contra magia comés el hechizo entero'
  }

  // The spread keys are the wire enum in lower case, so this needs no table of its own.
  const attribute = named(advice.attribute.toUpperCase() as AttributeName)

  return `${attribute} en 15 da el mismo +2 que en 14, y ninguna habilidad pide más de 14: son 2 puntos tirados`
}

/** Kept next to the messages so a change to the slot counts cannot drift from the prose. */
export const SLOT_SUMMARY = `${String(ACTION_SLOTS)} acciones y ${String(REACTION_SLOTS)} reacciones`
