import { ArrowLeft, LayoutDashboard, LogIn, MapPinOff } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import logoImage from '@/assets/images/logo-v2.png'
import { useDashboardPath } from '@/features/auth/session/useDashboardPath'
import { SiteFooter } from '@/shared/ui/SiteFooter'

/**
 * Trang cho mọi đường dẫn không khớp route nào.
 *
 * Thay cho việc lặng lẽ chuyển hướng: gõ nhầm một ký tự mà màn hình đột ngột nhảy sang bảng điều
 * khiển thì người dùng không biết chuyện gì vừa xảy ra, và cũng không biết đường dẫn họ vừa mở là
 * sai chứ không phải hệ thống hỏng. Ở đây nói thẳng ra, kèm đúng đường dẫn đã thử.
 *
 * Lối ra bám theo trạng thái đăng nhập -- đang đăng nhập thì về bảng điều khiển của vai trò, chưa
 * thì về trang đăng nhập. Cùng một quy tắc `useDashboardPath` mà HomeRoute dùng, nên ba lối vào
 * (`/`, /login, và trang này) luôn nói cùng một đích cho cùng một người.
 *
 * Dựng theo khuôn trang công khai độc lập của PrivacyPolicyPage: trang này nằm NGOÀI mọi layout
 * có điều hướng, nên thiếu thanh đầu trang là người dùng cụt đường thật, không còn gì để bấm
 * ngoài nút Back của trình duyệt.
 */
export function NotFoundPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const dashboardPath = useDashboardPath()

  const primaryAction = dashboardPath
    ? { icon: LayoutDashboard, label: 'Về bảng điều khiển', to: dashboardPath }
    : { icon: LogIn, label: 'Đăng nhập', to: '/login' }
  const PrimaryIcon = primaryAction.icon

  return (
    <div className="min-h-screen bg-white">
      {/* Logo trỏ "/" cho cả hai loại người dùng được: HomeRoute đã tự phân luồng khách xem trang
          giới thiệu, còn người đã đăng nhập thì về thẳng bảng điều khiển. */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            aria-label="Vox - về trang chủ"
            className="inline-flex h-9 w-24 shrink-0 items-center overflow-hidden drop-shadow-[0_1px_2px_rgba(15,23,42,0.30)]"
            to="/"
          >
            <img
              alt="Vox"
              className="h-full w-full object-cover object-center"
              src={logoImage}
            />
          </Link>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại trang trước
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          <MapPinOff aria-hidden="true" className="size-7" />
        </span>

        <p
          aria-hidden="true"
          className="mt-6 bg-linear-to-r from-violet-600 to-cyan-500 bg-clip-text text-6xl font-black leading-none text-transparent sm:text-7xl"
        >
          404
        </p>

        <h1 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
          Không tìm thấy trang này
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
          Đường dẫn bạn vừa mở không có trên hệ thống Vox.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Đường dẫn đã thử
          </h2>
          {/* Hiện nguyên văn để người dùng đối chiếu, và để có thứ dán vào tin nhắn khi họ báo
              cho quản trị viên rằng một liên kết trong hệ thống bị hỏng. */}
          <p className="mt-2 break-all font-mono text-sm text-slate-700">
            {location.pathname}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-linear-to-r from-violet-600 to-cyan-500 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/20"
            to={primaryAction.to}
          >
            <PrimaryIcon aria-hidden="true" className="size-5" />
            {primaryAction.label}
          </Link>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại trang trước
          </button>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
