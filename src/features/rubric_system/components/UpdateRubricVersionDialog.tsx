// src/features/rubrics/components/UpdateRubricVersionDialog.tsx

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ErrorBanner } from '@/shared/ui/ErrorBanner';
import type { UpdateRubricVersionPayload } from '../api/useUpdateSystemRubricVersionMutation';

type VersionData = {
  name: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  scoringScaleMin: number;
  scoringScaleMax: number;
  totalScoreMethod: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateRubricVersionPayload) => Promise<void>;
  isPending: boolean;
  initialData: VersionData;
};

const toDateInputValue = (value?: string) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  return '';
};

// Chuyển yyyy-MM-dd thành datetime kèm offset +07:00 để BE parse trực tiếp qua OffsetDateTime,
// không phụ thuộc nhánh tương thích tạm thời (không offset) của DateMapper.
const toBackendDate = (value?: string, endOfDay = false) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return undefined;
  return `${year}-${month}-${day}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`;
};

export function UpdateRubricVersionDialog({ isOpen, onClose, onSubmit, isPending, initialData }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateRubricVersionPayload>(() => ({
    name: initialData.name,
    description: initialData.description ?? '',
    effectiveFrom: toDateInputValue(initialData.effectiveFrom),
    effectiveTo: toDateInputValue(initialData.effectiveTo),
    scoringScaleMin: initialData.scoringScaleMin,
    scoringScaleMax: initialData.scoringScaleMax,
    totalScoreMethod: initialData.totalScoreMethod,
  }));

  // Xoá lỗi cũ mỗi lần mở lại, để banner không tố cáo một lỗi đã không còn đúng.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setErrorMessage(null);
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // --- BẮT ĐẦU VALIDATION CHỐNG LỖI LOGIC ---
    const min = Number(formData.scoringScaleMin);
    const max = Number(formData.scoringScaleMax);
    
    if (min >= max) {
      setErrorMessage("Lỗi: Điểm tối thiểu (Min) phải nhỏ hơn Điểm tối đa (Max)!");
      return;
    }
    if (formData.effectiveFrom && formData.effectiveTo) {
      if (new Date(formData.effectiveFrom) > new Date(formData.effectiveTo)) {
        setErrorMessage("Lỗi: Ngày kết thúc không được nhỏ hơn Ngày áp dụng!");
        return;
      }
    }
    // --- KẾT THÚC VALIDATION ---

    const payload: UpdateRubricVersionPayload = {
      ...formData,
      effectiveFrom: toBackendDate(formData.effectiveFrom),
      effectiveTo: formData.effectiveTo ? toBackendDate(formData.effectiveTo, true) : null,
      scoringScaleMin: min,
      scoringScaleMax: max,
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      // Lỗi từ máy chủ phải hiện NGAY TRONG modal. Trang cha không nuốt lỗi nữa: modal vẫn
      // mở khi submit hỏng, mà banner của trang thì nằm sau lớp backdrop-blur của overlay
      // nên chỉ còn là một vệt đỏ mờ, không đọc được.
      setErrorMessage((error as Error)?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-blue-950">Chỉnh sửa Version</h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
          <ErrorBanner className="mb-5" message={errorMessage} />
          <div className="grid gap-5 sm:grid-cols-2">
            
            {/* Tên Version: Chiếm trọn 2 cột */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Tên Phiên bản</label>
              <input type="text" value={formData.name ?? ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50" />
            </div>

            {/* Cách tính điểm: Chiếm trọn 2 cột để 4 ô (Min/Max, Từ/Đến) đứng cặp với nhau */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Cách tính tổng điểm</label>
              <select value={formData.totalScoreMethod ?? ''} onChange={(e) => setFormData({ ...formData, totalScoreMethod: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50">
                <option value="WEIGHTED_AVERAGE">Trung bình — mọi tiêu chí cân bằng</option>
                <option value="SUM">Phân bổ trọng số — chia phần trăm cho từng tiêu chí</option>
              </select>
            </div>

            {/* Cặp 1: Min - Max */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối thiểu (Min)</label>
              <input type="number" step="0.1" value={formData.scoringScaleMin ?? ''} onChange={(e) => setFormData({ ...formData, scoringScaleMin: e.target.value === '' ? 0 : Number(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối đa (Max)</label>
              <input type="number" step="0.1" value={formData.scoringScaleMax ?? ''} onChange={(e) => setFormData({ ...formData, scoringScaleMax: e.target.value === '' ? 0 : Number(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50" />
            </div>

            {/* Cặp 2: Từ ngày - Đến ngày */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Áp dụng từ ngày</label>
              <input type="date" value={formData.effectiveFrom ?? ''} onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Đến ngày (Tùy chọn)</label>
              <input type="date" value={formData.effectiveTo ?? ''} onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })} disabled={isPending} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50" />
            </div>

            {/* Mô tả: Chiếm trọn 2 cột */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Mô tả chi tiết</label>
              <textarea rows={3} value={formData.description ?? ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isPending} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50" />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Hủy bỏ</button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-30 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
