import { useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  FileQuestion,
  FileSpreadsheet,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  MonitorPlay,
  PenLine,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearAuthTokens } from '@/features/auth/session/authSession'
import { NotificationBell, unregisterPushDevice } from '@/features/notifications'
import { useProfileQuery } from '@/features/profile'
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
    label: 'Tổng quan',
    to: '/school-admin/dashboard',
  },
]

const navigationGroups: NavigationGroup[] = [
  {
    icon: BookOpen,
    label: 'Trường học',
    items: [
      {
        label: 'Quản lý lớp học',
        to: '/school-admin/classes',
      },
      {
        label: 'Quản lý khối',
        to: '/school-admin/grades',
      },
      {
        label: 'Quản lý phòng học',
        to: '/school-admin/rooms',
      },
    ],
  },
  {
    icon: GraduationCap,
    label: 'Người dùng',
    items: [
      {
        label: 'Quản lý Học sinh',
        to: '/school-admin/students',
      },
      {
        label: 'Quản lý Giáo viên',
        to: '/school-admin/teachers',
      },
    ],
  },
  {
    icon: MonitorPlay,
    label: 'Kỳ thi',
    items: [
      {
        label: 'Giám sát thi',
        to: '/school-admin/monitoring',
      },
      {
        label: 'Điểm danh ca thi',
        to: '/school-admin/proctor-attendance',
      },
      {
        label: 'Kiểm tra tập trung',
        to: '/school-admin/exams',
      },
      {
        label: 'Bài kiểm tra trên lớp',
        to: '/school-admin/class-tests',
      },
      {
        label: 'Khung đề thi',
        to: '/school-admin/blueprints',
      },
    ],
  },
  {
    icon: PenLine,
    label: 'Chấm bài',
    items: [
      {
        label: 'Phân công chấm bài',
        to: '/school-admin/grading',
      },
      {
        label: 'Phúc khảo',
        to: '/school-admin/reevaluation',
      },
    ],
  },
  {
    icon: ClipboardCheck,
    label: 'Đánh giá',
    items: [
      {
        label: 'Khung năng lực',
        to: '/school-admin/frameworks',
      },
      {
        label: 'Quản lý tiêu chí đánh giá',
        to: '/school-admin/rubrics',
      },
      {
        label: 'Quản lý chính sách đánh giá',
        to: '/school-admin/assessment-policies',
      },
    ],
  },
  {
    icon: FileQuestion,
    label: 'Câu hỏi',
    items: [
      {
        label: 'Ngân hàng câu hỏi',
        to: '/school-admin/question-banks',
      },
      {
        label: 'Câu hỏi trong trường',
        to: '/school-admin/questions/all',
      },
      {
        label: 'Duyệt câu hỏi',
        to: '/school-admin/questions/review',
      },
    ],
  },
  {
    icon: FileSpreadsheet,
    label: 'Hệ thống',
    items: [
      {
        label: 'Quản lý import',
        to: '/school-admin/imports',
      },
      {
        label: 'Gói dịch vụ',
        to: '/school-admin/subscription',
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
  const [prevIsGroupActive, setPrevIsGroupActive] = useState(isGroupActive)

  if (isGroupActive !== prevIsGroupActive) {
    setPrevIsGroupActive(isGroupActive)
    setIsOpen(isGroupActive)
  }

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
        Quản trị nhà trường
      </p>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.28)_transparent] scrollbar-thin">
        <nav aria-label="School admin" className="grid gap-2 pb-4">
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
            <SchoolAdminNavigationGroup
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
  const adminInitials = getEmailInitials(adminEmail)
  const { data: profile } = useProfileQuery()
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
    group.label === 'Câu hỏi'
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

  async function handleLogout() {
    setIsMobileMenuOpen(false)
    setIsUserMenuOpen(false)
    // Gỡ thiết bị nhận thông báo TRƯỚC khi xoá token: request cần header
    // Authorization, và backend không có endpoint đăng xuất nào dọn giúp việc này.
    await unregisterPushDevice()
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
            aria-label="Mở menu school admin"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-950 transition hover:bg-slate-50 lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            type="button"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />

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
                    {profile?.fullName}
                  </span>
                  <span className="block truncate uppercase text-xs font-medium text-slate-500">
                    Quản trị nhà trường
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