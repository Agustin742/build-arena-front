import { type CommandScope, type CommandState } from './types'

export function deriveScopes(state: CommandState): CommandScope[] {
  if (!state.isAuthenticated) {
    return ['anonymous']
  }

  if (state.battleId === null) {
    return ['lobby']
  }

  return state.reactionWindowOpen ? ['battle', 'reaction-window'] : ['battle']
}
