import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'

import { CatalogGate } from '@/app/boot/CatalogGate'
import { HealthGate } from '@/app/boot/HealthGate'
import { queryClient } from '@/app/boot/query-client'
import { SessionGate } from '@/app/boot/SessionGate'
import { AppRoutes } from '@/app/routes/AppRoutes'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Two waits, one screen: the arena has to answer, and then the catalog it serves
          has to arrive. Nothing opens until the player can actually use all of it. */}
      <HealthGate>
        <SessionGate>
          <CatalogGate>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </CatalogGate>
        </SessionGate>
      </HealthGate>
    </QueryClientProvider>
  )
}
