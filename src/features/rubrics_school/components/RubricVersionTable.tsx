// src/features/rubrics/components/RubricVersionTable.tsx

import { RefreshCw, LayoutList, ChevronRight } from 'lucide-react';
// Import type RubricVersion của ông vào đây (nếu khác thì ông tự đổi tên nhé)
import type { RubricVersion } from '../types';

const STATUS_BADGE_CLASSNAMES: Record<string, string> = {
  DRAFT: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  ARCHIVED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

type RubricVersionTableProps = {
  versions: RubricVersion[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onViewCriteria: (version: RubricVersion) => void;
};

export function RubricVersionTable({
  versions,
  isLoading,
  isError,
  onRetry,
  onViewCriteria,
}: RubricVersionTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3">
        <RefreshCw className="size-6 animate-spin text-cyan-600" />
        <p className="text-sm text-slate-500">Đang tải danh sách phiên bản...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-red-600">Đã có lỗi xảy ra khi tải dữ liệu.</p>
        <button onClick={onRetry} className="text-sm font-bold text-cyan-600 underline hover:text-cyan-700">
          Thử lại
        </button>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-500">
        <LayoutList className="size-8 text-slate-300" />
        <p className="text-sm">Chưa có phiên bản (Version) nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50/75 text-xs font-black text-blue-950 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">Mã phiên bản</th>
            <th className="px-4 py-3">Tên phiên bản</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Ngày áp dụng</th>
            <th className="px-4 py-3">Ngày hết hạn</th>
            <th className="px-4 py-3 text-right">Chi tiết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {versions.map((v) => (
            <tr
              key={v.id}
              onClick={() => onViewCriteria(v)}
              // Hiệu ứng click cả dòng giống hệt bảng Rubric
              className="group cursor-pointer transition hover:bg-cyan-50"
            >
              <td className="px-4 py-3 font-mono font-bold text-slate-900 group-hover:text-cyan-700">
                v{v.version}
              </td>
              <td className="px-4 py-3 font-medium text-slate-900">{v.name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    STATUS_BADGE_CLASSNAMES[v.status] ?? 'bg-slate-100 text-slate-600 ring-slate-500/10'
                  }`}
                >
                  {v.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {/* Nếu BE không trả về effectiveFrom thì hiện dấu gạch ngang */}
                {v.effectiveFrom ? new Date(v.effectiveFrom).toLocaleDateString('vi-VN') : '—'}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {/* Nếu BE không trả về effectiveTo (không có hạn) thì hiện dấu gạch ngang */}
                {v.effectiveTo ? new Date(v.effectiveTo).toLocaleDateString('vi-VN') : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                {/* Icon mũi tên sáng lên khi hover dòng */}
                <div className="inline-flex size-8 items-center justify-center rounded-full text-slate-400 transition group-hover:bg-white group-hover:text-cyan-600 group-hover:shadow-sm">
                  <ChevronRight className="size-5" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}