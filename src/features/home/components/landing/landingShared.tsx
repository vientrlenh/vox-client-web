import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import logoImage from '@/assets/images/logo.png'
import type { IconName } from '../../data/landingContent'
import { iconMap } from './landingIcons'

type IconBadgeProps = {
  className?: string
  icon: IconName
}

export function IconBadge({ className = '', icon }: IconBadgeProps) {
  const Icon = iconMap[icon]

  return (
    <span
      className={`inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 ${className}`}
    >
      <Icon aria-hidden="true" className="size-5 sm:size-7" strokeWidth={2} />
    </span>
  )
}

export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
}

export function Logo({
  className = 'h-11 w-32',
  src = logoImage,
}: {
  className?: string
  src?: string
}) {
  return (
    <Link
      aria-label="vox"
      className={`inline-flex shrink-0 items-center overflow-hidden ${className}`}
      to="/"
    >
      <img
        alt="vox"
        className="h-full w-full object-cover object-center"
        src={src}
      />
    </Link>
  )
}

export function SmartLink({
  children,
  className,
  href,
  onClick,
}: {
  children: ReactNode
  className?: string
  href: string
  onClick?: () => void
}) {
  if (href.startsWith('#')) {
    const handleAnchorClick = (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      document.getElementById(href.slice(1))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      onClick?.()
    }

    return (
      <a className={className} href={href} onClick={handleAnchorClick}>
        {children}
      </a>
    )
  }

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

export function SectionHeading({ title }: { title: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-xl font-black leading-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>
    </div>
  )
}
