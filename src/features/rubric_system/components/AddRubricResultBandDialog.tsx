// src/features/rubrics/components/AddRubricResultBandDialog.tsx

import { useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import type { AddRubricResultBandsPayload, RubricResultBandItemRequest } from '../api/useAddSystemRubricResultBandsMutation';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddRubricResultBandsPayload) => Promise<void>;
  isPending: boolean;
};

type BandFormItem = RubricResultBandItemRequest;

function makeEmptyBand(order: number): BandFormItem {
  return { code: '', name: '', description: '', mappedScoreMin: 0, mappedScoreMax: 10, order };
}

export function AddRubricResultBandDialog({ isOpen, onClose, onSubmit, isPending }: Props) {
  const [bands, setBands] = useState<BandFormItem[]>([makeEmptyBand(1)]);

  if (!isOpen) return null;

  const updateBand = (index: number, patch: Partial<BandFormItem>) => {
    setBands((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addBand = () => {
    setBands((prev) => [...prev, makeEmptyBand(prev.length + 1)]);
  };

  const removeBand = (index: number) => {
    setBands((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const band of bands) {
      const min = Number(band.mappedScoreMin);
      const max = Number(band.mappedScoreMax);
      if (min >= max) {
        alert(`Lỗi: Ở thang điểm "${band.code || band.name || '(chưa đặt tên)'}", Điểm tối thiểu (Min) phải nhỏ hơn Điểm tối đa (Max)!`);
        return;
      }
    }

    const payload: AddRubricResultBandsPayload = {
      resultBands: bands.map((band) => ({
        code: band.code,
        name: band.name,
        description: band.description || undefined,
        mappedScoreMin: Number(band.mappedScoreMin),
        mappedScoreMax: Number(band.mappedScoreMax),
        order: Number(band.order),
      })),
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Thêm Thang điểm Mới</h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
          <div className="space-y-4">
            {bands.map((band, index) => (
              <div key={index} className="relative space-y-3 rounded-lg border border-slate-200 p-4 pr-11">
                {bands.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBand(index)}
                    disabled={isPending}
                    className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}

                <p className="text-xs font-extrabold uppercase tracking-wide text-cyan-700">Thang điểm #{index + 1}</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-700">Mã Band</label>
                    <input type="text" value={band.code} onChange={(e) => updateBand(index, { code: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-700">Tên Mức điểm</label>
                    <input type="text" value={band.name} onChange={(e) => updateBand(index, { name: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-bold text-slate-700">Mô tả</label>
                    <textarea rows={2} value={band.description} onChange={(e) => updateBand(index, { description: e.target.value })} disabled={isPending} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối thiểu (Min)</label>
                    <input type="number" step="0.1" value={band.mappedScoreMin} onChange={(e) => updateBand(index, { mappedScoreMin: e.target.value === '' ? 0 : Number(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối đa (Max)</label>
                    <input type="number" step="0.1" value={band.mappedScoreMax} onChange={(e) => updateBand(index, { mappedScoreMax: e.target.value === '' ? 0 : Number(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-700">Thứ tự (Order)</label>
                    <input type="number" min="1" value={band.order} onChange={(e) => updateBand(index, { order: e.target.value === '' ? 1 : parseInt(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addBand}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-600 hover:text-cyan-700 disabled:opacity-50"
            >
              <Plus className="size-4" /> Thêm thang điểm khác
            </button>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-30 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : `Lưu ${bands.length > 1 ? `${bands.length} Thang điểm` : 'Thang điểm'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
