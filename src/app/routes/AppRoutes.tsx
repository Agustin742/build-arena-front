import { Route, Routes } from 'react-router'

import { gameCommands } from '@/app/boot/game-commands'
import { AppShell } from '@/app/layout/AppShell'
import { ConsoleLayout } from '@/app/layout/ConsoleLayout'
import { DesignScreen } from '@/app/routes/DesignScreen'
import { GuestOnly } from '@/app/routes/GuestOnly'
import { RequireSession } from '@/app/routes/RequireSession'
import { ScreenPlaceholder } from '@/app/routes/ScreenPlaceholder'

/**
 * No route for builds, friends, battles or the ranking: every one of those turned out to
 * be a command, and they are read and written from the console without ever leaving the
 * lobby. The placeholders that used to sit here promised screens nobody was going to write.
 *
 * The arena stays, because a battle is the one thing that is not a list: it is a place the
 * player is in, with its own address, and phase 9 fills it in.
 */
const PROTECTED_SCREENS = [
  { path: undefined, name: 'lobby' },
  { path: '/battles/:battleId', name: 'arena' },
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
