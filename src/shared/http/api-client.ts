import { type z } from 'zod'

import { type TokenPair } from '@/shared/contracts'

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
  fetchImpl?: typeof globalThis.fetch
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
  fetchImpl = globalThis.fetch,
}: ApiClientOptions): ApiClient {
  async function send(path: string, options: RequestOptions<unknown>): Promise<Response> {
    const { method = 'GET', body, auth = true, signal } = options
    const accessToken = auth ? tokens.getAccessToken() : null
    const headers = new Headers()

    if (accessToken !== null) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    if (body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    try {
      return await fetchImpl(join(baseUrl, path), {
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

  async function request<TValue = undefined>(
    path: string,
    options: RequestOptions<TValue> = {},
  ): Promise<TValue> {
    const response = await send(path, options)
    const payload = await readBody(response)

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
