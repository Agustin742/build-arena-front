import { Outlet } from 'react-router'

export function AppShell() {
  return (
    <div className="flex min-h-full flex-col bg-background font-mono text-text">
      <header className="border-b border-border px-4 py-2 text-accent">build arena</header>
      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
