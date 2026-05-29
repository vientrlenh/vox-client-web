import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import cartoonSchoolImage from '@/assets/images/cartoon-school.png'
import logoImage from '@/assets/images/logo.png'
import type { ApiError } from '@/shared/api'
import { SiteFooter } from '@/shared/ui/SiteFooter'
import { useSetUpPasswordMutation } from '../api/useSetUpPasswordMutation'

type SetupPasswordMessage = {
  text: string
  tone: 'error' | 'success'
}

const passwordChecks = [
  {
    label: 'Tối thiểu 8 ký tự',
    test: (password: string) => password.length >= 8,
  },
  {
    label: 'Có chữ hoa',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: 'Có chữ thường',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: 'Có số',
    test: (password: string) => /\d/.test(password),
  },
  {
    label: 'Có ký tự đặc biệt',
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
]

function getPasswordValidationError(password: string) {
  const failedCheck = passwordChecks.find((check) => !check.test(password))

  return failedCheck ? `Mật khẩu chưa đạt yêu cầu: ${failedCheck.label}.` : null
}

function getSetupPasswordErrorMessage(error: unknown) {
  const apiError = error as Partial<ApiError>

  if (typeof apiError.message === 'string' && apiError.message.trim()) {
    return apiError.message
  }

  return 'Thiết lập mật khẩu thất bại. Vui lòng thử lại.'
}

function SetupPasswordHeading({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
        <KeyRound aria-hidden="true" className="size-7" />
      </span>
      <div>
        <h1 className="text-3xl font-black leading-tight tracking-normal text-blue-950">
          Thiết lập mật khẩu
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Tạo mật khẩu mới để kích hoạt tài khoản trên{' '}
          <span className="font-bold text-violet-600">vox</span>
        </p>
      </div>
    </div>
  )
}

export function SetupPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setUpPasswordMutation = useSetUpPasswordMutation()
  const redirectTimerRef = useRef<number | null>(null)
  const userId = searchParams.get('userId')?.trim() ?? ''
  const token = searchParams.get('token')?.trim() ?? ''
  const linkError =
    !userId || !token
      ? 'Liên kết thiết lập mật khẩu không hợp lệ hoặc đã thiếu thông tin.'
      : null

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState<SetupPasswordMessage | null>(
    linkError
      ? {
          text: linkError,
          tone: 'error',
        }
      : null,
  )

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (linkError) {
      setMessage({
        text: linkError,
        tone: 'error',
      })
      return
    }

    const passwordError = getPasswordValidationError(password)

    if (passwordError) {
      setMessage({
        text: passwordError,
        tone: 'error',
      })
      return
    }

    if (password !== confirmPassword) {
      setMessage({
        text: 'Mật khẩu xác nhận không khớp.',
        tone: 'error',
      })
      return
    }

    try {
      setMessage(null)
      const successMessage = await setUpPasswordMutation.mutateAsync({
        password,
        token,
        userId,
      })

      setMessage({
        text: successMessage,
        tone: 'success',
      })
      redirectTimerRef.current = window.setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1200)
    } catch (error) {
      setMessage({
        text: getSetupPasswordErrorMessage(error),
        tone: 'error',
      })
    }
  }

  const isSubmitting = setUpPasswordMutation.isPending
  const isSubmitDisabled = isSubmitting || Boolean(linkError)
  const messageClassName =
    message?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_35%_45%,rgba(91,33,182,0.60),transparent_34%),linear-gradient(135deg,#020824_0%,#06105f_48%,#020617_100%)] text-white lg:min-h-screen">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_92px)] opacity-20" />
        <div className="pointer-events-none absolute -left-24 bottom-12 hidden h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl lg:block" />

        <div className="relative mx-auto grid w-full max-w-360 lg:min-h-screen lg:grid-cols-[minmax(0,0.78fr)_minmax(460px,0.72fr)] lg:items-center lg:gap-12 lg:px-8 lg:py-8 xl:px-12">
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
              <h2 className="relative text-5xl font-black leading-tight tracking-normal">
                Kích hoạt tài khoản
              </h2>
              <p className="relative mt-5 max-w-sm text-2xl font-bold leading-7 text-blue-100">
                Tạo mật khẩu an toàn để bắt đầu sử dụng{' '}
                <span className="text-cyan-300">nền tảng đánh giá VOX</span>
              </p>
              <p className="relative mt-4 max-w-md text-sm leading-7 text-blue-100">
                Liên kết thiết lập mật khẩu chỉ dùng cho tài khoản được cấp quyền.
                Sau khi hoàn tất, bạn có thể đăng nhập vào hệ thống.
              </p>
            </div>

            <div className="mt-10 grid max-w-md gap-5">
              <div className="flex items-center gap-4 text-blue-100">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-cyan-200 shadow-lg shadow-violet-950/30">
                  <ShieldCheck aria-hidden="true" className="size-6" />
                </span>
                <span className="text-sm font-bold leading-5 text-white">
                  Bảo vệ tài khoản bằng mật khẩu mạnh
                </span>
              </div>
              <div className="flex items-center gap-4 text-blue-100">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-cyan-200 shadow-lg shadow-violet-950/30">
                  <CheckCircle2 aria-hidden="true" className="size-6" />
                </span>
                <span className="text-sm font-bold leading-5 text-white">
                  Kích hoạt nhanh và chuyển về đăng nhập
                </span>
              </div>
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
                <KeyRound aria-hidden="true" className="size-6" />
              </span>
              <p className="mt-4 text-2xl font-black leading-tight tracking-normal">
                Thiết lập mật khẩu
              </p>
              <p className="mx-auto mt-2 max-w-xs text-xs font-medium leading-5 text-blue-100">
                Tạo mật khẩu mới để kích hoạt tài khoản trên vox.
              </p>
            </div>

            <div className="relative w-full flex-1 px-4 pb-5 sm:px-6 lg:mx-auto lg:flex lg:max-w-130 lg:items-center lg:px-0 lg:pb-0">
              <div className="absolute right-0 -top-12.5 hidden text-xs font-semibold text-blue-100 lg:block">
                Đã có mật khẩu?{' '}
                <Link className="text-cyan-300 hover:text-cyan-200" to="/login">
                  Đăng nhập
                </Link>
              </div>

              <div className="w-full">
                <form
                  className="w-full rounded-[18px] bg-white px-4 pb-5 pt-5 text-slate-950 shadow-2xl shadow-blue-950/35 ring-1 ring-white/50 sm:px-6 sm:py-7 lg:rounded-[22px] lg:p-10"
                  onSubmit={handleSubmit}
                >
                  <SetupPasswordHeading className="sr-only lg:not-sr-only lg:mb-8 lg:flex" />

                  <div className="grid gap-4">
                    <label className="block" htmlFor="password">
                      <span className="mb-2 block text-sm font-bold text-blue-950">
                        Mật khẩu mới
                      </span>
                      <span className="relative block">
                        <LockKeyhole
                          aria-hidden="true"
                          className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          autoComplete="new-password"
                          className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          disabled={isSubmitDisabled}
                          id="password"
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Nhập mật khẩu mới"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                        />
                        <button
                          aria-label={
                            showPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'
                          }
                          className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-700"
                          disabled={isSubmitDisabled}
                          onClick={() => setShowPassword((current) => !current)}
                          type="button"
                        >
                          {showPassword ? (
                            <EyeOff aria-hidden="true" className="size-5" />
                          ) : (
                            <Eye aria-hidden="true" className="size-5" />
                          )}
                        </button>
                      </span>
                    </label>

                    <label className="block" htmlFor="confirm-password">
                      <span className="mb-2 block text-sm font-bold text-blue-950">
                        Xác nhận mật khẩu
                      </span>
                      <span className="relative block">
                        <LockKeyhole
                          aria-hidden="true"
                          className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          autoComplete="new-password"
                          className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          disabled={isSubmitDisabled}
                          id="confirm-password"
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          placeholder="Nhập lại mật khẩu mới"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                        />
                        <button
                          aria-label={
                            showConfirmPassword
                              ? 'Ẩn mật khẩu xác nhận'
                              : 'Hiện mật khẩu xác nhận'
                          }
                          className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-700"
                          disabled={isSubmitDisabled}
                          onClick={() =>
                            setShowConfirmPassword((current) => !current)
                          }
                          type="button"
                        >
                          {showConfirmPassword ? (
                            <EyeOff aria-hidden="true" className="size-5" />
                          ) : (
                            <Eye aria-hidden="true" className="size-5" />
                          )}
                        </button>
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {passwordChecks.map((check) => {
                      const isPassed = check.test(password)

                      return (
                        <div
                          className={`flex items-center gap-2 text-xs font-semibold ${
                            isPassed ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                          key={check.label}
                        >
                          <CheckCircle2
                            aria-hidden="true"
                            className={`size-4 ${
                              isPassed ? 'text-emerald-500' : 'text-slate-300'
                            }`}
                          />
                          <span>{check.label}</span>
                        </div>
                      )
                    })}
                  </div>

                  {message ? (
                    <div
                      className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${messageClassName}`}
                      role={message.tone === 'error' ? 'alert' : 'status'}
                    >
                      {message.text}
                    </div>
                  ) : null}

                  <button
                    className="mt-6 inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-linear-to-r from-violet-600 to-cyan-500 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                    disabled={isSubmitDisabled}
                    type="submit"
                  >
                    {isSubmitting ? 'Đang thiết lập...' : 'Thiết lập mật khẩu'}
                    <ArrowRight aria-hidden="true" className="size-5" />
                  </button>

                  <p className="mt-6 text-center text-sm text-slate-500">
                    Quay lại{' '}
                    <Link
                      className="font-bold text-violet-600 hover:text-violet-700"
                      to="/login"
                    >
                      đăng nhập
                    </Link>
                  </p>
                </form>

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-blue-100 shadow-[0_12px_30px_rgba(2,6,23,0.18)] backdrop-blur-md">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/30 text-white">
                    <UserRound aria-hidden="true" className="size-6" />
                  </span>
                  <p className="text-sm leading-6">
                    <span className="block font-semibold text-white">
                      Tài khoản sẽ sẵn sàng sau khi đặt mật khẩu.
                    </span>
                    Bạn sẽ được chuyển về trang đăng nhập để bắt đầu phiên làm việc.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
