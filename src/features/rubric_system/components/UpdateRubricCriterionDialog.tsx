// src/features/rubrics/components/UpdateRubricCriterionDialog.tsx

import { useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast';
import type { UpdateRubricCriterionPayload } from '../api/useUpdateSystemRubricCriterionMutation';
import type { RubricCriterion } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateRubricCriterionPayload) => Promise<void>;
  isPending: boolean;
  initialData: RubricCriterion;
  scoringScaleMin: number;
  scoringScaleMax: number;
  existingOrders?: number[];
};

// Cấu trúc thật của examplesJson trả về từ Backend: { "values": [{ transcript, explanation, expectedScore }] }
type ExampleItem = {
  transcript: string;
  explanation: string;
  expectedScore: number;
};

const EMPTY_EXAMPLE: ExampleItem = { transcript: '', explanation: '', expectedScore: 0 };

function parseExamples(examplesJson?: string | null): ExampleItem[] {
  if (!examplesJson) return [EMPTY_EXAMPLE];
  try {
    const parsed: unknown = JSON.parse(examplesJson);
    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { values?: unknown[] })?.values)
        ? (parsed as { values: unknown[] }).values
        : [];

    if (rawList.length > 0) {
      return rawList.map((item) => {
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return {
            transcript: String(obj.transcript ?? ''),
            explanation: String(obj.explanation ?? ''),
            expectedScore: Number(obj.expectedScore ?? 0),
          };
        }
        return { transcript: String(item), explanation: '', expectedScore: 0 };
      });
    }
  } catch {
    // Chuỗi cũ không phải JSON hợp lệ, coi như chưa có ví dụ nào
  }
  return [EMPTY_EXAMPLE];
}

export function UpdateRubricCriterionDialog({ isOpen, onClose, onSubmit, isPending, initialData, scoringScaleMin, scoringScaleMax, existingOrders = [] }: Props) {
  const [formData, setFormData] = useState(() => ({
    name: initialData.name,
    description: initialData.description ?? '',
    // Lưu 0.2, hiện 20 -- xem ghi chú ở chỗ gửi lên.
    weight: initialData.weight * 100,
    order: initialData.order,
    isRequired: initialData.isRequired,
  }));
  const [examples, setExamples] = useState<ExampleItem[]>(() => parseExamples(initialData.examplesJson));
  const { showError, feedbackToast } = useFeedbackToast();

  if (!isOpen) return null;

  const updateExample = (index: number, patch: Partial<ExampleItem>) => {
    setExamples((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeExample = (index: number) => {
    setExamples((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (existingOrders.includes(Number(formData.order))) {
      showError(`Lỗi: Thứ tự (Order) ${formData.order} đã được sử dụng bởi một tiêu chí khác trong phiên bản này. Vui lòng chọn thứ tự khác.`);
      return;
    }

    const cleanedExamples = examples
      .filter((item) => item.transcript.trim() || item.explanation.trim())
      .map((item) => ({
        transcript: item.transcript.trim(),
        explanation: item.explanation.trim(),
        expectedScore: Number(item.expectedScore) || 0,
      }));
    const examplesJson = cleanedExamples.length > 0 ? JSON.stringify(cleanedExamples) : undefined;

    const payload: UpdateRubricCriterionPayload = {
      name: formData.name,
      description: formData.description || undefined,
      examplesJson,
        // Người dùng nhập PHẦN TRĂM (20), hệ thống lưu PHÂN SỐ (0.2): cổng ban hành
        // (ChangeSchoolRubricVersionStatusUseCase) đòi tổng trọng số đúng bằng 1.
      weight: Number(formData.weight) / 100,
      minScore: scoringScaleMin,
      maxScore: scoringScaleMax,
      order: Number(formData.order),
      isRequired: formData.isRequired,
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />
      {feedbackToast}

      <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-blue-950">
            Chỉnh sửa Tiêu chí <span className="font-mono text-slate-500">{initialData.code}</span>
          </h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
          <div className="grid gap-5 sm:grid-cols-2">

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Tên Tiêu chí</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Mô tả</label>
              <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isPending} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Ví dụ minh họa (tùy chọn)</label>
              <div className="space-y-3">
                {examples.map((example, index) => (
                  <div key={index} className="relative space-y-2 rounded-lg border border-slate-200 p-3 pr-10">
                    <button
                      type="button"
                      onClick={() => removeExample(index)}
                      disabled={isPending}
                      className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500">Transcript</label>
                      <input
                        type="text"
                        value={example.transcript}
                        onChange={(e) => updateExample(index, { transcript: e.target.value })}
                        disabled={isPending}
                        placeholder="Đoạn hội thoại/câu trả lời mẫu"
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500">Explanation</label>
                      <input
                        type="text"
                        value={example.explanation}
                        onChange={(e) => updateExample(index, { explanation: e.target.value })}
                        disabled={isPending}
                        placeholder="Giải thích vì sao ví dụ này đạt mức điểm bên dưới"
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                      />
                    </div>

                    <div className="w-32">
                      <label className="mb-1 block text-xs font-bold text-slate-500">Expected Score</label>
                      <input
                        type="number"
                        step="0.1"
                        value={example.expectedScore}
                        onChange={(e) => updateExample(index, { expectedScore: e.target.value === '' ? 0 : Number(e.target.value) })}
                        disabled={isPending}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExamples((prev) => [...prev, EMPTY_EXAMPLE])}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-600 hover:text-cyan-700 disabled:opacity-50"
                >
                  <Plus className="size-4" /> Thêm ví dụ
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Trọng số (Weight)</label>
              <input type="number" step="0.01" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value === '' ? 0 : Number(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
              <p className="mt-1 text-xs text-slate-400">Trọng số tương đối khi tính điểm trung bình có trọng số giữa các tiêu chí</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối thiểu (Min)</label>
              <input type="number" value={scoringScaleMin} disabled className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-500 outline-none" readOnly />
              <p className="mt-1 text-xs text-slate-400">Luôn theo thang điểm của phiên bản, không thể chỉnh riêng</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối đa (Max)</label>
              <input type="number" value={scoringScaleMax} disabled className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-500 outline-none" readOnly />
              <p className="mt-1 text-xs text-slate-400">Luôn theo thang điểm của phiên bản, không thể chỉnh riêng</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Thứ tự (Order)</label>
              <input type="number" min="1" value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value === '' ? 1 : parseInt(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isRequiredEdit" checked={formData.isRequired} onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })} disabled={isPending} className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
              <label htmlFor="isRequiredEdit" className="text-sm font-bold text-slate-700">Tiêu chí bắt buộc</label>
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
