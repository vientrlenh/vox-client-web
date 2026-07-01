import { useEffect, useState } from 'react'
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  FileQuestion,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearAuthTokens } from '@/features/auth/session/authSession'
import { useQuestionsQuery } from '@/features/question/api/useQuestionsQuery'

type NavigationGroup = {
  icon: typeof FileQuestion
  label: string
  items: Array<{
    badgeCount?: number
    label: string
    to: string
  }>
}

const navigationGroups: NavigationGroup[] = [
  {
    icon: FileQuestion,
    label: 'Câu hỏi',
    items: [
      {
        label: 'Câu hỏi của tôi',
        to: '/teacher/questions/my',
      },
      {
        label: 'Câu hỏi cần duyệt',
        to: '/teacher/questions/review',
      },
      {
        label: 'Ngân hàng và chủ đề',
        to: '/teacher/question-banks',
      },
    ],
  },
  {
    icon: ClipboardCheck,
    label: 'Kỳ thi',
    items: [
      {
        label: 'Kiểm tra tập trung',
        to: '/teacher/exams',
      },
      {
        label: 'Blueprint đề thi',
        to: '/teacher/blueprints',
      },
      {
        label: 'Tạo bài trên lớp',
        to: '/teacher/class-tests/create',
      },
      {
        label: 'Bài trên lớp của tôi',
        to: '/teacher/class-tests',
      },
    ],
  },
]

function getEmailInitials(email?: string) {
  if (!email) {
    return 'TC'
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

type TeacherSidebarProps = {
  onClose?: () => void
  onNavigate?: () => void
  showCloseButton?: boolean
}

function TeacherNavigationGroup({
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
          {items.map(({ badgeCount, label: itemLabel, to }) => (
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

function TeacherSidebar({
  groups,
  onClose,
  onNavigate,
  showCloseButton = false,
}: TeacherSidebarProps & { groups: NavigationGroup[] }) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-white/10 bg-linear-to-b from-blue-950 via-indigo-900 to-violet-900 px-6 py-7 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between">
        <NavLink
          aria-label="VOX teacher"
          className="inline-flex"
          onClick={onNavigate}
          to="/teacher/question-banks"
        >
          <img
            alt="VOX"
            className="h-25 w-auto object-contain"
            src={logoImage}
          />
        </NavLink>

        {showCloseButton ? (
          <button
            aria-label="Đóng menu giáo viên"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10 lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      <p className="mt-10 text-xs font-medium uppercase tracking-[0.08em] text-indigo-100/80">
        Giáo viên
      </p>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-2 [mask-image:linear-gradient(to_bottom,black,black_calc(100%-24px),transparent)] [scrollbar-color:rgba(255,255,255,0.28)_transparent] [scrollbar-width:thin]">
        <div className="flex min-h-full flex-col gap-6 pb-6">
          <nav aria-label="Giáo viên" className="grid gap-3">
            {groups.map((group) => (
              <TeacherNavigationGroup
                {...group}
                key={group.label}
                onNavigate={onNavigate}
              />
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
            <div className="inline-flex size-11 items-center justify-center rounded-xl bg-white text-indigo-700">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </div>
            <p className="mt-4 text-sm font-bold leading-6">
              Hệ thống an toàn và bảo mật
            </p>
            <p className="mt-2 text-xs leading-5 text-indigo-50/80">
              Dữ liệu được mã hóa và bảo vệ theo tiêu chuẩn quốc tế.
            </p>
            <button
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/35 text-sm font-bold text-white transition hover:bg-white/10"
              type="button"
            >
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TeacherLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const teacherEmail = user?.email ?? 'unknown'
  const teacherRoles = user?.roles.length ? user.roles.join(', ') : 'Chưa có vai trò'
  const teacherInitials = getEmailInitials(teacherEmail)
  const reviewQuestionsQuery = useQuestionsQuery('teacher', 'review', 1, 1, {
    keyword: '',
    questionBankId: '',
    questionTopicId: '',
    scope: '',
    sharing: '',
    status: 'SUBMITTED_FOR_REVIEW',
    topicName: '',
    type: '',
  })
  const teacherNavigationGroups = navigationGroups.map((group) =>
    group.label === 'Câu hỏi'
      ? {
          ...group,
          items: group.items.map((item) =>
            item.to === '/teacher/questions/review'
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
    <div className="min-h-screen bg-slate-50 text-blue-950 lg:pl-70">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-70 lg:block">
        <TeacherSidebar groups={teacherNavigationGroups} />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Đóng menu giáo viên bằng lớp phủ"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
            type="button"
          />
          <aside
            aria-label="Menu giáo viên"
            aria-modal="true"
            className="relative h-full w-70 max-w-[86vw]"
            role="dialog"
          >
            <TeacherSidebar
              groups={teacherNavigationGroups}
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
            aria-label="Mở menu giáo viên"
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
              aria-label="Tìm kiếm"
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-20 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Tìm kiếm ngân hàng, câu hỏi..."
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
                aria-label="Mở menu tài khoản"
                className="inline-flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
                onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {teacherInitials}
                </span>
                <span className="hidden max-w-56 sm:block">
                  <span className="block truncate text-sm font-bold text-blue-950">
                    {teacherEmail}
                  </span>
                  <span className="block truncate text-xs font-medium text-slate-500">
                    {teacherRoles}
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
