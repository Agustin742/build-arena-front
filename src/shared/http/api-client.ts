import { type z } from 'zod'

import { type TokenPair, tokenPairSchema } from '@/shared/contracts'

import { ApiError, SchemaError } from './api-error'

export interface TokenStore {
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  setTokens: (pair: TokenPair) => void
  clear: () => void
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface RequestOptions<TValue> {
  method?: HttpMethod | undefined
  body?: unknown
  schema?: z.ZodType<TValue> | undefined
  auth?: boolean | undefined
  signal?: AbortSignal | undefined
}

export interface ApiClientOptions {
  baseUrl: string
  tokens: TokenStore
  onSessionExpired?: (() => void) | undefined
  refreshPath?: string | undefined
  fetchImpl?: typeof globalThis.fetch | undefined
}

export interface ApiClient {
  request: <TValue = undefined>(path: string, options?: RequestOptions<TValue>) => Promise<TValue>
  get: <TValue>(path: string, schema: z.ZodType<TValue>) => Promise<TValue>
  post: <TValue = undefined>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<TValue>,
  ) => Promise<TValue>
  patch: <TValue = undefined>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<TValue>,
  ) => Promise<TValue>
  del: (path: string) => Promise<undefined>
}

function join(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }

  const text = await response.text()

  if (text === '') {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function createApiClient({
  baseUrl,
  tokens,
  onSessionExpired,
  refreshPath = '/auth/refresh',
  fetchImpl,
}: ApiClientOptions): ApiClient {
  let refreshInFlight: Promise<TokenPair | null> | null = null

  async function send(
    path: string,
    options: RequestOptions<unknown>,
    accessToken: string | null,
  ): Promise<Response> {
    const { method = 'GET', body, signal } = options
    const headers = new Headers()

    if (accessToken !== null) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    if (body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    const doFetch = fetchImpl ?? globalThis.fetch

    try {
      return await doFetch(join(baseUrl, path), {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        ...(signal ? { signal } : {}),
      })
    } catch (cause) {
      throw new ApiError(`The request to ${path} never reached the arena`, {
        status: null,
        payload: undefined,
        cause,
      })
    }
  }

  async function rotateTokens(): Promise<TokenPair | null> {
    const refreshToken = tokens.getRefreshToken()

    if (refreshToken === null) {
      return null
    }

    try {
      const response = await send(refreshPath, { method: 'POST', body: { refreshToken } }, null)

      if (!response.ok) {
        return null
      }

      const parsed = tokenPairSchema.safeParse(await readBody(response))

      if (!parsed.success) {
        return null
      }

      tokens.setTokens(parsed.data)

      return parsed.data
    } catch {
      return null
    }
  }

  function endSession(): null {
    tokens.clear()
    onSessionExpired?.()

    return null
  }

  function refreshOnce(): Promise<TokenPair | null> {
    refreshInFlight ??= rotateTokens()
      .then((pair) => pair ?? endSession())
      .finally(() => {
        refreshInFlight = null
      })

    return refreshInFlight
  }

  async function attempt<TValue>(
    path: string,
    options: RequestOptions<TValue>,
    accessToken: string | null,
  ): Promise<{ response: Response; payload: unknown }> {
    const response = await send(path, options, accessToken)

    return { response, payload: await readBody(response) }
  }

  async function request<TValue = undefined>(
    path: string,
    options: RequestOptions<TValue> = {},
  ): Promise<TValue> {
    const authenticated = options.auth !== false
    const tokenUsed = authenticated ? tokens.getAccessToken() : null

    let { response, payload } = await attempt(path, options, tokenUsed)

    if (response.status === 401 && tokenUsed !== null) {
      const rotatedElsewhere = tokens.getAccessToken() !== tokenUsed
      const canRetry = rotatedElsewhere || (await refreshOnce()) !== null

      if (canRetry) {
        ;({ response, payload } = await attempt(path, options, tokens.getAccessToken()))
      }
    }

    if (!response.ok) {
      throw new ApiError(`The request to ${path} failed with ${String(response.status)}`, {
        status: response.status,
        payload,
      })
    }

    if (!options.schema) {
      return undefined as TValue
    }

    const parsed = options.schema.safeParse(payload)

    if (!parsed.success) {
      throw new SchemaError(path, parsed.error.issues, payload)
    }

    return parsed.data
  }

  return {
    request,
    get: (path, schema) => request(path, { schema }),
    post: (path, body, schema) => request(path, { method: 'POST', body, schema }),
    patch: (path, body, schema) => request(path, { method: 'PATCH', body, schema }),
    del: (path) => request(path, { method: 'DELETE' }),
  }
}
