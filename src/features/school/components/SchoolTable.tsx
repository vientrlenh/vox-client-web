// src/features/school/components/SchoolTable.tsx

import { Eye, Lock, RefreshCw, School as SchoolIcon, Unlock } from 'lucide-react'
import type { School } from '../types'

type SchoolTableProps = {
  schools: School[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onChangeStatus?: (school: School) => void 
  onView?: (school: School) => void
}

// ĐÃ XÓA SẠCH onViewUsers Ở ĐÂY
export function SchoolTable({ schools, isLoading, isError, onRetry, onChangeStatus, onView }: SchoolTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3">
        <RefreshCw aria-hidden="true" className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Đang tải danh sách trường học...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm font-semibold text-red-600">Đã có lỗi xảy ra khi tải dữ liệu từ server.</p>
        <button 
          type="button" 
          onClick={onRetry} 
          className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-bold shadow-xs hover:bg-slate-50"
        >
          <RefreshCw aria-hidden="true" className="size-4" /> Thử lại
        </button>
      </div>
    )
  }

  if (schools.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-slate-500">
        <SchoolIcon aria-hidden="true" className="size-10 text-slate-300" />
        <p className="text-sm font-medium">Không tìm thấy trường học nào.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm text-blue-950">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
            <th className="px-6 py-4">Mã trường</th>
            <th className="px-6 py-4">Tên trường</th>
            <th className="px-6 py-4">Liên hệ</th>
            <th className="px-6 py-4">Học sinh</th>
            <th className="px-6 py-4">Trạng thái</th>
            <th className="px-6 py-4 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {schools.map((school) => (
            <tr key={school.id} className="transition hover:bg-slate-50/50">
              <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">{school.code}</td>
              <td className="px-6 py-4">
                <div className="font-bold text-blue-950">{school.name || 'N/A'}</div>
                <div className="mt-0.5 text-xs text-slate-500 max-w-xs truncate">{school.address || 'Chưa cập nhật địa chỉ'}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-slate-700">{school.contactEmail || 'N/A'}</div>
                <div className="mt-0.5 text-xs text-slate-500">{school.contactPhone || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 font-medium">{school.studentCount || 0}</td>
              
              <td className="px-6 py-4">
                <button
                  type="button"
                  title="Nhấn để đổi trạng thái"
                  aria-label={`Thay đổi trạng thái trường ${school.name || school.code}`}
                  onClick={() => onChangeStatus?.(school)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ring-1 ring-inset transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    school.isActive 
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100 focus:ring-emerald-600/40' 
                      : 'bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100 focus:ring-red-600/40'
                  }`}
                >
                  {school.isActive ? (
                    <>
                      <Unlock aria-hidden="true" className="size-3.5" />
                      Hoạt động
                    </>
                  ) : (
                    <>
                      <Lock aria-hidden="true" className="size-3.5" />
                      Đã khóa
                    </>
                  )}
                </button>
              </td>
              
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">                
                  {/* Nút Xem chi tiết thông tin trường */}
                  <button 
                    type="button"
                    aria-label={`Xem chi tiết trường ${school.name || school.code}`}
                    title="Xem chi tiết"
                    onClick={() => onView?.(school)} 
                    className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-blue-950"
                  >
                    <Eye aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}