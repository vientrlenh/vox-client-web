import { BarChart3, Headphones, ShieldCheck, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import cartoonSchoolImage from '@/assets/images/cartoon-school.png'
import logoImage from '@/assets/images/logo.png'
import { SiteFooter } from '@/shared/ui/SiteFooter'

const benefitItems = [
  {
    description:
      'Thông tin của bạn được bảo mật tuyệt đối và chỉ sử dụng cho mục đích quản lý.',
    icon: ShieldCheck,
    title: 'Bảo mật và tin cậy',
  },
  {
    description:
      'Tổ chức thi, chấm điểm và báo cáo dễ dàng trên một nền tảng.',
    icon: BarChart3,
    title: 'Quản lý toàn diện',
  },
  {
    description: 'Đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.',
    icon: Headphones,
    title: 'Hỗ trợ tận tâm',
  },
]

export function RegistrationHeading({
  className = '',
  subtitle,
  title,
}: {
  className?: string
  subtitle: string
  title: string
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
        <UserRound aria-hidden="true" className="size-7" />
      </span>
      <div>
        <h1 className="text-3xl font-black leading-tight tracking-normal text-blue-950">
          {title}
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

/**
 * Khung "hero" dùng chung cho mọi bước của luồng đăng ký công khai
 * (cột marketing bên trái + thẻ nội dung bên phải + footer).
 */
export function RegistrationLayout({
  children,
  subtitle,
  title,
}: {
  children: ReactNode
  subtitle: string
  title: string
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_35%_45%,rgba(91,33,182,0.60),transparent_34%),linear-gradient(135deg,#020824_0%,#06105f_48%,#020617_100%)] text-white lg:min-h-screen">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_92px)] opacity-20" />
        <div className="pointer-events-none absolute -left-24 bottom-12 hidden h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl lg:block" />

        <div className="relative mx-auto grid w-full max-w-360 lg:min-h-screen lg:grid-cols-[minmax(0,0.78fr)_minmax(690px,1fr)] lg:items-center lg:gap-8 lg:px-8 lg:py-8 xl:px-12">
          <div className="hidden min-h-180 flex-col lg:flex">
            <Link aria-label="Về trang chủ" className="inline-flex w-fit" to="/">
              <img
                alt="vox"
                className="h-auto w-28 object-contain"
                src={logoImage}
              />
            </Link>
            <p className="-mt-2 text-base font-semibold text-blue-100">
              Đánh giá kỹ năng nói thông minh hơn
            </p>

            <div className="relative mt-24 max-w-md">
              <div className="pointer-events-none absolute -right-40 top-4 h-72 w-72 rounded-full border border-violet-400/20" />
              <div className="pointer-events-none absolute -right-28 top-12 h-52 w-52 rounded-full border border-cyan-300/15" />
              <h2 className="text-5xl font-black leading-tight tracking-normal">
                Tạo tài khoản trường học với{' '}
                <span className="bg-linear-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
                  VOX
                </span>
              </h2>
              <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-blue-100">
                Đăng ký để bắt đầu hành trình đánh giá kỹ năng nói tiếng Anh
                thông minh và hiệu quả.
              </p>
            </div>

            <div className="mt-10 grid max-w-md gap-6">
              {benefitItems.map(({ description, icon: Icon, title: itemTitle }) => (
                <div className="flex gap-5" key={itemTitle}>
                  <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-cyan-200 shadow-lg shadow-violet-950/30">
                    <Icon aria-hidden="true" className="size-8" />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-white">
                      {itemTitle}
                    </span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-blue-100">
                      {description}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <img
              alt=""
              aria-hidden="true"
              className="mt-auto w-full max-w-140 object-contain opacity-95 mix-blend-screen"
              src={cartoonSchoolImage}
            />
          </div>

          <div className="flex min-h-screen flex-col lg:min-h-0">
            <header className="relative z-10 px-4 pt-3 lg:hidden">
              <div className="flex h-12 items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-3 shadow-[0_12px_30px_rgba(2,6,23,0.24)] backdrop-blur-md">
                <Link
                  aria-label="Về trang chủ"
                  className="inline-flex h-8 w-18 items-center overflow-hidden"
                  to="/"
                >
                  <img
                    alt="vox"
                    className="h-full w-full object-contain object-left"
                    src={logoImage}
                  />
                </Link>
                <Link
                  className="inline-flex h-8 items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/15 hover:text-white"
                  to="/login"
                >
                  Đăng nhập
                </Link>
              </div>
            </header>

            <div className="px-4 pb-5 pt-6 text-center lg:hidden">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
                <UserRound aria-hidden="true" className="size-6" />
              </span>
              <p className="mt-4 text-2xl font-black leading-tight tracking-normal">
                {title}
              </p>
              <p className="mx-auto mt-2 max-w-xs text-xs font-medium leading-5 text-blue-100">
                {subtitle}
              </p>
            </div>

            <div className="relative w-full flex-1 px-4 pb-5 sm:px-6 lg:mx-auto lg:flex lg:max-w-197.5 lg:items-center lg:px-0 lg:pb-0">
              <div className="absolute right-0 -top-12.5 hidden text-xs font-semibold text-blue-100 lg:block">
                Đã có tài khoản?{' '}
                <Link className="text-cyan-300 hover:text-cyan-200" to="/login">
                  Đăng nhập
                </Link>
              </div>

              {children}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

/** Thẻ trắng bao quanh nội dung từng bước. */
export function RegistrationCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full rounded-[18px] bg-white px-4 pb-5 pt-4 text-slate-950 shadow-2xl shadow-blue-950/35 ring-1 ring-white/50 sm:px-6 lg:rounded-[22px] lg:px-16 lg:py-8">
      {children}
    </div>
  )
}

export function RegistrationSubmitButton({
  children,
  disabled,
}: {
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-linear-to-r from-violet-600 to-cyan-500 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
      disabled={disabled}
      type="submit"
    >
      {children}
    </button>
  )
}
