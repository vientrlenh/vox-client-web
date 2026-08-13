// src/features/rubrics/components/RubricTable.tsx

import { RefreshCw, LayoutList, Eye, Trash2 } from 'lucide-react';
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton';
import type { Rubric } from '../types';

type RubricTableProps = {
  rubrics: Rubric[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onViewDetails: (rubric: Rubric) => void;
  onDelete: (rubric: Rubric) => void;
};

export function RubricTable({ rubrics, isLoading, isError, onRetry, onViewDetails, onDelete }: RubricTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3">
        <RefreshCw className="size-6 animate-spin text-cyan-600" />
        <p className="text-sm text-slate-500">Đang tải danh sách Rubric...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-red-600">Đã có lỗi xảy ra khi tải dữ liệu.</p>
        <button onClick={onRetry} className="text-sm font-bold text-cyan-600 underline">Thử lại</button>
      </div>
    );
  }

  if (rubrics.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-500">
        <LayoutList className="size-8 text-slate-300" />
        <p className="text-sm">Không tìm thấy Rubric nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50/75 text-xs font-black text-blue-950 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">Mã Rubric</th>
            <th className="px-4 py-3">Tên Rubric</th>
            <th className="px-4 py-3">Khung năng lực</th>
            <th className="px-4 py-3">Ngôn ngữ</th>
            <th className="px-4 py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rubrics.map((r) => (
            <tr
              key={r.id}
              onClick={() => onViewDetails(r)}
              // Thêm các class để click được cả dòng và highlight khi hover
              className="group cursor-pointer transition hover:bg-cyan-50"
            >
              <td className="px-4 py-3 font-mono font-bold text-slate-900 group-hover:text-cyan-700">{r.code}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {r.framework?.name || '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                  {r.language?.name || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
                  <ActionMenuButton
                    ariaLabel={`Hành động cho rubric ${r.code}`}
                    items={[
                      { id: 'view', label: 'Xem chi tiết', icon: Eye, onSelect: () => onViewDetails(r) },
                      { id: 'delete', label: 'Xóa', icon: Trash2, tone: 'danger', onSelect: () => onDelete(r) },
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}