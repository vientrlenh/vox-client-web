import { useState } from 'react'
import {
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  Gauge,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearAuthTokens } from '@/features/auth/session/authSession'
import { NotificationBell, unregisterPushDevice } from '@/features/notifications'
import { useProfileQuery } from '@/features/profile'

function getEmailInitials(email?: string) {
  if (!email) {
    return 'HS'
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

function StudentSidebar({
  onClose,
  onNavigate,
  showCloseButton = false,
}: {
  onClose?: () => void
  onNavigate?: () => void
  showCloseButton?: boolean
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-linear-to-b from-sky-950 via-blue-900 to-cyan-900 px-6 py-7 text-white">
      <div className="flex items-center justify-between">
        <NavLink
          aria-label="VOX hoc sinh"
          className="inline-flex"
          onClick={onNavigate}
          to="/student/exams"
        >
          <img alt="VOX" className="h-25 w-auto object-contain" src={logoImage} />
        </NavLink>

        {showCloseButton ? (
          <button
            aria-label="Đóng menu học sinh"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10 lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      <p className="mt-10 text-xs font-medium uppercase tracking-[0.08em] text-cyan-100/80">
        Học sinh
      </p>

      <nav aria-label="Học sinh" className="mt-6 grid gap-2">
        <NavLink
          className={({ isActive }) =>
            [
              'flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition',
              isActive
                ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-950/20'
                : 'text-cyan-50/90 hover:bg-white/10 hover:text-white',
            ].join(' ')
          }
          onClick={onNavigate}
          to="/student/exams"
        >
          <BookOpenCheck aria-hidden="true" className="size-5 shrink-0" />
          <span>Bài kiểm tra của tôi</span>
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            ['flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition', isActive ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-950/20' : 'text-cyan-50/90 hover:bg-white/10 hover:text-white'].join(' ')
          }
          onClick={onNavigate}
          to="/student/class-tests"
        >
          <ClipboardList aria-hidden="true" className="size-5 shrink-0" />
          <span>Bài tập của tôi</span>
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            ['flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition', isActive ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-950/20' : 'text-cyan-50/90 hover:bg-white/10 hover:text-white'].join(' ')
          }
          onClick={onNavigate}
          to="/student/schedule"
        >
          <CalendarDays aria-hidden="true" className="size-5 shrink-0" />
          <span>Lịch thi</span>
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            ['flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition', isActive ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-950/20' : 'text-cyan-50/90 hover:bg-white/10 hover:text-white'].join(' ')
          }
          onClick={onNavigate}
          to="/student/appeals"
        >
          <FileText aria-hidden="true" className="size-5 shrink-0" />
          <span>Đơn phúc khảo</span>
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            ['flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition', isActive ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-950/20' : 'text-cyan-50/90 hover:bg-white/10 hover:text-white'].join(' ')
          }
          onClick={onNavigate}
          to="/student/quota-usage"
        >
          <Gauge aria-hidden="true" className="size-5 shrink-0" />
          <span>Hạn mức sử dụng</span>
        </NavLink>
      </nav>

      <div className="mt-auto rounded-lg border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
        <p className="text-sm font-bold leading-6">Xem kết quả trên web</p>
        <p className="mt-2 text-xs leading-5 text-cyan-50/80">
          Bài thi đã hoàn thành sẽ hiển thị điểm tổng và điểm từng phần ngay trong mục bài thi của tôi.
        </p>
      </div>
    </div>
  )
}

export function StudentLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const { data: profile } = useProfileQuery()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const studentInitials = getEmailInitials(user?.email ?? 'unknown')

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
        <StudentSidebar />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Đóng menu học sinh"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
            type="button"
          />
          <aside aria-label="Menu học sinh" aria-modal="true" className="relative h-full w-70 max-w-[86vw]" role="dialog">
            <StudentSidebar
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
            aria-label="Mở menu học sinh"
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
              aria-label="Tìm kiếm bài thi"
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              placeholder="Danh sách bài thi và kết quả của bạn"
              readOnly
              type="search"
            />
          </div>

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
                  {studentInitials}
                </span>
                <span className="hidden max-w-56 sm:block">
                  <span className="block truncate text-sm font-bold text-slate-950">{profile?.fullName}</span>
                  <span className="block truncate uppercase text-xs font-medium text-slate-500">Học sinh</span>
                </span>
                <ChevronDown aria-hidden="true" className="hidden size-4 text-slate-950 sm:block" />
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
