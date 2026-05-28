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
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
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

const waveformBars = [
  18, 34, 22, 46, 28, 58, 35, 76, 42, 90, 64, 116, 78, 132, 86, 102, 70, 88,
  54, 72, 44, 58, 32, 46, 24, 36,
]

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

function Waveform({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none flex items-center gap-1 ${className}`}
    >
      <span className="h-px w-20 bg-blue-300/30" />
      {waveformBars.map((height, index) => (
        <span
          className="w-1 rounded-full bg-blue-400/70 shadow-[0_0_18px_rgba(96,165,250,0.80)]"
          key={`${height}-${index}`}
          style={{ height }}
        />
      ))}
      <span className="h-px flex-1 bg-blue-300/20" />
    </div>
  )
}

function ProductPreview() {
  return (
    <div className="mt-10 hidden lg:grid lg:grid-cols-4 lg:gap-5">
      {trustItems.map(({ icon: Icon, label }) => (
        <div className="flex items-center gap-3 text-blue-100" key={label}>
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-cyan-200 ring-1 ring-white/15">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="text-xs font-medium leading-5">{label}</span>
        </div>
      ))}
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

      if (!user.roles.includes('SYSTEM_ADMIN')) {
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
      navigate('/system-admin/dashboard', { replace: true })
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
    <main className="bg-slate-50">
      <section className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#06105f_0%,#07085f_45%,#5319dd_100%)] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_90px)] opacity-20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(56,189,248,0.18))]" />

        <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-5 py-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-12">
          <div className="min-w-0 lg:pb-8">
            <Link aria-label="Về trang chủ" className="inline-flex" to="/">
              <img
                alt="vox"
                className="h-auto w-24 object-contain sm:w-32 lg:w-24"
                src={logoImage}
              />
            </Link>

            <div className="relative mt-9 max-w-xl sm:mt-12 lg:mt-14">
              <Waveform className="absolute -right-28 top-0 h-28 w-80 opacity-60 sm:-right-48 sm:w-110 lg:-right-45 lg:top-28 lg:h-32 lg:w-120" />
              <h1 className="relative text-3xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
                Chào mừng trở lại
              </h1>
              <p className="relative mt-2 max-w-88 text-base font-bold leading-6 text-white sm:max-w-md sm:text-2xl sm:leading-8 lg:text-2xl">
                Đăng nhập để tiếp tục quản lý và{' '}
                <span className="text-cyan-300">
                  đánh giá bài thi nói với AI
                </span>
              </p>
              <p className="relative mt-4 hidden max-w-md text-sm leading-7 text-blue-100 sm:block">
                Nền tảng hỗ trợ nhà trường tổ chức, chấm điểm và quản lý bài
                thi nói tiếng Anh nhanh chóng, công bằng và minh bạch.
              </p>
            </div>

            <ProductPreview />
          </div>

          <div className="mx-auto flex w-full max-w-115 flex-col gap-5 lg:max-w-130">
            <form
              className="rounded-[22px] bg-white p-5 text-slate-950 shadow-2xl shadow-blue-950/40 ring-1 ring-white/50 sm:p-8 lg:rounded-[18px] lg:p-10"
              onSubmit={handleSubmit}
            >
              <div className="hidden text-center sm:block">
                <h2 className="text-3xl font-black text-blue-950">Đăng nhập</h2>
                <p className="mt-3 text-sm text-slate-500">
                  Chào mừng bạn quay trở lại{' '}
                  <span className="font-bold text-violet-600">vox</span>
                </p>
              </div>

              <div className="mt-0 grid gap-4 sm:mt-8">
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
                      className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                      className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      disabled={loginMutation.isPending}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Nhập mật khẩu"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-700"
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
                <a
                  className="font-bold text-violet-600 hover:text-violet-700"
                  href="#forgot-password"
                >
                  Quên mật khẩu?
                </a>
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
                className="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r from-blue-500 to-violet-600 text-base font-bold text-white shadow-xl shadow-violet-500/25 transition hover:-translate-y-0.5 hover:shadow-violet-500/35 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
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
                className="inline-flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
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

            <div className="flex items-start gap-3 px-8 text-blue-100 sm:px-16 lg:px-20">
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
      </section>
      <SiteFooter />
    </main>
  )
}
