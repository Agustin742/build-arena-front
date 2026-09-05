import { describe, expect, it, vi } from 'vitest'

import { type Command, type CommandContext, type CommandScope } from '@/shared/commands'
import { ApiError } from '@/shared/http'

import { type AuthApi } from './auth.api'
import { type AuthSession, createAuthCommands } from './auth.commands'

const profile = {
  id: '3b9a1c4e-2f5d-4c8b-9a7e-6d5c4b3a2f1e',
  email: 'ada@arena.dev',
  username: 'ada',
  rating: 1200,
  createdAt: '2026-09-04T10:15:00.000Z',
}

const pair = { accessToken: 'access-1', refreshToken: 'refresh-1' }

const ctx = {
  activeScopes: ['anonymous'],
  picks: { generation: 0, items: [], lookup: () => undefined },
  state: { isAuthenticated: false, battleId: null, reactionWindowOpen: false },
} satisfies CommandContext

function makeApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    register: vi.fn(() => Promise.resolve(profile)),
    login: vi.fn(() => Promise.resolve(pair)),
    me: vi.fn(() => Promise.resolve(profile)),
    logout: vi.fn(() => Promise.resolve(undefined)),
    ...overrides,
  }
}

function makeSession(refreshToken: string | null = 'refresh-1'): AuthSession {
  return {
    getRefreshToken: () => refreshToken,
    setTokens: vi.fn(),
    setUser: vi.fn(),
    clear: vi.fn(),
  }
}

function commandNamed(commands: Command[], id: string): Command {
  const found = commands.find((command) => command.id === id)

  if (found === undefined) {
    throw new Error(`no command named ${id}`)
  }

  return found
}

function throwing(status: number): () => Promise<never> {
  return () => Promise.reject(new ApiError('failed', { status, payload: undefined }))
}

describe('createAuthCommands', () => {
  it('offers login and register to an anonymous visitor, and me and logout once inside', () => {
    const commands = createAuthCommands({ api: makeApi(), session: makeSession() })

    const scopeOf = (id: string): readonly CommandScope[] => commandNamed(commands, id).scope

    expect(scopeOf('login')).toEqual(['anonymous'])
    expect(scopeOf('register')).toEqual(['anonymous'])
    expect(scopeOf('me')).toEqual(['lobby'])
    expect(scopeOf('logout')).toEqual(['lobby'])
  })

  it('asks for the password as a masked argument, never as plain text', () => {
    const commands = createAuthCommands({ api: makeApi(), session: makeSession() })

    for (const id of ['login', 'register']) {
      const passwordArg = commandNamed(commands, id).args.find((arg) => arg.name === 'password')

      expect(passwordArg?.kind).toBe('password')
    }
  })

  describe('login', () => {
    it('stores the pair, then fetches and stores the profile', async () => {
      const api = makeApi()
      const session = makeSession()
      const commands = createAuthCommands({ api, session })

      const result = await commandNamed(commands, 'login').run(
        { email: 'ada@arena.dev', password: 'hunter2hunter2' },
        ctx,
      )

      expect(api.login).toHaveBeenCalledWith({
        email: 'ada@arena.dev',
        password: 'hunter2hunter2',
      })
      expect(session.setTokens).toHaveBeenCalledWith(pair)
      expect(api.me).toHaveBeenCalled()
      expect(session.setUser).toHaveBeenCalledWith(profile)
      expect(result.status).toBe('ok')
    })

    it('reports wrong credentials without storing anything', async () => {
      const api = makeApi({ login: throwing(401) })
      const session = makeSession()
      const commands = createAuthCommands({ api, session })

      const result = await commandNamed(commands, 'login').run(
        { email: 'ada@arena.dev', password: 'wrongpassword' },
        ctx,
      )

      expect(result).toEqual({ status: 'error', message: 'Email o contraseña incorrectos' })
      expect(session.setTokens).not.toHaveBeenCalled()
      expect(session.setUser).not.toHaveBeenCalled()
    })

    it('surfaces the throttle as its own message', async () => {
      const api = makeApi({ login: throwing(429) })
      const commands = createAuthCommands({ api, session: makeSession() })

      const result = await commandNamed(commands, 'login').run(
        { email: 'ada@arena.dev', password: 'hunter2hunter2' },
        ctx,
      )

      expect(result).toEqual({
        status: 'error',
        message: 'Frená un poco: demasiadas peticiones seguidas',
      })
    })
  })

  describe('register', () => {
    it('chains the login, because register returns the profile and no tokens', async () => {
      const api = makeApi()
      const session = makeSession()
      const commands = createAuthCommands({ api, session })

      const result = await commandNamed(commands, 'register').run(
        { email: 'ada@arena.dev', username: 'ada', password: 'hunter2hunter2' },
        ctx,
      )

      expect(api.register).toHaveBeenCalledWith({
        email: 'ada@arena.dev',
        username: 'ada',
        password: 'hunter2hunter2',
      })
      expect(api.login).toHaveBeenCalledWith({
        email: 'ada@arena.dev',
        password: 'hunter2hunter2',
      })
      expect(session.setTokens).toHaveBeenCalledWith(pair)
      expect(session.setUser).toHaveBeenCalledWith(profile)
      expect(result.status).toBe('ok')
    })

    it('reuses the profile register already returned instead of asking for it again', async () => {
      const api = makeApi()
      const commands = createAuthCommands({ api, session: makeSession() })

      await commandNamed(commands, 'register').run(
        { email: 'ada@arena.dev', username: 'ada', password: 'hunter2hunter2' },
        ctx,
      )

      expect(api.me).not.toHaveBeenCalled()
    })

    it('never attempts the chained login when the account was not created', async () => {
      const api = makeApi({ register: throwing(409) })
      const session = makeSession()
      const commands = createAuthCommands({ api, session })

      const result = await commandNamed(commands, 'register').run(
        { email: 'taken@arena.dev', username: 'ada', password: 'hunter2hunter2' },
        ctx,
      )

      expect(result).toEqual({ status: 'error', message: 'Ese email o usuario ya está tomado' })
      expect(api.login).not.toHaveBeenCalled()
      expect(session.setTokens).not.toHaveBeenCalled()
    })

    it('reports the account as created when only the chained login fails', async () => {
      const api = makeApi({ login: throwing(500) })
      const session = makeSession()
      const commands = createAuthCommands({ api, session })

      const result = await commandNamed(commands, 'register').run(
        { email: 'ada@arena.dev', username: 'ada', password: 'hunter2hunter2' },
        ctx,
      )

      expect(result.status).toBe('error')
      expect(result.status === 'error' && result.message).toContain('cuenta')
      expect(session.setTokens).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('tells the arena and clears the local session', async () => {
      const api = makeApi()
      const session = makeSession('refresh-1')
      const commands = createAuthCommands({ api, session })

      const result = await commandNamed(commands, 'logout').run({}, ctx)

      expect(api.logout).toHaveBeenCalledWith('refresh-1')
      expect(session.clear).toHaveBeenCalled()
      expect(result.status).toBe('ok')
    })

    it('clears the local session even when the arena refuses the call', async () => {
      const api = makeApi({ logout: throwing(401) })
      const session = makeSession('refresh-1')
      const commands = createAuthCommands({ api, session })

      const result = await commandNamed(commands, 'logout').run({}, ctx)

      expect(session.clear).toHaveBeenCalled()
      expect(result.status).toBe('ok')
    })

    it('clears without calling the arena when there is no refresh token', async () => {
      const api = makeApi()
      const session = makeSession(null)
      const commands = createAuthCommands({ api, session })

      await commandNamed(commands, 'logout').run({}, ctx)

      expect(api.logout).not.toHaveBeenCalled()
      expect(session.clear).toHaveBeenCalled()
    })
  })

  describe('me', () => {
    it('still reports an expired session, because here a 401 really is one', async () => {
      const api = makeApi({ me: throwing(401) })
      const commands = createAuthCommands({ api, session: makeSession() })

      const result = await commandNamed(commands, 'me').run({}, ctx)

      expect(result).toEqual({ status: 'error', message: 'Tu sesión terminó. Volvé a entrar' })
    })

    it('refreshes the stored profile and names the player', async () => {
      const api = makeApi()
      const session = makeSession()
      const commands = createAuthCommands({ api, session })

      const result = await commandNamed(commands, 'me').run({}, ctx)

      expect(session.setUser).toHaveBeenCalledWith(profile)
      expect(result.status === 'ok' && result.message).toContain('ada')
    })
  })
})
