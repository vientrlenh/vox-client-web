// src/features/rubrics/components/RubricFormDialog.tsx

import { useState } from 'react'; // Đã xóa import useEffect
import { X, Loader2 } from 'lucide-react';
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast';

type RubricFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData?: { name: string; description?: string | null };
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
  isPending: boolean;
};

export function RubricFormDialog({ isOpen, onClose, initialData, onSubmit, isPending }: RubricFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Kỹ thuật React 19: Lưu lại prop isOpen của lần render trước để so sánh
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const { showError, feedbackToast } = useFeedbackToast();

  // Cập nhật state trực tiếp trong lúc render thay vì dùng useEffect
  // Giúp tránh render 2 lần (Cascading Renders) và fix triệt để lỗi ESLint
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen && initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
    } else if (!isOpen) {
      setName('');
      setDescription('');
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Vui lòng nhập tên Rubric!');
      return;
    }
    // Để trống thì gửi undefined (không đổi), không gửi chuỗi rỗng -- BE COALESCE chỉ giữ nguyên
    // giá trị cũ khi field là null/không có, chuỗi rỗng "" bị coi là giá trị thật.
    await onSubmit({ name, description: description.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      {/* Lớp nền đen mờ (Click ra ngoài để đóng nếu không đang load) */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
        onClick={!isPending ? onClose : undefined}
      />
      {feedbackToast}

      {/* Box Dialog */}
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Chỉnh sửa thông tin Rubric</h2>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isPending} 
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-5">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-bold text-slate-700">
                Tên Rubric <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50"
                placeholder="Ví dụ: Khung chấm điểm Đồ án..."
              />
            </div>
            
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-bold text-slate-700">
                Mô tả
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50"
                placeholder="Nhập mô tả chi tiết (không bắt buộc)..."
              />
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isPending} 
              className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              disabled={isPending} 
              className="inline-flex min-w-30 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}