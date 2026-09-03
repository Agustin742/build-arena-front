import { BrowserRouter } from 'react-router'

import { AppRoutes } from '@/app/routes/AppRoutes'

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
