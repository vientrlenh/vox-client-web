// src/features/school/components/SchoolDetailDialog.tsx

import { 
  AlignLeft, 
  Building2, 
  Calendar, 
  Clock, 
  Globe, 
  Hash, 
  Mail, 
  MapPin, 
  Phone, 
  School as SchoolIcon, 
  Users, 
  X 
} from 'lucide-react'
import type { School } from '../types'

type SchoolDetailDialogProps = {
  isOpen: boolean
  onClose: () => void
  school: School | null
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Chưa cập nhật'
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateString))
  } catch {
    return dateString
  }
}

export function SchoolDetailDialog({ isOpen, onClose, school }: SchoolDetailDialogProps) {
  if (!isOpen || !school) {
    return null
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
        aria-labelledby="school-detail-title"
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
      >
        <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 to-indigo-600" />

        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-600/10">
              <SchoolIcon aria-hidden="true" className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 id="school-detail-title" className="text-xl font-bold text-blue-950">
                  {school.name || 'Trường học chưa có tên'}
                </h2>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${
                    school.isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      : 'bg-red-50 text-red-700 ring-red-600/20'
                  }`}
                >
                  {school.isActive ? 'Hoạt động' : 'Đã khóa'}
                </span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <Hash aria-hidden="true" className="size-4 text-slate-400" />
                Mã định danh: <span className="font-mono font-bold text-indigo-600">{school.code}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            title="Đóng"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-red-600 transition"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto bg-slate-50/50 px-6 py-6">
          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            
            {/* Card 1: Thông tin chung */}
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                <Building2 className="size-4 text-indigo-500" /> Thông tin chung
              </h3>
              <div className="flex flex-1 flex-col gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tên miền hệ thống (Domain)</p>
                  <p className="mt-1.5">
                    {school.domain ? (
                      <span className="rounded-md bg-indigo-50 px-2.5 py-1 font-mono text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                        {school.domain}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-slate-400">Chưa cấu hình</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <AlignLeft className="size-3.5" /> Mô tả trường học
                  </p>
                  <div className="mt-2 flex-1 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100">
                    <p className="text-sm leading-relaxed text-slate-600">
                      {school.description || 'Chưa có thông tin mô tả chi tiết cho trường học này.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Liên hệ */}
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                <MapPin className="size-4 text-indigo-500" /> Liên hệ & Trụ sở
              </h3>
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                  <Phone className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số điện thoại</p>
                    <p className="mt-0.5 text-sm font-medium text-blue-950">{school.contactPhone || 'Chưa cập nhật'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                  <Mail className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email điện tử</p>
                    <p className="mt-0.5 break-all text-sm font-medium text-blue-950">{school.contactEmail || 'Chưa cập nhật'}</p>
                  </div>
                </div>
                <div className="flex flex-1 items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                  <Globe className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Địa chỉ cụ thể</p>
                    <p className="mt-0.5 text-sm font-medium text-blue-950 leading-relaxed">{school.address || 'Chưa cập nhật địa chỉ.'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Thống kê */}
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                <Users className="size-4 text-indigo-500" /> Quy mô & Hệ thống
              </h3>
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col justify-center rounded-lg bg-indigo-50/50 p-3 ring-1 ring-inset ring-indigo-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/80">Số học sinh</p>
                  <p className="mt-1 text-2xl font-bold text-indigo-700">{school.studentCount || 0}</p>
                </div>
              </div>
            </div>

            {/* Card 4: Thời gian */}
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                <Calendar className="size-4 text-indigo-500" /> Ghi nhận thời gian
              </h3>
              <div className="flex flex-1 flex-col justify-center gap-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="size-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Khởi tạo lúc</span>
                  </div>
                  <span className="text-sm font-bold text-blue-950">{formatDate(school.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100/50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="size-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Cập nhật cuối</span>
                  </div>
                  <span className="text-sm font-bold text-blue-950">{formatDate(school.updatedAt)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-50 px-6 text-sm font-bold text-indigo-700 ring-1 ring-inset ring-indigo-100 transition hover:bg-indigo-100 hover:text-indigo-800"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  )
}