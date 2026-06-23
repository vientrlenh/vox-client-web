import { Building2, ChevronRight, FilePlus2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { RegistrationMethod } from '../../pages/RegisterPage'
import { RegistrationCard, RegistrationHeading } from './RegistrationLayout'

const methods: {
  description: string
  icon: LucideIcon
  method: RegistrationMethod
  title: string
}[] = [
  {
    description:
      'Trường của bạn đã có trong danh mục hệ thống. Chọn trường và xác thực nhanh qua email hoặc tài liệu.',
    icon: Building2,
    method: 'directory',
    title: 'Trường có trong danh mục',
  },
  {
    description:
      'Trường chưa có trong danh mục. Tự khai thông tin và gửi kèm tài liệu để quản trị viên xác minh.',
    icon: FilePlus2,
    method: 'self-declared',
    title: 'Tự khai thông tin trường',
  },
]

export function RegisterMethodStep({
  onSelect,
}: {
  onSelect: (method: RegistrationMethod) => void
}) {
  return (
    <RegistrationCard>
      <RegistrationHeading
        className="sr-only lg:not-sr-only lg:mb-6 lg:flex"
        subtitle="Chọn cách đăng ký phù hợp với trường của bạn."
        title="Đăng ký tài khoản trường học"
      />

      <div className="grid gap-4">
        {methods.map(({ description, icon: Icon, method, title }) => (
          <button
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 lg:p-5"
            key={method}
            onClick={() => onSelect(method)}
            type="button"
          >
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-blue-950">
                {title}
              </span>
              <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
                {description}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-500"
            />
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-xs font-medium text-slate-500 lg:hidden">
        Đã có tài khoản?{' '}
        <Link className="font-bold text-indigo-600" to="/login">
          Đăng nhập
        </Link>
      </p>
    </RegistrationCard>
  )
}
