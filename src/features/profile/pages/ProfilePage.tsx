import { useState } from "react"
import { Calendar, Clock, Mail, MapPin, Pencil, Phone, RefreshCw, UserRound, Users, X, type LucideIcon } from "lucide-react"
import { useAppSelector } from "@/app/store/hooks"
import { AvatarUploadField } from "@/shared/ui/AvatarUploadField"
import { PageLoader } from "@/shared/ui/PageLoader"
import { useFeedbackToast } from "@/shared/ui/useFeedbackToast"
import type { Profile } from "../api/useProfileQuery"
import { useProfileQuery } from "../api/useProfileQuery"
import { useUpdateProfileMutation, type UpdateProfileInput } from "../api/useUpdateProfileMutation"

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

function getErrorMessage(error: unknown) {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return 'Không lưu được thông tin cá nhân. Vui lòng thử lại.'
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

const fieldClassName =
    'h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50'

type FormState = {
    address: string
    avatarUrl: string | null
    dateOfBirth: string
    fullName: string
    phone: string
}

function toFormState(profile: Profile): FormState {
    return {
        address: profile.address ?? '',
        avatarUrl: profile.avatarUrl ?? null,
        // API trả LocalDate.toString() = yyyy-MM-dd, đúng thứ <input type="date"> cần, nên không
        // phải đổi định dạng ở cả hai chiều.
        dateOfBirth: profile.dateOfBirth ?? '',
        fullName: profile.fullName ?? '',
        phone: profile.phone ?? '',
    }
}

/**
 * Chỉ gửi những field NGƯỜI DÙNG THỰC SỰ ĐỔI.
 *
 * Backend phân biệt "không gửi field" với "gửi null" bằng Map.containsKey: không gửi = giữ nguyên,
 * null = XOÁ. Gửi cả form mỗi lần lưu sẽ biến mọi ô đang trống thành lệnh xoá, và tệ hơn là ghi đè
 * mất thay đổi vừa được thực hiện ở nơi khác (school admin sửa hồ sơ cùng lúc).
 */
function buildChangedInput(profile: Profile, form: FormState): UpdateProfileInput {
    const initial = toFormState(profile)
    const input: UpdateProfileInput = {}

    // Họ tên và số điện thoại KHÔNG xoá được: backend ném lỗi nếu nhận chuỗi rỗng. Form đã chặn
    // trước bằng required nên ở đây chỉ cần bỏ qua giá trị trắng.
    if (form.fullName.trim() !== initial.fullName && form.fullName.trim()) {
        input.fullName = form.fullName.trim()
    }
    if (form.phone.trim() !== initial.phone && form.phone.trim()) {
        input.phone = form.phone.trim()
    }
    if (form.address.trim() !== initial.address) {
        input.address = form.address.trim() || null
    }
    if (form.dateOfBirth !== initial.dateOfBirth) {
        input.dateOfBirth = form.dateOfBirth || null
    }
    if (form.avatarUrl !== initial.avatarUrl) {
        input.avatarUrl = form.avatarUrl
    }

    return input
}

export function ProfilePage() {
    const { data: profile, isLoading, isError, isFetching, refetch } = useProfileQuery()
    const updateMutation = useUpdateProfileMutation()
    const { feedbackToast, showError, showSuccess } = useFeedbackToast()
    const user = useAppSelector((state) => state.auth.user)
    const [form, setForm] = useState<FormState | null>(null)

    // Học sinh không tự đổi ảnh đại diện -- ảnh do nhà trường đặt, vì nó là dữ liệu định danh dùng
    // lúc giám thị điểm danh. Backend cũng chặn (UpdateProfileUseCase), đây chỉ là để không bày ra
    // một nút bấm vào là báo lỗi.
    const canEditAvatar = Boolean(
        user?.roles.some((role) => role === 'SYSTEM_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'TEACHER'),
    )

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
    const isEditing = form !== null

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!profile || !form) return

        const input = buildChangedInput(profile, form)
        if (Object.keys(input).length === 0) {
            // Backend từ chối input rỗng ("Cần cung cấp ít nhất một trường"). Đóng form im lặng
            // đúng hơn là bắt người dùng đọc một thông báo lỗi cho việc họ không sửa gì.
            setForm(null)
            return
        }

        try {
            await updateMutation.mutateAsync(input)
            setForm(null)
            showSuccess('Đã cập nhật thông tin cá nhân.')
        } catch (error) {
            showError(getErrorMessage(error))
        }
    }

    return (
        <div className="mx-auto max-w-3xl">
            {feedbackToast}

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    Thông tin cá nhân
                </h1>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <button
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={updateMutation.isPending}
                            onClick={() => setForm(null)}
                            type="button"
                        >
                            <X aria-hidden="true" className="size-4" />
                            Huỷ
                        </button>
                    ) : (
                        <button
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            onClick={() => setForm(toFormState(profile))}
                            type="button"
                        >
                            <Pencil aria-hidden="true" className="size-4" />
                            Chỉnh sửa
                        </button>
                    )}
                    <button
                        aria-label="Tải lại"
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        disabled={isFetching || isEditing}
                        onClick={() => refetch()}
                        type="button"
                    >
                        <RefreshCw
                            aria-hidden="true"
                            className={`size-5 ${isFetching ? 'animate-spin' : ''}`}
                        />
                    </button>
                </div>
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

                {isEditing ? (
                    <form className="grid gap-5 p-6" onSubmit={handleSubmit}>
                        {canEditAvatar ? (
                            <div className="grid gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Ảnh đại diện
                                </span>
                                <AvatarUploadField
                                    disabled={updateMutation.isPending}
                                    name={form.fullName || profile.email}
                                    onChange={(url) => setForm({ ...form, avatarUrl: url })}
                                    value={form.avatarUrl}
                                />
                            </div>
                        ) : null}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Họ và tên
                                </span>
                                <input
                                    className={fieldClassName}
                                    disabled={updateMutation.isPending}
                                    maxLength={255}
                                    onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                                    required
                                    value={form.fullName}
                                />
                            </label>

                            <label className="grid gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Số điện thoại
                                </span>
                                <input
                                    className={fieldClassName}
                                    disabled={updateMutation.isPending}
                                    maxLength={20}
                                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                    required
                                    value={form.phone}
                                />
                            </label>

                            <label className="grid gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Ngày sinh
                                </span>
                                <input
                                    className={fieldClassName}
                                    disabled={updateMutation.isPending}
                                    onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
                                    type="date"
                                    value={form.dateOfBirth}
                                />
                            </label>

                            <label className="grid gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Địa chỉ
                                </span>
                                <input
                                    className={fieldClassName}
                                    disabled={updateMutation.isPending}
                                    maxLength={255}
                                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                                    value={form.address}
                                />
                            </label>
                        </div>

                        {/* Email và giới tính không nằm trong UpdateProfileInput của backend nên không dựng ô nhập. */}
                        <p className="text-xs font-medium text-slate-500">
                            Email và giới tính không sửa được tại đây. Liên hệ quản trị viên nếu cần thay đổi.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={updateMutation.isPending}
                                onClick={() => setForm(null)}
                                type="button"
                            >
                                Huỷ
                            </button>
                            <button
                                className="inline-flex h-11 items-center rounded-lg bg-indigo-600 px-6 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={updateMutation.isPending}
                                type="submit"
                            >
                                {updateMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </form>
                ) : (
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
                )}
            </div>
        </div>
    )
}
