import { Route, Routes } from 'react-router'

import { AppShell } from '@/app/layout/AppShell'
import { DesignScreen } from '@/app/routes/DesignScreen'
import { ScreenPlaceholder } from '@/app/routes/ScreenPlaceholder'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/login" element={<ScreenPlaceholder name="login" />} />
        <Route path="/register" element={<ScreenPlaceholder name="register" />} />
        <Route index element={<ScreenPlaceholder name="lobby" />} />
        <Route path="/builds" element={<ScreenPlaceholder name="builds" />} />
        <Route path="/builds/new" element={<ScreenPlaceholder name="build wizard" />} />
        <Route path="/builds/:buildId" element={<ScreenPlaceholder name="build detail" />} />
        <Route path="/friends" element={<ScreenPlaceholder name="friends" />} />
        <Route path="/battles" element={<ScreenPlaceholder name="battles" />} />
        <Route path="/battles/:battleId" element={<ScreenPlaceholder name="arena" />} />
        <Route path="/leaderboard" element={<ScreenPlaceholder name="leaderboard" />} />
        <Route path="/design" element={<DesignScreen />} />
        <Route path="*" element={<ScreenPlaceholder name="not found" />} />
      </Route>
    </Routes>
  )
}
