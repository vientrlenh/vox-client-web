// src/features/rubrics/components/AddRubricVersionDialog.tsx

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { AddRubricVersionsPayload } from '../api/useAddSystemRubricVersionsMutation';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddRubricVersionsPayload) => Promise<void>;
  isPending: boolean;
};

// Chuyển yyyy-MM-dd thành datetime kèm offset +07:00 để BE parse trực tiếp qua OffsetDateTime,
// không phụ thuộc nhánh tương thích tạm thời (không offset) của DateMapper.
const toBackendDate = (value?: string, endOfDay = false) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return undefined;
  return `${year}-${month}-${day}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`;
};

export function AddRubricVersionDialog({ isOpen, onClose, onSubmit, isPending }: Props) {
  // State khởi tạo rỗng
  const [formData, setFormData] = useState({
    version: 1, // Khởi tạo mặc định version = 1
    name: '',
    scoringScaleMin: 0,
    scoringScaleMax: 100,
    totalScoreMethod: 'WEIGHTED_AVERAGE',
    effectiveFrom: '',
    effectiveTo: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- VALIDATION BẢO VỆ GIAO DIỆN ---
    if (formData.version <= 0) {
      alert("Lỗi: Số Version phải lớn hơn 0!");
      return;
    }

    if (!formData.name.trim()) {
      alert("Lỗi: Vui lòng nhập Tên phiên bản!");
      return;
    }

    const min = Number(formData.scoringScaleMin);
    const max = Number(formData.scoringScaleMax);
    if (min >= max) {
      alert("Lỗi: Điểm tối thiểu (Min) phải nhỏ hơn Điểm tối đa (Max)!");
      return;
    }
    if (formData.effectiveFrom && formData.effectiveTo) {
      if (new Date(formData.effectiveFrom) > new Date(formData.effectiveTo)) {
        alert("Lỗi: Ngày kết thúc không được nhỏ hơn Ngày áp dụng!");
        return;
      }
    }

    // --- CHUẨN BỊ PAYLOAD ---
    // Bọc object vào trong mảng `versions` theo chuẩn của BE
    const payload: AddRubricVersionsPayload = {
      versions: [
        {
          version: Number(formData.version),
          name: formData.name.trim(),
          scoringScaleMin: min,
          scoringScaleMax: max,
          totalScoreMethod: formData.totalScoreMethod,
          effectiveFrom: toBackendDate(formData.effectiveFrom),
          effectiveTo: formData.effectiveTo ? toBackendDate(formData.effectiveTo, true) : null,
        }
      ]
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Thêm Phiên bản Mới</h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            
            {/* Version Number */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Số Version (Ví dụ: 1, 2)</label>
              <input 
                type="number" 
                min="1"
                value={formData.version} 
                onChange={(e) => setFormData({ ...formData, version: e.target.value === '' ? 1 : parseInt(e.target.value) })} 
                disabled={isPending} 
                required 
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" 
              />
            </div>

            {/* Version Name */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Tên phiên bản</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isPending}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
              />
            </div>

            {/* Total Score Method */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Cách tính tổng điểm</label>
              <select 
                value={formData.totalScoreMethod} 
                onChange={(e) => setFormData({ ...formData, totalScoreMethod: e.target.value })} 
                disabled={isPending} 
                required 
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
              >
                <option value="SUM">Cộng dồn (SUM)</option>
                <option value="WEIGHTED_AVERAGE">Trung bình có trọng số (WEIGHTED_AVERAGE)</option>
              </select>
            </div>

            {/* Min - Max */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối thiểu (Min)</label>
              <input 
                type="number" step="0.1" 
                value={formData.scoringScaleMin} 
                onChange={(e) => setFormData({ ...formData, scoringScaleMin: e.target.value === '' ? 0 : Number(e.target.value) })} 
                disabled={isPending} 
                required 
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" 
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối đa (Max)</label>
              <input 
                type="number" step="0.1" 
                value={formData.scoringScaleMax} 
                onChange={(e) => setFormData({ ...formData, scoringScaleMax: e.target.value === '' ? 0 : Number(e.target.value) })} 
                disabled={isPending} 
                required 
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" 
              />
            </div>

            {/* Dates */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Áp dụng từ ngày</label>
              <input 
                type="date" 
                value={formData.effectiveFrom} 
                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} 
                disabled={isPending} 
                required 
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" 
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Đến ngày (Tùy chọn)</label>
              <input 
                type="date" 
                value={formData.effectiveTo} 
                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })} 
                disabled={isPending} 
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" 
              />
            </div>

          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Lưu Phiên bản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
