import type { FormEvent } from 'react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useQuestionBanksQuery } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionTopicsQuery } from '@/features/question-topic/api/useQuestionTopicsQuery'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import {
  downloadQuestionImportTemplate,
} from '../api/useQuestionExport'
import {
  usePreviewQuestionImportMutation,
  useAcceptQuestionImportMutation,
} from '../api/useQuestionImportMutations'
import { useImportRowsQuery, useImportSessionQuery } from '../api/useImportSessionQuery'
import { questionQueryKeys } from '../api/useQuestionsQuery'
import type { PreviewQuestionImportResponse } from '../types'

type QuestionImportPageProps = {
  basePath: string
}

const ACCEPTED_EXTENSIONS = ['csv', 'xlsx', 'xls']

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

function buildMappingFromSuggestion(preview: PreviewQuestionImportResponse) {
  return preview.originalHeaders.reduce<Record<string, string>>((result, header) => {
    const suggested = preview.suggestedMapping[header]?.trim()
    if (suggested) {
      result[header] = suggested
    }
    return result
  }, {})
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function SampleRowsTable({ preview }: { preview: PreviewQuestionImportResponse }) {
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
          Kiểm tra nhanh một số dòng đầu tiên trước khi import. Hệ thống tự nhận
          diện cột theo tên header, không cần tự ghép tay - nếu sai cột/ Thiếu
          trường bắt buộc, BE sẽ báo lỗi cụ thể khi xác nhận.
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

function ImportProgressPanel({
  basePath,
  sessionId,
}: {
  basePath: string
  sessionId: string
}) {
  const sessionQuery = useImportSessionQuery(sessionId, { poll: true })
  const session = sessionQuery.data
  const isFinished = session
    ? !['QUEUED', 'VALIDATING', 'IMPORTING'].includes(session.status)
    : false
  const invalidRowsQuery = useImportRowsQuery(
    sessionId,
    1,
    20,
    isFinished ? 'INVALID' : undefined,
  )

  if (sessionQuery.isError) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        không tải được trạng thái phiên import: {getErrorMessage(sessionQuery.error) ?? 'Loi khong xac dinh.'}
        <div className="mt-3">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-red-300 bg-white px-4 text-sm font-bold text-red-700"
            onClick={() => void sessionQuery.refetch()}
            type="button"
          >
Thử lại          </button>
        </div>
      </section>
    )
  }

  if (sessionQuery.isLoading || !session) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Đang tải trạng thái phiên import...
      </section>
    )
  }

  return (
    <section className="grid gap-5 rounded-lg border border-indigo-200 bg-indigo-50 p-5">
      <div>
        <h2 className="text-lg font-black text-indigo-950">
          {isFinished ? 'Import hoàn tất' : 'Đang xử lý import...'}
        </h2>
        <p className="mt-1 text-sm font-semibold text-indigo-800">
          Trạng thái phiên import: {session.status}
          {session.failureReason ? ` - ${session.failureReason}` : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="ổng số dòng" value={session.totalRows} />
        <SummaryCard label="Đã import" value={session.importedRows} />
        <SummaryCard label="òng lỗi" value={session.invalidRows} />
        <SummaryCard label="Bỏ qua (trùng)" value={session.skippedRows} />
      </div>

      {!isFinished ? (
        <p className="text-sm font-semibold text-indigo-700">
Đang xử lý        </p>
      ) : null}

      {isFinished && session.invalidRows > 0 ? (
        <div className="grid gap-3">
          <h3 className="text-base font-black text-indigo-950">Cac dong bi loi</h3>
          <div className="grid gap-2">
            {invalidRowsQuery.data?.content.map((row) => (
              <div
                className="rounded-lg border border-red-200 bg-white p-3 text-sm"
                key={row.id}
              >
                <p className="font-black text-slate-950">Dong {row.rowNumber}</p>
                <ul className="mt-1 list-disc pl-5 text-red-700">
                  {row.errors.map((error, index) => (
                    <li key={index}>
                      {error.field ? `${error.field}: ` : ''}
                      {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isFinished ? (
        <Link
          className="inline-flex h-11 w-fit items-center justify-center rounded-lg bg-indigo-700 px-4 text-sm font-bold text-white transition hover:bg-indigo-800"
          to={`${basePath}/questions/all`}
        >
Quay lại danh sách câu hỏi
        </Link>
      ) : null}
    </section>
  )
}

export function QuestionImportPage({ basePath }: QuestionImportPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const previewMutation = usePreviewQuestionImportMutation()
  const acceptMutation = useAcceptQuestionImportMutation()

  const [questionBankId, setQuestionBankId] = useState('')
  const [questionTopicId, setQuestionTopicId] = useState('')
  const [preview, setPreview] = useState<PreviewQuestionImportResponse | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const isSystemAdmin = user?.roles?.includes('SYSTEM_ADMIN') ?? false
  const questionBanksQuery = useQuestionBanksQuery('teacher', 0, 100, true, {
    ownerType: isSystemAdmin ? 'SYSTEM' : 'SCHOOL',
    status: 'PUBLISHED',
  })
  const questionTopicsQuery = useQuestionTopicsQuery(
    'teacher',
    questionBankId,
    0,
    100,
    Boolean(questionBankId),
    { status: 'PUBLISHED' },
  )

  const isBusy = previewMutation.isPending || acceptMutation.isPending

  async function handleFileChange(file?: File) {
    if (!file) {
      return
    }

    if (!questionBankId || !questionTopicId) {
      setError('Vui lòng chọn ngân hàng câu hỏi và chủ đề trước khi tải file.')
      return
    }

    if (!isAcceptedFile(file)) {
      setPreview(null)
      setError('File không hợp lệ. Vui lòng chọn file CSV hoac Excel.')
      return
    }

    try {
      setError(null)
      setMessage(null)
      const response = await previewMutation.mutateAsync({
        file,
        questionBankId,
        questionTopicId,
      })
      setPreview(response.data)
      setMessage(response.message)
    } catch (submitError) {
      setPreview(null)
      setError(
        getErrorMessage(submitError) ??
          'Import file thất bại do lỗi hệ thống hoặc file không đọc được, không chỉ là lỗi nghiệp vụ. Vui lòng kiểm tra định dạng file, cột dữ liệu và thử lại.',
      )
    }
  }

  async function handleAccept() {
    if (!preview) {
      return
    }

    try {
      setError(null)
      const response = await acceptMutation.mutateAsync({
        payload: { confirmedMapping: buildMappingFromSuggestion(preview) },
        sessionId: preview.importSessionId,
      })
      setMessage(response.message)
      setSessionId(preview.importSessionId)
      await queryClient.invalidateQueries({ queryKey: questionQueryKeys.all })
    } catch (submitError) {
      setError(
        getErrorMessage(submitError) ??
          'không thể xác nhận import vì hệ thống xử lý thất bại hoặc file có vấn đề ngoài nghiệp vụ. Vui lòng thử lại sau.',
      )
    }
  }

  async function handleDownloadTemplate(event: FormEvent) {
    event.preventDefault()
    try {
      await downloadQuestionImportTemplate()
    } catch (submitError) {
      setError(getErrorMessage(submitError) ?? 'Khong the tai file mau.')
    }
  }

  return (
    <section className="grid gap-6 text-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-0 text-slate-950">
            Nhap cau hoi tu Excel
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Chọn ngân hàng và chủ đề, rồi tải file lên. Hệ thống tự nhận diện cột theo
            tên header và gửi xuống server. Nếu sai đầu mục hay nhầm cột, backend sẽ
            báo lỗi cụ thể từng dòng. Câu hỏi tạo từ import sẽ vào hàng đợi chờ duyệt.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={handleDownloadTemplate}
            type="button"
          >
            Tai file mau
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={() => navigate(`${basePath}/questions/all`)}
            type="button"
          >
            Quay lai
          </button>
        </div>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />

      {sessionId ? (
        <ImportProgressPanel basePath={basePath} sessionId={sessionId} />
      ) : (
        <>
          <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Ngân hàng câu hỏi
              <select
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
                disabled={Boolean(preview)}
                onChange={(event) => {
                  setQuestionBankId(event.target.value)
                  setQuestionTopicId('')
                }}
                value={questionBankId}
              >
                <option value="">Chọn ngân hàng</option>
                {questionBanksQuery.data?.content.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name} ({bank.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Chủ đề
              <select
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
                disabled={Boolean(preview) || !questionBankId}
                onChange={(event) => setQuestionTopicId(event.target.value)}
                value={questionTopicId}
              >
                <option value="">Chọn chủ đề</option>
                {questionTopicsQuery.data?.content.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name} ({topic.code})
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <div>
              <h2 className="text-lg font-black text-slate-950">Chọn file import</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Hỗ trợ file .csv, .xlsx và .xls. Phải chọn ngân hàng + chủ đề trước.
              </p>
            </div>

            <label
              className={`grid cursor-pointer place-items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center transition ${
                questionBankId && questionTopicId
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
                disabled={isBusy || !questionBankId || !questionTopicId}
                onChange={(event) => {
                  void handleFileChange(event.currentTarget.files?.[0])
                  event.currentTarget.value = ''
                }}
                type="file"
              />
            </label>

            {previewMutation.isPending ? (
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                Đang đọc file import...
              </div>
            ) : null}
          </section>

          {preview ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard label="Tên file" value={preview.fileName} />
                <SummaryCard label="Tổng số dòng" value={preview.totalRows} />
                <SummaryCard label="Số cột" value={preview.originalHeaders.length} />
                <SummaryCard label="Hết hạn" value={preview.expiresAt ?? '-'} />
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
                  {acceptMutation.isPending ? 'Dang gui...' : 'Xac nhan import'}
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  )
}

export function TeacherQuestionImportPage() {
  return <QuestionImportPage basePath="/teacher" />
}

export function SystemAdminQuestionImportPage() {
  return <QuestionImportPage basePath="/system-admin" />
}
