import {
  ArrowRight,
  BarChart3,
  Brain,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import studentSpeakingImage from '@/assets/images/student-speaking.png'
import { SiteFooter } from '@/shared/ui/SiteFooter'
import { validateMockLogin } from '../data/mockAuth'

const waveformBars = [
  18, 34, 22, 46, 28, 58, 35, 76, 42, 90, 64, 116, 78, 132, 86, 102, 70, 88,
  54, 72, 44, 58, 32, 46, 24, 36,
]

const criteriaScores = [
  { label: 'Phát âm', score: 90, width: '90%' },
  { label: 'Độ trôi chảy', score: 85, width: '85%' },
  { label: 'Ngữ pháp', score: 82, width: '82%' },
  { label: 'Từ vựng', score: 88, width: '88%' },
  { label: 'Nội dung', score: 83, width: '83%' },
  { label: 'Tương tác', score: 84, width: '84%' },
]

const trustItems = [
  { icon: Brain, label: 'Chấm điểm chính xác' },
  { icon: FileText, label: 'Phân tích đa chiều' },
  { icon: BarChart3, label: 'Báo cáo trực quan, dễ hiểu' },
  { icon: ShieldCheck, label: 'Bảo mật tuyệt đối, an toàn dữ liệu' },
]

type LoginMessage = {
  tone: 'error' | 'info' | 'success'
  text: string
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
    <div className="mt-10 hidden lg:grid lg:grid-cols-[176px_minmax(0,1fr)] lg:items-end lg:gap-6">
      <div className="grid gap-5">
        <div className="relative mx-auto size-32">
          <img
            alt=""
            className="size-32 rounded-full border-4 border-white object-cover shadow-2xl shadow-blue-950/50"
            src={studentSpeakingImage}
          />
          <span className="absolute -right-2 bottom-5 inline-flex size-10 items-center justify-center rounded-full bg-violet-600 text-white ring-4 ring-white/80">
            <Mic aria-hidden="true" className="size-5" />
          </span>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl shadow-blue-950/30 backdrop-blur">
          <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-white/10 text-cyan-200">
            <Sparkles aria-hidden="true" className="size-5" />
          </div>
          <p className="text-base font-bold leading-6 text-white">
            AI chấm điểm tự động
          </p>
          <p className="mt-2 text-xs leading-5 text-blue-100">
            Phân tích toàn diện 6 tiêu chí giúp đánh giá chính xác và công bằng.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 text-slate-950 shadow-2xl shadow-blue-950/40 ring-1 ring-white/40">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm font-bold">Bài thi nói</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600">
            Đã hoàn thành
          </span>
        </div>
        <div className="mb-5 flex items-center gap-4 rounded-xl bg-slate-50 p-3">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-blue-600 text-white">
            <Play aria-hidden="true" className="ml-0.5 size-5 fill-current" />
          </span>
          <Waveform className="h-9 flex-1 scale-y-50 overflow-hidden" />
          <div className="grid gap-1 text-[10px] text-slate-400">
            <span>00:00</span>
            <span>01:29</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-xl bg-white p-4 shadow-lg shadow-slate-200/70 ring-1 ring-slate-100">
            <p className="text-xs font-bold text-slate-700">Điểm tổng</p>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-5xl font-black text-blue-950">85</span>
              <span className="pb-1 text-sm font-semibold text-slate-500">/100</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-slate-100">
              <div className="h-full w-[78%] rounded-full bg-emerald-400" />
            </div>
            <p className="mt-3 text-right text-sm font-semibold text-slate-600">Tốt</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-lg shadow-slate-200/70 ring-1 ring-slate-100">
            <p className="text-xs font-bold text-slate-700">Kết quả theo tiêu chí</p>
            <div className="mt-4 grid gap-2">
              {criteriaScores.map((item) => (
                <div className="grid grid-cols-[72px_1fr_24px] items-center gap-2" key={item.label}>
                  <span className="text-[11px] font-medium text-slate-600">{item.label}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-linear-to-r from-blue-500 to-violet-500"
                      style={{ width: item.width }}
                    />
                  </span>
                  <span className="text-right text-[11px] font-bold text-blue-950">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-5 lg:col-span-2">
        {trustItems.map(({ icon: Icon, label }) => (
          <div className="flex items-center gap-3 text-blue-100" key={label}>
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200 ring-1 ring-white/15">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="text-xs font-medium leading-5">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberLogin, setRememberLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<LoginMessage | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim() || !password) {
      setMessage({
        tone: 'error',
        text: 'Vui lòng nhập email và mật khẩu.',
      })
      return
    }

    if (!validateMockLogin({ email, password })) {
      setMessage({
        tone: 'error',
        text: 'Tài khoản mock không đúng. Dùng demo@vox.edu.vn / Vox@123456 để thử.',
      })
      return
    }

    setMessage({
      tone: 'success',
      text: rememberLogin
        ? 'Đăng nhập mock thành công. Tùy chọn ghi nhớ đã được bật.'
        : 'Đăng nhập mock thành công.',
    })
  }

  function handleGoogleLogin() {
    setMessage({
      tone: 'info',
      text: 'Google login sẽ được kết nối sau khi BE sẵn sàng.',
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
              alt="VOX"
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
              <span className="text-cyan-300">đánh giá bài thi nói với AI</span>
            </p>
            <p className="relative mt-4 hidden max-w-md text-sm leading-7 text-blue-100 sm:block">
              Nền tảng hỗ trợ nhà trường tổ chức, chấm điểm và quản lý bài thi nói tiếng Anh
              nhanh chóng, công bằng và minh bạch nhờ trí tuệ nhân tạo.
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
                Chào mừng bạn quay trở lại <span className="font-bold text-violet-600">VOX</span>
              </p>
            </div>

            <div className="mt-0 grid gap-4 sm:mt-8">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-blue-950">Email</span>
                <span className="relative block">
                  <Mail
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    autoComplete="email"
                    className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Nhập email của bạn"
                    type="email"
                    value={email}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-blue-950">Mật khẩu</span>
                <span className="relative block">
                  <LockKeyhole
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    autoComplete="current-password"
                    className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-700"
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

            <div className="mt-4 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <label className="inline-flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                <input
                  checked={rememberLogin}
                  className="size-4 rounded border-slate-300 accent-blue-600"
                  onChange={(event) => setRememberLogin(event.target.checked)}
                  type="checkbox"
                />
                <span className="whitespace-nowrap">Ghi nhớ đăng nhập</span>
              </label>
              <a className="shrink-0 font-bold text-violet-600 hover:text-violet-700" href="#forgot-password">
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
              className="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r from-blue-500 to-violet-600 text-base font-bold text-white shadow-xl shadow-violet-500/25 transition hover:-translate-y-0.5 hover:shadow-violet-500/35"
              type="submit"
            >
              Đăng nhập
              <ArrowRight aria-hidden="true" className="size-5" />
            </button>

            <div className="my-5 flex items-center gap-4 text-sm text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              <span>hoặc</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              className="inline-flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={handleGoogleLogin}
              type="button"
            >
              <span aria-hidden="true" className="text-lg font-black">
                <span className="text-blue-500">G</span>
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
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/30 text-white">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </span>
            <p className="text-sm leading-6">
              <span className="block font-semibold text-white">Thông tin của bạn được bảo mật tuyệt đối.</span>
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
