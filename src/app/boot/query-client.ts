import { QueryClient } from '@tanstack/react-query'

/**
 * One client for the whole application, created outside React on purpose: commands run
 * from the prompt, not from a component, and they still need to read and invalidate the
 * same cache the screens read.
 */
export const queryClient = new QueryClient()
