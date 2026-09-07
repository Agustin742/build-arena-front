import {
  type BattleList,
  battleListSchema,
  type PublicBattle,
  publicBattleSchema,
} from '@/shared/contracts'
import { type ApiClient } from '@/shared/http'

export interface BattlesApi {
  list: () => Promise<BattleList>
  get: (id: string) => Promise<PublicBattle>
  challenge: (opponentId: string, buildId: string) => Promise<PublicBattle>
  accept: (id: string, buildId: string) => Promise<PublicBattle>
  reject: (id: string) => Promise<PublicBattle>
  cancel: (id: string) => Promise<PublicBattle>
}

/**
 * Every row comes back oriented to the caller: `role` says which end of the challenge we
 * are on, `rival` is always the other player, and `outcome` is already `WON` or `LOST`
 * without anybody comparing a `winnerId`.
 *
 * `ranked` arrives `false` when an accepted friendship already existed between the two
 * when the challenge was made — a fight between friends does not move the rating.
 *
 * This is where REST stops. Once a battle is accepted both builds are frozen and the
 * fight itself is played over the socket.
 */
export function createBattlesApi(client: ApiClient): BattlesApi {
  return {
    list: () => client.get('/battles', battleListSchema),
    get: (id) => client.get(`/battles/${id}`, publicBattleSchema),
    challenge: (opponentId, buildId) =>
      client.post('/battles', { opponentId, buildId }, publicBattleSchema),
    // The build travels with the acceptance because that is the call that freezes both
    // sides at once: there is no later moment to choose it.
    accept: (id, buildId) => client.patch(`/battles/${id}/accept`, { buildId }, publicBattleSchema),
    reject: (id) => client.patch(`/battles/${id}/reject`, undefined, publicBattleSchema),
    cancel: (id) => client.patch(`/battles/${id}/cancel`, undefined, publicBattleSchema),
  }
}
