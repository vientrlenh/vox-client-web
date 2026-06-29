import { useEffect, useState } from 'react'
import {
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  ClipboardCheck,
  FileQuestion,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearAuthTokens } from '@/features/auth/session/authSession'

type NavigationItem = {
  icon: typeof Home
  label: string
  to: string
}

type NavigationGroup = {
  icon: typeof Home
  label: string
  items: Array<{
    label: string
    to: string
  }>
}

const navigationItems: NavigationItem[] = [
  {
    icon: Home,
    label: 'Tong quan',
    to: '/system-admin/dashboard',
  },
  {
    icon: ClipboardList,
    label: 'Quan ly don dang ky',
    to: '/system-admin/registrations',
  },
  {
    icon: Users,
    label: 'Quan ly nguoi dung',
    to: '/system-admin/users',
  },
  {
    icon: Building2,
    label: 'Quan ly truong hoc',
    to: '/system-admin/schools',
  },
  {
    icon: Settings,
    label: 'Cai dat he thong',
    to: '/system-admin/settings',
  },
]

const navigationGroups: NavigationGroup[] = [
  {
    icon: FileQuestion,
    label: 'Question',
    items: [
      {
        label: 'Ngan hang cau hoi',
        to: '/system-admin/question-banks',
      },
    ],
  },
  {
    icon: FileQuestion,
    label: 'Question',
    items: [
      {
        label: 'Question tong',
        to: '/system-admin/questions/all',
      },
      {
        label: 'Duyet question',
        to: '/system-admin/questions/review',
      },
    ],
  },
  {
    icon: ClipboardCheck,
    label: 'Exam',
    items: [
      {
        label: 'Giam sat exam',
        to: '/system-admin/exams',
      },
      {
        label: 'Giam sat blueprint',
        to: '/system-admin/blueprints',
      },
    ],
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

type SystemAdminSidebarProps = {
  onClose?: () => void
  onNavigate?: () => void
  showCloseButton?: boolean
}

function SystemAdminNavigationGroup({
  icon: Icon,
  items,
  label,
  onNavigate,
}: NavigationGroup & { onNavigate?: () => void }) {
  const location = useLocation()
  const isGroupActive = items.some(({ to }) => location.pathname.startsWith(to))
  const [isOpen, setIsOpen] = useState(isGroupActive)

  useEffect(() => {
    if (isGroupActive) {
      setIsOpen(true)
    }
  }, [isGroupActive])

  return (
    <div className="grid gap-2">
      <button
        aria-expanded={isOpen}
        className={[
          'flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold transition',
          isGroupActive ? 'bg-white/10 text-white' : 'text-indigo-50/90',
        ].join(' ')}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        <span className="flex-1">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={[
            'size-4 shrink-0 transition-transform',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {isOpen ? (
        <div className="ml-4 grid gap-2 border-l border-white/10 pl-4">
          {items.map(({ label: itemLabel, to }) => (
            <NavLink
              className={({ isActive }) =>
                [
                  'flex min-h-11 items-center rounded-lg px-4 py-2.5 text-sm font-bold transition',
                  isActive
                    ? 'bg-violet-500 text-white shadow-sm shadow-violet-950/20'
                    : 'text-indigo-50/90 hover:bg-white/10 hover:text-white',
                ].join(' ')
              }
              key={to}
              onClick={onNavigate}
              to={to}
            >
              {itemLabel}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SystemAdminSidebar({
  onClose,
  onNavigate,
  showCloseButton = false,
}: SystemAdminSidebarProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-linear-to-b from-blue-950 via-indigo-900 to-violet-900 px-6 py-7 text-white">
      <div className="flex items-center justify-between">
        <NavLink
          aria-label="VOX system admin"
          className="inline-flex"
          onClick={onNavigate}
          to="/system-admin/dashboard"
        >
          <img
            alt="VOX"
            className="h-25 w-auto object-contain"
            src={logoImage}
          />
        </NavLink>

        {showCloseButton ? (
          <button
            aria-label="Dong menu system admin"
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

      <nav aria-label="System admin" className="mt-6 grid gap-3">
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

        {navigationGroups.map((group) => (
          <SystemAdminNavigationGroup
            {...group}
            key={group.label}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
        <div className="inline-flex size-11 items-center justify-center rounded-lg bg-white text-indigo-700">
          <ShieldCheck aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-4 text-sm font-bold leading-6">
          He thong an toan va bao mat
        </p>
        <p className="mt-2 text-xs leading-5 text-indigo-50/80">
          Du lieu duoc ma hoa va bao ve theo tieu chuan quoc te.
        </p>
        <button
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-white/35 text-sm font-bold text-white transition hover:bg-white/10"
          type="button"
        >
          Xem chi tiet
        </button>
      </div>
    </div>
  )
}

export function SystemAdminLayout() {
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
    <div className="min-h-screen bg-slate-50 text-blue-950 lg:pl-70">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-70 lg:block">
        <SystemAdminSidebar />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Dong menu system admin bang lop phu"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
            type="button"
          />
          <aside
            aria-label="Menu system admin"
            aria-modal="true"
            className="relative h-full w-70 max-w-[86vw]"
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
        <div className="flex min-h-19 items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            aria-label="Mo menu system admin"
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
              aria-label="Tim kiem he thong"
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-20 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Tim kiem theo ten truong, email, so dien thoai, ma don..."
              readOnly
              type="search"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-blue-900/70">
              Ctrl K
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              aria-label="Thong bao"
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
                aria-label="Mo menu tai khoan"
                className="inline-flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
                onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {adminInitials}
                </span>
                <span className="hidden max-w-56 sm:block">
                  <span className="block truncate text-sm font-bold text-blue-950">
                    {adminEmail}
                  </span>
                  <span className="block truncate text-xs font-medium text-slate-500">
                    {adminRoles}
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
                    Dang xuat
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
