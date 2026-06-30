import { useEffect, useState } from 'react'
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  FileQuestion,
  Home,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearAuthTokens } from '@/features/auth/session/authSession'
import { useQuestionsQuery } from '@/features/question/api/useQuestionsQuery'

type NavigationGroup = {
  icon: typeof Home
  label: string
  items: Array<{
    badgeCount?: number
    label: string
    to: string
  }>
}

const navigationItems = [
  {
    icon: Home,
    label: 'Tong quan',
    to: '/school-admin/dashboard',
  },
  {
    icon: Users,
    label: 'Quan ly lop hoc',
    to: '/school-admin/classes',
  },
]

const navigationGroups: NavigationGroup[] = [
  {
    icon: FileQuestion,
    label: 'Question',
    items: [
      {
        label: 'Ngan hang cau hoi',
        to: '/school-admin/question-banks',
      },
      {
        label: 'Cau hoi trong truong',
        to: '/school-admin/questions/all',
      },
      {
        label: 'Duyet question',
        to: '/school-admin/questions/review',
      },
    ],
  },
  {
    icon: ClipboardCheck,
    label: 'Exam',
    items: [
      {
        label: 'Kiem tra tap trung',
        to: '/school-admin/exams',
      },
      {
        label: 'Bai kiem tra tren lop',
        to: '/school-admin/class-tests',
      },
      {
        label: 'Blueprint de thi',
        to: '/school-admin/blueprints',
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

type SchoolAdminSidebarProps = {
  onClose?: () => void
  onNavigate?: () => void
  showCloseButton?: boolean
}

function SchoolAdminNavigationGroup({
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
          isGroupActive ? 'bg-white/10 text-white' : 'text-cyan-50/90',
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
          {items.map(({ badgeCount, label: itemLabel, to }) => (
            <NavLink
              className={({ isActive }) =>
                [
                  'flex min-h-11 items-center rounded-lg px-4 py-2.5 text-sm font-bold transition',
                  isActive
                    ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-950/20'
                    : 'text-cyan-50/90 hover:bg-white/10 hover:text-white',
                ].join(' ')
              }
              key={to}
              onClick={onNavigate}
              to={to}
            >
              <span className="flex flex-1 items-center justify-between gap-3">
                <span>{itemLabel}</span>
                {badgeCount && badgeCount > 0 ? (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-black text-white">
                    {badgeCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SchoolAdminSidebar({
  groups,
  onClose,
  onNavigate,
  showCloseButton = false,
}: SchoolAdminSidebarProps & { groups: NavigationGroup[] }) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-white/10 bg-linear-to-b from-cyan-950 via-blue-900 to-indigo-900 px-6 py-7 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]">
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
            aria-label="Dong menu school admin"
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

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-2 [mask-image:linear-gradient(to_bottom,black,black_calc(100%-24px),transparent)] [scrollbar-color:rgba(255,255,255,0.28)_transparent] [scrollbar-width:thin]">
        <div className="flex min-h-full flex-col gap-6 pb-6">
          <nav aria-label="School admin" className="grid gap-3">
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
                key={to}
                onClick={onNavigate}
                to={to}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}

            {groups.map((group) => (
              <SchoolAdminNavigationGroup
                {...group}
                key={group.label}
                onNavigate={onNavigate}
              />
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
            <div className="inline-flex size-11 items-center justify-center rounded-xl bg-white text-cyan-700">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </div>
            <p className="mt-4 text-sm font-bold leading-6">Quan tri lop hoc</p>
            <p className="mt-2 text-xs leading-5 text-cyan-50/80">
              Theo doi lop, hoc vien va trang thai tham gia trong truong.
            </p>
          </div>
        </div>
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
  const reviewQuestionsQuery = useQuestionsQuery('school', 'review', 1, 1, {
    keyword: '',
    questionBankId: '',
    questionTopicId: '',
    scope: '',
    sharing: '',
    status: 'SUBMITTED_FOR_REVIEW',
    topicName: '',
    type: '',
  })
  const schoolAdminNavigationGroups = navigationGroups.map((group) =>
    group.label === 'Question'
      ? {
          ...group,
          items: group.items.map((item) =>
            item.to === '/school-admin/questions/review'
              ? { ...item, badgeCount: reviewQuestionsQuery.data?.totalElements ?? 0 }
              : item,
          ),
        }
      : group,
  )

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
        <SchoolAdminSidebar groups={schoolAdminNavigationGroups} />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Dong menu school admin bang lop phu"
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
              groups={schoolAdminNavigationGroups}
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
            aria-label="Mo menu school admin"
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
              aria-label="Tim kiem lop hoc"
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              placeholder="Tim theo ma lop, ten lop, hoc vien..."
              readOnly
              type="search"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              aria-label="Thong bao"
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
                aria-label="Mo menu tai khoan"
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
