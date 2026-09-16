/**
 * Leaving a battle for the lobby, or entering one, is navigation — and `arena/application`
 * cannot import `react-router` (architecture.md: a feature depends inward, never on `app/`).
 * `app/boot` implements this against `useNavigate`, handed in through a bridge component
 * (D8), the same shape `MenuControl` already uses for the menu store.
 */
export interface ArenaNavigation {
  toArena: (battleId: string) => void
  toLobby: () => void
}
