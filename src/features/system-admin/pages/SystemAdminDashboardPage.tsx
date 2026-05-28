import { BarChart3, ClipboardList, LogOut, ShieldCheck, Users } from 'lucide-react'
import { useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearAuthTokens } from '@/features/auth/session/authSession'

const dashboardStats = [
  {
    icon: Users,
    label: 'Người dùng',
    value: 'Quản lý tài khoản',
  },
  {
    icon: ClipboardList,
    label: 'Đơn đăng ký',
    value: 'Duyệt trường học',
  },
  {
    icon: BarChart3,
    label: 'Báo cáo',
    value: 'Theo dõi hệ thống',
  },
]

export function SystemAdminDashboardPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)

  function handleLogout() {
    clearAuthTokens()
    dispatch(clearAuthState())
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <img alt="vox" className="h-10 w-auto object-contain" src={logoImage} />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-blue-700"
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Đăng xuất
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex size-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-blue-950 sm:text-3xl">
            Bảng điều khiển System Admin
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Đăng nhập thành công với tài khoản {user?.email ?? 'quản trị hệ thống'}.
            Các module quản trị chi tiết sẽ được kết nối trong các bước tiếp theo.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {dashboardStats.map(({ icon: Icon, label, value }) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              key={label}
            >
              <div className="inline-flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <h2 className="mt-4 text-sm font-bold text-slate-500">{label}</h2>
              <p className="mt-1 text-lg font-black text-blue-950">{value}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
