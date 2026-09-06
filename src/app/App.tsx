import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'

import { HealthGate } from '@/app/boot/HealthGate'
import { queryClient } from '@/app/boot/query-client'
import { SessionGate } from '@/app/boot/SessionGate'
import { AppRoutes } from '@/app/routes/AppRoutes'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HealthGate>
        <SessionGate>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SessionGate>
      </HealthGate>
    </QueryClientProvider>
  )
}
