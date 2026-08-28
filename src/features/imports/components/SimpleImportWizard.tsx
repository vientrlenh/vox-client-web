import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import type { PreviewImportResponse } from '../api/useQuestionScopeImportMutations'
import { buildImportSessionDetailPath } from '../types'
import type { ImportSessionNavState } from '../types'

type SimpleImportWizardProps = {
  /** Đường dẫn gốc theo vai trò: /teacher, /school-admin, /system-admin. */
  basePath: string
  description: string
  /** Chặn chọn file khi phạm vi chưa đủ (ví dụ chưa chọn ngân hàng cho luồng chủ đề). */
  isScopeReady?: boolean
  onAccept: (sessionId: string, confirmedMapping: Record<string, string>) => Promise<unknown>
  onPreview: (file: File) => Promise<{ data: PreviewImportResponse; message: string }>
  returnLabel: string
  returnTo: string
  /** Khối chọn phạm vi hiện phía trên ô tải file; khoá lại sau khi đã có preview. */
  scopeSelector?: ReactNode
  scopeHint?: string
  title: string
}

function getErrorMessage(error: unknown) {
  if (
    error
    && typeof error === 'object'
    && 'response' in error
    && error.response
    && typeof error.response === 'object'
    && 'data' in error.response
    && error.response.data
    && typeof error.response.data === 'object'
    && 'message' in error.response.data
    && typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message
  }
  return null
}

function isAcceptedFile(file: File) {
  return /\.(csv|xlsx|xls)$/i.test(file.name)
}

/**
 * Xác nhận nguyên gợi ý ghép cột của backend. Màn này cố ý KHÔNG cho sửa tay từng cột: file sai
 * tiêu đề thì sửa file rồi tải lại, chứ ghép tay là mở đường đổ dữ liệu vào nhầm trường mà không
 * ai rà lại được.
 */
function buildMappingFromSuggestion(preview: PreviewImportResponse) {
  return Object.fromEntries(
    Object.entries(preview.suggestedMapping).filter(
      ([, systemField]) => Boolean(systemField),
    ),
  )
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  )
}

function SampleRowsTable({ preview }: { preview: PreviewImportResponse }) {
  if (preview.sampleRows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
        File không có dòng dữ liệu nào để xem trước.
      </div>
    )
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div>
        <h2 className="text-lg font-black text-slate-950">Xem trước dữ liệu</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Cột nào không nhận diện được sẽ bị bỏ qua khi nhập. Kiểm tra kỹ trước khi xác nhận.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {preview.originalHeaders.map((header) => (
                <th className="px-3 py-2 font-bold text-slate-700" key={header}>
                  <span className="block">{header}</span>
                  <span className="block text-[11px] font-semibold text-indigo-600">
                    {preview.suggestedMapping[header] ?? 'không dùng'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.sampleRows.map((row, rowIndex) => (
              <tr className="border-b border-slate-100" key={rowIndex}>
                {preview.originalHeaders.map((header) => (
                  <td className="px-3 py-2 font-medium text-slate-600" key={header}>
                    {row[header] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SimpleImportWizard({
  basePath,
  description,
  isScopeReady = true,
  onAccept,
  onPreview,
  returnLabel,
  returnTo,
  scopeHint,
  scopeSelector,
  title,
}: SimpleImportWizardProps) {
  const navigate = useNavigate()
  const [preview, setPreview] = useState<PreviewImportResponse | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleFileChange(file?: File) {
    if (!file) {
      return
    }
    if (!isScopeReady) {
      setError(scopeHint ?? 'Vui lòng chọn phạm vi trước khi tải file.')
      return
    }
    if (!isAcceptedFile(file)) {
      setPreview(null)
      setError('File không hợp lệ. Vui lòng chọn file CSV hoặc Excel.')
      return
    }

    try {
      setIsBusy(true)
      setError(null)
      setMessage(null)
      const response = await onPreview(file)
      setPreview(response.data)
      setMessage(response.message)
    } catch (submitError) {
      setPreview(null)
      setError(
        getErrorMessage(submitError)
          ?? 'Đọc file thất bại. Kiểm tra lại định dạng file và tên các cột rồi thử lại.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function handleAccept() {
    if (!preview) {
      return
    }
    try {
      setIsBusy(true)
      setError(null)
      await onAccept(preview.importSessionId, buildMappingFromSuggestion(preview))
      // Backend nhập ngầm nên con số lúc này chưa phải kết quả cuối: chuyển sang trang chi tiết
      // phiên import để theo dõi từng dòng.
      navigate(buildImportSessionDetailPath(basePath, preview.importSessionId), {
        state: {
          returnLabel,
          returnTo,
        } satisfies ImportSessionNavState,
      })
    } catch (submitError) {
      setError(
        getErrorMessage(submitError)
          ?? 'Không thể xác nhận nhập. Vui lòng thử lại sau.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="grid gap-6 text-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-0 text-slate-950">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            {description}
          </p>
        </div>
        <button
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={() => navigate(returnTo)}
          type="button"
        >
          Quay lại
        </button>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />

      {scopeSelector ? (
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 md:grid-cols-2">
          {scopeSelector}
        </section>
      ) : null}

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div>
          <h2 className="text-lg font-black text-slate-950">Chọn file import</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Hỗ trợ file .csv, .xlsx và .xls.{scopeHint ? ` ${scopeHint}` : ''}
          </p>
        </div>

        <label
          className={`grid cursor-pointer place-items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center transition ${
            isScopeReady
              ? 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50'
              : 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
          }`}
        >
          <span className="text-sm font-black text-slate-950">
            Chọn file CSV hoặc Excel
          </span>
          <input
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            disabled={isBusy || !isScopeReady}
            onChange={(event) => {
              void handleFileChange(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
            type="file"
          />
        </label>

        {isBusy && !preview ? (
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            Đang đọc file import...
          </div>
        ) : null}
      </section>

      {preview ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Tên file" value={preview.fileName} />
            <SummaryCard label="Tổng số dòng" value={preview.totalRows} />
            <SummaryCard label="Số cột" value={preview.originalHeaders.length} />
          </div>

          <SampleRowsTable preview={preview} />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isBusy}
              onClick={() => {
                setPreview(null)
                setMessage(null)
              }}
              type="button"
            >
              Chọn file khác
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isBusy}
              onClick={() => {
                void handleAccept()
              }}
              type="button"
            >
              {isBusy ? 'Đang gửi...' : 'Xác nhận nhập'}
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}
