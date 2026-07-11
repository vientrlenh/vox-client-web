import { useState } from 'react'
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  FileQuestion,
  Gavel,
  LogOut,
  Menu,
  MonitorPlay,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearAuthTokens } from '@/features/auth/session/authSession'
import { useProfileQuery } from '@/features/profile'
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

const navigationItems = [
  {
    icon: MonitorPlay,
    label: 'Giám sát thi',
    to: '/teacher/monitoring',
  },
  {
    icon: Gavel,
    label: 'Chấm phúc khảo',
    to: '/teacher/reevaluation',
  },
]

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
    return 'GT'
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
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const isOpen = manualOpen ?? isGroupActive

  return (
    <div className="grid gap-2">
      <button
        aria-expanded={isOpen}
        className={[
          'flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold transition',
          isGroupActive ? 'bg-white/10 text-white' : 'text-cyan-50/90',
        ].join(' ')}
        onClick={() => setManualOpen(!isOpen)}
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

function TeacherSidebar({
  groups,
  onClose,
  onNavigate,
  showCloseButton = false,
}: TeacherSidebarProps & { groups: NavigationGroup[] }) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-linear-to-b from-cyan-950 via-blue-900 to-indigo-900 px-6 py-7 text-white">
      <div className="flex items-center justify-between">
        <NavLink
          aria-label="VOX giám thị"
          className="inline-flex"
          onClick={onNavigate}
          to="/teacher/monitoring"
        >
          <img alt="VOX" className="h-25 w-auto object-contain" src={logoImage} />
        </NavLink>

        {showCloseButton ? (
          <button
            aria-label="Đóng menu giám thị"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10 lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      <p className="mt-10 text-xs font-medium uppercase tracking-[0.08em] text-cyan-100/80">
        Giảng viên
      </p>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.28)_transparent] scrollbar-thin">
        <nav aria-label="Giám thị" className="grid gap-2 pb-4">
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

          {groups.map((group) => (
            <TeacherNavigationGroup
              {...group}
              key={group.label}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </div>

      <div className="mt-4 rounded-lg border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
        <div className="inline-flex size-11 items-center justify-center rounded-lg bg-white text-cyan-700">
          <ShieldCheck aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-4 text-sm font-bold leading-6">Giám sát phòng thi</p>
        <p className="mt-2 text-xs leading-5 text-cyan-50/80">
          Theo dõi màn hình và camera của học sinh trong các phòng bạn gác thi.
        </p>
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
  const teacherInitials = getEmailInitials(teacherEmail)
  const { data: profile } = useProfileQuery()
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
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:pl-70">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-70 lg:block">
        <TeacherSidebar groups={teacherNavigationGroups} />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Đóng menu giám thị bằng lớp phủ"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
            type="button"
          />
          <aside
            aria-label="Menu giám thị"
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
            aria-label="Mở menu giám thị"
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
              aria-label="Tìm kiếm phòng thi"
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              placeholder="Tìm theo mã phòng, tên phòng thi..."
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
                  {teacherInitials}
                </span>
                <span className="hidden max-w-56 sm:block">
                  <span className="block truncate text-sm font-bold text-slate-950">
                    {profile?.fullName}
                  </span>
                  <span className="block truncate uppercase text-xs font-medium text-slate-500">
                    Giảng viên
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
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-cyan-700"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setIsUserMenuOpen(false)
                      navigate('/profile')
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <UserRound aria-hidden="true" className="size-4" />
                    Thông tin cá nhân
                  </button>
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
