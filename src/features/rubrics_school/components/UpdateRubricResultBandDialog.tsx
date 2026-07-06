// src/features/rubrics/components/UpdateRubricResultBandDialog.tsx

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { UpdateRubricResultBandPayload } from '../api/useUpdateSchoolRubricResultBandMutation';
import type { RubricResultBand } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateRubricResultBandPayload) => Promise<void>;
  isPending: boolean;
  initialData: RubricResultBand;
};

export function UpdateRubricResultBandDialog({ isOpen, onClose, onSubmit, isPending, initialData }: Props) {
  const [formData, setFormData] = useState(() => ({
    name: initialData.name,
    description: initialData.description ?? '',
    scoreMin: initialData.scoreMin,
    scoreMax: initialData.scoreMax,
    order: initialData.order,
  }));

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const min = Number(formData.scoreMin);
    const max = Number(formData.scoreMax);
    if (min >= max) {
      alert('Lỗi: Điểm tối thiểu (Min) phải nhỏ hơn Điểm tối đa (Max)!');
      return;
    }

    const payload: UpdateRubricResultBandPayload = {
      name: formData.name,
      description: formData.description || undefined,
      scoreMin: min,
      scoreMax: max,
      order: Number(formData.order),
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            Chỉnh sửa Thang điểm <span className="font-mono text-slate-500">{initialData.code}</span>
          </h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Tên Mức điểm</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Mô tả</label>
              <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isPending} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối thiểu (Min)</label>
              <input type="number" step="0.1" value={formData.scoreMin} onChange={(e) => setFormData({ ...formData, scoreMin: e.target.value === '' ? 0 : Number(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối đa (Max)</label>
              <input type="number" step="0.1" value={formData.scoreMax} onChange={(e) => setFormData({ ...formData, scoreMax: e.target.value === '' ? 0 : Number(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Thứ tự (Order)</label>
              <input type="number" min="1" value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value === '' ? 1 : parseInt(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
