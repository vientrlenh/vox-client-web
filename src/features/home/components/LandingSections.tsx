import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  CirclePlay,
  Clock3,
  FolderOpen,
  GraduationCap,
  Headphones,
  Lock,
  Mail,
  Menu,
  MessageSquareText,
  Mic,
  Scale,
  School,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import schoolImage from '@/assets/images/school.png'
import studentSpeakingImage from '@/assets/images/student-speaking.png'
import studentUseLaptopImage from '@/assets/images/student-use-lap.png'
import teacherUseLaptopImage from '@/assets/images/teacher-use-lap.png'
import {
  audienceItems,
  benefitItems,
  featureItems,
  footerColumns,
  heroHighlights,
  navItems,
  problemItems,
  routeLinks,
} from '../data/landingContent'
import type { AudienceImage, IconName } from '../data/landingContent'

const iconMap: Record<IconName, LucideIcon> = {
  barChart: BarChart3,
  book: BookOpen,
  brain: Brain,
  calendar: CalendarDays,
  check: CheckCircle2,
  clock: Clock3,
  folder: FolderOpen,
  graduation: GraduationCap,
  headphones: Headphones,
  lock: Lock,
  message: MessageSquareText,
  mic: Mic,
  scale: Scale,
  school: School,
  shield: ShieldCheck,
  sparkles: Sparkles,
  users: Users,
}

const audienceImages: Record<AudienceImage, string> = {
  school: schoolImage,
  student: studentUseLaptopImage,
  teacher: teacherUseLaptopImage,
}

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

type IconBadgeProps = {
  className?: string
  icon: IconName
}

function IconBadge({ className = '', icon }: IconBadgeProps) {
  const Icon = iconMap[icon]

  return (
    <span
      className={`inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 ${className}`}
    >
      <Icon aria-hidden="true" className="size-5 sm:size-7" strokeWidth={2} />
    </span>
  )
}

function Container({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
}

function Logo({ className = 'h-11 w-32' }: { className?: string }) {
  return (
    <Link
      aria-label="vox"
      className={`inline-flex shrink-0 items-center overflow-hidden ${className}`}
      to="/"
    >
      <img
        alt="vox"
        className="h-full w-full object-cover object-center"
        src={logoImage}
      />
    </Link>
  )
}

function SmartLink({
  children,
  className,
  href,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  href: string
  onClick?: () => void
}) {
  if (href.startsWith('/')) {
    return (
      <Link className={className} onClick={onClick} to={href}>
        {children}
      </Link>
    )
  }

  return (
    <a className={className} href={href} onClick={onClick}>
      {children}
    </a>
  )
}

export function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="relative z-30">
      <Container className="py-4 sm:py-5">
        <nav className="flex items-center justify-between gap-4">
          <Logo />

          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <SmartLink
                className="text-sm font-semibold text-white/85 transition hover:text-white"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </SmartLink>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              className="min-h-11 rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              to={routeLinks.login}
            >
              Đăng nhập
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30"
              to={routeLinks.register}
            >
              Dùng thử miễn phí
            </Link>
          </div>

          <button
            aria-expanded={isMenuOpen}
            aria-label="Mở menu"
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl text-white md:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            {isMenuOpen ? (
              <X aria-hidden="true" className="size-8" />
            ) : (
              <Menu aria-hidden="true" className="size-8" />
            )}
          </button>
        </nav>

        {isMenuOpen ? (
          <div className="mt-4 rounded-3xl border border-white/15 bg-slate-950/95 p-4 shadow-2xl shadow-slate-950/40 md:hidden">
            <div className="grid gap-2">
              {navItems.map((item) => (
                <SmartLink
                  className="min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                  href={item.href}
                  key={item.label}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </SmartLink>
              ))}
            </div>
            <div className="mt-4 grid gap-3 border-t border-white/10 pt-4">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white"
                onClick={() => setIsMenuOpen(false)}
                to={routeLinks.login}
              >
                Đăng nhập
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-indigo-700"
                onClick={() => setIsMenuOpen(false)}
                to={routeLinks.register}
              >
                Dùng thử miễn phí
              </Link>
            </div>
          </div>
        ) : null}
      </Container>
    </header>
  )
}

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

export function ProblemSection() {
  return (
    <section className="bg-white py-7 sm:py-16">
      <Container>
        <SectionHeading title="Vấn đề trong thi nói truyền thống" />
        <div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
          {problemItems.map((item) => (
            <article
              className="flex w-36 shrink-0 snap-start items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm shadow-slate-200/70 sm:w-auto sm:flex-col sm:gap-0 sm:rounded-3xl sm:p-5 sm:text-center"
              key={item.label}
            >
              <IconBadge className="size-11 rounded-2xl sm:size-14" icon={item.icon} />
              <p className="text-xs font-semibold leading-5 text-slate-950 sm:mt-4 sm:text-sm sm:leading-6">
                {item.label}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function FeatureSection() {
  return (
    <section className="bg-slate-50 py-7 sm:py-16" id="features">
      <Container>
        <SectionHeading
          title={
            <>
              Tính năng nổi bật của{' '}
              <span className="text-indigo-600">VOX</span>
            </>
          }
        />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 xl:grid-cols-6">
          {featureItems.map((item, index) => (
            <article
              className="flex min-h-31 min-w-0 gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl sm:block sm:min-h-0 sm:rounded-3xl sm:p-6"
              key={item.title}
            >
              <IconBadge
                className={
                  index % 3 === 1
                    ? 'size-11 rounded-2xl bg-cyan-50 text-cyan-600 ring-cyan-100 sm:size-14'
                    : index % 3 === 2
                      ? 'size-11 rounded-2xl bg-emerald-50 text-emerald-600 ring-emerald-100 sm:size-14'
                      : 'size-11 rounded-2xl sm:size-14'
                }
                icon={item.icon}
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-5 text-slate-950 sm:mt-5 sm:text-base">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600 sm:mt-3 sm:text-sm sm:leading-6">
                  <span className="sm:hidden">
                    {item.mobileDescription ?? item.description}
                  </span>
                  <span className="hidden sm:inline">{item.description}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function AudienceSection() {
  return (
    <section className="bg-white py-7 sm:py-16" id="audiences">
      <Container>
        <SectionHeading title="Dành cho ai?" />
        <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:grid-cols-1 sm:gap-5 lg:grid-cols-3">
          {audienceItems.map((item, index) => (
            <article
              className={`relative min-h-41 min-w-0 overflow-hidden rounded-2xl border border-slate-200 p-3 shadow-lg shadow-slate-200/70 sm:rounded-3xl sm:p-5 ${
                index === 0
                  ? 'bg-indigo-50'
                  : index === 1
                    ? 'bg-sky-50'
                    : 'bg-emerald-50'
              }`}
              key={item.title}
            >
              <div className="grid gap-3 sm:min-h-65 sm:gap-4 sm:grid-cols-[1fr_150px]">
                <div className="relative z-10 max-w-[72%] sm:max-w-none">
                  <div className="mb-2 flex items-center gap-1.5 sm:mb-4 sm:gap-3">
                    <IconBadge
                      className="size-7 rounded-xl bg-white/80 sm:size-11 sm:rounded-2xl"
                      icon={
                        item.image === 'school'
                          ? 'school'
                          : item.image === 'teacher'
                            ? 'users'
                            : 'graduation'
                      }
                    />
                    <h3 className="text-xs font-bold leading-4 text-slate-950 sm:text-lg">
                      {item.title}
                    </h3>
                  </div>
                  <ul className="grid gap-1 text-[11px] font-medium leading-4 text-slate-800 sm:hidden">
                    {(item.mobileBullets ?? item.bullets.slice(0, 2)).map((bullet) => (
                      <li className="flex gap-1.5" key={bullet}>
                        <span
                          className={`mt-1.5 size-1 shrink-0 rounded-full ${
                            index === 0
                              ? 'bg-indigo-500'
                              : index === 1
                                ? 'bg-sky-500'
                                : 'bg-emerald-500'
                          }`}
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="hidden gap-2 text-sm leading-6 text-slate-700 sm:grid">
                    {item.bullets.map((bullet) => (
                      <li className="flex gap-2" key={bullet}>
                        <span
                          className={`mt-2 size-1.5 shrink-0 rounded-full ${
                            index === 0
                              ? 'bg-indigo-500'
                              : index === 1
                                ? 'bg-sky-500'
                                : 'bg-emerald-500'
                          }`}
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-[58%] w-[58%] sm:hidden">
                  <img
                    alt={`${item.title} sử dụng vox`}
                    className={`h-full w-full ${
                      item.image === 'school'
                        ? 'object-cover object-right'
                        : 'object-contain object-bottom'
                    }`}
                    src={audienceImages[item.image]}
                  />
                </div>
                <div className="hidden items-end justify-end sm:flex">
                  <img
                    alt={`${item.title} sử dụng vox`}
                    className="max-h-48 w-full max-w-44 object-contain sm:max-h-56"
                    src={audienceImages[item.image]}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function BenefitSection() {
  return (
    <section className="bg-white py-7 sm:py-16" id="benefits">
      <Container>
        <SectionHeading
          title={
            <>
              Vì sao chọn <span className="text-indigo-600">VOX?</span>
            </>
          }
        />
        <div className="mt-5 grid grid-cols-4 gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {benefitItems.map((item) => (
            <article
              className="flex min-h-33 min-w-0 flex-col items-center gap-2 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 text-center shadow-sm shadow-slate-200/70 sm:min-h-0 sm:flex-row sm:items-start sm:gap-4 sm:rounded-3xl sm:border-0 sm:p-4 sm:text-left sm:shadow-none"
              key={item.title}
            >
              <IconBadge className="size-10 rounded-2xl sm:size-14" icon={item.icon} />
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold leading-4 text-indigo-900 sm:text-base sm:leading-normal">
                  {item.title}
                </h3>
                <p className="mt-1 max-h-12 overflow-hidden text-[10px] leading-4 text-slate-600 sm:mt-2 sm:max-h-none sm:text-sm sm:leading-6">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function CTASection() {
  return (
    <section className="bg-white pb-0 pt-1 sm:pt-8">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-linear-to-r from-indigo-800 via-indigo-600 to-cyan-500 p-4 text-white shadow-2xl shadow-indigo-500/20 sm:rounded-3xl sm:p-8 lg:p-10">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 sm:grid-cols-1 sm:gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="max-w-2xl text-xl font-black leading-tight sm:text-4xl">
                Sẵn sàng nâng tầm kỳ thi nói của nhà trường?
              </h2>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-white/85 sm:mt-4 sm:text-base sm:leading-7">
                Tham gia cùng hàng trăm trường học đã tin tưởng sử dụng vox để
                đánh giá kỹ năng nói nhanh hơn và hiệu quả hơn.
              </p>
            </div>
            <div className="flex justify-end gap-3 sm:justify-start">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-bold text-indigo-700 shadow-xl shadow-indigo-950/10 sm:min-h-12 sm:px-7 sm:text-sm"
                to={routeLinks.register}
              >
                Dùng thử miễn phí
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                className="hidden min-h-12 items-center justify-center rounded-full border border-white/45 px-7 py-3 text-sm font-bold text-white sm:inline-flex"
                to={routeLinks.contact}
              >
                Liên hệ tư vấn
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="bg-slate-50 py-10">
      <Container>
        <div className="grid gap-8 md:grid-cols-[1.4fr_2fr_1fr]">
          <div>
            <Logo className="h-11 w-32 drop-shadow-[0_1px_2px_rgba(15,23,42,0.30)]" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">
              Nền tảng đánh giá bài thi nói tiếng Anh bằng trí tuệ nhân tạo.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-bold text-slate-950">
                  {column.title}
                </h3>
                <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a className="hover:text-indigo-600" href="#features">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-950">
              Kết nối với chúng tôi
            </h3>
            <div className="mt-4 flex gap-3">
              {[Users, CirclePlay, Mail].map((Icon, index) => (
                <a
                  aria-label={`Kênh liên hệ ${index + 1}`}
                  className="inline-flex size-10 items-center justify-center rounded-full bg-indigo-900 text-white"
                  href={routeLinks.contact}
                  key={index}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </footer>
  )
}

function SectionHeading({ title }: { title: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-xl font-black leading-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>
    </div>
  )
}
