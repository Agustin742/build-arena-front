import { sessionTokens } from '@/features/auth'
import { env } from '@/shared/config'
import { healthStatusSchema } from '@/shared/contracts'
import { createApiClient } from '@/shared/http'

export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  tokens: sessionTokens,
})

export async function pingHealth(): Promise<void> {
  await apiClient.request('/health', { schema: healthStatusSchema, auth: false })
}
