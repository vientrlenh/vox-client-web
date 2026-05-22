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
      <Icon aria-hidden="true" className="size-7" strokeWidth={2} />
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
      <Container className="py-5">
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
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white md:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            {isMenuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
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
      className="relative isolate overflow-hidden bg-slate-950 pb-16 pt-2 text-white sm:pb-20 lg:min-h-[720px]"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(139, 92, 246, 0.42), transparent 32%), radial-gradient(circle at right, rgba(6, 182, 212, 0.24), transparent 30%), #0F172A',
      }}
    >
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-indigo-950/60 to-transparent" />
      <div className="absolute -left-24 bottom-20 hidden h-64 w-[680px] rounded-full border border-cyan-300/10 opacity-60 blur-sm lg:block" />
      <div className="absolute bottom-12 left-0 right-0 hidden h-px bg-cyan-300/20 shadow-[0_0_80px_24px_rgba(6,182,212,0.20)] lg:block" />

      <LandingHeader />

      <Container className="relative grid items-center gap-10 pt-8 md:grid-cols-[0.95fr_1.05fr] md:pt-14 lg:gap-14">
        <div className="max-w-2xl text-left">
          <div className="mb-7 hidden sm:block">
            <Logo className="h-24 w-72 sm:h-28 sm:w-80" />
          </div>

          <h1 className="max-w-xl text-4xl font-black leading-[1.08] sm:text-5xl lg:text-6xl">
            Đánh giá kỹ năng nói{' '}
            <span className="block bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
              thông minh hơn
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
            Nền tảng hỗ trợ nhà trường tổ chức, chấm điểm và quản lý bài thi
            nói tiếng Anh nhanh hơn, công bằng hơn và minh bạch hơn với trí tuệ
            nhân tạo.
          </p>

          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <a
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-7 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/30 transition hover:-translate-y-0.5"
              href="#features"
            >
              Khám phá ngay
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            <a
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              href="#features"
            >
              Xem tính năng
              <CirclePlay aria-hidden="true" className="size-5" />
            </a>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -right-1 top-4 z-20 hidden size-44 overflow-hidden rounded-full border-4 border-white bg-white shadow-2xl shadow-indigo-950/30 sm:block lg:-right-7 lg:-top-8 lg:size-48">
        <img
          alt="Học sinh đang làm bài thi nói với tai nghe"
          className="h-full w-full object-cover"
          src={studentSpeakingImage}
        />
      </div>

      <div className="relative z-10 rounded-[2rem] border border-white/30 bg-white/95 p-4 text-slate-950 shadow-2xl shadow-indigo-950/40 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold">Bài thi nói</p>
            <p className="text-sm text-slate-500">Speaking assessment</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            Đã hoàn thành
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-200/70">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
              <CirclePlay aria-hidden="true" className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              {waveformBars.map((height, index) => (
                <span
                  className="w-1 shrink-0 rounded-full bg-blue-300"
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

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/70">
            <p className="text-sm font-bold text-slate-700">Điểm tổng</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-5xl font-black text-indigo-950">85</span>
              <span className="pb-2 text-sm font-bold text-slate-600">/100</span>
              <span className="ml-auto pb-2 text-sm font-semibold text-slate-600">
                Tốt
              </span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-slate-100">
              <div className="h-full w-[78%] rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/70">
            <p className="text-sm font-bold text-slate-700">
              Kết quả theo tiêu chí
            </p>
            <div className="mt-4 grid gap-3">
              {criteriaScores.map((item) => (
                <div className="grid grid-cols-[86px_1fr_28px] items-center gap-3" key={item.label}>
                  <span className="text-xs font-medium text-slate-600">
                    {item.label}
                  </span>
                  <span className="h-2 rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-indigo-500"
                      style={{ width: item.width }}
                    />
                  </span>
                  <span className="text-right text-xs font-bold text-slate-700">
                    {item.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/70">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 size-5 shrink-0 text-indigo-500" />
            <div>
              <p className="text-sm font-bold text-slate-700">Nhận xét từ AI</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Phát âm rõ ràng, ngữ điệu tự nhiên. Cần chú ý thêm về cấu
                trúc ngữ pháp phức và khả năng phát triển ý.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-20 mt-4 flex items-center gap-3 rounded-2xl bg-indigo-50 p-3 sm:hidden">
          <img
            alt="Học sinh đang nói tiếng Anh"
            className="size-14 rounded-full object-cover"
            src={studentSpeakingImage}
          />
          <div>
            <p className="text-sm font-bold text-slate-900">Bài nói đã ghi âm</p>
            <p className="text-xs text-slate-500">Sẵn sàng để xem nhận xét</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProblemSection() {
  return (
    <section className="bg-white py-14 sm:py-16">
      <Container>
        <SectionHeading title="Vấn đề trong thi nói truyền thống" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {problemItems.map((item) => (
            <article
              className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm shadow-slate-200/70"
              key={item.label}
            >
              <IconBadge icon={item.icon} />
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-950">
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
    <section className="bg-slate-50 py-14 sm:py-16" id="features">
      <Container>
        <SectionHeading
          title={
            <>
              Tính năng nổi bật của{' '}
              <span className="text-indigo-600">VOX</span>
            </>
          }
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {featureItems.map((item, index) => (
            <article
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl"
              key={item.title}
            >
              <IconBadge
                className={
                  index % 3 === 1
                    ? 'bg-cyan-50 text-cyan-600 ring-cyan-100'
                    : index % 3 === 2
                      ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                      : ''
                }
                icon={item.icon}
              />
              <h3 className="mt-5 text-base font-bold text-slate-950">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function AudienceSection() {
  return (
    <section className="bg-white py-14 sm:py-16" id="audiences">
      <Container>
        <SectionHeading title="Dành cho ai?" />
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {audienceItems.map((item, index) => (
            <article
              className={`overflow-hidden rounded-3xl border border-slate-200 p-5 shadow-lg shadow-slate-200/70 ${
                index === 0
                  ? 'bg-indigo-50'
                  : index === 1
                    ? 'bg-sky-50'
                    : 'bg-emerald-50'
              }`}
              key={item.title}
            >
              <div className="grid min-h-[260px] gap-4 sm:grid-cols-[1fr_150px]">
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-3">
                    <IconBadge
                      className="size-11 rounded-2xl bg-white/80"
                      icon={
                        item.image === 'school'
                          ? 'school'
                          : item.image === 'teacher'
                            ? 'users'
                            : 'graduation'
                      }
                    />
                    <h3 className="text-lg font-bold text-slate-950">
                      {item.title}
                    </h3>
                  </div>
                  <ul className="grid gap-2 text-sm leading-6 text-slate-700">
                    {item.bullets.map((bullet) => (
                      <li className="flex gap-2" key={bullet}>
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-500" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-end justify-end">
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
    <section className="bg-white py-14 sm:py-16" id="benefits">
      <Container>
        <SectionHeading
          title={
            <>
              Vì sao chọn <span className="text-indigo-600">VOX?</span>
            </>
          }
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefitItems.map((item) => (
            <article className="flex gap-4 rounded-3xl bg-white p-4" key={item.title}>
              <IconBadge icon={item.icon} />
              <div>
                <h3 className="text-base font-bold text-indigo-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
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
    <section className="bg-white pb-0 pt-6 sm:pt-8">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-800 via-indigo-600 to-cyan-500 p-6 text-white shadow-2xl shadow-indigo-500/20 sm:p-8 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
                Sẵn sàng nâng tầm kỳ thi nói của nhà trường?
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                Tham gia cùng hàng trăm trường học đã tin tưởng sử dụng vox để
                đánh giá kỹ năng nói nhanh hơn và hiệu quả hơn.
              </p>
            </div>
            <div className="grid gap-3 sm:flex">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-bold text-indigo-700 shadow-xl shadow-indigo-950/10"
                to={routeLinks.register}
              >
                Dùng thử miễn phí
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/45 px-7 py-3 text-sm font-bold text-white"
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
      <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>
    </div>
  )
}
