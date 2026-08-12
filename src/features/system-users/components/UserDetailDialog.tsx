// src/features/system-users/components/UserDetailDialog.tsx

import { Calendar, Clock, Loader2, Mail, MapPin, Phone, ShieldCheck, User as UserIcon, X } from 'lucide-react'
import { useUserQuery } from '../api/useUsersQuery'

type UserDetailDialogProps = {
  isOpen: boolean
  onClose: () => void
  userId: string | null
}

function formatDate(dateString: string | null, includeTime = false) {
  if (!dateString) return 'Chưa cập nhật'
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      ...(includeTime ? { timeStyle: 'short' } : {}),
    }).format(new Date(dateString))
  } catch {
    return dateString
  }
}

export function UserDetailDialog({ isOpen, onClose, userId }: UserDetailDialogProps) {
  const { data: user, isLoading, isError } = useUserQuery(userId)

  if (!isOpen) return null

  const getInitials = (name?: string | null) => (name ? name.charAt(0).toUpperCase() : 'U')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        aria-label="Đóng hộp thoại chi tiết"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        type="button"
      />

      <div
        aria-labelledby="user-detail-title"
        aria-modal="true"
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
        role="dialog"
      >
        <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 to-indigo-600" />

        {isLoading ? (
          <div className="flex min-h-100 flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-500">Đang tải thông tin người dùng...</p>
          </div>
        ) : isError || !user ? (
          <div className="flex min-h-100 flex-col items-center justify-center gap-4 p-6 text-center">
            <UserIcon className="size-12 text-slate-300" />
            <p className="text-sm font-semibold text-red-600">
              Không thể tải dữ liệu người dùng. Vui lòng kiểm tra lại quyền truy cập hoặc kết nối mạng.
            </p>
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                  <img
                    alt={user.fullName || 'Avatar'}
                    className="size-16 rounded-full object-cover ring-2 ring-slate-100"
                    src={user.avatarUrl}
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700 ring-2 ring-slate-100">
                    {getInitials(user.fullName)}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-blue-950" id="user-detail-title">
                      {user.fullName || 'Người dùng chưa cập nhật tên'}
                    </h2>
                    {user.roles && user.roles.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                        <ShieldCheck className="size-3.5" />
                        {user.roles.map((r) => r.name || r.code).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="inline-flex size-9 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-red-600"
                onClick={onClose}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto bg-slate-50/50 px-6 py-6">
              <div className="grid items-stretch gap-6 md:grid-cols-2">
                <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                    <UserIcon className="size-4 text-indigo-500" /> Thông tin cá nhân
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Giới tính</p>
                      <p className="mt-1 font-medium text-blue-950">{user.gender || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày sinh</p>
                      <p className="mt-1 font-medium text-blue-950">{formatDate(user.dateOfBirth)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                    <MapPin className="size-4 text-indigo-500" /> Liên hệ
                  </h3>
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <Phone className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số điện thoại</p>
                        <p className="mt-0.5 text-sm font-medium text-blue-950">{user.phone || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <Mail className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</p>
                        <p className="mt-0.5 break-all text-sm font-medium text-blue-950">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-1 items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Địa chỉ</p>
                        <p className="mt-0.5 text-sm font-medium leading-relaxed text-blue-950">{user.address || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
                  <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                    <Calendar className="size-4 text-indigo-500" /> Ghi nhận hệ thống
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Tạo tài khoản</span>
                      </div>
                      <span className="text-sm font-bold text-blue-950">{formatDate(user.createdAt, true)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Cập nhật cuối</span>
                      </div>
                      <span className="text-sm font-bold text-blue-950">{formatDate(user.updatedAt, true)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
