// src/features/rubrics/components/AddRubricCriterionDialog.tsx

import { useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { ErrorBanner } from '@/shared/ui/ErrorBanner';
import {
  RUBRIC_ALLOCATION_TOTAL_PERCENT,
  RUBRIC_AVERAGE_WEIGHT,
  isAllocationMethod,
  percentToWeight,
} from '../types';
import type { AddRubricCriteriaPayload } from '../api/useAddSchoolRubricCriteriaMutation';
import { useFrameworkVersionCriteriaQuery, useFrameworkVersionsQuery } from '../api/useFrameworkVersionOptionsQuery';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddRubricCriteriaPayload) => Promise<void>;
  isPending: boolean;
  frameworkId?: string;
  scoringScaleMin: number;
  scoringScaleMax: number;
  usedFrameworkCriterionIds?: string[];
  existingOrders?: number[];
  /** Cách khai trọng số của phiên bản — quyết định ô trọng số hiện ra hay tự điền. */
  totalScoreMethod: string;
  /** Tổng phần trăm các tiêu chí đã có. Chỉ dùng ở chế độ phân bổ, để biết còn lại bao nhiêu. */
  allocatedPercent?: number;
};

// Cấu trúc thật của examplesJson trả về từ Backend: { "values": [{ transcript, explanation, expectedScore }] }
type ExampleItem = {
  transcript: string;
  explanation: string;
  expectedScore: number;
};

const EMPTY_EXAMPLE: ExampleItem = { transcript: '', explanation: '', expectedScore: 0 };

export function AddRubricCriterionDialog({ isOpen, onClose, onSubmit, isPending, frameworkId, scoringScaleMin, scoringScaleMax, usedFrameworkCriterionIds = [], existingOrders = [], totalScoreMethod, allocatedPercent = 0 }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Chế độ trung bình gán cứng 100% cho mọi tiêu chí nên không hỏi người dùng; chỉ chế độ phân bổ
  // mới cần khai phần trăm, và khai tới đâu thì trừ dần vào 100% tới đó.
  const isAllocation = isAllocationMethod(totalScoreMethod);
  const remainingPercent = Math.max(RUBRIC_ALLOCATION_TOTAL_PERCENT - allocatedPercent, 0);
  const [formData, setFormData] = useState(() => ({
    frameworkCriterionId: '',
    name: '',
    description: '',
    weightPercent: 0,
    order: existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1,
    isRequired: false,
  }));
  const [examples, setExamples] = useState<ExampleItem[]>([EMPTY_EXAMPLE]);
  const [frameworkVersionId, setFrameworkVersionId] = useState('');

  const { data: frameworkVersions, isLoading: isLoadingVersions } = useFrameworkVersionsQuery(frameworkId);
  const { data: frameworkCriteriaAll, isLoading: isLoadingCriteria } = useFrameworkVersionCriteriaQuery(frameworkVersionId || undefined);
  const frameworkCriteria = frameworkCriteriaAll?.filter((fc) => !usedFrameworkCriterionIds.includes(fc.id));
  // Mã Code luôn theo đúng Framework Criterion đã chọn — không cho gõ tay để tránh lệch dữ liệu.
  const selectedFrameworkCriterion = frameworkCriteria?.find((fc) => fc.id === formData.frameworkCriterionId);

  // Xoá lỗi cũ mỗi lần mở lại, để banner không tố cáo một lỗi đã không còn đúng.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setErrorMessage(null);
  }

  if (!isOpen) return null;

  const handleFrameworkVersionChange = (value: string) => {
    setFrameworkVersionId(value);
    setFormData((prev) => ({ ...prev, frameworkCriterionId: '' }));
  };

  const updateExample = (index: number, patch: Partial<ExampleItem>) => {
    setExamples((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeExample = (index: number) => {
    setExamples((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.frameworkCriterionId.trim()) {
      setErrorMessage('Lỗi: Vui lòng chọn Framework Version và Framework Criterion!');
      return;
    }

    if (existingOrders.includes(Number(formData.order))) {
      setErrorMessage(`Lỗi: Thứ tự (Order) ${formData.order} đã được sử dụng bởi một tiêu chí khác trong phiên bản này. Vui lòng chọn thứ tự khác.`);
      return;
    }

    if (isAllocation) {
      const percent = Number(formData.weightPercent);
      if (percent <= 0) {
        setErrorMessage('Vui lòng nhập trọng số lớn hơn 0%.');
        return;
      }
      if (percent > remainingPercent) {
        setErrorMessage(`Chỉ còn ${remainingPercent}% chưa được phân bổ, không thể gán ${percent}% cho tiêu chí này.`);
        return;
      }
    }

    const cleanedExamples = examples
      .filter((item) => item.transcript.trim() || item.explanation.trim())
      .map((item) => ({
        transcript: item.transcript.trim(),
        explanation: item.explanation.trim(),
        expectedScore: Number(item.expectedScore) || 0,
      }));
    const payload: AddRubricCriteriaPayload = {
      criteria: [
        {
          frameworkCriterionId: formData.frameworkCriterionId.trim(),
          code: (selectedFrameworkCriterion?.code ?? '').trim().toUpperCase(),
          name: formData.name,
          description: formData.description || undefined,
          examples: cleanedExamples.length > 0 ? cleanedExamples : undefined,
          weight: isAllocation ? percentToWeight(Number(formData.weightPercent)) : RUBRIC_AVERAGE_WEIGHT,
          minScore: scoringScaleMin,
          maxScore: scoringScaleMax,
          order: Number(formData.order),
          isRequired: formData.isRequired,
        },
      ],
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Thêm Tiêu chí Mới</h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
          <ErrorBanner className="mb-5" message={errorMessage} />
          <div className="grid gap-5 sm:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Framework Version</label>
              <select
                value={frameworkVersionId}
                onChange={(e) => handleFrameworkVersionChange(e.target.value)}
                disabled={isPending || !frameworkId || isLoadingVersions}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
              >
                <option value="">{isLoadingVersions ? 'Đang tải...' : '-- Chọn framework version --'}</option>
                {frameworkVersions?.map((fv) => (
                  <option key={fv.id} value={fv.id}>{fv.code} - {fv.name} (v{fv.version})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Framework Criterion</label>
              <select
                value={formData.frameworkCriterionId}
                onChange={(e) => setFormData({ ...formData, frameworkCriterionId: e.target.value })}
                disabled={isPending || !frameworkVersionId || isLoadingCriteria}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
              >
                <option value="">{isLoadingCriteria ? 'Đang tải...' : '-- Chọn framework criterion --'}</option>
                {frameworkCriteria?.map((fc) => (
                  <option key={fc.id} value={fc.id}>{fc.code} - {fc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Mã Code</label>
              <input
                type="text"
                value={selectedFrameworkCriterion?.code ?? ''}
                placeholder="-- Chọn Framework Criterion trước --"
                disabled
                readOnly
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-500 outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">Tự động lấy theo Framework Criterion đã chọn, không thể chỉnh riêng</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Tên Tiêu chí</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50" />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Mô tả</label>
              <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isPending} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50" />
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExamples((prev) => [...prev, EMPTY_EXAMPLE])}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  <Plus className="size-4" /> Thêm ví dụ
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Trọng số</label>
              {isAllocation ? (
                <>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={remainingPercent}
                      step="1"
                      value={formData.weightPercent}
                      onChange={(e) => setFormData({ ...formData, weightPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                      disabled={isPending}
                      required
                      className="w-full rounded-lg border border-slate-300 py-2 pl-4 pr-9 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-slate-400">%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Đã phân bổ {allocatedPercent}% / {RUBRIC_ALLOCATION_TOTAL_PERCENT}% — còn lại {remainingPercent}%
                  </p>
                </>
              ) : (
                <>
                  <input type="text" value="100%" disabled readOnly className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-500 outline-none" />
                  <p className="mt-1 text-xs text-slate-400">Phiên bản đang tính trung bình nên mọi tiêu chí cân bằng nhau, không cần khai riêng</p>
                </>
              )}
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
              <input type="number" min="1" value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value === '' ? 1 : parseInt(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50" />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isRequired" checked={formData.isRequired} onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })} disabled={isPending} className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor="isRequired" className="text-sm font-bold text-slate-700">Tiêu chí bắt buộc</label>
            </div>

          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Lưu Tiêu chí'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
