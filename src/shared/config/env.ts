import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.url({ protocol: /^https?$/ }),
})

export interface Env {
  apiUrl: string
}

export function readEnv(source: unknown): Env {
  const parsed = envSchema.safeParse(source)

  if (!parsed.success) {
    throw new Error(
      'VITE_API_URL is missing or is not a valid url. Copy .env.example to .env and fill it in.',
    )
  }

  return { apiUrl: parsed.data.VITE_API_URL }
}

export const env = readEnv(import.meta.env)
