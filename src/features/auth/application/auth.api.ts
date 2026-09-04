import {
  type PublicUser,
  publicUserSchema,
  type TokenPair,
  tokenPairSchema,
} from '@/shared/contracts'
import { type ApiClient } from '@/shared/http'

export interface RegisterInput {
  email: string
  username: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthApi {
  register: (input: RegisterInput) => Promise<PublicUser>
  login: (input: LoginInput) => Promise<TokenPair>
  me: () => Promise<PublicUser>
  logout: (refreshToken: string) => Promise<undefined>
}

export function createAuthApi(client: ApiClient): AuthApi {
  return {
    register: (input) =>
      client.request('/auth/register', {
        method: 'POST',
        body: input,
        schema: publicUserSchema,
        auth: false,
      }),
    login: (input) =>
      client.request('/auth/login', {
        method: 'POST',
        body: input,
        schema: tokenPairSchema,
        auth: false,
      }),
    me: () => client.get('/auth/me', publicUserSchema),
    logout: (refreshToken) =>
      client.request('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      }),
  }
}
