// src/features/rubrics/pages/SchoolAdminRubricResultBandImportPage.tsx

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react';
import { useAppSelector } from '@/app/store/hooks';
import { buildImportSessionDetailPath, type ImportSessionNavState } from '@/features/imports';
import { usePreviewSchoolRubricResultBandImportMutation } from '../api/usePreviewSchoolRubricResultBandImportMutation';
import { useAcceptSchoolRubricResultBandImportMutation } from '../api/useAcceptSchoolRubricResultBandImportMutation';
import { searchRubricResultBandKeys } from '../api/useSearchSchoolRubricResultBandsQuery';
import { formatRubricImportDate } from '../types';
import type { PreviewRubricResultBandImportResponse } from '../types';


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
  { isRequired: true, label: 'Mã Band', value: 'code' },
  { isRequired: true, label: 'Tên Mức điểm', value: 'name' },
  { isRequired: false, label: 'Mô tả', value: 'description' },
  { isRequired: true, label: 'Điểm tối thiểu (Min)', value: 'scoreMin' },
  { isRequired: true, label: 'Điểm tối đa (Max)', value: 'scoreMax' },
  { isRequired: true, label: 'Thứ tự (Order)', value: 'order' },
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

function createInitialMapping(preview: PreviewRubricResultBandImportResponse) {
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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

type MappingPanelProps = {
  mapping: Record<string, string>;
  onChange: (header: string, value: string) => void;
  preview: PreviewRubricResultBandImportResponse;
};

function MappingPanel({ mapping, onChange, preview }: MappingPanelProps) {
  return (
    <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-medium text-slate-950">Ghép cột dữ liệu</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chọn trường hệ thống tương ứng với từng cột trong file.
        </p>
      </div>

      <div className="grid gap-3">
        {preview.originalHeaders.map((header) => (
          <label
            className="grid gap-3 rounded-lg border border-slate-200 p-3 text-sm font-bold text-slate-700 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center"
            key={header}
          >
            <span className="truncate">{header}</span>
            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
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
  preview: PreviewRubricResultBandImportResponse;
};

function SampleRowsTable({ preview }: SampleRowsTableProps) {
  if (!preview.sampleRows.length || !preview.originalHeaders.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500">
        Không có dữ liệu mẫu để hiển thị.
      </div>
    );
  }

  return (
    <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-medium text-slate-950">Dữ liệu mẫu</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kiểm tra nhanh một số dòng đầu tiên trước khi import.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
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

export function SchoolAdminRubricResultBandImportPage() {
  const { rubricId, versionId } = useParams<{ rubricId: string; versionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  const previewMutation = usePreviewSchoolRubricResultBandImportMutation(schoolId, versionId);
  const acceptMutation = useAcceptSchoolRubricResultBandImportMutation(schoolId);

  const [preview, setPreview] = useState<PreviewRubricResultBandImportResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<PageMessage | null>(null);

  const missingFields = getMissingRequiredFields(mapping);
  const canAccept = Boolean(preview) && missingFields.length === 0;
  const isBusy = previewMutation.isPending || acceptMutation.isPending;

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

      setPreview(nextPreview);
      setMapping(createInitialMapping(nextPreview));
      setMessage({ text: 'Đã đọc file thành công. Vui lòng kiểm tra mapping bên dưới.', tone: 'success' });
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
      await acceptMutation.mutateAsync({
        payload: { confirmedMapping: mapping },
        sessionId: preview.sessionId,
      });

      await queryClient.invalidateQueries({ queryKey: searchRubricResultBandKeys.all });

      // Backend import ngầm nên số liệu trả về lúc này chưa phải kết quả cuối:
      // chuyển sang trang chi tiết phiên import để theo dõi trạng thái file.
      navigate(buildImportSessionDetailPath('/school-admin', preview.sessionId), {
        state: {
          invalidateKeys: [searchRubricResultBandKeys.all],
          returnLabel: 'Quay lại phiên bản rubric',
          returnTo: `/school-admin/rubrics/${rubricId ?? ''}/versions/${versionId ?? ''}`,
        } satisfies ImportSessionNavState,
      });
    } catch (error) {
      setMessage({
        text: getErrorMessage(error) ?? 'Không thể xác nhận import thang điểm. Vui lòng thử lại.',
        tone: 'error',
      });
    }
  }

  const messageClassName =
    message?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700';

  const backToVersionUrl = `/school-admin/rubrics/${rubricId ?? ''}/versions/${versionId ?? ''}`;

  return (
    <section aria-labelledby="school-rubric-resultband-import-title" className="grid gap-6 text-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav aria-label="Đường dẫn" className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Link className="transition hover:text-indigo-600" to={backToVersionUrl}>
              Chi tiết Phiên bản
            </Link>
            <span aria-hidden="true" className="text-slate-300">/</span>
            <span className="text-slate-950">Import Thang điểm hàng loạt</span>
          </nav>
          <h1 className="mt-3 text-2xl font-black text-blue-950 sm:text-3xl" id="school-rubric-resultband-import-title">
            Import Thang điểm hàng loạt
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Tải lên file CSV hoặc Excel, kiểm tra mapping cột và xác nhận import các Thang điểm kết quả (Result Band) mới.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          to={backToVersionUrl}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại
        </Link>
      </div>

      {message ? (
        <div
          className={`flex items-center gap-2.5 rounded-lg border px-4 py-3.5 text-sm font-semibold ${messageClassName}`}
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

      <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <FileSpreadsheet aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-medium text-slate-950">Chọn file import</h2>
            <p className="mt-1 text-sm text-slate-500">Hỗ trợ file .csv, .xlsx và .xls.</p>
          </div>
        </div>

        <label className="grid cursor-pointer place-items-center gap-3 rounded-lg border-[1.5px] border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40">
          <span className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Upload aria-hidden="true" className="size-[26px]" />
          </span>
          <span className="text-[15px] font-bold text-slate-950">Chọn file CSV hoặc Excel</span>
          <span className="max-w-md text-[13px] leading-6 text-slate-500">
            File cần có Mã Band, Tên Mức điểm, Điểm tối thiểu, Điểm tối đa và Thứ tự.
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
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-700" role="alert">
              <AlertTriangle aria-hidden="true" className="size-[18px] shrink-0" />
              Cần ghép đủ trường bắt buộc: {missingFields.map((field) => field.label).join(', ')}.
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 aria-hidden="true" className="size-[18px] shrink-0" />
              Mapping đã đủ các trường bắt buộc.
            </div>
          )}

          <SampleRowsTable preview={preview} />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canAccept || isBusy}
              onClick={() => {
                void handleAccept();
              }}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {acceptMutation.isPending ? 'Đang gửi yêu cầu...' : 'Xác nhận import'}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
