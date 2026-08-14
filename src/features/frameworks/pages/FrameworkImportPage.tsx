// src/features/frameworks/pages/FrameworkImportPage.tsx
//
// 1 component dùng chung cho cả 4 luồng import khung đánh giá năng lực
// (phiên bản / tiêu chí / thang kết quả / mức đánh giá tiêu chí) — Preview →
// Accept → theo dõi kết quả ở trang chi tiết phiên import (features/imports).
// 4 khác biệt còn lại (endpoint, trường hệ thống, breadcrumb...) truyền vào
// qua FrameworkImportPageConfig.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  RefreshCw,
  Upload,
} from 'lucide-react'
import {
  buildImportSessionDetailPath,
  type ImportSessionNavState,
} from '@/features/imports'
import { getImportFields, getMissingRequiredFields } from '@/features/imports/importFields'
import { useFrameworkVersionQuery } from '../api/useFrameworkVersionQuery'
import { frameworkQueryKeys } from '../api/useFrameworksQuery'
import {
  useAcceptFrameworkCriterionBandImportMutation,
  useAcceptFrameworkCriterionImportMutation,
  useAcceptFrameworkResultBandImportMutation,
  useAcceptFrameworkVersionImportMutation,
  usePreviewFrameworkCriterionBandImportMutation,
  usePreviewFrameworkCriterionImportMutation,
  usePreviewFrameworkResultBandImportMutation,
  usePreviewFrameworkVersionImportMutation,
} from '../api/useFrameworkImportMutations'
import type {
  AcceptFrameworkImportRequest,
  AcceptFrameworkImportResponse,
  PreviewFrameworkImportResponse,
} from '../types'

const ACCEPTED_EXTENSIONS = ['csv', 'xlsx', 'xls']

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

export type FrameworkImportPageConfig = {
  // FRAMEWORK_VERSION | FRAMEWORK_CRITERION | FRAMEWORK_RESULT_BAND | FRAMEWORK_CRITERION_BAND
  importType: string
  pageTitle: string
  breadcrumbLabel: string
  description: string
  uploadHint: string
  backUrl: string
  backLabel: string
  invalidateKeys: readonly (readonly unknown[])[]
  // Criterion/ResultBand/CriterionBand chỉ import được khi versionId đang DRAFT.
  requireDraftVersionId?: string
  // Hook phải được gọi ở component gọi (không phải trong callback) nên nhận
  // thẳng kết quả mutation đã invoke, không nhận hàm hook.
  previewMutation: UseMutationResult<
    { data: PreviewFrameworkImportResponse; message: string },
    unknown,
    File
  >
  acceptMutation: UseMutationResult<
    { data: AcceptFrameworkImportResponse; message: string },
    unknown,
    { payload: AcceptFrameworkImportRequest; sessionId: string }
  >
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

function isAcceptedFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return Boolean(extension && ACCEPTED_EXTENSIONS.includes(extension))
}

function createInitialMapping(preview: PreviewFrameworkImportResponse) {
  return preview.originalHeaders.reduce<Record<string, string>>((result, header) => {
    result[header] = preview.suggestedMapping[header]?.trim() ?? ''
    return result
  }, {})
}

export function FrameworkImportPage(config: FrameworkImportPageConfig) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const importFields = getImportFields(config.importType)
  const { previewMutation, acceptMutation } = config

  const [preview, setPreview] = useState<PreviewFrameworkImportResponse | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<PageMessage | null>(null)

  // Bản thân điều hướng vào trang này cũng phải chặn nếu version không phải
  // DRAFT (không chỉ chặn ở nút vào trang), phòng khi người dùng vào thẳng URL.
  const versionQuery = useFrameworkVersionQuery(config.requireDraftVersionId ?? null)
  const blockedByVersionStatus =
    Boolean(config.requireDraftVersionId) &&
    versionQuery.data != null &&
    versionQuery.data.status !== 'DRAFT'

  const missingFields = getMissingRequiredFields(importFields, mapping)
  const canAccept = Boolean(preview) && missingFields.length === 0
  const isBusy = previewMutation.isPending || acceptMutation.isPending

  async function handleFileChange(file?: File) {
    if (!file) return

    if (!isAcceptedFile(file)) {
      setPreview(null)
      setMessage({ text: 'File không hợp lệ. Vui lòng chọn file CSV hoặc Excel.', tone: 'error' })
      return
    }

    try {
      setMessage(null)
      const nextPreview = await previewMutation.mutateAsync(file)

      setPreview(nextPreview.data)
      setMapping(createInitialMapping(nextPreview.data))
      setMessage({ text: nextPreview.message, tone: 'success' })
    } catch (error) {
      setPreview(null)
      setMessage({
        text: getErrorMessage(error) ?? 'Không thể đọc file import. Vui lòng kiểm tra lại file.',
        tone: 'error',
      })
    }
  }

  function handleMappingChange(header: string, value: string) {
    setMapping((current) => ({ ...current, [header]: value }))
  }

  async function handleAccept() {
    if (!preview) return

    if (!canAccept) {
      setMessage({
        text: `Vui lòng ghép đủ trường bắt buộc: ${missingFields.map((field) => field.label).join(', ')}.`,
        tone: 'error',
      })
      return
    }

    try {
      setMessage(null)
      await acceptMutation.mutateAsync({
        payload: { confirmedMapping: mapping },
        sessionId: preview.importSessionId,
      })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })

      // Accept chỉ chuyển PREVIEWED -> QUEUED và trả về ngay; commit thật chạy
      // ngầm ở backend nên số liệu ở đây luôn là 0 — sang trang chi tiết phiên
      // import để theo dõi trạng thái thật qua GraphQL poll.
      navigate(buildImportSessionDetailPath('/system-admin', preview.importSessionId), {
        state: {
          invalidateKeys: [frameworkQueryKeys.all, ...config.invalidateKeys],
          returnLabel: config.backLabel,
          returnTo: config.backUrl,
        } satisfies ImportSessionNavState,
      })
    } catch (error) {
      setMessage({
        text: getErrorMessage(error) ?? 'Không thể xác nhận import. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  const messageClassName =
    message?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section aria-labelledby="framework-import-title" className="grid gap-6 font-['Be_Vietnam_Pro',sans-serif] text-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav aria-label="Đường dẫn" className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Link className="transition hover:text-indigo-600" to={config.backUrl}>
              {config.breadcrumbLabel}
            </Link>
            <span aria-hidden="true" className="text-slate-300">/</span>
            <span className="text-slate-950">{config.pageTitle}</span>
          </nav>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950" id="framework-import-title">
            {config.pageTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">{config.description}</p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
          to={config.backUrl}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại
        </Link>
      </div>

      {blockedByVersionStatus ? (
        <div
          className="flex items-center gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-700"
          role="alert"
        >
          <AlertTriangle aria-hidden="true" className="size-[18px] shrink-0" />
          Phiên bản này không còn ở trạng thái Bản nháp nên không thể import. Chỉ phiên bản DRAFT mới cho phép import hàng loạt.
        </div>
      ) : (
        <>
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
              <span className="max-w-md text-[13px] leading-6 text-slate-500">{config.uploadHint}</span>
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
                <SummaryCard label="Hết hạn" value={formatExpiry(preview.expiresAt)} />
              </div>

              <MappingPanel
                fields={importFields}
                mapping={mapping}
                onChange={handleMappingChange}
                preview={preview}
              />

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
                    setPreview(null)
                    setMapping({})
                    setMessage(null)
                  }}
                  type="button"
                >
                  Chọn file khác
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canAccept || isBusy}
                  onClick={() => {
                    void handleAccept()
                  }}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  {acceptMutation.isPending ? 'Đang gửi yêu cầu...' : 'Xác nhận import'}
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  )
}

function formatExpiry(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

type SummaryCardProps = {
  label: string
  value: string | number
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  )
}

type ImportFieldOption = { hint?: string; isRequired: boolean; label: string; value: string }

type MappingPanelProps = {
  fields: ImportFieldOption[]
  mapping: Record<string, string>
  onChange: (header: string, value: string) => void
  preview: PreviewFrameworkImportResponse
}

function MappingPanel({ fields, mapping, onChange, preview }: MappingPanelProps) {
  return (
    <section className="grid gap-5 rounded-[14px] border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-medium text-slate-950">Ghép cột dữ liệu</h2>
        <p className="mt-1 text-sm text-slate-500">Chọn trường hệ thống tương ứng với từng cột trong file.</p>
      </div>

      <div className="grid gap-3">
        {preview.originalHeaders.map((header) => {
          const selected = fields.find((field) => field.value === mapping[header])

          return (
            <label
              className="grid gap-3 rounded-[10px] border border-slate-200 p-3 text-sm font-bold text-slate-700 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center"
              key={header}
            >
              <span className="flex items-center gap-1.5 truncate">
                {header}
                {selected?.hint ? (
                  <span className="text-slate-400" title={selected.hint}>
                    <HelpCircle aria-hidden="true" className="size-3.5" />
                  </span>
                ) : null}
              </span>
              <select
                className="h-10 rounded-[10px] border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                onChange={(event) => onChange(header, event.target.value)}
                value={mapping[header] ?? ''}
              >
                <option value="">Bỏ qua cột này</option>
                {fields.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                    {field.isRequired ? ' *' : ''}
                  </option>
                ))}
              </select>
              {selected?.hint ? <p className="text-xs font-medium text-slate-400 sm:col-span-2">{selected.hint}</p> : null}
            </label>
          )
        })}
      </div>
    </section>
  )
}

type SampleRowsTableProps = {
  preview: PreviewFrameworkImportResponse
}

function SampleRowsTable({ preview }: SampleRowsTableProps) {
  if (!preview.sampleRows.length || !preview.originalHeaders.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500">
        Không có dữ liệu mẫu để hiển thị.
      </div>
    )
  }

  return (
    <section className="grid gap-5 rounded-[14px] border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-medium text-slate-950">Dữ liệu mẫu</h2>
        <p className="mt-1 text-sm text-slate-500">Kiểm tra nhanh một số dòng đầu tiên trước khi import.</p>
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
  )
}

// ---- 4 trang cụ thể, chỉ khai báo cấu hình khác nhau ----

export function FrameworkVersionImportPage() {
  const { frameworkId } = useParams<{ frameworkId: string }>()
  const backUrl = `/system-admin/frameworks/${frameworkId ?? ''}`

  return (
    <FrameworkImportPage
      acceptMutation={useAcceptFrameworkVersionImportMutation()}
      backLabel="Quay lại khung đánh giá năng lực"
      backUrl={backUrl}
      breadcrumbLabel="Chi tiết khung đánh giá năng lực"
      description="Tải lên file CSV hoặc Excel, kiểm tra mapping cột và xác nhận import các phiên bản khung đánh giá năng lực mới."
      importType="FRAMEWORK_VERSION"
      invalidateKeys={[]}
      pageTitle="Import Phiên bản hàng loạt"
      previewMutation={usePreviewFrameworkVersionImportMutation(frameworkId)}
      uploadHint="File cần có số phiên bản, tên, ngày hiệu lực."
    />
  )
}

export function FrameworkCriterionImportPage() {
  const { frameworkId, versionId } = useParams<{ frameworkId: string; versionId: string }>()
  const backUrl = `/system-admin/frameworks/${frameworkId ?? ''}/versions/${versionId ?? ''}`

  return (
    <FrameworkImportPage
      acceptMutation={useAcceptFrameworkCriterionImportMutation()}
      backLabel="Quay lại phiên bản khung đánh giá năng lực"
      backUrl={backUrl}
      breadcrumbLabel="Chi tiết phiên bản"
      description="Tải lên file CSV hoặc Excel, kiểm tra mapping cột và xác nhận import các tiêu chí mới. Chỉ áp dụng cho phiên bản đang ở trạng thái Bản nháp."
      importType="FRAMEWORK_CRITERION"
      invalidateKeys={[]}
      pageTitle="Import Tiêu chí hàng loạt"
      previewMutation={usePreviewFrameworkCriterionImportMutation(versionId)}
      requireDraftVersionId={versionId}
      uploadHint="File cần có mã tiêu chí (thuộc danh sách mã cho phép), tên và thứ tự."
    />
  )
}

export function FrameworkResultBandImportPage() {
  const { frameworkId, versionId } = useParams<{ frameworkId: string; versionId: string }>()
  const backUrl = `/system-admin/frameworks/${frameworkId ?? ''}/versions/${versionId ?? ''}`

  return (
    <FrameworkImportPage
      acceptMutation={useAcceptFrameworkResultBandImportMutation()}
      backLabel="Quay lại phiên bản khung đánh giá năng lực"
      backUrl={backUrl}
      breadcrumbLabel="Chi tiết phiên bản"
      description="Tải lên file CSV hoặc Excel, kiểm tra mapping cột và xác nhận import các thang kết quả mới. Chỉ áp dụng cho phiên bản đang ở trạng thái Bản nháp."
      importType="FRAMEWORK_RESULT_BAND"
      invalidateKeys={[]}
      pageTitle="Import Thang kết quả hàng loạt"
      previewMutation={usePreviewFrameworkResultBandImportMutation(versionId)}
      requireDraftVersionId={versionId}
      uploadHint="File cần có mã, nhãn và thứ tự."
    />
  )
}

export function FrameworkCriterionBandImportPage() {
  const { frameworkId, versionId } = useParams<{ frameworkId: string; versionId: string }>()
  const backUrl = `/system-admin/frameworks/${frameworkId ?? ''}/versions/${versionId ?? ''}`

  return (
    <FrameworkImportPage
      acceptMutation={useAcceptFrameworkCriterionBandImportMutation()}
      backLabel="Quay lại phiên bản khung đánh giá năng lực"
      backUrl={backUrl}
      breadcrumbLabel="Chi tiết phiên bản"
      description="Tải lên file CSV hoặc Excel, kiểm tra mapping cột và xác nhận import các mức đánh giá tiêu chí (theo cặp tiêu chí + thang kết quả) mới. Chỉ áp dụng cho phiên bản đang ở trạng thái Bản nháp."
      importType="FRAMEWORK_CRITERION_BAND"
      invalidateKeys={[]}
      pageTitle="Import Mức đánh giá tiêu chí hàng loạt"
      previewMutation={usePreviewFrameworkCriterionBandImportMutation(versionId)}
      requireDraftVersionId={versionId}
      uploadHint="File cần có mã tiêu chí, mã thang kết quả; tín hiệu tích cực/tiêu cực theo cú pháp code|description|importance|evidenceHint."
    />
  )
}
