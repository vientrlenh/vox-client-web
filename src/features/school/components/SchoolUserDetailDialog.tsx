// src/features/school/components/SchoolUserDetailDialog.tsx

import { 
  Calendar, 
  Clock, 
  Hash, 
  Mail, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  User as UserIcon, 
  X,
  Loader2
} from 'lucide-react'
import { useSchoolUserQuery } from '../api/useSchoolUserQuery'

type SchoolUserDetailDialogProps = {
  isOpen: boolean
  onClose: () => void
  schoolId: string | null
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

export function SchoolUserDetailDialog({ isOpen, onClose, schoolId, userId }: SchoolUserDetailDialogProps) {
  const { data: schoolUser, isLoading, isError } = useSchoolUserQuery(schoolId, userId)

  if (!isOpen) return null

  const getInitials = (name?: string | null) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Đóng hộp thoại chi tiết"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-title"
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
      >
        <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 to-indigo-600" />

        {isLoading ? (
          <div className="flex min-h-100 flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-500">Đang tải thông tin người dùng...</p>
          </div>
        ) : isError || !schoolUser || !schoolUser.user ? (
          <div className="flex min-h-100 flex-col items-center justify-center gap-4 p-6 text-center">
            <UserIcon className="size-12 text-slate-300" />
            <p className="text-sm font-semibold text-red-600">Không thể tải dữ liệu người dùng. Vui lòng kiểm tra lại quyền truy cập hoặc kết nối mạng.</p>
            <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50">Đóng</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-4">
                {schoolUser.user.avatarUrl ? (
                  <img 
                    src={schoolUser.user.avatarUrl} 
                    alt={schoolUser.user.fullName || 'Avatar'} 
                    className="size-16 rounded-full object-cover ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700 ring-2 ring-slate-100">
                    {getInitials(schoolUser.user.fullName)}
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-3">
                    <h2 id="user-detail-title" className="text-xl font-bold text-blue-950">
                      {schoolUser.user.fullName || 'Người dùng chưa cập nhật tên'}
                    </h2>
                    {schoolUser.user.roles && schoolUser.user.roles.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                        <ShieldCheck className="size-3.5" />
                        {schoolUser.user.roles.map(r => r.name || r.code).join(', ')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                    <Hash aria-hidden="true" className="size-4 text-slate-400" />
                    ID User: <span className="font-mono text-indigo-600">{schoolUser.user.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex size-9 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-red-600 transition"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[65vh] overflow-y-auto bg-slate-50/50 px-6 py-6">
              <div className="grid gap-6 md:grid-cols-2 items-stretch">
                
                {/* Thông tin cá nhân */}
                <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                    <UserIcon className="size-4 text-indigo-500" /> Thông tin cá nhân
                  </h3>
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Giới tính</p>
                        <p className="mt-1 font-medium text-blue-950">{schoolUser.user.gender || 'Chưa cập nhật'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày sinh</p>
                        <p className="mt-1 font-medium text-blue-950">{formatDate(schoolUser.user.dateOfBirth)}</p>
                      </div>
                    </div>
                    <div className="mt-2 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1">
                        <Clock className="size-3.5" /> Thời gian công tác/học tập
                      </p>
                      <p className="text-sm font-medium text-blue-950">
                        Bắt đầu: <span className="text-indigo-600">{formatDate(schoolUser.startDate)}</span>
                      </p>
                      <p className="text-sm font-medium text-blue-950 mt-1">
                        Kết thúc: <span className="text-indigo-600">{formatDate(schoolUser.endDate)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Liên hệ */}
                <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                    <MapPin className="size-4 text-indigo-500" /> Liên hệ
                  </h3>
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <Phone className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số điện thoại</p>
                        <p className="mt-0.5 text-sm font-medium text-blue-950">{schoolUser.user.phone || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <Mail className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</p>
                        <p className="mt-0.5 break-all text-sm font-medium text-blue-950">{schoolUser.user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-1 items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Địa chỉ</p>
                        <p className="mt-0.5 text-sm font-medium leading-relaxed text-blue-950">{schoolUser.user.address || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dấu thời gian */}
                <div className="md:col-span-2 flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                    <Calendar className="size-4 text-indigo-500" /> Ghi nhận hệ thống
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Tạo tài khoản</span>
                      </div>
                      <span className="text-sm font-bold text-blue-950">{formatDate(schoolUser.user.createdAt, true)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Cập nhật cuối</span>
                      </div>
                      <span className="text-sm font-bold text-blue-950">{formatDate(schoolUser.user.updatedAt, true)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-50 px-6 text-sm font-bold text-indigo-700 ring-1 ring-inset ring-indigo-100 transition hover:bg-indigo-100 hover:text-indigo-800"
              >
                Đóng
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}