import { ArrowLeft, FolderOpen } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { useQuestionBankQuery } from '../api/useQuestionBankQuery'
import { formatNullableText, formatQuestionBankDate, getQuestionBankStatusDisplay } from '../types'

type QuestionBankDetailPageProps = {
  basePath: string
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'không thể tải chi tiết question bank.'
}

function QuestionBankDetailPage({ basePath }: QuestionBankDetailPageProps) {
  const navigate = useNavigate()
  const { bankId } = useParams()
  const questionBankQuery = useQuestionBankQuery(bankId ?? null)
  const questionBank = questionBankQuery.data

  if (questionBankQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
Đang tải chi tiết question bank...
      </section>
    )
  }

  if (questionBankQuery.isError || !questionBank) {
    return (
      <section className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        <span>{getErrorMessage(questionBankQuery.error)}</span>
        <button
          className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
          onClick={() => navigate(-1)}
          type="button"
        >
          Quay lại
        </button>
      </section>
    )
  }

  const status = getQuestionBankStatusDisplay(questionBank.status)

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại
          </button>
          <h1 className="text-3xl font-black text-blue-950">Chi tiết question bank</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Xem thông tin tổng quan, status và các topic thuộc ngân hàng.
          </p>
        </div>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
          onClick={() =>
            navigate(
              `${basePath}/question-topics?bankId=${questionBank.id}&bankName=${encodeURIComponent(questionBank.name)}`,
            )
          }
          type="button"
        >
          <FolderOpen aria-hidden="true" className="size-4" />
          Xem topic
        </button>
      </div>

      <div className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            {formatNullableText(questionBank.code)}
          </span>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailItem label="Tên question bank" value={formatNullableText(questionBank.name)} />
          <DetailItem label="Owner type" value={formatNullableText(questionBank.ownerType)} />
          <DetailItem label="Language ID" value={formatNullableText(questionBank.languageId)} />
          <DetailItem label="School ID" value={formatNullableText(questionBank.schoolId)} />
          <DetailItem label="Ngày tạo" value={formatQuestionBankDate(questionBank.createdAt)} />
          <DetailItem label="Cập nhật" value={formatQuestionBankDate(questionBank.updatedAt)} />
          <DetailItem label="Created by" value={formatNullableText(questionBank.createdBy)} />
          <DetailItem label="Updated by" value={formatNullableText(questionBank.updatedBy)} />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Mô tả</p>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-800">
            {formatNullableText(questionBank.description)}
          </div>
        </div>
      </div>
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-950">{value}</p>
    </div>
  )
}

export function TeacherQuestionBankDetailPage() {
  return <QuestionBankDetailPage basePath="/teacher" />
}

export function SchoolAdminQuestionBankDetailPage() {
  return <QuestionBankDetailPage basePath="/school-admin" />
}

export function SystemAdminQuestionBankDetailPage() {
  return <QuestionBankDetailPage basePath="/system-admin" />
}
