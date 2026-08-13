// src/features/rubrics/components/ViewRubricResultBandDialog.tsx

import { X, RefreshCw } from 'lucide-react';
import { useSystemRubricResultBandQuery } from '../api/useSystemRubricResultBandQuery';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  resultBandId: string | undefined;
};

export function ViewRubricResultBandDialog({ isOpen, onClose, resultBandId }: Props) {
  const { data: band, isLoading } = useSystemRubricResultBandQuery(isOpen ? resultBandId : undefined);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-blue-950">Chi tiết Thang điểm</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading || !band ? (
            <div className="flex h-32 items-center justify-center">
              <RefreshCw className="size-6 animate-spin text-cyan-600" />
            </div>
          ) : (
            <div className="grid gap-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mã Band</p>
                <p className="mt-1 font-mono font-bold text-slate-900">{band.code}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tên Mức điểm</p>
                <p className="mt-1 font-medium text-slate-900">{band.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mô tả</p>
                <p className="mt-1 whitespace-pre-line text-slate-700">{band.description || 'Không có mô tả'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Khoảng điểm</p>
                <p className="mt-1 font-medium text-slate-900">{band.scoreMin} - {band.scoreMax}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ngày tạo</p>
                  <p className="mt-1 text-slate-700">{band.createdAt ? new Date(band.createdAt).toLocaleString('vi-VN') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cập nhật gần nhất</p>
                  <p className="mt-1 text-slate-700">{band.updatedAt ? new Date(band.updatedAt).toLocaleString('vi-VN') : '—'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
