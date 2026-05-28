import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Headphones,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'
import cartoonSchoolImage from '@/assets/images/cartoon-school.png'
import logoImage from '@/assets/images/logo.png'
import { SiteFooter } from '@/shared/ui/SiteFooter'

type FieldProps = {
  autoComplete?: string
  className?: string
  id: string
  label: string
  placeholder: string
  required?: boolean
  type?: string
}

const contactFields: FieldProps[] = [
  {
    autoComplete: 'name',
    id: 'contact-name',
    label: 'Họ và tên liên hệ',
    placeholder: 'Nhập họ và tên đầy đủ',
    required: true,
  },
  {
    id: 'identifier-code',
    label: 'Mã định danh',
    placeholder: 'Nhập mã định danh',
    required: true,
  },
  {
    autoComplete: 'tel',
    id: 'contact-phone',
    label: 'Số điện thoại liên hệ',
    placeholder: 'Nhập số điện thoại',
    required: true,
    type: 'tel',
  },
  {
    autoComplete: 'email',
    id: 'contact-email',
    label: 'Email liên hệ',
    placeholder: 'Nhập email',
    required: true,
    type: 'email',
  },
]

const schoolFields: FieldProps[] = [
  {
    id: 'school-domain',
    label: 'Tên miền của trường',
    placeholder: 'vd: ten-truong.edu.vn',
    required: true,
  },
  {
    autoComplete: 'organization',
    id: 'school-name',
    label: 'Tên trường',
    placeholder: 'Nhập tên trường',
    required: true,
  },
]

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
    description:
      'Đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.',
    icon: Headphones,
    title: 'Hỗ trợ tận tâm',
  },
]

function RequiredMark() {
  return <span className="text-red-500">*</span>
}

function TextField({
  autoComplete,
  className = '',
  id,
  label,
  placeholder,
  required,
  type = 'text',
}: FieldProps) {
  return (
    <label className={`block min-w-0 ${className}`} htmlFor={id}>
      <span className="mb-1.5 block text-xs font-bold leading-4 text-blue-950">
        {label} {required ? <RequiredMark /> : null}
      </span>
      <input
        autoComplete={autoComplete}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        id={id}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  )
}

function DateField() {
  return (
    <label className="block min-w-0" htmlFor="birth-date">
      <span className="mb-1.5 block text-xs font-bold leading-4 text-blue-950">
        Ngày sinh <RequiredMark />
      </span>
      <span className="relative block">
        <input
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          id="birth-date"
          placeholder="dd/mm/yyyy"
          required
          type="text"
        />
        <CalendarDays
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
        />
      </span>
    </label>
  )
}

function SelectField({
  children,
  id,
  label,
  required,
}: {
  children: ReactNode
  id: string
  label: string
  required?: boolean
}) {
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="mb-1.5 block text-xs font-bold leading-4 text-blue-950">
        {label} {required ? <RequiredMark /> : null}
      </span>
      <span className="relative block">
        <select
          className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          defaultValue=""
          id={id}
          required={required}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
        />
      </span>
    </label>
  )
}

function FormSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="border-t border-slate-200 pt-4">
      <h2 className="mb-3 text-xs font-black text-blue-950">{title}</h2>
      {children}
    </section>
  )
}

function RegisterHeading({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
        <UserRound aria-hidden="true" className="size-7" />
      </span>
      <div>
        <h1 className="text-2xl font-black leading-tight tracking-normal text-blue-950">
          Đăng ký tài khoản trường học
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Vui lòng điền đầy đủ thông tin để chúng tôi hỗ trợ bạn tốt nhất.
        </p>
      </div>
    </div>
  )
}

export function RegisterPage() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

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
            <p className="-mt-2 text-sm font-semibold text-blue-100">
              Đánh giá kỹ năng nói thông minh hơn
            </p>

            <div className="relative mt-24 max-w-md">
              <div className="pointer-events-none absolute -right-40 top-4 h-72 w-72 rounded-full border border-violet-400/20" />
              <div className="pointer-events-none absolute -right-28 top-12 h-52 w-52 rounded-full border border-cyan-300/15" />
              <h2 className="text-4xl font-black leading-tight tracking-normal">
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
              {benefitItems.map(({ description, icon: Icon, title }) => (
                <div className="flex gap-5" key={title}>
                  <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-cyan-200 shadow-lg shadow-violet-950/30">
                    <Icon aria-hidden="true" className="size-8" />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-white">
                      {title}
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
            <header className="flex h-12 items-center justify-between border-b border-white/15 px-3 lg:hidden">
              <Link aria-label="Về trang chủ" className="inline-flex w-16" to="/">
                <img
                  alt="vox"
                  className="h-auto w-full object-contain"
                  src={logoImage}
                />
              </Link>
              <Link
                className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
                to="/login"
              >
                Đăng nhập
              </Link>
            </header>

            <div className="px-4 pb-5 pt-6 text-center lg:hidden">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
                <UserRound aria-hidden="true" className="size-6" />
              </span>
              <p className="mt-4 text-xl font-black leading-tight tracking-normal">
                Đăng ký tài khoản trường học
              </p>
              <p className="mx-auto mt-2 max-w-xs text-xs font-medium leading-5 text-blue-100">
                Vui lòng điền đầy đủ thông tin để chúng tôi hỗ trợ bạn tốt nhất.
              </p>
            </div>

            <div className="relative w-full flex-1 lg:mx-auto lg:flex lg:max-w-197.5 lg:items-center">
              <div className="absolute right-0 -top-12.5 hidden text-xs font-semibold text-blue-100 lg:block">
                Đã có tài khoản?{' '}
                <Link className="text-cyan-300 hover:text-cyan-200" to="/login">
                  Đăng nhập
                </Link>
              </div>

              <form
                className="w-full rounded-t-[18px] bg-white px-4 pb-5 pt-4 text-slate-950 shadow-2xl shadow-blue-950/35 ring-1 ring-white/50 sm:px-6 lg:rounded-[22px] lg:px-16 lg:py-8"
                onSubmit={handleSubmit}
              >
                <RegisterHeading className="sr-only lg:not-sr-only lg:mb-6 lg:flex" />

                <div className="grid gap-5">
                  <FormSection title="Thông tin liên hệ">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {contactFields.map((field) => (
                        <TextField key={field.id} {...field} />
                      ))}
                      <DateField />
                      <TextField
                        autoComplete="street-address"
                        id="contact-address"
                        label="Địa chỉ liên hệ"
                        placeholder="Nhập địa chỉ liên hệ"
                        required
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Thông tin trường">
                    <div className="grid gap-3">
                      <div className="grid gap-3 min-[390px]:grid-cols-2">
                        {schoolFields.map((field) => (
                          <TextField key={field.id} {...field} />
                        ))}
                      </div>
                      <TextField
                        autoComplete="street-address"
                        id="school-address"
                        label="Địa chỉ trường"
                        placeholder="Nhập địa chỉ trường"
                        required
                      />
                      <div className="grid gap-3 min-[390px]:grid-cols-2">
                        <TextField
                          id="postal-code"
                          label="Mã bưu chính"
                          placeholder="Nhập mã bưu chính"
                          required
                        />
                        <SelectField id="student-count" label="Số học sinh" required>
                          <option value="" disabled>
                            Nhập số học sinh của trường
                          </option>
                          <option value="under-500">Dưới 500 học sinh</option>
                          <option value="500-1000">500 - 1.000 học sinh</option>
                          <option value="over-1000">Trên 1.000 học sinh</option>
                        </SelectField>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Thông tin chức vụ">
                    <SelectField id="position" label="Chức vụ" required>
                      <option value="" disabled>
                        Nhập chức vụ của bạn
                      </option>
                      <option value="principal">Hiệu trưởng</option>
                      <option value="vice-principal">Phó hiệu trưởng</option>
                      <option value="teacher">Giáo viên</option>
                      <option value="admin">Quản trị viên</option>
                    </SelectField>
                  </FormSection>
                </div>

                {submitted ? (
                  <div
                    className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs font-semibold text-cyan-800"
                    role="status"
                  >
                    Thông tin đã được ghi nhận ở giao diện. Kết nối BE sẽ được
                    bổ sung sau khi màn hình được duyệt.
                  </div>
                ) : null}

                <button
                  className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-linear-to-r from-violet-600 to-cyan-500 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/20"
                  type="submit"
                >
                  Đăng ký tài khoản
                </button>

                <p className="mx-auto mt-5 max-w-xl text-center text-xs leading-5 text-slate-500">
                  Bằng việc đăng ký, bạn đồng ý với{' '}
                  <a
                    className="font-bold text-indigo-600 hover:text-indigo-700"
                    href="/terms"
                  >
                    Điều khoản sử dụng
                  </a>{' '}
                  và{' '}
                  <a
                    className="font-bold text-indigo-600 hover:text-indigo-700"
                    href="/privacy"
                  >
                    Chính sách bảo mật
                  </a>{' '}
                  của vox.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
