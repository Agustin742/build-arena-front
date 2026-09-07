import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { type Command, type CommandContext } from '@/shared/commands'
import { type PublicFriendship } from '@/shared/contracts'
import { ApiError } from '@/shared/http'

import { type FriendshipsApi } from '../infrastructure/friendships.api'
import { createFriendshipsCommands, type FriendshipCommandDeps } from './friendships.commands'

const ctx = {} as CommandContext

function row(
  id: string,
  status: PublicFriendship['status'],
  direction: PublicFriendship['direction'],
  username: string,
): PublicFriendship {
  return {
    id,
    status,
    direction,
    player: { id: `${username}-id`, username, rating: 1200 },
    createdAt: '2026-09-07T10:15:00.000Z',
    updatedAt: '2026-09-07T10:15:00.000Z',
  }
}

const GRACE = row('f1', 'PENDING', 'INCOMING', 'grace')
const ADA = row('f2', 'PENDING', 'OUTGOING', 'ada')
const HOPPER = row('f3', 'ACCEPTED', 'OUTGOING', 'hopper')

const RANKING = [
  { rank: 1, id: 'grace-id', username: 'grace', rating: 1350 },
  { rank: 2, id: 'turing-id', username: 'turing', rating: 1180 },
]

function api(list: PublicFriendship[] = [GRACE, ADA, HOPPER]): FriendshipsApi {
  return {
    list: vi.fn<FriendshipsApi['list']>().mockResolvedValue(list),
    request: vi.fn<FriendshipsApi['request']>().mockResolvedValue(GRACE),
    accept: vi.fn<FriendshipsApi['accept']>().mockResolvedValue({ ...GRACE, status: 'ACCEPTED' }),
    remove: vi.fn<FriendshipsApi['remove']>().mockResolvedValue(undefined),
  }
}

function deps(overrides: Partial<FriendshipCommandDeps> = {}): FriendshipCommandDeps {
  return {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    api: api(),
    menu: { open: vi.fn(), close: vi.fn() },
    rivals: { warm: vi.fn().mockResolvedValue(undefined), cached: () => RANKING },
    self: () => 'self-id',
    ...overrides,
  }
}

function commandOf(from: FriendshipCommandDeps, id: string): Command {
  const command = createFriendshipsCommands(from).find((entry) => entry.id === id)

  if (command === undefined) {
    throw new Error(`${id} was not registered`)
  }

  return command
}

/** Opening the menu is what loads the list every other command reads. */
async function openMenu(from: FriendshipCommandDeps) {
  await commandOf(from, 'friends').run({}, ctx)
}

describe('friends', () => {
  it('answers from the lobby', () => {
    expect(commandOf(deps(), 'friends').scope).toEqual(['lobby'])
  })

  it('prints the grouped list under a headline that counts it', async () => {
    const result = await commandOf(deps(), 'friends').run({}, ctx)

    expect(result).toMatchObject({
      status: 'ok',
      message: 'Tenés 1 solicitud sin responder · 1 amigo',
    })
    expect(result.lines).toContain('TE MANDARON SOLICITUD')
  })

  it('steps the console into the friends menu', async () => {
    const from = deps()

    await openMenu(from)

    expect(from.menu.open).toHaveBeenCalledWith('friends')
  })

  it('warms the ranking, because that is where the addable players come from', async () => {
    const from = deps()

    await openMenu(from)

    expect(from.rivals.warm).toHaveBeenCalled()
  })

  it('opens the menu anyway when the ranking never arrives', async () => {
    const from = deps({
      rivals: { warm: vi.fn().mockRejectedValue(new Error('down')), cached: () => [] },
    })

    await expect(commandOf(from, 'friends').run({}, ctx)).resolves.toMatchObject({ status: 'ok' })
    expect(from.menu.open).toHaveBeenCalledWith('friends')
  })

  it('stays in the lobby when the list itself never arrives', async () => {
    const failing = api()
    failing.list = vi.fn().mockRejectedValue(new ApiError('down', { status: 503, payload: null }))
    const from = deps({ api: failing })

    await expect(commandOf(from, 'friends').run({}, ctx)).resolves.toMatchObject({
      status: 'error',
    })
    expect(from.menu.open).not.toHaveBeenCalled()
  })
})

describe('friend add', () => {
  it('lives inside the friends menu', () => {
    expect(commandOf(deps(), 'friend-add').scope).toEqual(['friends'])
  })

  it('offers whoever the ranking knows and the list does not', async () => {
    const from = deps()
    await openMenu(from)
    const [player] = commandOf(from, 'friend-add').args

    expect(player?.options?.(ctx, {}).map((option) => option.label)).toEqual(['turing'])
  })

  it('asks the arena for the player that was picked', async () => {
    const from = deps()
    await openMenu(from)

    await commandOf(from, 'friend-add').run({ player: 'turing-id' }, ctx)

    expect(from.api.request).toHaveBeenCalledWith('turing-id')
  })

  it('takes the number the list showed instead of sending it as an id', async () => {
    const from = deps()
    await openMenu(from)

    await commandOf(from, 'friend-add').run({ player: '1' }, ctx)

    expect(from.api.request).toHaveBeenCalledWith('turing-id')
  })

  it('takes the username, whatever case it was typed in', async () => {
    const from = deps()
    await openMenu(from)

    await commandOf(from, 'friend-add').run({ player: 'TURING' }, ctx)

    expect(from.api.request).toHaveBeenCalledWith('turing-id')
  })

  it('lets an id pasted by hand through, for somebody outside every list', async () => {
    const from = deps()
    await openMenu(from)
    const pasted = '9f8e7d6c-5b4a-4392-8180-7f6e5d4c3b2a'

    await commandOf(from, 'friend-add').run({ player: pasted }, ctx)

    expect(from.api.request).toHaveBeenCalledWith(pasted)
  })

  it('explains a name it cannot resolve instead of bouncing off a validation error', async () => {
    const from = deps()
    await openMenu(from)

    await expect(
      commandOf(from, 'friend-add').run({ player: 'hopper' }, ctx),
    ).resolves.toMatchObject({
      status: 'error',
      message: 'No encontré a nadie que se llame "hopper"',
      lines: [
        'La arena no tiene buscador: elegí de la lista, o pegá el id que te hayan pasado',
        'Cada uno consigue el suyo con el comando me',
      ],
    })
    expect(from.api.request).not.toHaveBeenCalled()
  })

  it('names the player it just wrote to', async () => {
    const from = deps()
    await openMenu(from)

    await expect(
      commandOf(from, 'friend-add').run({ player: 'turing-id' }, ctx),
    ).resolves.toMatchObject({ status: 'ok', message: 'Le mandaste solicitud a turing' })
  })

  it('translates the rule the arena named instead of showing a 400', async () => {
    const refusing = api()
    refusing.request = vi.fn().mockRejectedValue(
      new ApiError('nope', {
        status: 400,
        payload: {
          message: 'The friend request breaks the rules of the arena',
          violations: [{ rule: 'DUPLICATE_REQUEST', message: 'already asked' }],
        },
      }),
    )
    const from = deps({ api: refusing })
    await openMenu(from)

    await expect(
      commandOf(from, 'friend-add').run({ player: 'turing-id' }, ctx),
    ).resolves.toMatchObject({ status: 'error', lines: ['Esa solicitud ya existe'] })
  })

  it('reads the list back so the next command sees the new row', async () => {
    const from = deps()
    await openMenu(from)

    await commandOf(from, 'friend-add').run({ player: 'turing-id' }, ctx)

    expect(from.api.list).toHaveBeenCalledTimes(2)
  })
})

describe('friend ok', () => {
  it('accepts the row the player pointed at', async () => {
    const from = deps()
    await openMenu(from)

    await commandOf(from, 'friend-ok').run({ friendship: '1' }, ctx)

    expect(from.api.accept).toHaveBeenCalledWith('f1')
  })

  it('names the new friend', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'friend-ok').run({ friendship: '1' }, ctx)).resolves.toMatchObject(
      {
        status: 'ok',
        message: 'Ahora sos amigo de grace',
      },
    )
  })

  it('refuses a row that is not ours to accept, without asking the arena', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'friend-ok').run({ friendship: '2' }, ctx)).resolves.toMatchObject(
      {
        status: 'error',
        message: 'Esta la mandaste vos: la tiene que aceptar la otra persona',
      },
    )
    expect(from.api.accept).not.toHaveBeenCalled()
  })

  it('says so when the row is gone from the list', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'friend-ok').run({ friendship: '9' }, ctx)).resolves.toMatchObject(
      {
        status: 'error',
        message: 'No encontré esa solicitud',
      },
    )
  })
})

describe('friend rm', () => {
  it('drops the row and says which of the three things it did', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'friend-rm').run({ friendship: '2' }, ctx)).resolves.toMatchObject(
      {
        status: 'ok',
        message: 'Cancelaste la solicitud que le mandaste a ada',
      },
    )
    expect(from.api.remove).toHaveBeenCalledWith('f2')
  })

  it('calls it rejecting when the request came the other way', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'friend-rm').run({ friendship: '1' }, ctx)).resolves.toMatchObject(
      {
        message: 'Rechazaste la solicitud de grace',
      },
    )
  })

  it('calls it unfriending once the friendship exists', async () => {
    const from = deps()
    await openMenu(from)

    await expect(commandOf(from, 'friend-rm').run({ friendship: '3' }, ctx)).resolves.toMatchObject(
      {
        message: 'hopper ya no está entre tus amigos',
      },
    )
  })

  it('says so when the row was already gone on the arena side', async () => {
    const failing = api()
    failing.remove = vi.fn().mockRejectedValue(new ApiError('gone', { status: 404, payload: null }))
    const from = deps({ api: failing })
    await openMenu(from)

    await expect(commandOf(from, 'friend-rm').run({ friendship: '1' }, ctx)).resolves.toMatchObject(
      {
        status: 'error',
        message: 'Esa solicitud ya no está',
      },
    )
  })
})

describe('friend back', () => {
  it('closes the menu and returns to the lobby', async () => {
    const from = deps()

    await expect(commandOf(from, 'friend-back').run({}, ctx)).resolves.toMatchObject({
      status: 'ok',
    })
    expect(from.menu.close).toHaveBeenCalled()
  })
})
