import { CirclePlay, Mail, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import footerLogoImage from '@/assets/images/logo-v2.png'

const routeLinks = {
  about: '/about',
  contact: '/contact',
  features: '/#features',
  pricing: '/pricing',
  register: '/register',
} as const

const footerColumns = [
  {
    links: [
      { href: routeLinks.features, label: 'Tính năng' },
      { href: routeLinks.pricing, label: 'Bảng giá' },
      { href: routeLinks.register, label: 'Dùng thử' },
    ],
    title: 'Sản phẩm',
  },
  {
    links: [
      { href: routeLinks.contact, label: 'Trung tâm hỗ trợ' },
      { href: routeLinks.contact, label: 'Hướng dẫn sử dụng' },
      { href: routeLinks.contact, label: 'Liên hệ' },
    ],
    title: 'Hỗ trợ',
  },
  {
    links: [
      { href: routeLinks.about, label: 'Về chúng tôi' },
      { href: routeLinks.about, label: 'Chính sách bảo mật' },
      { href: routeLinks.about, label: 'Điều khoản sử dụng' },
    ],
    title: 'Công ty',
  },
]

const socialLinks: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Users, label: 'Kênh cộng đồng' },
  { icon: CirclePlay, label: 'Kênh video' },
  { icon: Mail, label: 'Email liên hệ' },
]

function FooterContainer({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
}

export function SiteFooter() {
  return (
    <footer className="bg-slate-50 py-10">
      <FooterContainer>
        <div className="grid gap-8 md:grid-cols-[1.4fr_2fr_1fr]">
          <div>
            <Link
              aria-label="vox"
              className="inline-flex h-11 w-32 shrink-0 items-center overflow-hidden drop-shadow-[0_1px_2px_rgba(15,23,42,0.30)]"
              to="/"
            >
              <img
                alt="vox"
                className="h-full w-full object-cover object-center"
                src={footerLogoImage}
              />
            </Link>
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
                    <li key={link.label}>
                      <a className="hover:text-indigo-600" href={link.href}>
                        {link.label}
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
              {socialLinks.map(({ icon: Icon, label }) => (
                <a
                  aria-label={label}
                  className="inline-flex size-10 items-center justify-center rounded-full bg-indigo-900 text-white"
                  href={routeLinks.contact}
                  key={label}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </FooterContainer>
    </footer>
  )
}
