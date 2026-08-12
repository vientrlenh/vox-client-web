// src/features/rubrics/components/CreateRubricDialog.tsx

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast';
import type { CreateRubricPayload } from '../api/useCreateSystemRubricMutation';

type CreateRubricDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRubricPayload) => Promise<void>;
  isPending: boolean;
  frameworks: { id: string; name: string }[];
  languages: { id: string; name: string }[];
};

export function CreateRubricDialog({ isOpen, onClose, onSubmit, isPending, frameworks, languages }: CreateRubricDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frameworkId, setFrameworkId] = useState('');
  const [languageId, setLanguageId] = useState('');

  // Reset Form khi mở lại
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const { showError, feedbackToast } = useFeedbackToast();
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setCode('');
      setName('');
      setDescription('');
      setFrameworkId('');
      setLanguageId('');
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !frameworkId || !languageId) {
      showError('Vui lòng nhập đầy đủ các trường bắt buộc!');
      return;
    }
    await onSubmit({ code, name, description, frameworkId, languageId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity" onClick={!isPending ? onClose : undefined} />
      {feedbackToast}

      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Thêm mới Rubric</h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Mã Rubric <span className="text-red-500">*</span></label>
                <input
                  type="text" value={code} onChange={(e) => setCode(e.target.value)} disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                  placeholder="VD: ENG-B1" maxLength={50}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Ngôn ngữ <span className="text-red-500">*</span></label>
                <select
                  value={languageId} onChange={(e) => setLanguageId(e.target.value)} disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                >
                  <option value="">-- Chọn ngôn ngữ --</option>
                  {languages.map(lang => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Khung năng lực <span className="text-red-500">*</span></label>
              <select
                value={frameworkId} onChange={(e) => setFrameworkId(e.target.value)} disabled={isPending}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
              >
                <option value="">-- Chọn khung năng lực --</option>
                {frameworks.map(fw => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Tên Rubric <span className="text-red-500">*</span></label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                placeholder="VD: Khung chấm điểm Tiếng Anh B1..." maxLength={255}
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Mô tả</label>
              <textarea
                rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                placeholder="Nhập mô tả chi tiết (không bắt buộc)..." maxLength={2048}
              />
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Hủy bỏ</button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-30 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}