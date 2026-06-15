import { ArrowLeft, FolderOpen } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import type { QuestionModuleScope } from '../api/useQuestionBanksQuery'
import { useQuestionBankQuery } from '../api/useQuestionBankQuery'
import { formatNullableText, formatQuestionBankDate } from '../types'

type QuestionBankDetailPageProps = {
  basePath: string
  scope: QuestionModuleScope
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

  return 'Khong the tai chi tiet question bank.'
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={[
        'inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-bold',
        isActive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-500',
      ].join(' ')}
    >
      {isActive ? 'Hoat dong' : 'Ngung hoat dong'}
    </span>
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

function QuestionBankDetailPage({
  basePath,
  scope,
}: QuestionBankDetailPageProps) {
  const navigate = useNavigate()
  const { bankId } = useParams()
  const questionBankQuery = useQuestionBankQuery(scope, bankId ?? null)
  const questionBank = questionBankQuery.data

  if (questionBankQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Dang tai chi tiet question bank...
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
          Quay lai
        </button>
      </section>
    )
  }

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
            Quay lai
          </button>
          <h1 className="text-3xl font-black text-blue-950">
            Chi tiet question bank
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Xem thong tin tong quan cua ngan hang cau hoi va di tiep sang danh sach topic.
          </p>
        </div>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
          onClick={() =>
            navigate(
              `${basePath}/question-topics?bankId=${questionBank.id}&bankName=${encodeURIComponent(questionBank.bankName)}`,
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
            {questionBank.id}
          </span>
          <StatusBadge isActive={questionBank.isActive} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailItem
            label="Ten question bank"
            value={formatNullableText(questionBank.bankName)}
          />
          <DetailItem
            label="Trang thai"
            value={questionBank.isActive ? 'Hoat dong' : 'Ngung hoat dong'}
          />
          <DetailItem
            label="Ngay tao"
            value={formatQuestionBankDate(questionBank.createdAt)}
          />
          <DetailItem
            label="Cap nhat"
            value={formatQuestionBankDate(questionBank.updatedAt)}
          />
          <DetailItem
            label="Created by"
            value={formatNullableText(questionBank.createdBy)}
          />
          <DetailItem
            label="Updated by"
            value={formatNullableText(questionBank.updatedBy)}
          />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            Mo ta
          </p>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-800">
            {formatNullableText(questionBank.description)}
          </div>
        </div>
      </div>
    </section>
  )
}

export function TeacherQuestionBankDetailPage() {
  return <QuestionBankDetailPage basePath="/teacher" scope="teacher" />
}

export function SchoolAdminQuestionBankDetailPage() {
  return <QuestionBankDetailPage basePath="/school-admin" scope="school" />
}

export function SystemAdminQuestionBankDetailPage() {
  return <QuestionBankDetailPage basePath="/system-admin" scope="admin" />
}
