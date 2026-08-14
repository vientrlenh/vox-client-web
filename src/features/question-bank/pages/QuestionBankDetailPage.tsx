import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { QuestionTopicsPanel } from '@/features/question-topic/components/QuestionTopicsPanel'
import type { QuestionModuleScope } from '../api/useQuestionBanksQuery'
import { useQuestionBankQuery } from '../api/useQuestionBankQuery'
import type { QuestionBankDto } from '../types'
import { formatNullableText, formatQuestionBankDate, getQuestionBankStatusDisplay } from '../types'

type ActiveTab = 'info' | 'topics'

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

  return 'Không thể tải chi tiết ngân hàng câu hỏi.'
}

function QuestionBankDetailPage({
  basePath,
  scope,
}: QuestionBankDetailPageProps) {
  const navigate = useNavigate()
  const { bankId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const questionBankQuery = useQuestionBankQuery(bankId ?? null)
  const questionBank = questionBankQuery.data
  const activeTab: ActiveTab =
    searchParams.get('tab') === 'topics' ? 'topics' : 'info'

  // Tab được suy ra từ URL để link thẳng vào tab Chủ đề vẫn mở đúng tab sau khi tải lại.
  function selectTab(tab: ActiveTab) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)

        if (tab === 'topics') {
          next.set('tab', 'topics')
        } else {
          next.delete('tab')
        }

        return next
      },
      { replace: true },
    )
  }

  if (questionBankQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Đang tải chi tiết ngân hàng câu hỏi...
      </section>
    )
  }

  if (questionBankQuery.isError || !questionBank) {
    return (
      <section className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        <span>{getErrorMessage(questionBankQuery.error)}</span>
        <button
          className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
          onClick={() => navigate(`${basePath}/question-banks`)}
          type="button"
        >
          Quay lại danh sách ngân hàng
        </button>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="question-bank-detail-title"
      className="grid gap-6"
    >
      <div>
        <button
          className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
          onClick={() => navigate(`${basePath}/question-banks`)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách ngân hàng
        </button>
        <h1
          className="text-3xl font-black text-blue-950"
          id="question-bank-detail-title"
        >
          Chi tiết ngân hàng câu hỏi
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Xem thông tin tổng quan, trạng thái và các chủ đề thuộc ngân hàng.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-1">
        <div
          aria-label="Chi tiết ngân hàng câu hỏi"
          className="flex gap-1"
          role="tablist"
        >
          <button
            aria-selected={activeTab === 'info'}
            className={[
              'h-10 rounded-md px-4 text-sm font-black transition',
              activeTab === 'info'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            ].join(' ')}
            onClick={() => selectTab('info')}
            role="tab"
            type="button"
          >
            Thông tin ngân hàng
          </button>
          <button
            aria-selected={activeTab === 'topics'}
            className={[
              'h-10 rounded-md px-4 text-sm font-black transition',
              activeTab === 'topics'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            ].join(' ')}
            onClick={() => selectTab('topics')}
            role="tab"
            type="button"
          >
            Chủ đề
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <QuestionBankInfoTab questionBank={questionBank} />
      ) : (
        <QuestionTopicsPanel
          bankId={questionBank.id}
          bankName={questionBank.name}
          basePath={basePath}
          scope={scope}
        />
      )}
    </section>
  )
}

function QuestionBankInfoTab({
  questionBank,
}: {
  questionBank: QuestionBankDto
}) {
  const status = getQuestionBankStatusDisplay(questionBank.status)

  return (
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
        <DetailItem label="Tên ngân hàng" value={formatNullableText(questionBank.name)} />
        <DetailItem label="Phạm vi sở hữu" value={formatNullableText(questionBank.ownerType)} />
        <DetailItem label="Ngày tạo" value={formatQuestionBankDate(questionBank.createdAt)} />
        <DetailItem label="Cập nhật" value={formatQuestionBankDate(questionBank.updatedAt)} />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Mô tả</p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-800">
          {formatNullableText(questionBank.description)}
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-sm font-bold text-slate-950">{value}</p>
    </div>
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
