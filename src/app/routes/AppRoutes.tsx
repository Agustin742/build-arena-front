import { Route, Routes } from 'react-router'

import { gameCommands } from '@/app/boot/game-commands'
import { AppShell } from '@/app/layout/AppShell'
import { ConsoleLayout } from '@/app/layout/ConsoleLayout'
import { DesignScreen } from '@/app/routes/DesignScreen'
import { GuestOnly } from '@/app/routes/GuestOnly'
import { RequireSession } from '@/app/routes/RequireSession'
import { ScreenPlaceholder } from '@/app/routes/ScreenPlaceholder'

const PROTECTED_SCREENS = [
  { path: undefined, name: 'lobby' },
  { path: '/builds', name: 'builds' },
  { path: '/builds/new', name: 'build wizard' },
  { path: '/builds/:buildId', name: 'build detail' },
  { path: '/friends', name: 'friends' },
  { path: '/battles', name: 'battles' },
  { path: '/battles/:battleId', name: 'arena' },
  { path: '/leaderboard', name: 'leaderboard' },
] as const

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ConsoleLayout commands={gameCommands} />}>
        <Route path="/login" element={<GuestOnly>{null}</GuestOnly>} />
        <Route path="/register" element={<GuestOnly>{null}</GuestOnly>} />

        {PROTECTED_SCREENS.map(({ path, name }) => {
          const element = (
            <RequireSession>
              <ScreenPlaceholder name={name} />
            </RequireSession>
          )

          return path === undefined ? (
            <Route key={name} index element={element} />
          ) : (
            <Route key={name} path={path} element={element} />
          )
        })}

        <Route path="*" element={<ScreenPlaceholder name="not found" />} />
      </Route>

      <Route element={<AppShell />}>
        <Route path="/design" element={<DesignScreen />} />
      </Route>
    </Routes>
  )
}
