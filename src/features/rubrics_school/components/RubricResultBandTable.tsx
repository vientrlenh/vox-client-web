import { RefreshCw, LayoutList, Eye, Edit, Trash2 } from 'lucide-react';
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton';
import type { RubricResultBand } from '../types';

type Props = {
  bands: RubricResultBand[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onView: (item: RubricResultBand) => void;
  onEdit: (item: RubricResultBand) => void;
  onDelete: (item: RubricResultBand) => void;
};

export function RubricResultBandTable({ bands, isLoading, isError, onRetry, onView, onEdit, onDelete }: Props) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-32 flex-col items-center justify-center">
        <p className="text-red-500">Lỗi tải dữ liệu.</p>
        <button onClick={onRetry} className="text-indigo-600 underline hover:text-indigo-700">Thử lại</button>
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
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
          <tr>
            <th className="px-4 py-3">STT</th>
            <th className="px-4 py-3">Mã Band</th>
            <th className="px-4 py-3">Tên Mức điểm</th>
            <th className="px-4 py-3 text-center">Khoảng điểm</th>
            <th className="px-4 py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bands.map((b) => (
            <tr key={b.id} className="transition hover:bg-indigo-50">
              <td className="px-4 py-3 font-medium text-slate-500">{b.order}</td>
              <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.code}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
              <td className="px-4 py-3 text-center">
                <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-700 ring-1 ring-inset ring-green-700/10">
                  {b.scoreMin} - {b.scoreMax}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end">
                  <ActionMenuButton
                    ariaLabel={`Hành động cho thang điểm ${b.code}`}
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