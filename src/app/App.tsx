import { BrowserRouter } from 'react-router'

import { HealthGate } from '@/app/boot/HealthGate'
import { AppRoutes } from '@/app/routes/AppRoutes'

export function App() {
  return (
    <HealthGate>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </HealthGate>
  )
}
