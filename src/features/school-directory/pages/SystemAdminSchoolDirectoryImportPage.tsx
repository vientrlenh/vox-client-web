import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router'
import { schoolDirectoryManagementQueryKeys } from '../api/useSchoolDirectoriesQuery'
import {
  useAcceptSchoolDirectoryImportMutation,
  usePreviewSchoolDirectoryImportMutation,
} from '../api/useSchoolDirectoryImportMutations'
import type { PreviewSchoolDirectoryImportResponse } from '../types'
import { formatSchoolDirectoryDate } from '../types'

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

type ImportField = {
  isRequired: boolean
  label: string
  value: string
}

const ACCEPTED_EXTENSIONS = ['csv', 'xlsx', 'xls']
const IMPORT_FIELDS: ImportField[] = [
  { isRequired: true, label: 'Mã trường', value: 'code' },
  { isRequired: true, label: 'Tên trường', value: 'name' },
  { isRequired: false, label: 'Mã tỉnh', value: 'provinceCode' },
  { isRequired: false, label: 'Tên tỉnh', value: 'provinceName' },
  { isRequired: false, label: 'Tên quận/huyện', value: 'districtName' },
  { isRequired: false, label: 'Domain', value: 'domain' },
  { isRequired: false, label: 'Địa chỉ', value: 'address' },
  { isRequired: false, label: 'Nguồn gốc', value: 'origin' },
]

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return undefined
}

function isAcceptedFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  return Boolean(extension && ACCEPTED_EXTENSIONS.includes(extension))
}

function createInitialMapping(preview: PreviewSchoolDirectoryImportResponse) {
  return preview.originalHeaders.reduce<Record<string, string>>(
    (result, header) => {
      result[header] = preview.suggestedMapping[header]?.trim() ?? ''
      return result
    },
    {},
  )
}

function getMissingRequiredFields(mapping: Record<string, string>) {
  const mappedFields = new Set(
    Object.values(mapping)
      .map((value) => value.trim())
      .filter(Boolean),
  )

  return IMPORT_FIELDS.filter(
    (field) => field.isRequired && !mappedFields.has(field.value),
  )
}

type SummaryCardProps = {
  label: string
  value: string | number
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
    </div>
  )
}

type MappingPanelProps = {
  mapping: Record<string, string>
  onChange: (header: string, value: string) => void
  preview: PreviewSchoolDirectoryImportResponse
}

function MappingPanel({ mapping, onChange, preview }: MappingPanelProps) {
  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-black text-slate-950">Ghép cột dữ liệu</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Chọn trường hệ thống tương ứng với từng cột trong file.
        </p>
      </div>

      <div className="grid gap-3">
        {preview.originalHeaders.map((header) => (
          <label
            className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm font-bold text-slate-700 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center"
            key={header}
          >
            <span className="truncate">{header}</span>
            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
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
  )
}

type SampleRowsTableProps = {
  preview: PreviewSchoolDirectoryImportResponse
}

function SampleRowsTable({ preview }: SampleRowsTableProps) {
  if (!preview.sampleRows.length || !preview.originalHeaders.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500">
        Không có dữ liệu mẫu để hiển thị.
      </div>
    )
  }

  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-black text-slate-950">Dữ liệu mẫu</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Kiểm tra nhanh một số dòng đầu tiên trước khi import.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
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
                  <td
                    className="max-w-64 truncate px-4 py-3 text-sm font-semibold text-slate-600"
                    key={header}
                  >
                    {row[header] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

type ImportResultPanelProps = {
  message: string
}

function ImportResultPanel({ message }: ImportResultPanelProps) {
  return (
    <section className="grid gap-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700">
          <CheckCircle2 aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-emerald-950">
            Đã nhận yêu cầu import
          </h2>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            {message}
          </p>
          <p className="mt-1 text-sm font-medium text-emerald-700">
            Quá trình import chạy nền (bất đồng bộ). Danh sách sẽ cập nhật dần khi
            hệ thống xử lý xong.
          </p>
        </div>
      </div>

      <Link
        className="inline-flex h-11 w-fit items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
        to="/system-admin/school-directory"
      >
        Quay lại danh mục trường
      </Link>
    </section>
  )
}

export function SystemAdminSchoolDirectoryImportPage() {
  const queryClient = useQueryClient()
  const previewMutation = usePreviewSchoolDirectoryImportMutation()
  const acceptMutation = useAcceptSchoolDirectoryImportMutation()
  const [preview, setPreview] =
    useState<PreviewSchoolDirectoryImportResponse | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<PageMessage | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const missingFields = getMissingRequiredFields(mapping)
  const canAccept = Boolean(preview) && missingFields.length === 0
  const isBusy = previewMutation.isPending || acceptMutation.isPending

  async function handleFileChange(file?: File) {
    if (!file) {
      return
    }

    if (!isAcceptedFile(file)) {
      setPreview(null)
      setResultMessage(null)
      setMessage({
        text: 'File không hợp lệ. Vui lòng chọn file CSV hoặc Excel.',
        tone: 'error',
      })
      return
    }

    try {
      setMessage(null)
      setResultMessage(null)
      const nextPreview = await previewMutation.mutateAsync({ file })

      setPreview(nextPreview.data)
      setMapping(createInitialMapping(nextPreview.data))
      setMessage({ text: nextPreview.message, tone: 'success' })
    } catch (error) {
      setPreview(null)
      setResultMessage(null)
      setMessage({
        text:
          getErrorMessage(error) ??
          'Không thể đọc file import. Vui lòng kiểm tra lại file.',
        tone: 'error',
      })
    }
  }

  function handleMappingChange(header: string, value: string) {
    setMapping((current) => ({
      ...current,
      [header]: value,
    }))
  }

  async function handleAccept() {
    if (!preview) {
      return
    }

    if (!canAccept) {
      setMessage({
        text: `Vui lòng ghép đủ trường bắt buộc: ${missingFields
          .map((field) => field.label)
          .join(', ')}.`,
        tone: 'error',
      })
      return
    }

    try {
      setMessage(null)
      const response = await acceptMutation.mutateAsync({
        payload: {
          confirmedMapping: mapping,
        },
        sessionId: preview.importSessionId,
      })

      await queryClient.invalidateQueries({
        queryKey: schoolDirectoryManagementQueryKeys.all,
      })
      setResultMessage(response.message)
      setMessage({ text: response.message, tone: 'success' })
    } catch (error) {
      setMessage({
        text:
          getErrorMessage(error) ??
          'Không thể xác nhận import danh mục. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  const messageClassName =
    message?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section
      aria-labelledby="school-directory-import-title"
      className="grid gap-6 text-slate-950"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav
            aria-label="Đường dẫn"
            className="flex items-center gap-2 text-sm font-bold text-slate-500"
          >
            <Link
              className="transition hover:text-blue-800"
              to="/system-admin/school-directory"
            >
              Danh mục trường
            </Link>
            <span aria-hidden="true">/</span>
            <span>Import danh mục</span>
          </nav>
          <h1
            className="mt-4 text-3xl font-black tracking-0 text-slate-950"
            id="school-directory-import-title"
          >
            Import danh mục trường
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Tải lên file CSV hoặc Excel, kiểm tra mapping cột và xác nhận import
            danh mục trường vào hệ thống.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-blue-950 shadow-sm shadow-slate-950/5 transition hover:bg-slate-50"
          to="/system-admin/school-directory"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại
        </Link>
      </div>

      {message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${messageClassName}`}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
            <FileSpreadsheet aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Chọn file import
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Hỗ trợ file .csv, .xlsx và .xls.
            </p>
          </div>
        </div>

        <label className="grid cursor-pointer place-items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-cyan-400 hover:bg-cyan-50">
          <Upload aria-hidden="true" className="size-8 text-cyan-700" />
          <span className="text-sm font-black text-slate-950">
            Chọn file CSV hoặc Excel
          </span>
          <span className="text-xs font-semibold text-slate-500">
            File cần có tối thiểu mã trường và tên trường.
          </span>
          <input
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            disabled={isBusy}
            onChange={(event) => {
              void handleFileChange(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
            type="file"
          />
        </label>

        {previewMutation.isPending ? (
          <div
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
            role="status"
          >
            <RefreshCw aria-hidden="true" className="size-4 animate-spin" />
            Đang đọc file import...
          </div>
        ) : null}
      </section>

      {preview ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Tên file" value={preview.fileName} />
            <SummaryCard label="Tổng số dòng" value={preview.totalRows} />
            <SummaryCard
              label="Số cột"
              value={preview.originalHeaders.length}
            />
            <SummaryCard
              label="Hết hạn"
              value={formatSchoolDirectoryDate(preview.expiresAt)}
            />
          </div>

          <MappingPanel
            mapping={mapping}
            onChange={handleMappingChange}
            preview={preview}
          />

          {missingFields.length ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
              role="alert"
            >
              Cần ghép đủ trường bắt buộc:{' '}
              {missingFields.map((field) => field.label).join(', ')}.
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Mapping đã đủ các trường bắt buộc.
            </div>
          )}

          <SampleRowsTable preview={preview} />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isBusy}
              onClick={() => {
                setPreview(null)
                setResultMessage(null)
                setMapping({})
                setMessage(null)
              }}
              type="button"
            >
              Chọn file khác
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!canAccept || isBusy}
              onClick={() => {
                void handleAccept()
              }}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {acceptMutation.isPending ? 'Đang import...' : 'Xác nhận import'}
            </button>
          </div>
        </>
      ) : null}

      {resultMessage ? <ImportResultPanel message={resultMessage} /> : null}
    </section>
  )
}
