import { type Command, type CommandResult } from '@/shared/commands'
import { type PublicUser, type TokenPair } from '@/shared/contracts'
import { ApiError, toGameMessage } from '@/shared/http'

import { type AuthApi } from './auth.api'

export interface AuthSession {
  getRefreshToken: () => string | null
  setTokens: (pair: TokenPair) => void
  setUser: (user: PublicUser | null) => void
  clear: () => void
}

export interface AuthCommandDeps {
  api: AuthApi
  session: AuthSession
}

const ACCOUNT_CREATED_LOGIN_FAILED =
  'Tu cuenta quedó creada, pero no pudimos entrar. Probá con login'

const BAD_CREDENTIALS = 'Email o contraseña incorrectos'
const ALREADY_TAKEN = 'Ese email o usuario ya está tomado'

function messageFor(error: unknown, byStatus: Readonly<Record<number, string>>): string {
  if (error instanceof ApiError && error.status !== null && error.violations === undefined) {
    const known = byStatus[error.status]

    if (known !== undefined) {
      return known
    }
  }

  return toGameMessage(error)
}

export function createAuthCommands({ api, session }: AuthCommandDeps): Command[] {
  async function login(email: string, password: string): Promise<TokenPair> {
    const pair = await api.login({ email, password })
    session.setTokens(pair)

    return pair
  }

  return [
    {
      id: 'login',
      label: 'LOGIN',
      hint: 'entrar a la arena',
      aliases: ['login'],
      args: [
        { name: 'email', kind: 'text', label: 'Email', required: true },
        { name: 'password', kind: 'password', label: 'Contraseña', required: true },
      ],
      scope: ['anonymous'],
      availability: () => ({ enabled: true }),
      run: async (args): Promise<CommandResult> => {
        try {
          await login(args.email ?? '', args.password ?? '')
        } catch (error) {
          return { status: 'error', message: messageFor(error, { 401: BAD_CREDENTIALS }) }
        }

        const user = await api.me()
        session.setUser(user)

        return { status: 'ok', message: `Adentro. Bienvenido, ${user.username}` }
      },
    },
    {
      id: 'register',
      label: 'REGISTER',
      hint: 'crear una cuenta',
      aliases: ['register'],
      args: [
        { name: 'email', kind: 'text', label: 'Email', required: true },
        { name: 'username', kind: 'text', label: 'Usuario', required: true },
        { name: 'password', kind: 'password', label: 'Contraseña', required: true },
      ],
      scope: ['anonymous'],
      availability: () => ({ enabled: true }),
      run: async (args): Promise<CommandResult> => {
        const email = args.email ?? ''
        const password = args.password ?? ''

        let profile: PublicUser

        try {
          profile = await api.register({ email, username: args.username ?? '', password })
        } catch (error) {
          return { status: 'error', message: messageFor(error, { 409: ALREADY_TAKEN }) }
        }

        try {
          await login(email, password)
        } catch {
          return { status: 'error', message: ACCOUNT_CREATED_LOGIN_FAILED }
        }

        session.setUser(profile)

        return { status: 'ok', message: `Cuenta creada. Bienvenido, ${profile.username}` }
      },
    },
    {
      id: 'me',
      label: 'ME',
      hint: 'tu perfil',
      aliases: ['me'],
      args: [],
      scope: ['lobby'],
      availability: () => ({ enabled: true }),
      run: async (): Promise<CommandResult> => {
        try {
          const user = await api.me()
          session.setUser(user)

          return { status: 'ok', message: `${user.username} · rating ${String(user.rating)}` }
        } catch (error) {
          return { status: 'error', message: toGameMessage(error) }
        }
      },
    },
    {
      id: 'logout',
      label: 'LOGOUT',
      hint: 'cerrar la sesión',
      aliases: ['logout'],
      args: [],
      scope: ['lobby'],
      availability: () => ({ enabled: true }),
      run: async (): Promise<CommandResult> => {
        const refreshToken = session.getRefreshToken()

        if (refreshToken !== null) {
          try {
            await api.logout(refreshToken)
          } catch {
            session.clear()

            return { status: 'ok', message: 'Sesión cerrada de este lado' }
          }
        }

        session.clear()

        return { status: 'ok', message: 'Sesión cerrada' }
      },
    },
  ]
}
