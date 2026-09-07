import { type CommandScope, type CommandState } from './types'

/**
 * A battle outranks everything: whatever menu the player left open, they cannot be off
 * browsing their builds while a round is waiting on them.
 */
export function deriveScopes(state: CommandState): CommandScope[] {
  if (!state.isAuthenticated) {
    return ['anonymous']
  }

  if (state.battleId !== null) {
    return state.reactionWindowOpen ? ['battle', 'reaction-window'] : ['battle']
  }

  return state.menu === null || state.menu === undefined ? ['lobby'] : [state.menu]
}
