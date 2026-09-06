import { Route, Routes } from 'react-router'

import { authCommands } from '@/app/boot/auth-commands'
import { AppShell } from '@/app/layout/AppShell'
import { DesignScreen } from '@/app/routes/DesignScreen'
import { GuestOnly } from '@/app/routes/GuestOnly'
import { RequireSession } from '@/app/routes/RequireSession'
import { ScreenPlaceholder } from '@/app/routes/ScreenPlaceholder'
import { AuthConsole } from '@/features/auth'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <AuthConsole title="entrar" commands={authCommands} />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <AuthConsole title="crear cuenta" commands={authCommands} />
            </GuestOnly>
          }
        />

        <Route
          index
          element={
            <RequireSession>
              <ScreenPlaceholder name="lobby" />
            </RequireSession>
          }
        />
        <Route
          path="/builds"
          element={
            <RequireSession>
              <ScreenPlaceholder name="builds" />
            </RequireSession>
          }
        />
        <Route
          path="/builds/new"
          element={
            <RequireSession>
              <ScreenPlaceholder name="build wizard" />
            </RequireSession>
          }
        />
        <Route
          path="/builds/:buildId"
          element={
            <RequireSession>
              <ScreenPlaceholder name="build detail" />
            </RequireSession>
          }
        />
        <Route
          path="/friends"
          element={
            <RequireSession>
              <ScreenPlaceholder name="friends" />
            </RequireSession>
          }
        />
        <Route
          path="/battles"
          element={
            <RequireSession>
              <ScreenPlaceholder name="battles" />
            </RequireSession>
          }
        />
        <Route
          path="/battles/:battleId"
          element={
            <RequireSession>
              <ScreenPlaceholder name="arena" />
            </RequireSession>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <RequireSession>
              <ScreenPlaceholder name="leaderboard" />
            </RequireSession>
          }
        />

        <Route path="/design" element={<DesignScreen />} />
        <Route path="*" element={<ScreenPlaceholder name="not found" />} />
      </Route>
    </Routes>
  )
}
