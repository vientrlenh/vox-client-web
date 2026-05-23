import { Link, Outlet } from 'react-router'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-base font-semibold text-neutral-950">
            Vox Client Web
          </Link>
        </nav>
      </header>

      <Outlet />
    </div>
  )
}
