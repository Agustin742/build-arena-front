import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { type Command, type CommandContext } from '@/shared/commands'
import { type PublicBattle, type PublicBuild } from '@/shared/contracts'
import { ApiError } from '@/shared/http'

import { type BattlesApi } from '../infrastructure/battles.api'
import { type BattleCommandDeps, createBattlesCommands } from './battles.commands'

const ctx = {} as CommandContext

function battle(id: string, over: Partial<PublicBattle> = {}): PublicBattle {
  return {
    id,
    status: 'PENDING',
    ranked: true,
    role: 'OPPONENT',
    rival: { id: `${id}-rival`, username: id, rating: 1200 },
    outcome: null,
    currentRound: 0,
    createdAt: '2026-09-07T10:15:00.000Z',
    startedAt: null,
    endedAt: null,
    ...over,
  }
}

const INVITATION = battle('turing')
const SENT = battle('ada', { role: 'CHALLENGER' })

const DUELIST: PublicBuild = {
  id: 'build-1',
  name: 'Duelista',
  strength: 12,
  magic: 14,
  dexterity: 12,
  constitution: 12,
  skills: [],
  createdAt: '2026-09-06T10:15:00.000Z',
  updatedAt: '2026-09-06T10:15:00.000Z',
}

const RANKING = [
  { rank: 1, id: 'grace-id', username: 'grace', rating: 1350 },
  { rank: 2, id: 'self-id', username: 'me', rating: 1100 },
]

function api(list: PublicBattle[] = [INVITATION, SENT]): BattlesApi {
  return {
    list: vi.fn<BattlesApi['list']>().mockResolvedValue(list),
    get: vi.fn<BattlesApi['get']>().mockResolvedValue(INVITATION),
    challenge: vi.fn<BattlesApi['challenge']>().mockResolvedValue(SENT),
    accept: vi.fn<BattlesApi['accept']>().mockResolvedValue({ ...INVITATION, status: 'ACCEPTED' }),
    reject: vi.fn<BattlesApi['reject']>().mockResolvedValue({ ...INVITATION, status: 'REJECTED' }),
    cancel: vi.fn<BattlesApi['cancel']>().mockResolvedValue({ ...SENT, status: 'CANCELLED' }),
  }
}

function deps(overrides: Partial<BattleCommandDeps> = {}): BattleCommandDeps {
  return {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    api: api(),
    buildsApi: { list: vi.fn().mockResolvedValue([DUELIST]) },
    menu: { open: vi.fn(), close: vi.fn() },
    rivals: { warm: vi.fn().mockResolvedValue(undefined), cached: () => RANKING },
    self: () => 'self-id',
    ...overrides,
  }
}

function commandOf(from: BattleCommandDeps, id: string): Command {
  const command = createBattlesCommands(from).find((entry) => entry.id === id)

  if (command === undefined) {
    throw new Error(`${id} was not registered`)
  }

  return command
}

/** Opening the menu is what loads everything the other commands read. */
async function openMenu(from: BattleCommandDeps) {
  await commandOf(from, 'battles').run({}, ctx)
}

describe('battles', () => {
  it('answers from the lobby', () => {
    expect(commandOf(deps(), 'battles').scope).toEqual(['lobby'])
  })

  it('prints the grouped list under a headline that names what is urgent', async () => {
    const result = await commandOf(deps(), 'battles').run({}, ctx)

    expect(result).toMatchObject({ status: 'ok', message: 'Tenés 1 desafío esperándote' })
    expect(result.lines).toContain('TE DESAFIARON')
  })

  it('steps the console into the battles menu', async () => {
    const from = deps()

    await openMenu(from)

    expect(from.menu.open).toHaveBeenCalledWith('battles')
  })

  it('warms the rivals and the builds, because challenging needs both', async () => {
    const from = deps()

    await openMenu(from)

    expect(from.rivals.warm).toHaveBeenCalled()
    expect(from.buildsApi.list).toHaveBeenCalled()
  })

  it('stays in the lobby when the list itself never arrives', async () => {
    const failing = api()
    failing.list = vi.fn().mockRejectedValue(new ApiError('down', { status: 503, payload: null }))
    const from = deps({ api: failing })

    await expect(commandOf(from, 'battles').run({}, ctx)).resolves.toMatchObject({
      status: 'error',
    })
    expect(from.menu.open).not.toHaveBeenCalled()
  })
})

describe('challenge', () => {
  it('asks for a rival and then a build, in that order', () => {
    expect(commandOf(deps(), 'challenge').args.map((arg) => arg.name)).toEqual(['rival', 'build'])
  })

  it('offers the ranking without the player themselves', async () => {
    const from = deps()
    await openMenu(from)
    const [rival] = commandOf(from, 'challenge').args

    expect(rival?.options?.(ctx, {}).map((option) => option.label)).toEqual(['grace'])
  })

  it('offers the builds the player owns', async () => {
    const from = deps()
    await openMenu(from)
    const [, build] = commandOf(from, 'challenge').args

    expect(build?.options?.(ctx, {}).map((option) => option.label)).toEqual(['Duelista'])
  })

  it('is closed while the player has no build to walk in with', async () => {
    const from = deps({ buildsApi: { list: vi.fn().mockResolvedValue([]) } })
    await openMenu(from)

    expect(commandOf(from, 'challenge').availability(ctx)).toEqual({
      enabled: false,
      reason: 'Armá una build primero: no se pelea sin una',
    })
  })

  it('sends the rival and the build together', async () => {
    const from = deps()
    await openMenu(from)

    await commandOf(from, 'challenge').run({ rival: 'grace-id', build: '1' }, ctx)

    expect(from.api.challenge).toHaveBeenCalledWith('grace-id', 'build-1')
  })

  it('names who was challenged', async () => {
    const from = deps()
    await openMenu(from)

    await expect(
      commandOf(from, 'challenge').run({ rival: 'grace-id', build: '1' }, ctx),
    ).resolves.toMatchObject({ status: 'ok', message: 'Desafiaste a grace con Duelista' })
  })

  it('warns when the fight will not move the rating', async () => {
    const unranked = api()
    unranked.challenge = vi.fn().mockResolvedValue({ ...SENT, ranked: false })
    const from = deps({ api: unranked })
    await openMenu(from)

    await expect(
      commandOf(from, 'challenge').run({ rival: 'grace-id', build: '1' }, ctx),
    ).resolves.toMatchObject({ lines: ['Son amigos, así que esta pelea no mueve el rating'] })
  })

  it('says nothing about the rating when the fight counts', async () => {
    const from = deps()
    await openMenu(from)

    const result = await commandOf(from, 'challenge').run({ rival: 'grace-id', build: '1' }, ctx)

    expect(result.lines).toBeUndefined()
  })

  it('translates the rule the arena named instead of showing a 400', async () => {
    const refusing = api()
    refusing.challenge = vi.fn().mockRejectedValue(
      new ApiError('nope', {
        status: 400,
        payload: {
          message: 'The challenge breaks the rules of the arena',
          violations: [{ rule: 'SELF_CHALLENGE', message: 'not yourself' }],
        },
      }),
    )
    const from = deps({ api: refusing })
    await openMenu(from)

    await expect(
      commandOf(from, 'challenge').run({ rival: 'grace-id', build: '1' }, ctx),
    ).resolves.toMatchObject({
      status: 'error',
      lines: ['No podés desafiarte a vos mismo'],
    })
  })

  it('says so when the build is gone from the list', async () => {
    const from = deps()
    await openMenu(from)

    await expect(
      commandOf(from, 'challenge').run({ rival: 'grace-id', build: '9' }, ctx),
    ).resolves.toMatchObject({ status: 'error', message: 'No encontré esa build' })
    expect(from.api.challenge).not.toHaveBeenCalled()
  })
})

describe('accept', () => {
  it('sends the battle and the build, because accepting freezes both sides', async () => {
    const from = deps()
    await openMenu(from)

    await commandOf(from, 'battle-accept').run({ battle: '1', build: '1' }, ctx)

    expect(from.api.accept).toHaveBeenCalledWith('turing', 'build-1')
  })

  it('refuses a challenge the player sent, without asking the arena', async () => {
    const from = deps()
    await openMenu(from)

    await expect(
      commandOf(from, 'battle-accept').run({ battle: '2', build: '1' }, ctx),
    ).resolves.toMatchObject({
      status: 'error',
      message: 'Este lo mandaste vos: lo tiene que aceptar la otra persona',
    })
    expect(from.api.accept).not.toHaveBeenCalled()
  })

  it('says so when the challenger dropped the build they had picked', async () => {
    const failing = api()
    failing.accept = vi.fn().mockRejectedValue(new ApiError('gone', { status: 409, payload: null }))
    const from = deps({ api: failing })
    await openMenu(from)

    await expect(
      commandOf(from, 'battle-accept').run({ battle: '1', build: '1' }, ctx),
    ).resolves.toMatchObject({
      status: 'error',
      message: 'La otra persona se quedó sin la build que había elegido',
    })
  })
})

describe('reject', () => {
  it('turns down a challenge somebody else sent', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'battle-reject').run({ battle: '1' }, ctx)).resolves.toMatchObject(
      {
        status: 'ok',
        message: 'Rechazaste el desafío de turing',
      },
    )
    expect(from.api.reject).toHaveBeenCalledWith('turing')
  })

  it('refuses to reject our own challenge, and points at cancelling', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'battle-reject').run({ battle: '2' }, ctx)).resolves.toMatchObject(
      {
        status: 'error',
        message: 'Este lo mandaste vos: para eso está cancelarlo',
      },
    )
  })
})

describe('cancel', () => {
  it('takes back a challenge the player sent', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'battle-cancel').run({ battle: '2' }, ctx)).resolves.toMatchObject(
      {
        status: 'ok',
        message: 'Cancelaste el desafío que le mandaste a ada',
      },
    )
    expect(from.api.cancel).toHaveBeenCalledWith('ada')
  })

  it('refuses to cancel what somebody else sent, and points at rejecting', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'battle-cancel').run({ battle: '1' }, ctx)).resolves.toMatchObject(
      {
        status: 'error',
        message: 'Este te lo mandaron: para eso está rechazarlo',
      },
    )
  })

  it('says so when the row is gone from the list', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'battle-cancel').run({ battle: '9' }, ctx)).resolves.toMatchObject(
      {
        status: 'error',
        message: 'No encontré ese desafío',
      },
    )
  })
})

describe('battle back', () => {
  it('closes the menu and returns to the lobby', async () => {
    const from = deps()

    await expect(commandOf(from, 'battle-back').run({}, ctx)).resolves.toMatchObject({
      status: 'ok',
    })
    expect(from.menu.close).toHaveBeenCalled()
  })
})
