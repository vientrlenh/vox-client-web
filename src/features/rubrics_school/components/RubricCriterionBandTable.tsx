// src/features/rubrics/components/RubricCriterionBandTable.tsx

import { RefreshCw, LayoutList, Eye, Edit, Trash2 } from 'lucide-react';
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton';
import type { RubricCriterionBand } from '../types';

type Props = {
  bands: RubricCriterionBand[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onView: (item: RubricCriterionBand) => void;
  onEdit: (item: RubricCriterionBand) => void;
  onDelete: (item: RubricCriterionBand) => void;
  isActionPending?: boolean;
};

export function RubricCriterionBandTable({ bands, isLoading, isError, onRetry, onView, onEdit, onDelete, isActionPending }: Props) {
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

  if (bands.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center text-slate-500">
        <LayoutList className="size-8 text-slate-300" />
        <p>Chưa có Mức điểm nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">Mã Band</th>
            <th className="px-4 py-3 text-center">Khoảng điểm</th>
            <th className="px-4 py-3">Cập nhật gần nhất</th>
            <th className="px-4 py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {bands.map((b) => (
            <tr key={b.id} className="transition hover:bg-cyan-50">
              <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.code}</td>
              <td className="px-4 py-3 text-center">
                <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-700 ring-1 ring-inset ring-green-700/10">
                  {b.scoreMin} - {b.scoreMax}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('vi-VN') : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end">
                  <ActionMenuButton
                    ariaLabel={`Hành động cho mức điểm ${b.code}`}
                    disabled={isActionPending}
                    items={[
                      { id: 'view', label: 'Xem chi tiết', icon: Eye, onSelect: () => onView(b) },
                      { id: 'edit', label: 'Chỉnh sửa', icon: Edit, tone: 'primary', onSelect: () => onEdit(b) },
                      { id: 'delete', label: 'Xóa', icon: Trash2, tone: 'danger', onSelect: () => onDelete(b) },
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
