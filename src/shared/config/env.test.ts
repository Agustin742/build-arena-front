import { describe, expect, it } from 'vitest'

import { readEnv } from './env'

describe('readEnv', () => {
  it('reads the api url', () => {
    expect(readEnv({ VITE_API_URL: 'https://api.test' })).toEqual({ apiUrl: 'https://api.test' })
  })

  it('fails loudly when the api url is missing', () => {
    expect(() => readEnv({})).toThrow(/VITE_API_URL/)
  })

  it('fails loudly when the api url is not a url', () => {
    expect(() => readEnv({ VITE_API_URL: 'localhost:3000' })).toThrow(/VITE_API_URL/)
  })
})
