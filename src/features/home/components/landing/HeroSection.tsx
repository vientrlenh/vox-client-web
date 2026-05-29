import { ArrowRight, CirclePlay, Sparkles } from 'lucide-react'
import studentSpeakingImage from '@/assets/images/student-speaking.png'
import { heroHighlights } from '../../data/landingContent'
import { LandingHeader } from './LandingHeader'
import { iconMap } from './landingIcons'
import { Container, Logo } from './landingShared'

const criteriaScores = [
  { label: 'Phát âm', score: 90, width: '82%' },
  { label: 'Độ trôi chảy', score: 85, width: '72%' },
  { label: 'Ngữ pháp', score: 82, width: '68%' },
  { label: 'Từ vựng', score: 88, width: '78%' },
  { label: 'Nội dung', score: 83, width: '70%' },
  { label: 'Tương tác', score: 84, width: '73%' },
]

const waveformBars = [
  22, 34, 18, 42, 28, 50, 26, 38, 58, 24, 46, 31, 54, 20, 40, 62, 28, 48,
  35, 56, 24, 44,
]

export function HeroSection() {
  return (
    <section
      className="relative isolate overflow-hidden rounded-b-[28px] bg-slate-950 pb-6 pt-1 text-white sm:rounded-none sm:pb-20 sm:pt-2 lg:min-h-180"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(139, 92, 246, 0.42), transparent 32%), radial-gradient(circle at right, rgba(6, 182, 212, 0.24), transparent 30%), #0F172A',
      }}
    >
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-indigo-950/60 to-transparent" />
      <div className="absolute -left-24 bottom-20 hidden h-64 w-170 rounded-full border border-cyan-300/10 opacity-60 blur-sm lg:block" />
      <div className="absolute bottom-12 left-0 right-0 hidden h-px bg-cyan-300/20 shadow-[0_0_80px_24px_rgba(6,182,212,0.20)] lg:block" />
      <div className="pointer-events-none absolute right-2 top-32 flex h-24 w-44 items-center justify-center gap-1 opacity-50 sm:hidden">
        {waveformBars.slice(0, 18).map((height, index) => (
          <span
            className="w-1 rounded-full bg-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,0.65)]"
            key={`${height}-${index}`}
            style={{ height: Math.max(10, height * 1.35) }}
          />
        ))}
      </div>

      <LandingHeader />

      <Container className="relative grid items-center gap-6 pt-3 sm:gap-10 sm:pt-8 md:grid-cols-[0.95fr_1.05fr] md:pt-14 lg:gap-14">
        <div className="min-w-0 max-w-2xl text-left">
          <div className="mb-7 hidden sm:block">
            <Logo className="h-24 w-72 sm:h-28 sm:w-80" />
          </div>

          <h1 className="max-w-xl text-[2rem] font-black leading-[1.08] sm:text-5xl lg:text-6xl">
            Đánh giá kỹ năng nói{' '}
            <span className="block bg-linear-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
              thông minh hơn
            </span>
          </h1>
          <p className="mt-4 max-w-92 text-sm leading-6 text-slate-200 sm:mt-6 sm:max-w-xl sm:text-lg sm:leading-8">
            Nền tảng hỗ trợ nhà trường tổ chức, chấm điểm và quản lý bài thi
            nói tiếng Anh nhanh hơn, công bằng hơn và minh bạch hơn với trí tuệ
            nhân tạo.
          </p>

          <div className="mt-6 flex min-w-0 flex-row gap-3 sm:mt-8 sm:flex-wrap">
            <a
              className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/30 transition hover:-translate-y-0.5 sm:flex-none sm:rounded-full sm:px-7"
              href="#features"
            >
              Khám phá ngay
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            <a
              className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15 sm:flex-none sm:rounded-full sm:px-7"
              href="#features"
            >
              Xem tính năng
              <CirclePlay aria-hidden="true" className="size-5" />
            </a>
          </div>

          <div className="mt-10 hidden grid-cols-2 gap-4 sm:grid sm:grid-cols-4">
            {heroHighlights.map((item) => {
              const Icon = iconMap[item.icon]

              return (
                <div className="min-w-0" key={item.label}>
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/10">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold leading-5 text-white/90">
                    {item.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <HeroMockup />
      </Container>
    </section>
  )
}

function HeroMockup() {
  return (
    <div className="relative mx-auto mt-4 w-full min-w-0 max-w-155 sm:mt-0">
      <div className="absolute -right-1 -top-10 z-20 size-24 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-2xl shadow-indigo-950/30 sm:top-4 sm:size-44 sm:border-4 lg:-right-7 lg:-top-8 lg:size-48">
        <img
          alt="Học sinh đang làm bài thi nói với tai nghe"
          className="h-full w-full object-cover"
          src={studentSpeakingImage}
        />
      </div>

      <div className="relative z-10 overflow-hidden rounded-3xl border border-white/30 bg-white/95 p-3 text-slate-950 shadow-2xl shadow-indigo-950/40 sm:overflow-visible sm:rounded-4xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-bold sm:text-lg">Bài thi nói</p>
            <p className="hidden text-sm text-slate-500 sm:block">Speaking assessment</p>
          </div>
          <span className="mr-20 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 sm:mr-0 sm:px-3 sm:text-xs">
            Đã hoàn thành
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg shadow-slate-200/70 sm:mt-5 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white sm:size-10">
              <CirclePlay aria-hidden="true" className="size-4 sm:size-5" />
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              {waveformBars.map((height, index) => (
                <span
                  className="w-0.5 shrink-0 origin-center scale-y-75 rounded-full bg-blue-300 sm:w-1 sm:scale-y-100"
                  key={`${height}-${index}`}
                  style={{ height }}
                />
              ))}
            </div>
            <div className="hidden text-right text-xs font-medium text-slate-400 sm:block">
              <p>00:00</p>
              <p className="mt-5">01:25</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg shadow-slate-200/70 sm:p-5">
            <p className="text-xs font-bold text-slate-700 sm:text-sm">Điểm tổng</p>
            <div className="mt-3 flex items-end gap-1.5 sm:mt-5 sm:gap-2">
              <span className="text-4xl font-black text-indigo-950 sm:text-5xl">85</span>
              <span className="pb-1 text-xs font-bold text-slate-600 sm:pb-2 sm:text-sm">/100</span>
              <span className="ml-auto hidden pb-2 text-sm font-semibold text-slate-600 sm:inline">
                Tốt
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100 sm:mt-5">
              <div className="h-full w-[78%] rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg shadow-slate-200/70 sm:p-5">
            <p className="text-xs font-bold text-slate-700 sm:text-sm">
              Kết quả theo tiêu chí
            </p>
            <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
              {criteriaScores.map((item) => (
                <div className="grid min-w-0 grid-cols-[54px_1fr_22px] items-center gap-1.5 sm:grid-cols-[86px_1fr_28px] sm:gap-3" key={item.label}>
                  <span className="truncate text-[10px] font-medium text-slate-600 sm:text-xs">
                    {item.label}
                  </span>
                  <span className="h-2 rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-indigo-500"
                      style={{ width: item.width }}
                    />
                  </span>
                  <span className="text-right text-[10px] font-bold text-slate-700 sm:text-xs">
                    {item.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg shadow-slate-200/70 sm:mt-4 sm:p-5">
          <div className="flex items-start gap-2 sm:gap-3">
            <Sparkles className="mt-1 size-4 shrink-0 text-indigo-500 sm:size-5" />
            <div>
              <p className="text-xs font-bold text-slate-700 sm:text-sm">Nhận xét từ AI</p>
              <p className="mt-1 text-xs leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">
                Phát âm rõ ràng, ngữ điệu tự nhiên. Cần chú ý thêm về cấu
                trúc ngữ pháp phức và khả năng phát triển ý.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
