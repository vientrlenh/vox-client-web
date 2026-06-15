import {
  ArrowRight,
  BarChart3,
  Brain,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import cartoonSchoolImage from '@/assets/images/cartoon-school.png'
import logoImage from '@/assets/images/logo.png'
import { setAuthenticatedUser } from '@/app/store/authSlice'
import { useAppDispatch } from '@/app/store/hooks'
import {
  clearAuthTokens,
  decodeAccessToken,
  isAccessTokenExpired,
  saveAuthTokens,
} from '@/features/auth/session/authSession'
import { SiteFooter } from '@/shared/ui/SiteFooter'
import type { ApiError } from '@/shared/api'
import { useLoginMutation } from '../api/useLoginMutation'

const trustItems = [
  { icon: Brain, label: 'Chấm điểm chính xác' },
  { icon: FileText, label: 'Phân tích đa chiều' },
  { icon: BarChart3, label: 'Báo cáo trực quan, dễ hiểu' },
  { icon: ShieldCheck, label: 'Bảo mật dữ liệu' },
]

type LoginMessage = {
  text: string
  tone: 'error' | 'info' | 'success'
}

function ProductPreview() {
  return (
    <div className="mt-10 hidden max-w-md gap-5 lg:grid">
      {trustItems.map(({ icon: Icon, label }) => (
        <div className="flex items-center gap-4 text-blue-100" key={label}>
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-cyan-200 shadow-lg shadow-violet-950/30">
            <Icon aria-hidden="true" className="size-6" />
          </span>
          <span className="text-sm font-bold leading-5 text-white">{label}</span>
        </div>
      ))}
    </div>
  )
}

function LoginHeading({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
        <UserRound aria-hidden="true" className="size-7" />
      </span>
      <div>
        <h1 className="text-4xl font-black leading-tight tracking-normal text-blue-950">
          Đăng nhập
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Chào mừng bạn quay trở lại{' '}
          <span className="font-bold text-violet-600">vox</span>
        </p>
      </div>
    </div>
  )
}

function getLoginErrorMessage(error: unknown) {
  const apiError = error as Partial<ApiError>

  if (typeof apiError.message === 'string' && apiError.message.trim()) {
    return apiError.message
  }

  return 'Đăng nhập thất bại. Vui lòng thử lại.'
}

function getPostLoginPath(roles: string[]) {
  if (roles.includes('SYSTEM_ADMIN')) {
    return '/system-admin/dashboard'
  }

  if (roles.includes('SCHOOL_ADMIN')) {
    return '/school-admin/dashboard'
  }

  if (roles.includes('TEACHER')) {
    return '/teacher/question-banks'
  }

  return null
}

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const loginMutation = useLoginMutation()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<LoginMessage | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedLogin = login.trim()

    if (!normalizedLogin || !password) {
      setMessage({
        text: 'Vui lòng nhập email hoặc số điện thoại và mật khẩu.',
        tone: 'error',
      })
      return
    }

    try {
      const tokens = await loginMutation.mutateAsync({
        login: normalizedLogin,
        password,
      })
      saveAuthTokens(tokens)

      const user = decodeAccessToken(tokens.accessToken)

      if (!user || isAccessTokenExpired(user)) {
        clearAuthTokens()
        setMessage({
          text: 'Phiên đăng nhập không hợp lệ. Vui lòng thử lại.',
          tone: 'error',
        })
        return
      }

      const postLoginPath = getPostLoginPath(user.roles)

      if (!postLoginPath) {
        clearAuthTokens()
        setMessage({
          text: 'Vai trò hiện chưa được hỗ trợ trong phiên bản này.',
          tone: 'error',
        })
        return
      }

      dispatch(setAuthenticatedUser(user))
      setMessage({
        text: 'Đăng nhập thành công.',
        tone: 'success',
      })
      navigate(postLoginPath, { replace: true })
    } catch (error) {
      clearAuthTokens()
      setMessage({
        text: getLoginErrorMessage(error),
        tone: 'error',
      })
    }
  }

  function handleGoogleLogin() {
    setMessage({
      text: 'Google login sẽ được kết nối sau khi BE sẵn sàng.',
      tone: 'info',
    })
  }

  const messageClassName =
    message?.tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : message?.tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-blue-200 bg-blue-50 text-blue-700'

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
                Chào mừng trở lại
              </h2>
              <p className="relative mt-5 max-w-sm text-2xl font-bold leading-7 text-blue-100">
                Đăng nhập để tiếp tục quản lý và{' '}
                <span className="text-cyan-300">
                  đánh giá bài thi nói với AI
                </span>
              </p>
              <p className="relative mt-4 max-w-md text-sm leading-7 text-blue-100">
                Nền tảng hỗ trợ nhà trường tổ chức, chấm điểm và quản lý bài
                thi nói tiếng Anh nhanh chóng, công bằng và minh bạch.
              </p>
            </div>

            <ProductPreview />

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
                  to="/register"
                >
                  Đăng ký
                </Link>
              </div>
            </header>

            <div className="px-4 pb-5 pt-6 text-center lg:hidden">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
                <UserRound aria-hidden="true" className="size-6" />
              </span>
              <p className="mt-4 text-2xl font-black leading-tight tracking-normal">
                Đăng nhập
              </p>
              <p className="mx-auto mt-2 max-w-xs text-xs font-medium leading-5 text-blue-100">
                Chào mừng bạn quay trở lại vox.
              </p>
            </div>

            <div className="relative w-full flex-1 px-4 pb-5 sm:px-6 lg:mx-auto lg:flex lg:max-w-130 lg:items-center lg:px-0 lg:pb-0">
              <div className="absolute right-0 -top-12.5 hidden text-xs font-semibold text-blue-100 lg:block">
                Chưa có tài khoản?{' '}
                <Link className="text-cyan-300 hover:text-cyan-200" to="/register">
                  Đăng ký
                </Link>
              </div>

              <div className="w-full">
                <form
                  className="w-full rounded-[18px] bg-white px-4 pb-5 pt-5 text-slate-950 shadow-2xl shadow-blue-950/35 ring-1 ring-white/50 sm:px-6 sm:py-7 lg:rounded-[22px] lg:p-10"
                  onSubmit={handleSubmit}
                >
                  <LoginHeading className="sr-only lg:not-sr-only lg:mb-8 lg:flex" />

                  <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-blue-950">
                    Email hoặc số điện thoại
                  </span>
                  <span className="relative block">
                    <Mail
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      autoComplete="username"
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      disabled={loginMutation.isPending}
                      onChange={(event) => setLogin(event.target.value)}
                      placeholder="Nhập email hoặc số điện thoại"
                      type="text"
                      value={login}
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-blue-950">
                    Mật khẩu
                  </span>
                  <span className="relative block">
                    <LockKeyhole
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      autoComplete="current-password"
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      disabled={loginMutation.isPending}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Nhập mật khẩu"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-700"
                      disabled={loginMutation.isPending}
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
              </div>

              <div className="mt-4 flex justify-end text-xs sm:text-sm">
                <Link
                  className="font-bold text-violet-600 hover:text-violet-700"
                  to="/reset-password"
                >
                  Quên mật khẩu?
                </Link>
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
                disabled={loginMutation.isPending}
                type="submit"
              >
                {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                <ArrowRight aria-hidden="true" className="size-5" />
              </button>

              <div className="my-5 flex items-center gap-4 text-sm text-slate-500">
                <span className="h-px flex-1 bg-slate-200" />
                <span>hoặc</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                disabled={loginMutation.isPending}
                onClick={handleGoogleLogin}
                type="button"
              >
                <span aria-hidden="true" className="text-lg font-black text-blue-500">
                  G
                </span>
                Đăng nhập bằng Google
              </button>

              <p className="mt-6 text-center text-sm text-slate-500">
                Chưa có tài khoản?{' '}
                <a className="font-bold text-violet-600 hover:text-violet-700" href="/contact">
                  Liên hệ nhà trường
                </a>{' '}
                /{' '}
                <a className="font-bold text-violet-600 hover:text-violet-700" href="/register">
                  Đăng ký
                </a>
              </p>
            </form>

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-blue-100 shadow-[0_12px_30px_rgba(2,6,23,0.18)] backdrop-blur-md">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/30 text-white">
                <ShieldCheck aria-hidden="true" className="size-6" />
              </span>
              <p className="text-sm leading-6">
                <span className="block font-semibold text-white">
                  Thông tin của bạn được bảo mật.
                </span>
                Truy cập được kiểm soát theo vai trò và quyền hạn.
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
