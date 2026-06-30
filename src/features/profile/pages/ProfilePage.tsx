import { Calendar, Clock, Mail, MapPin, Phone, RefreshCw, UserRound, Users, type LucideIcon } from "lucide-react"
import { useProfileQuery } from "../api/useProfileQuery"
import { PageLoader } from "@/shared/ui/PageLoader"

function formatDate(value?: string | null) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

function formatDateTime(value?: string | null) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

function formatGender(value?: string | null) {
    if (!value) return 'OTHER'
    const normalized = value.toUpperCase()
    if (normalized === "MALE") return "Nam"
    if (normalized === "FEMALE") return "Nữ"
    return value
}

function getInitials(name?: string | null, email?: string | null) {
    const source = name?.trim() || email?.split("@")[0] || ''
    const parts = source.split(/[\s._-]+/).filter(Boolean)
    const initials = parts.slice(0, 2).map((part) => part[0]).join('')
    return initials.toUpperCase() || 'U'
}

type InfoItemProps = {
    icon: LucideIcon,
    label: string,
    value: string
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                </p>
                <p className="mt-1 wrap-break-word text-sm font-semibold text-slate-900">
                    {value}
                </p>
            </div>
        </div>
    )
}

export function ProfilePage() {
    const { data: profile, isLoading, isError, isFetching, refetch } = useProfileQuery()

    if (isLoading) {
        return <PageLoader />
    }

    if (isError || !profile) {
        return (
            <div className="mx-auto max-w-3xl">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                    <p className="text-sm font-semibold text-red-700">
                        Không tải được thông tin cá nhân.
                    </p>
                    <button
                        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                        onClick={() => refetch()}
                        type="button"
                    >
                        <RefreshCw aria-hidden="true" className="size-4" />
                        Thử lại
                    </button>
                </div>
            </div>
        )
    }

    const displayName = profile.fullName?.trim() || profile.email

    return (
        <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    Thông tin cá nhân
                </h1>
                <button
                    aria-label="Tải lại"
                    className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    disabled={isFetching}
                    onClick={() => refetch()}
                    type="button"
                >
                    <RefreshCw
                        aria-hidden="true"
                        className={`size-5 ${isFetching ? 'animate-spin' : ''}`}
                    />
                </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-5 bg-linear-to-r from-violet-600 to-indigo-500 px-6 py-7 text-white">
                    {profile.avatarUrl ? (
                        <img
                            alt={displayName}
                            className="size-20 rounded-full border-4 border-white/30 object-cover"
                            src={profile.avatarUrl}
                        />
                    ) : (
                        <span className="inline-flex size-20 items-center justify-center rounded-full border-4 border-white/30 bg-white/15 text-2xl font-black">
                            {getInitials(profile.fullName, profile.email)}
                        </span>
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-2xl font-black">{displayName}</p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-indigo-100">
                            <Mail aria-hidden="true" className="size-4 shrink-0" />
                            <span className="truncate">{profile.email}</span>
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 p-6 sm:grid-cols-2">
                    <InfoItem
                        icon={UserRound}
                        label="Họ và tên"
                        value={profile.fullName || '—'}
                    />
                    <InfoItem icon={Mail} label="Email" value={profile.email} />
                    <InfoItem
                        icon={Phone}
                        label="Số điện thoại"
                        value={profile.phone || '—'}
                    />
                    <InfoItem
                        icon={Users}
                        label="Giới tính"
                        value={formatGender(profile.gender)}
                    />
                    <InfoItem
                        icon={Calendar}
                        label="Ngày sinh"
                        value={formatDate(profile.dateOfBirth)}
                    />
                    <InfoItem
                        icon={MapPin}
                        label="Địa chỉ"
                        value={profile.address || '—'}
                    />
                    <InfoItem
                        icon={Clock}
                        label="Ngày đăng ký"
                        value={formatDateTime(profile.createdAt)}
                    />
                    <InfoItem
                        icon={Clock}
                        label="Cập nhật gần nhất"
                        value={formatDateTime(profile.updatedAt)}
                    />
                </div>
            </div>
        </div>
    )
}