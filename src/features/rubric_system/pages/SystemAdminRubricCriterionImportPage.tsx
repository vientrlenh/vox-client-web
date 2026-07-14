// src/features/rubric_system/pages/SystemAdminRubricCriterionImportPage.tsx

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react';
import { fetchImportSessionStatus } from '@/features/imports';
import { usePreviewSystemRubricCriterionImportMutation } from '../api/usePreviewSystemRubricCriterionImportMutation';
import { useAcceptSystemRubricCriterionImportMutation } from '../api/useAcceptSystemRubricCriterionImportMutation';
import { searchRubricCriteriaKeys } from '../api/useSearchSystemRubricCriteriaQuery';
import { formatRubricImportDate } from '../types';
import type { PreviewRubricCriterionImportResponse } from '../types';

const TERMINAL_IMPORT_STATUSES = ['COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'];

// Import chạy ngầm (async) ở BE, nên sau khi accept phải chờ session
// chuyển sang trạng thái cuối rồi mới invalidate cache + điều hướng,
// nếu không danh sách tiêu chí vẫn rỗng cho tới khi người dùng tự F5.
async function waitForImportSessionToFinish(sessionId: string, maxAttempts = 20, intervalMs = 1500) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const session = await fetchImportSessionStatus(sessionId);
    const status = session?.status?.trim().toUpperCase();
    if (status && TERMINAL_IMPORT_STATUSES.includes(status)) {
      return session;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

type PageMessage = {
  text: string;
  tone: 'error' | 'success';
};

type ImportField = {
  isRequired: boolean;
  label: string;
  value: string;
};

const ACCEPTED_EXTENSIONS = ['csv', 'xlsx', 'xls'];
const IMPORT_FIELDS: ImportField[] = [
  { isRequired: true, label: 'Mã Khung tiêu chuẩn (code, VD: GRAMMAR, FLUENCY, PRONUNCIATION...)', value: 'frameworkCriterionCode' },
  { isRequired: true, label: 'Mã Code', value: 'code' },
  { isRequired: true, label: 'Tên Tiêu chí', value: 'name' },
  { isRequired: false, label: 'Mô tả', value: 'description' },
  { isRequired: true, label: 'Trọng số (Weight)', value: 'weight' },
  { isRequired: true, label: 'Điểm tối thiểu (Min)', value: 'minScore' },
  { isRequired: true, label: 'Điểm tối đa (Max)', value: 'maxScore' },
  { isRequired: true, label: 'Thứ tự (Order)', value: 'order' },
  { isRequired: true, label: 'Bắt buộc (true/false)', value: 'isRequired' },
  { isRequired: false, label: 'Ví dụ minh họa (mỗi ví dụ cách nhau bằng dấu ";")', value: 'examples' },
];

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
}

function isAcceptedFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return Boolean(extension && ACCEPTED_EXTENSIONS.includes(extension));
}

function createInitialMapping(preview: PreviewRubricCriterionImportResponse) {
  return preview.originalHeaders.reduce<Record<string, string>>((result, header) => {
    result[header] = preview.suggestedMapping[header]?.trim() ?? '';
    return result;
  }, {});
}

function getMissingRequiredFields(mapping: Record<string, string>) {
  const mappedFields = new Set(
    Object.values(mapping)
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return IMPORT_FIELDS.filter((field) => field.isRequired && !mappedFields.has(field.value));
}

type SummaryCardProps = {
  label: string;
  value: string | number;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

type MappingPanelProps = {
  mapping: Record<string, string>;
  onChange: (header: string, value: string) => void;
  preview: PreviewRubricCriterionImportResponse;
};

function MappingPanel({ mapping, onChange, preview }: MappingPanelProps) {
  return (
    <section className="grid gap-5 rounded-[14px] border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-medium text-slate-950">Ghép cột dữ liệu</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chọn trường hệ thống tương ứng với từng cột trong file.
        </p>
      </div>

      <div className="grid gap-3">
        {preview.originalHeaders.map((header) => (
          <label
            className="grid gap-3 rounded-[10px] border border-slate-200 p-3 text-sm font-bold text-slate-700 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center"
            key={header}
          >
            <span className="truncate">{header}</span>
            <select
              className="h-10 rounded-[10px] border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              onChange={(event) => onChange(header, event.target.value)}
              value={mapping[header] ?? ''}
            >
              <option value="">Bỏ qua cột này</option>
              {IMPORT_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                  {field.isRequired ? ' *' : ''}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

type SampleRowsTableProps = {
  preview: PreviewRubricCriterionImportResponse;
};

function SampleRowsTable({ preview }: SampleRowsTableProps) {
  if (!preview.sampleRows.length || !preview.originalHeaders.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500">
        Không có dữ liệu mẫu để hiển thị.
      </div>
    );
  }

  return (
    <section className="grid gap-5 rounded-[14px] border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-medium text-slate-950">Dữ liệu mẫu</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kiểm tra nhanh một số dòng đầu tiên trước khi import.
        </p>
      </div>
      <div className="overflow-x-auto rounded-[10px] border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              {preview.originalHeaders.map((header) => (
                <th className="px-4 py-3" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.sampleRows.map((row, index) => (
              <tr className="bg-white" key={index}>
                {preview.originalHeaders.map((header) => (
                  <td className="max-w-64 truncate px-4 py-3 text-sm font-medium text-slate-600" key={header}>
                    {row[header] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SystemAdminRubricCriterionImportPage() {
  const { rubricId, versionId } = useParams<{ rubricId: string; versionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const previewMutation = usePreviewSystemRubricCriterionImportMutation(versionId);
  const acceptMutation = useAcceptSystemRubricCriterionImportMutation();

  const [preview, setPreview] = useState<PreviewRubricCriterionImportResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [isWaitingForResult, setIsWaitingForResult] = useState(false);

  const missingFields = getMissingRequiredFields(mapping);
  const canAccept = Boolean(preview) && missingFields.length === 0;
  const isBusy = previewMutation.isPending || acceptMutation.isPending || isWaitingForResult;

  async function handleFileChange(file?: File) {
    if (!file) return;

    if (!isAcceptedFile(file)) {
      setPreview(null);
      setMessage({ text: 'File không hợp lệ. Vui lòng chọn file CSV hoặc Excel.', tone: 'error' });
      return;
    }

    try {
      setMessage(null);
      const nextPreview = await previewMutation.mutateAsync(file);

      setPreview(nextPreview.data);
      setMapping(createInitialMapping(nextPreview.data));
      setMessage({ text: nextPreview.message, tone: 'success' });
    } catch (error) {
      setPreview(null);
      setMessage({
        text: getErrorMessage(error) ?? 'Không thể đọc file import. Vui lòng kiểm tra lại file.',
        tone: 'error',
      });
    }
  }

  function handleMappingChange(header: string, value: string) {
    setMapping((current) => ({ ...current, [header]: value }));
  }

  async function handleAccept() {
    if (!preview) return;

    if (!canAccept) {
      setMessage({
        text: `Vui lòng ghép đủ trường bắt buộc: ${missingFields.map((field) => field.label).join(', ')}.`,
        tone: 'error',
      });
      return;
    }

    try {
      setMessage(null);
      const response = await acceptMutation.mutateAsync({
        payload: { confirmedMapping: mapping },
        sessionId: preview.importSessionId,
      });

      // BE xử lý import ở hàng đợi ngầm (async), nên phải chờ session
      // chuyển sang trạng thái cuối rồi mới invalidate cache, nếu không
      // danh sách tiêu chí vẫn rỗng cho tới khi người dùng tự F5.
      setIsWaitingForResult(true);
      const finishedSession = await waitForImportSessionToFinish(preview.importSessionId);
      setIsWaitingForResult(false);

      await queryClient.invalidateQueries({ queryKey: searchRubricCriteriaKeys.all });

      if (finishedSession) {
        alert(
          `Import hoàn tất (${finishedSession.status}). Đã import ${finishedSession.importedRows}/${finishedSession.totalRows} dòng.`
        );
      } else {
        alert(response.message || 'Import đang được xử lý trong nền, vui lòng kiểm tra lại sau ít phút.');
      }

      navigate(`/system-admin/rubrics/${rubricId ?? ''}/versions/${versionId ?? ''}`);
    } catch (error) {
      setIsWaitingForResult(false);
      setMessage({
        text: getErrorMessage(error) ?? 'Không thể xác nhận import tiêu chí. Vui lòng thử lại.',
        tone: 'error',
      });
    }
  }

  const messageClassName =
    message?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700';

  const backToVersionUrl = `/system-admin/rubrics/${rubricId ?? ''}/versions/${versionId ?? ''}`;

  return (
    <section aria-labelledby="system-rubric-criterion-import-title" className="grid gap-6 font-['Be_Vietnam_Pro',sans-serif] text-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav aria-label="Đường dẫn" className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Link className="transition hover:text-indigo-600" to={backToVersionUrl}>
              Chi tiết Phiên bản
            </Link>
            <span aria-hidden="true" className="text-slate-300">/</span>
            <span className="text-slate-950">Import Tiêu chí hàng loạt</span>
          </nav>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950" id="system-rubric-criterion-import-title">
            Import Tiêu chí hàng loạt
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
            Tải lên file CSV hoặc Excel, kiểm tra mapping cột và xác nhận import các Tiêu chí Rubric mới.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
          to={backToVersionUrl}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại
        </Link>
      </div>

      {message ? (
        <div
          className={`flex items-center gap-2.5 rounded-[10px] border px-4 py-3.5 text-sm font-semibold ${messageClassName}`}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.tone === 'success' ? (
            <CheckCircle2 aria-hidden="true" className="size-[18px] shrink-0" />
          ) : (
            <AlertTriangle aria-hidden="true" className="size-[18px] shrink-0" />
          )}
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-5 rounded-[14px] border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
            <FileSpreadsheet aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-medium text-slate-950">Chọn file import</h2>
            <p className="mt-1 text-sm text-slate-500">Hỗ trợ file .csv, .xlsx và .xls.</p>
          </div>
        </div>

        <label className="grid cursor-pointer place-items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40">
          <span className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Upload aria-hidden="true" className="size-[26px]" />
          </span>
          <span className="text-[15px] font-bold text-slate-950">Chọn file CSV hoặc Excel</span>
          <span className="max-w-md text-[13px] leading-6 text-slate-500">
            File cần có Mã Khung tiêu chuẩn (code), Mã Code, Tên tiêu chí, trọng số và thang điểm.
          </span>
          <input
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            disabled={isBusy}
            onChange={(event) => {
              void handleFileChange(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
            type="file"
          />
        </label>

        {previewMutation.isPending ? (
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600" role="status">
            <RefreshCw aria-hidden="true" className="size-4 animate-spin" />
            Đang đọc file import...
          </div>
        ) : null}
      </section>

      {preview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Tên file" value={preview.fileName} />
            <SummaryCard label="Tổng số dòng" value={preview.totalRows} />
            <SummaryCard label="Số cột" value={preview.originalHeaders.length} />
            <SummaryCard label="Hết hạn" value={formatRubricImportDate(preview.expiresAt)} />
          </div>

          <MappingPanel mapping={mapping} onChange={handleMappingChange} preview={preview} />

          {missingFields.length ? (
            <div className="flex items-center gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-700" role="alert">
              <AlertTriangle aria-hidden="true" className="size-[18px] shrink-0" />
              Cần ghép đủ trường bắt buộc: {missingFields.map((field) => field.label).join(', ')}.
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 aria-hidden="true" className="size-[18px] shrink-0" />
              Mapping đã đủ các trường bắt buộc.
            </div>
          )}

          <SampleRowsTable preview={preview} />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isBusy}
              onClick={() => {
                setPreview(null);
                setMapping({});
                setMessage(null);
              }}
              type="button"
            >
              Chọn file khác
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canAccept || isBusy}
              onClick={() => {
                void handleAccept();
              }}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {isWaitingForResult
                ? 'Đang xử lý dữ liệu...'
                : acceptMutation.isPending
                  ? 'Đang gửi yêu cầu...'
                  : 'Xác nhận import'}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
