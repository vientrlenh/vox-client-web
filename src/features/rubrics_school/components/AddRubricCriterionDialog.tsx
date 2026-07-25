// src/features/rubrics/components/AddRubricCriterionDialog.tsx

import { useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
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
};

// Cấu trúc thật của examplesJson trả về từ Backend: { "values": [{ transcript, explanation, expectedScore }] }
type ExampleItem = {
  transcript: string;
  explanation: string;
  expectedScore: number;
};

const EMPTY_EXAMPLE: ExampleItem = { transcript: '', explanation: '', expectedScore: 0 };

export function AddRubricCriterionDialog({ isOpen, onClose, onSubmit, isPending, frameworkId, scoringScaleMin, scoringScaleMax }: Props) {
  const [formData, setFormData] = useState({
    frameworkCriterionId: '',
    code: '',
    name: '',
    description: '',
    weight: 0,
    minScore: scoringScaleMin,
    maxScore: scoringScaleMax,
    order: 1,
    isRequired: false,
  });
  const [examples, setExamples] = useState<ExampleItem[]>([EMPTY_EXAMPLE]);
  const [frameworkVersionId, setFrameworkVersionId] = useState('');

  const { data: frameworkVersions, isLoading: isLoadingVersions } = useFrameworkVersionsQuery(frameworkId);
  const { data: frameworkCriteria, isLoading: isLoadingCriteria } = useFrameworkVersionCriteriaQuery(frameworkVersionId || undefined);

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

    if (!formData.frameworkCriterionId.trim()) {
      alert('Lỗi: Vui lòng chọn Framework Version và Framework Criterion!');
      return;
    }

    const min = Number(formData.minScore);
    const max = Number(formData.maxScore);
    if (min >= max) {
      alert('Lỗi: Điểm tối thiểu (Min) phải nhỏ hơn Điểm tối đa (Max)!');
      return;
    }
    if (min < scoringScaleMin || max > scoringScaleMax) {
      alert(`Lỗi: Điểm tiêu chí phải nằm trong thang điểm tổng của Rubric Version (${scoringScaleMin} – ${scoringScaleMax})!`);
      return;
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
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          examples: cleanedExamples.length > 0 ? cleanedExamples : undefined,
          weight: Number(formData.weight),
          minScore: min,
          maxScore: max,
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

      <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Thêm Tiêu chí Mới</h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
          <div className="grid gap-5 sm:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Framework Version</label>
              <select
                value={frameworkVersionId}
                onChange={(e) => handleFrameworkVersionChange(e.target.value)}
                disabled={isPending || !frameworkId || isLoadingVersions}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
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
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
              >
                <option value="">{isLoadingCriteria ? 'Đang tải...' : '-- Chọn framework criterion --'}</option>
                {frameworkCriteria?.map((fc) => (
                  <option key={fc.id} value={fc.id}>{fc.code} - {fc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Mã Code</label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div>
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
              <input type="number" step="0.1" value={formData.minScore} onChange={(e) => setFormData({ ...formData, minScore: e.target.value === '' ? 0 : Number(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Điểm tối đa (Max)</label>
              <input type="number" step="0.1" value={formData.maxScore} onChange={(e) => setFormData({ ...formData, maxScore: e.target.value === '' ? 0 : Number(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
              <p className="mt-1 text-xs text-slate-400">Phải nằm trong thang điểm tổng: {scoringScaleMin} – {scoringScaleMax}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Thứ tự (Order)</label>
              <input type="number" min="1" value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value === '' ? 1 : parseInt(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isRequired" checked={formData.isRequired} onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })} disabled={isPending} className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
              <label htmlFor="isRequired" className="text-sm font-bold text-slate-700">Tiêu chí bắt buộc</label>
            </div>

          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Lưu Tiêu chí'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
