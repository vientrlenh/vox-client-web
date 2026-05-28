import { BarChart3, ClipboardList, ShieldCheck, Users } from 'lucide-react'
import { useAppSelector } from '@/app/store/hooks'

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
  const user = useAppSelector((state) => state.auth.user)

  return (
    <section className="grid gap-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="inline-flex size-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
          <ShieldCheck aria-hidden="true" className="size-6" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-blue-950 sm:text-3xl">
          Bảng điều khiển System Admin
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Đăng nhập thành công với tài khoản{' '}
          {user?.email ?? 'quản trị hệ thống'}. Các module quản trị chi tiết sẽ
          được kết nối trong các bước tiếp theo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {dashboardStats.map(({ icon: Icon, label, value }) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5"
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
  )
}
