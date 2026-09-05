import { BrowserRouter } from 'react-router'

import { HealthGate } from '@/app/boot/HealthGate'
import { SessionGate } from '@/app/boot/SessionGate'
import { AppRoutes } from '@/app/routes/AppRoutes'

export function App() {
  return (
    <HealthGate>
      <SessionGate>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SessionGate>
    </HealthGate>
  )
}
