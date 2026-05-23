import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { navItems, routeLinks } from '../../data/landingContent'
import { Container, Logo, SmartLink } from './landingShared'

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
