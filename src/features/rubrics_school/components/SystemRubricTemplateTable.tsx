// src/features/rubrics/components/SystemRubricTemplateTable.tsx

import { Copy, LibraryBig, RefreshCw } from 'lucide-react';
import type { SystemRubricTemplate } from '../api/useSystemRubricTemplatesQuery';

type SystemRubricTemplateTableProps = {
  templates: SystemRubricTemplate[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onClone: (template: SystemRubricTemplate) => void;
};

export function SystemRubricTemplateTable({
  templates,
  isLoading,
  isError,
  onRetry,
  onClone,
}: SystemRubricTemplateTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3">
        <RefreshCw className="size-6 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải thư viện bản mẫu...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-red-600">Đã có lỗi xảy ra khi tải dữ liệu.</p>
        <button
          onClick={onRetry}
          className="text-sm font-bold text-indigo-600 underline hover:text-indigo-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-500">
        <LibraryBig className="size-8 text-slate-300" />
        <p className="text-sm">Chưa có bộ tiêu chí mẫu nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
          <tr>
            <th className="px-4 py-3">Mã</th>
            <th className="px-4 py-3">Tên bộ tiêu chí mẫu</th>
            <th className="px-4 py-3">Ngôn ngữ</th>
            <th className="px-4 py-3">Khung năng lực</th>
            <th className="px-4 py-3">Phiên bản đã ban hành</th>
            <th className="px-4 py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {templates.map((template) => {
            // Bản mẫu chưa ban hành phiên bản nào thì backend cũng sẽ từ chối sao; chặn ngay ở đây
            // để người dùng không phải mở modal rồi mới gặp lỗi.
            const publishedCount = template.publishedVersions?.totalElements ?? 0;
            const isCloneable = publishedCount > 0;

            return (
              <tr key={template.id} className="transition hover:bg-indigo-50/50">
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">{template.code}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{template.name}</p>
                  {template.description && (
                    <p className="mt-0.5 line-clamp-2 max-w-md text-xs text-slate-500">
                      {template.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{template.language?.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{template.framework?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  {isCloneable ? (
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      {publishedCount} phiên bản
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/20">
                      Chưa ban hành
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onClone(template)}
                    disabled={!isCloneable}
                    title={isCloneable ? undefined : 'Bản mẫu chưa có phiên bản nào được ban hành'}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                  >
                    <Copy className="size-4" /> Xem &amp; sao về trường
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
