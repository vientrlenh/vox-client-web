import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useSchoolClassesQuery } from '@/features/classes/api/useSchoolClassesQuery'
import type { QuestionDto, QuestionStatus } from '@/features/question/types'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import {
  formatNullableText as formatQuestionNullableText,
  getQuestionStatusDisplay,
  getQuestionTypeDisplay,
} from '@/features/question/types'
import { QuestionPicker } from '../components/QuestionPicker'
import {
  useCreateClassTestMutation,
  useDeleteClassTestMutation,
  useUpdateClassTestMutation,
  useUpdateClassTestQuestionsMutation,
  useUpdateClassTestStatusMutation,
} from '../api/useExamMutations'
import {
  examQueryKeys,
  useClassTestsQuery,
  useExamBlueprintQuery,
  useExamBlueprintsQuery,
  useExamQuery,
} from '../api/useExamQueries'
import type { CreateClassTestRequest, ExamStatus, UpdateExamStatusRequest } from '../types'
import { formatDateTime, formatNullableText, getExamStatusDisplay } from '../types'

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Khong the xu ly class test.'
}

function StatusBadge({ status }: { status?: string | null }) {
  const display = getExamStatusDisplay(status)
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${display.className}`}>{display.label}</span>
}

function Field({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function DateTimeField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  // input type=datetime-local dung dinh dang "YYYY-MM-DDTHH:mm" (khong co giay), trong khi gia tri
  // luu/gui len BE la ISO day du co giay "YYYY-MM-DDTHH:mm:ss" - cat/them ":00" khi qua lai 2 chieu.
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        onChange={(event) => onChange(event.target.value ? `${event.target.value}:00` : '')}
        type="datetime-local"
        value={value ? value.slice(0, 16) : ''}
      />
    </label>
  )
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea
        className="min-h-28 rounded-lg border border-slate-200 px-3 py-3 text-sm font-medium text-slate-950"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-bold text-slate-950">{value}</div>
    </div>
  )
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) {
    return items
  }

  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, movedItem)
  return nextItems
}

function QuestionStatusBadge({ status }: { status?: QuestionStatus | null }) {
  const display = getQuestionStatusDisplay(status)
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${display.className}`}>{display.label}</span>
}

function SelectedQuestionsEditor({
  onChange,
  selectedQuestions,
}: {
  onChange: (questions: QuestionDto[]) => void
  selectedQuestions: QuestionDto[]
}) {
  return (
    <div className="grid gap-3">
      {selectedQuestions.length ? (
        selectedQuestions.map((question, index) => (
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center" key={question.id}>
            <div className="grid gap-1">
              <p className="text-sm font-black text-slate-950">
                {index + 1}. {question.code}
              </p>
              <p className="text-sm font-medium text-slate-600">{formatQuestionNullableText(question.questionText)}</p>
              <div className="flex flex-wrap gap-2">
                <QuestionStatusBadge status={question.status} />
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                  {getQuestionTypeDisplay(question.type)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50"
                disabled={index === 0}
                onClick={() => onChange(moveItem(selectedQuestions, index, index - 1))}
                type="button"
              >
                Len
              </button>
              <button
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50"
                disabled={index === selectedQuestions.length - 1}
                onClick={() => onChange(moveItem(selectedQuestions, index, index + 1))}
                type="button"
              >
                Xuong
              </button>
              <button
                className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600"
                onClick={() => onChange(selectedQuestions.filter((item) => item.id !== question.id))}
                type="button"
              >
                Bo
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm font-semibold text-slate-500">
          Chua co cau hoi nao duoc chon.
        </div>
      )}
    </div>
  )
}

function ClassPicker({
  onChange,
  value,
}: {
  onChange: (schoolClassId: string) => void
  value: string
}) {
  const [search, setSearch] = useState('')
  const classesQuery = useSchoolClassesQuery(0, 20, {
    languageId: '',
    schoolGradeId: '',
    search,
    status: 'ACTIVE',
  })

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <Field label="Tim lop hoc" onChange={setSearch} placeholder="Nhap ma lop hoac ten lop" value={search} />
      <div className="grid gap-3">
        {classesQuery.data?.content.map((schoolClass) => (
          <button
            className={`grid gap-1 rounded-lg border px-4 py-3 text-left transition ${value === schoolClass.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
            key={schoolClass.id}
            onClick={() => onChange(schoolClass.id)}
            type="button"
          >
            <span className="text-sm font-black text-slate-950">{schoolClass.name}</span>
            <span className="text-xs font-semibold text-slate-500">{schoolClass.code}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

type ClassTestListPageProps = {
  allowCreate: boolean
  basePath: string
  title: string
}

function ClassTestListPage({ allowCreate, basePath, title }: ClassTestListPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'' | ExamStatus>('')
  const flashMessage =
    (location.state as { successMessage?: string } | null)?.successMessage ?? null
  const [message, setMessage] = useState<string | null>(flashMessage)
  const { dialog } = useConfirmationDialog()
  const classTestsQuery = useClassTestsQuery({
    keyword,
    page,
    size: 10,
    status: status || undefined,
  })

  useEffect(() => {
    if (!flashMessage) {
      return
    }

    setMessage(flashMessage)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [flashMessage, location.pathname, location.search, navigate])

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-950">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Theo doi danh sach bai kiem tra tren lop va mo chi tiet de thao tac.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"
            onClick={() => void classTestsQuery.refetch()}
            type="button"
          >
            Lam moi
          </button>
          {allowCreate ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
              onClick={() => navigate('/teacher/class-tests/create')}
              type="button"
            >
              Tao bai moi
            </button>
          ) : null}
        </div>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      {dialog}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
        <Field label="Tu khoa" onChange={setKeyword} value={keyword} />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Trang thai
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
            onChange={(event) => setStatus(event.target.value as '' | ExamStatus)}
            value={status}
          >
            <option value="">Tat ca</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="CLOSED">Closed</option>
            <option value="RESULTS_PUBLISHED">Results published</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Class test</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Open</th>
              <th className="px-4 py-3">Close</th>
              <th className="px-4 py-3 text-right">Thao tac</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classTestsQuery.data?.content.map((exam) => (
              <tr key={exam.id}>
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <span className="text-sm font-black text-slate-950">{exam.name}</span>
                    <span className="text-xs font-medium text-slate-500">{formatNullableText(exam.description)}</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-600">{exam.code}</td>
                <td className="px-4 py-4"><StatusBadge status={exam.status} /></td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">{formatDateTime(exam.openAt)}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">{formatDateTime(exam.closeAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
                      onClick={() => navigate(`${basePath}/${exam.id}`)}
                      type="button"
                    >
                      Chi tiet
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
          <span>
            {classTestsQuery.data?.totalElements ?? 0} class test, trang {classTestsQuery.data?.page ?? 1}/{classTestsQuery.data?.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Truoc
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
              disabled={page >= (classTestsQuery.data?.totalPages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function TeacherClassTestsPage() {
  return <ClassTestListPage allowCreate basePath="/teacher/class-tests" title="Bai kiem tra tren lop cua toi" />
}

export function SchoolAdminClassTestsPage() {
  return <ClassTestListPage allowCreate={false} basePath="/school-admin/class-tests" title="Giam sat bai kiem tra tren lop" />
}

export function TeacherClassTestCreatePage() {
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const queryClient = useQueryClient()
  const createMutation = useCreateClassTestMutation()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schoolClassId, setSchoolClassId] = useState('')
  const [openAt, setOpenAt] = useState('')
  const [closeAt, setCloseAt] = useState('')
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionDto[]>([])
  const [blueprintKeyword, setBlueprintKeyword] = useState('')
  const [blueprintPage, setBlueprintPage] = useState(1)
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('')
  const { confirm, dialog } = useConfirmationDialog()
  const blueprintsQuery = useExamBlueprintsQuery({
    keyword: blueprintKeyword,
    page: blueprintPage,
    schoolId: user?.schoolId,
    size: 8,
  })
  const blueprintTemplateQuery = useExamBlueprintQuery(selectedBlueprintId || null)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  useEffect(() => {
    if (!blueprintTemplateQuery.data || !selectedBlueprintId) {
      return
    }

    const publishedVersion = [...(blueprintTemplateQuery.data.versions ?? [])]
      .reverse()
      .find((version) => version.status === 'PUBLISHED')

    if (!publishedVersion) {
      return
    }

    const templateQuestions = publishedVersion.sections.flatMap((section) =>
      section.slots
        .filter((slot) => slot.slotType === 'FIXED' && slot.fixedQuestion?.id)
        .map((slot) => ({
          code: slot.fixedQuestion?.code ?? '',
          createdAt: null,
          createdBy: null,
          id: slot.fixedQuestion?.id ?? '',
          instructionText: null,
          locked: false,
          maxResponseSeconds: 0,
          minResponseSeconds: 0,
          preparationText: null,
          preparationTimeSeconds: 0,
          promptText: null,
          questionBankId: '',
          questionText: slot.fixedQuestion?.questionText ?? '',
          questionTopicId: '',
          securePoolId: null,
          sharing: 'PRIVATE' as const,
          sourceQuestionId: null,
          status: 'PUBLISHED' as const,
          topic: null,
          type: 'SHORT_ANSWER' as const,
          updatedAt: null,
          updatedBy: null,
          confidentiality: 'OPEN' as const,
        })),
    )

    setSelectedQuestions(
      templateQuestions.filter(
        (question, index, current) =>
          question.id && current.findIndex((item) => item.id === question.id) === index,
      ),
    )
  }, [blueprintTemplateQuery.data, selectedBlueprintId])

  return (
    <section className="grid gap-6">
      <div>
        <button className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600" onClick={() => navigate(-1)} type="button">
          Quay lai
        </button>
        <h1 className="text-3xl font-black text-blue-950">Tao bai kiem tra tren lop</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Nhap thong tin bai kiem tra va danh sach question ID theo dung thu tu muon su dung.
        </p>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {dialog}

      <form
        className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6"
        onSubmit={(event) => {
          event.preventDefault()
          void (async () => {
            if (!(await confirm({ message: 'Ban co chac muon tao bai kiem tra nay khong?' }))) {
              return
            }
            const payload: CreateClassTestRequest = {
              closeAt: closeAt || null,
              description: description || null,
              name,
              openAt: openAt || null,
              questionIds: selectedQuestions.map((question) => question.id),
              schoolClassId,
            }
            try {
              const result = await createMutation.mutateAsync(payload)
              await refresh()
              setError(null)
              navigate('/teacher/class-tests', {
                state: { successMessage: result },
              })
            } catch (submitError) {
              setError(getErrorMessage(submitError))
            }
          })()
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ten bai kiem tra" onChange={setName} value={name} />
          <DateTimeField label="Mo luc" onChange={setOpenAt} value={openAt} />
          <DateTimeField label="Dong luc" onChange={setCloseAt} value={closeAt} />
        </div>
        <TextAreaField label="Mo ta" onChange={setDescription} value={description} />
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Bat dau tu blueprint mau</h2>
              <p className="text-sm font-medium text-slate-600">
                Chon blueprint de nap san cac slot FIXED vao danh sach cau hoi.
              </p>
            </div>
            {selectedBlueprintId ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
                onClick={() => setSelectedBlueprintId('')}
                type="button"
              >
                Bo mau
              </button>
            ) : null}
          </div>
          <Field
            label="Tim blueprint"
            onChange={(value) => {
              setBlueprintKeyword(value)
              setBlueprintPage(1)
            }}
            placeholder="Nhap ma hoac ten blueprint"
            value={blueprintKeyword}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {blueprintsQuery.data?.content.map((blueprint) => (
              <button
                className={`grid gap-1 rounded-lg border px-4 py-3 text-left transition ${selectedBlueprintId === blueprint.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                key={blueprint.id}
                onClick={() => setSelectedBlueprintId(blueprint.id)}
                type="button"
              >
                <span className="text-sm font-black text-slate-950">{blueprint.name}</span>
                <span className="text-xs font-semibold text-slate-500">{blueprint.code}</span>
              </button>
            ))}
            {blueprintsQuery.data && blueprintsQuery.data.content.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm font-semibold text-slate-500 md:col-span-2">
                Khong tim thay blueprint phu hop.
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
            <span>
              {blueprintsQuery.data?.totalElements ?? 0} blueprint, trang {blueprintsQuery.data?.page ?? 1}/{blueprintsQuery.data?.totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button
                className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
                disabled={blueprintPage <= 1}
                onClick={() => setBlueprintPage((current) => current - 1)}
                type="button"
              >
                Truoc
              </button>
              <button
                className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
                disabled={blueprintPage >= (blueprintsQuery.data?.totalPages ?? 1)}
                onClick={() => setBlueprintPage((current) => current + 1)}
                type="button"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <h2 className="text-lg font-black text-slate-950">Chon lop hoc</h2>
            <ClassPicker onChange={setSchoolClassId} value={schoolClassId} />
          </div>
          <div className="grid gap-3">
            <h2 className="text-lg font-black text-slate-950">Cau hoi da chon</h2>
            <SelectedQuestionsEditor onChange={setSelectedQuestions} selectedQuestions={selectedQuestions} />
          </div>
        </div>
        <div className="grid gap-3">
          <h2 className="text-lg font-black text-slate-950">Them cau hoi</h2>
          <QuestionPicker
            allowStatusChange={false}
            mode="multiple"
            onSelect={(question) =>
              setSelectedQuestions((current) =>
                current.some((item) => item.id === question.id) ? current : [...current, question],
              )
            }
            selectedQuestionIds={selectedQuestions.map((question) => question.id)}
          />
        </div>
        <div className="flex justify-end">
          <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" disabled={createMutation.isPending} type="submit">
            Tao bai kiem tra
          </button>
        </div>
      </form>
    </section>
  )
}

type ClassTestDetailPageProps = {
  canManage: boolean
  title: string
}

function ClassTestDetailPage({ canManage, title }: ClassTestDetailPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { examId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  const updateMutation = useUpdateClassTestMutation()
  const updateQuestionsMutation = useUpdateClassTestQuestionsMutation()
  const updateStatusMutation = useUpdateClassTestStatusMutation()
  const deleteMutation = useDeleteClassTestMutation()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [openAt, setOpenAt] = useState('')
  const [closeAt, setCloseAt] = useState('')
  const { confirm, dialog } = useConfirmationDialog()

  useEffect(() => {
    setOpenAt(exam?.openAt ?? '')
    setCloseAt(exam?.closeAt ?? '')
  }, [exam?.id])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (examQuery.isLoading) {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">Dang tai class test...</section>
  }

  if (!exam) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Khong tim thay class test.</section>
  }

  const currentQuestions = exam.papers?.flatMap((paper) =>
    paper.sections.flatMap((section) =>
      section.items
        .filter((item) => item.question?.id)
        .map((item) => ({
          code: item.question?.code ?? '',
          createdAt: null,
          createdBy: null,
          id: item.question?.id ?? item.questionId ?? item.id,
          instructionText: null,
          locked: false,
          maxResponseSeconds: 0,
          minResponseSeconds: 0,
          preparationText: null,
          preparationTimeSeconds: 0,
          promptText: null,
          questionBankId: '',
          questionText: item.question?.questionText ?? '',
          questionTopicId: '',
          securePoolId: null,
          sharing: 'PRIVATE' as const,
          sourceQuestionId: null,
          status: 'PUBLISHED' as const,
          topic: null,
          type: 'SHORT_ANSWER' as const,
          updatedAt: null,
          updatedBy: null,
          confidentiality: 'OPEN' as const,
        })),
    ),
  ) ?? []
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionDto[]>(currentQuestions)

  useEffect(() => {
    setSelectedQuestions(currentQuestions)
  }, [exam?.id])

  const actions: UpdateExamStatusRequest['action'][] = ['CLOSE', 'PUBLISH_RESULTS', 'CANCEL']

  return (
    <section className="grid gap-6">
      <div>
        <button className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600" onClick={() => navigate(-1)} type="button">
          Quay lai
        </button>
        <h1 className="text-3xl font-black text-blue-950">{title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Theo doi thong tin bai kiem tra, cap nhat cau hoi va xu ly workflow ngay tren mot man.
        </p>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {dialog}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
        <InfoItem label="Ten" value={exam.name} />
        <InfoItem label="Code" value={exam.code} />
        <InfoItem label="Trang thai" value={<StatusBadge status={exam.status} />} />
        <InfoItem label="School class ID" value={formatNullableText(exam.schoolClassId)} />
        <InfoItem label="Open" value={formatDateTime(exam.openAt)} />
        <InfoItem label="Close" value={formatDateTime(exam.closeAt)} />
      </div>

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-black text-slate-950">Danh sach cau hoi hien tai</h2>
        <SelectedQuestionsEditor onChange={setSelectedQuestions} selectedQuestions={selectedQuestions} />
      </div>

      {canManage ? (
        <>
          <form
            className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6"
            onSubmit={(event) => {
            event.preventDefault()
            void (async () => {
                if (!(await confirm({ message: 'Ban co chac muon luu thong tin bai kiem tra nay khong?' }))) {
                  return
                }
                try {
                  const result = await updateMutation.mutateAsync({
                    examId: exam.id,
                    payload: {
                      closeAt: closeAt || null,
                      description: description || exam.description || null,
                      name: name || exam.name,
                      openAt: openAt || null,
                    },
                  })
                  await refresh()
                  setMessage(result)
                  setError(null)
                } catch (submitError) {
                  setError(getErrorMessage(submitError))
                }
              })()
            }}
          >
            <h2 className="text-lg font-black text-slate-950">Sua thong tin</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ten bai kiem tra" onChange={setName} placeholder={exam.name} value={name} />
              <Field label="Mo ta ngan" onChange={setDescription} placeholder={exam.description ?? ''} value={description} />
              <DateTimeField label="Mo luc" onChange={setOpenAt} value={openAt} />
              <DateTimeField label="Dong luc" onChange={setCloseAt} value={closeAt} />
            </div>
            <div className="flex justify-end">
              <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
                Luu thong tin
              </button>
            </div>
          </form>

          <form
            className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6"
            onSubmit={(event) => {
            event.preventDefault()
            void (async () => {
                if (!(await confirm({ message: 'Ban co chac muon cap nhat danh sach cau hoi nay khong?' }))) {
                  return
                }
                try {
                  const result = await updateQuestionsMutation.mutateAsync({
                    examId: exam.id,
                    payload: {
                      questionIds: selectedQuestions.map((question) => question.id),
                    },
                  })
                  await refresh()
                  setMessage(result)
                  setError(null)
                } catch (submitError) {
                  setError(getErrorMessage(submitError))
                }
              })()
            }}
          >
            <h2 className="text-lg font-black text-slate-950">Sua danh sach cau hoi</h2>
            <QuestionPicker
              allowStatusChange={false}
              mode="multiple"
              onSelect={(question) =>
                setSelectedQuestions((current) =>
                  current.some((item) => item.id === question.id) ? current : [...current, question],
                )
              }
              selectedQuestionIds={selectedQuestions.map((question) => question.id)}
            />
            <div className="flex justify-end">
              <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
                Cap nhat cau hoi
              </button>
            </div>
          </form>

          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-black text-slate-950">Workflow</h2>
            <div className="flex flex-wrap gap-3">
              {actions.map((action) => (
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"
                  key={action}
                  onClick={() => {
                    void (async () => {
                      try {
                        const result = await updateStatusMutation.mutateAsync({
                          examId: exam.id,
                          payload: { action },
                        })
                        await refresh()
                        setMessage(result)
                        setError(null)
                      } catch (submitError) {
                        setError(getErrorMessage(submitError))
                      }
                    })()
                  }}
                  type="button"
                >
                  {action}
                </button>
              ))}
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-bold text-red-600"
                onClick={() => {
                  void (async () => {
                    try {
                      const result = await deleteMutation.mutateAsync(exam.id)
                      await refresh()
                      navigate('/teacher/class-tests', {
                        state: { successMessage: result },
                      })
                      setError(null)
                    } catch (submitError) {
                      setError(getErrorMessage(submitError))
                    }
                  })()
                }}
                type="button"
              >
                Xoa bai kiem tra
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}

export function TeacherClassTestDetailPage() {
  return <ClassTestDetailPage canManage title="Chi tiet bai kiem tra tren lop" />
}

export function SchoolAdminClassTestDetailPage() {
  return <ClassTestDetailPage canManage={false} title="Chi tiet bai kiem tra tren lop" />
}
