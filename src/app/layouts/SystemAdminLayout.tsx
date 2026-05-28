import { useState } from 'react'
import {
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo-v2.png'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch } from '@/app/store/hooks'
import { clearAuthTokens } from '@/features/auth/session/authSession'

const navigationItems = [
  {
    icon: Home,
    label: 'Tổng quan',
    to: '/system-admin/dashboard',
  },
  {
    icon: ClipboardList,
    label: 'Quản lý đơn đăng ký',
    to: '/system-admin/registrations',
  },
  {
    icon: Users,
    label: 'Quản lý người dùng',
    to: '/system-admin/users',
  },
  {
    icon: Building2,
    label: 'Quản lý trường học',
    to: '/system-admin/schools',
  },
  {
    icon: Settings,
    label: 'Cài đặt hệ thống',
    to: '/system-admin/settings',
  },
]

type SystemAdminSidebarProps = {
  onClose?: () => void
  onNavigate?: () => void
  showCloseButton?: boolean
}

function SystemAdminSidebar({
  onClose,
  onNavigate,
  showCloseButton = false,
}: SystemAdminSidebarProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-blue-950 via-indigo-900 to-violet-900 px-6 py-7 text-white">
      <div className="flex items-center justify-between">
        <NavLink
          aria-label="VOX system admin"
          className="inline-flex"
          onClick={onNavigate}
          to="/system-admin/dashboard"
        >
          <img
            alt="VOX"
            className="h-12 w-auto object-contain brightness-0 invert"
            src={logoImage}
          />
        </NavLink>

        {showCloseButton ? (
          <button
            aria-label="Đóng menu system admin"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10 lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      <p className="mt-10 text-xs font-medium uppercase tracking-[0.08em] text-indigo-100/80">
        System Admin
      </p>

      <nav aria-label="System admin" className="mt-6 grid gap-2">
        {navigationItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            className={({ isActive }) =>
              [
                'flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition',
                isActive
                  ? 'bg-violet-500 text-white shadow-sm shadow-violet-950/20'
                  : 'text-indigo-50/90 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
            key={to}
            onClick={onNavigate}
            to={to}
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
        <div className="inline-flex size-11 items-center justify-center rounded-lg bg-white text-indigo-700">
          <ShieldCheck aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-4 text-sm font-bold leading-6">
          Hệ thống an toàn & bảo mật
        </p>
        <p className="mt-2 text-xs leading-5 text-indigo-50/80">
          Dữ liệu được mã hóa và bảo vệ theo tiêu chuẩn quốc tế.
        </p>
        <button
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-white/35 text-sm font-bold text-white transition hover:bg-white/10"
          type="button"
        >
          Xem chi tiết
        </button>
      </div>
    </div>
  )
}

export function SystemAdminLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  function handleLogout() {
    setIsMobileMenuOpen(false)
    setIsUserMenuOpen(false)
    clearAuthTokens()
    dispatch(clearAuthState())
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-blue-950 lg:pl-[280px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] lg:block">
        <SystemAdminSidebar />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Đóng menu system admin bằng lớp phủ"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
            type="button"
          />
          <aside
            aria-label="Menu system admin"
            aria-modal="true"
            className="relative h-full w-[280px] max-w-[86vw]"
            role="dialog"
          >
            <SystemAdminSidebar
              onClose={() => setIsMobileMenuOpen(false)}
              onNavigate={() => setIsMobileMenuOpen(false)}
              showCloseButton
            />
          </aside>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-[76px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            aria-label="Mở menu system admin"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 text-blue-950 transition hover:bg-slate-50 lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            type="button"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <div className="relative hidden max-w-2xl flex-1 md:block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-blue-900/70"
            />
            <input
              aria-label="Tìm kiếm hệ thống"
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-20 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Tìm kiếm theo tên trường, email, số điện thoại, mã đơn..."
              readOnly
              type="search"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-blue-900/70">
              Ctrl K
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              aria-label="Thông báo"
              className="relative inline-flex size-11 items-center justify-center rounded-lg border border-transparent text-blue-950 transition hover:border-slate-200 hover:bg-slate-50"
              type="button"
            >
              <Bell aria-hidden="true" className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            <div className="relative">
              <button
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                aria-label="Mở menu tài khoản System Admin"
                className="inline-flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
                onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  SA
                </span>
                <span className="hidden sm:block">
                  <span className="block text-sm font-bold text-blue-950">
                    System Admin
                  </span>
                  <span className="block text-xs font-medium text-slate-500">
                    Super Admin
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="hidden size-4 text-blue-950 sm:block"
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
