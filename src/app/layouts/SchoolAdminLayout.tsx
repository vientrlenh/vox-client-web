import { useState } from 'react'
import {
  Bell,
  BookOpen,
  ChevronDown,
  FileSpreadsheet,
  Home,
  Layers,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearAuthTokens } from '@/features/auth/session/authSession'

const navigationItems = [
  {
    icon: Home,
    label: 'Tổng quan',
    to: '/school-admin/dashboard',
  },
  {
    icon: BookOpen,
    label: 'Quản lý lớp học',
    to: '/school-admin/classes',
  },
  {
    icon: Layers,
    label: 'Quản lý khối',
    to: '/school-admin/grades',
  },
  {
    icon: FileSpreadsheet,
    label: 'Quản lý import',
    to: '/school-admin/imports',
  },
  {
    icon: Users,
    label: 'Quản lý Người dùng',
    to: '/school-admin/students',
  },
]

function getEmailInitials(email?: string) {
  if (!email) {
    return 'SA'
  }

  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .padEnd(2, email[0].toUpperCase())
    .slice(0, 2)
}

type SchoolAdminSidebarProps = {
  onClose?: () => void
  onNavigate?: () => void
  showCloseButton?: boolean
}

function SchoolAdminSidebar({
  onClose,
  onNavigate,
  showCloseButton = false,
}: SchoolAdminSidebarProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-linear-to-b from-cyan-950 via-blue-900 to-indigo-900 px-6 py-7 text-white">
      <div className="flex items-center justify-between">
        <NavLink
          aria-label="VOX school admin"
          className="inline-flex"
          onClick={onNavigate}
          to="/school-admin/dashboard"
        >
          <img
            alt="VOX"
            className="h-25 w-auto object-contain"
            src={logoImage}
          />
        </NavLink>

        {showCloseButton ? (
          <button
            aria-label="Đóng menu school admin"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10 lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      <p className="mt-10 text-xs font-medium uppercase tracking-[0.08em] text-cyan-100/80">
        School Admin
      </p>

      <nav aria-label="School admin" className="mt-6 grid gap-2">
        {navigationItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            className={({ isActive }) =>
              [
                'flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition',
                isActive
                  ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-950/20'
                  : 'text-cyan-50/90 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
            key={`${label}-${to}`}
            onClick={onNavigate}
            to={to}
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
        <div className="inline-flex size-11 items-center justify-center rounded-lg bg-white text-cyan-700">
          <ShieldCheck aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-4 text-sm font-bold leading-6">Quản trị lớp học</p>
        <p className="mt-2 text-xs leading-5 text-cyan-50/80">
          Theo dõi lớp, học viên và trạng thái tham gia trong trường.
        </p>
      </div>
    </div>
  )
}

export function SchoolAdminLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const adminEmail = user?.email ?? 'unknown'
  const adminRoles = user?.roles.length ? user.roles.join(', ') : 'No roles'
  const adminInitials = getEmailInitials(adminEmail)

  function handleLogout() {
    setIsMobileMenuOpen(false)
    setIsUserMenuOpen(false)
    clearAuthTokens()
    dispatch(clearAuthState())
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:pl-70">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-70 lg:block">
        <SchoolAdminSidebar />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Đóng menu school admin bằng lớp phủ"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
            type="button"
          />
          <aside
            aria-label="Menu school admin"
            aria-modal="true"
            className="relative h-full w-70 max-w-[86vw]"
            role="dialog"
          >
            <SchoolAdminSidebar
              onClose={() => setIsMobileMenuOpen(false)}
              onNavigate={() => setIsMobileMenuOpen(false)}
              showCloseButton
            />
          </aside>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-19 items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            aria-label="Mở menu school admin"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-950 transition hover:bg-slate-50 lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            type="button"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <div className="relative hidden max-w-2xl flex-1 md:block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500"
            />
            <input
              aria-label="Tìm kiếm lớp học"
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              placeholder="Tìm theo mã lớp, tên lớp, học viên..."
              readOnly
              type="search"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              aria-label="Thông báo"
              className="relative inline-flex size-11 items-center justify-center rounded-lg border border-transparent text-slate-950 transition hover:border-slate-200 hover:bg-slate-50"
              type="button"
            >
              <Bell aria-hidden="true" className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            <div className="relative">
              <button
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                aria-label="Mở menu tài khoản"
                className="inline-flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
                onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
                  {adminInitials}
                </span>
                <span className="hidden max-w-56 sm:block">
                  <span className="block truncate text-sm font-bold text-slate-950">
                    {adminEmail}
                  </span>
                  <span className="block truncate text-xs font-medium text-slate-500">
                    {adminRoles}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="hidden size-4 text-slate-950 sm:block"
                />
              </button>

              {isUserMenuOpen ? (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-950/10"
                  role="menu"
                >
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-red-600"
                    onClick={handleLogout}
                    role="menuitem"
                    type="button"
                  >
                    <LogOut aria-hidden="true" className="size-4" />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-76px)] px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
