import { CheckCircle2, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { RegistrationCard } from './RegistrationLayout'

type RegistrationResultVariant = 'pending' | 'success'

const variants: Record<
  RegistrationResultVariant,
  {
    accent: string
    icon: typeof CheckCircle2
    subtitle: string
    title: string
  }
> = {
  pending: {
    accent: 'from-amber-500 to-orange-500 shadow-amber-500/30',
    icon: Clock,
    subtitle:
      'Đơn đăng ký của bạn đã được gửi. Quản trị viên sẽ xem xét và phản hồi qua email. Vui lòng kiểm tra hộp thư trong thời gian tới.',
    title: 'Đã gửi đơn đăng ký',
  },
  success: {
    accent: 'from-emerald-500 to-green-500 shadow-emerald-500/30',
    icon: CheckCircle2,
    subtitle:
      'Xác thực thành công và trường của bạn đã được tạo. Vui lòng kiểm tra email để thiết lập mật khẩu cho tài khoản quản trị trường.',
    title: 'Xác thực thành công',
  },
}

export function RegistrationResultStep({
  variant,
}: {
  variant: RegistrationResultVariant
}) {
  const { accent, icon: Icon, subtitle, title } = variants[variant]

  return (
    <RegistrationCard>
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <span
          className={`inline-flex size-16 items-center justify-center rounded-full bg-linear-to-br text-white shadow-lg ${accent}`}
        >
          <Icon aria-hidden="true" className="size-8" />
        </span>
        <div className="grid gap-2">
          <h1 className="text-2xl font-black leading-tight text-blue-950">
            {title}
          </h1>
          <p className="mx-auto max-w-md text-sm font-medium leading-6 text-slate-500">
            {subtitle}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg bg-linear-to-r from-violet-600 to-cyan-500 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/20"
            to="/login"
          >
            Đến trang đăng nhập
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            to="/"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </RegistrationCard>
  )
}
