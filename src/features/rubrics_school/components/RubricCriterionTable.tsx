// src/features/rubrics/components/RubricCriterionTable.tsx

import { RefreshCw, LayoutList, Eye, Edit, Trash2 } from 'lucide-react';
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton';
import type { RubricCriterion } from '../types';

type Props = {
  criteria: RubricCriterion[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onViewDetails: (item: RubricCriterion) => void;
  onEdit: (item: RubricCriterion) => void;
  onDelete: (item: RubricCriterion) => void;
};

export function RubricCriterionTable({ criteria, isLoading, isError, onRetry, onViewDetails, onEdit, onDelete }: Props) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-32 flex-col items-center justify-center">
        <p className="text-red-500">Lỗi tải dữ liệu.</p>
        <button onClick={onRetry} className="text-cyan-600 underline hover:text-cyan-700">Thử lại</button>
      </div>
    );
  }

  if (criteria.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center text-slate-500">
        <LayoutList className="size-8 text-slate-300" />
        <p>Chưa có Tiêu chí nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">STT</th>
            <th className="px-4 py-3">Mã Code</th>
            <th className="px-4 py-3">Tên Tiêu chí</th>
            <th className="px-4 py-3 text-center">Trọng số</th>
            <th className="px-4 py-3 text-center">Thang điểm</th>
            <th className="px-4 py-3 text-center">Bắt buộc</th>
            <th className="px-4 py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {criteria.map((c) => (
            <tr key={c.id} onClick={() => onViewDetails(c)} className="group cursor-pointer transition hover:bg-cyan-50">
              <td className="px-4 py-3 font-medium text-slate-500">{c.order}</td>
              <td className="px-4 py-3 font-mono font-bold text-slate-900 group-hover:text-cyan-700">{c.code}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
              <td className="px-4 py-3 text-center">
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {c.weight}%
                </span>
              </td>
              <td className="px-4 py-3 text-center font-medium">{c.minScore} - {c.maxScore}</td>
              
              {/* ĐÃ FIX LẠI CỘT BẮT BUỘC Ở ĐÂY CHO ĐẸP MẮT HƠN */}
              <td className="px-4 py-3 text-center">
                {c.isRequired ? (
                  <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    Bắt buộc
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Tùy chọn</span>
                )}
              </td>
              
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
                  <ActionMenuButton
                    ariaLabel={`Hành động cho tiêu chí ${c.code}`}
                    items={[
                      { id: 'view', label: 'Xem chi tiết', icon: Eye, onSelect: () => onViewDetails(c) },
                      { id: 'edit', label: 'Chỉnh sửa', icon: Edit, tone: 'primary', onSelect: () => onEdit(c) },
                      { id: 'delete', label: 'Xóa', icon: Trash2, tone: 'danger', onSelect: () => onDelete(c) },
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