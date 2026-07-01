import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useSchoolUsersBySchoolQuery } from '@/features/classes/api/useSchoolUsersBySchoolQuery'
import { formatNullableText as formatQuestionNullableText } from '@/features/question/types'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { QuestionPicker } from '../components/QuestionPicker'
import {
  useAttachExamBlueprintMutation,
  useCreateExamMemberMutation,
  useCreateExamMutation,
  useCreateExamPaperMutation,
  useDeleteExamMemberMutation,
  useDeleteExamMutation,
  useDeleteExamPaperMutation,
  useUpdateExamMemberMutation,
  useUpdateExamMutation,
  useUpdateExamPaperItemMutation,
  useUpdateExamPaperStatusMutation,
  useUpdateExamStatusMutation,
} from '../api/useExamMutations'
import { examQueryKeys, useExamBlueprintQuery, useExamBlueprintsQuery, useExamQuery, useExamsQuery } from '../api/useExamQueries'
import type {
  CreateExamRequest,
  ExamBlueprintDto,
  ExamBlueprintVersionDto,
  CreateExamMemberRequest,
  ExamKind,
  ExamMemberRole,
  ExamStatus,
  UpdateExamPaperStatusRequest,
  UpdateExamStatusRequest,
} from '../types'
import {
  formatDateTime,
  formatNullableText,
  getExamPaperStatusDisplay,
  getExamStatusDisplay,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_LANGUAGE_ID = '00000000-0000-0000-0000-000000000001'
type ExamDetailTab = 'blueprint' | 'workflow' | 'papers' | 'people'

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Không thể xử lý yêu cầu hiện tại.'
}

function StatusBadge({ status }: { status?: string | null }) {
  const display = getExamStatusDisplay(status)
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${display.className}`}>{display.label}</span>
}

function PaperStatusBadge({ status }: { status?: string | null }) {
  const display = getExamPaperStatusDisplay(status)
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${display.className}`}>{display.label}</span>
}

function getPublishedBlueprintVersion(blueprint: ExamBlueprintDto | null | undefined) {
  return [...(blueprint?.versions ?? [])]
    .reverse()
    .find((version) => version.status === 'PUBLISHED') ?? null
}

function getBlueprintVersionById(blueprint: ExamBlueprintDto | null | undefined, blueprintVersionId?: string | null) {
  if (!blueprintVersionId) {
    return null
  }

  return blueprint?.versions?.find((version) => version.id === blueprintVersionId) ?? null
}

function getBlockingFixedSlots(version: ExamBlueprintVersionDto | null) {
  return version?.sections.flatMap((section) =>
    section.slots.filter(
      (slot) =>
        slot.slotType === 'FIXED' &&
        slot.fixedQuestion &&
        slot.fixedQuestion.status !== 'PUBLISHED',
    ),
  ) ?? []
}

function getExamActionLabel(action: UpdateExamStatusRequest['action']) {
  switch (action) {
    case 'SCHEDULE':
      return 'Lên lịch thi'
    case 'START':
      return 'Bắt đầu thi'
    case 'CLOSE':
      return 'Đóng kỳ thi'
    case 'PUBLISH_RESULTS':
      return 'Công bố kết quả'
    case 'CANCEL':
      return 'Hủy kỳ thi'
    default:
      return action
  }
}

type ExamListPageProps = {
  allowCreate: boolean
  basePath: string
  kind?: ExamKind
  readOnly?: boolean
  title: string
}

function ExamListPage({ allowCreate, basePath, kind, readOnly = false, title }: ExamListPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'' | ExamStatus>('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const { confirm, dialog } = useConfirmationDialog()
  const examsQuery = useExamsQuery({
    kind,
    keyword,
    page,
    schoolId: user?.schoolId,
    size: DEFAULT_PAGE_SIZE,
    status: status || undefined,
  })
  const createExamMutation = useCreateExamMutation()
  const deleteExamMutation = useDeleteExamMutation()

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-950">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Theo dõi danh sách kỳ thi và mở chi tiết để thao tác.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={() => void examsQuery.refetch()}
            type="button"
          >
            Làm mới
          </button>
          {allowCreate ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
              onClick={() => setShowCreate((current) => !current)}
              type="button"
            >
              {showCreate ? 'Đóng form' : 'Tạo kỳ thi'}
            </button>
          ) : null}
        </div>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {dialog}

      {showCreate ? (
        <CreateExamCard
          isSubmitting={createExamMutation.isPending}
          onCancel={() => setShowCreate(false)}
          onSubmit={async (payload) => {
            if (!(await confirm({ message: 'Bạn có chắc muốn tạo kỳ thi này không?' }))) {
              return
            }
            try {
              const result = await createExamMutation.mutateAsync(payload)
              await refresh()
              setShowCreate(false)
              setMessage(result)
              setError(null)
            } catch (submitError) {
              setError(getErrorMessage(submitError))
            }
          }}
        />
      ) : null}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-3">
        <Field label="Từ khóa" value={keyword} onChange={setKeyword} />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Trạng thái
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
            onChange={(event) => setStatus(event.target.value as '' | ExamStatus)}
            value={status}
          >
            <option value="">Tất cả</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="SCHEDULED">Đã lên lịch</option>
            <option value="IN_PROGRESS">Đang diễn ra</option>
            <option value="CLOSED">Đã đóng</option>
            <option value="RESULTS_PUBLISHED">Đã công bố kết quả</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Kỳ thi</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Mở lúc</th>
              <th className="px-4 py-3">Đóng lúc</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {examsQuery.data?.content.map((exam) => (
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
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => navigate(`${basePath}/${exam.id}`)}
                      type="button"
                    >
                      Chi tiết
                    </button>
                    {!readOnly ? (
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
                        onClick={() => {
                          void (async () => {
                            try {
                              const result = await deleteExamMutation.mutateAsync(exam.id)
                              await refresh()
                              setMessage(result)
                              setError(null)
                            } catch (deleteError) {
                              setError(getErrorMessage(deleteError))
                            }
                          })()
                        }}
                        type="button"
                      >
                        Xóa
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
          <span>
            {examsQuery.data?.totalElements ?? 0} kỳ thi, trang {examsQuery.data?.page ?? 1}/{examsQuery.data?.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
              disabled={page >= (examsQuery.data?.totalPages ?? 1)}
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

type ExamDetailPageProps = {
  basePath: string
  blueprintBasePath: string
  canManageMembers: boolean
  canManagePapers: boolean
  canManageStatus: boolean
  canUpdateInfo: boolean
  title: string
}

function ExamDetailPage({
  basePath,
  blueprintBasePath,
  canManageMembers,
  canManagePapers,
  canManageStatus,
  canUpdateInfo,
  title,
}: ExamDetailPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const { examId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  const blueprintQuery = useExamBlueprintQuery(exam?.blueprintId ?? null)
  const blueprint = blueprintQuery.data
  const availableBlueprintsQuery = useExamBlueprintsQuery({
    examKind: exam?.kind,
    isActive: true,
    keyword: '',
    page: 1,
    schoolId: exam?.schoolId ?? user?.schoolId,
    size: 50,
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ExamDetailTab>('blueprint')
  const updateExamMutation = useUpdateExamMutation()
  const attachBlueprintMutation = useAttachExamBlueprintMutation()
  const updateStatusMutation = useUpdateExamStatusMutation()
  const createMemberMutation = useCreateExamMemberMutation()
  const updateMemberMutation = useUpdateExamMemberMutation()
  const deleteMemberMutation = useDeleteExamMemberMutation()
  const createPaperMutation = useCreateExamPaperMutation()
  const updatePaperItemMutation = useUpdateExamPaperItemMutation()
  const updatePaperStatusMutation = useUpdateExamPaperStatusMutation()
  const deletePaperMutation = useDeleteExamPaperMutation()
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState<ExamMemberRole>('AUTHOR')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPage, setMemberPage] = useState(1)
  const [memberListPage, setMemberListPage] = useState(1)
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('')
  const [selectedBlueprintVersionId, setSelectedBlueprintVersionId] = useState('')
  const { confirm, dialog } = useConfirmationDialog()
  const schoolUsersQuery = useSchoolUsersBySchoolQuery(memberPage, 8, {
    role: 'TEACHER',
    schoolId: user?.schoolId ?? '',
    search: memberSearch,
  })
  const selectedBlueprintQuery = useExamBlueprintQuery(selectedBlueprintId || null)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (examQuery.isLoading) {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">Đang tải chi tiết kỳ thi...</section>
  }

  if (!exam) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Không tìm thấy kỳ thi.</section>
  }

  const finalizedBlueprintVersion = getBlueprintVersionById(blueprint, exam.blueprintVersionId)
  const finalizedBlockingFixedSlots = getBlockingFixedSlots(finalizedBlueprintVersion)
  const canUsePaperActions = Boolean(exam.blueprintVersionId && finalizedBlueprintVersion) && finalizedBlockingFixedSlots.length === 0
  const hasBlueprint = Boolean(exam.blueprintId && blueprint)
  const isSchoolAdmin = user?.roles?.includes('SCHOOL_ADMIN') ?? false
  const viewerRoles = exam.members
    ?.filter((member) => member.userId === user?.userId)
    .map((member) => member.role) ?? []
  const isAuthor = viewerRoles.includes('AUTHOR')
  const isChair = viewerRoles.includes('CHAIR')
  const hasAuthor = exam.members?.some((member) => member.role === 'AUTHOR') ?? false
  const hasReviewerOrChair = exam.members?.some((member) => member.role === 'REVIEWER' || member.role === 'CHAIR') ?? false
  const hasChair = exam.members?.some((member) => member.role === 'CHAIR') ?? false
  const canAttachBlueprint = exam.kind === 'CENTRALIZED' && isAuthor
  const canFinalizeBlueprintVersion = exam.kind === 'CENTRALIZED' && isChair
  const canShowExamWorkflow = canManageStatus && exam.kind === 'CENTRALIZED' && isSchoolAdmin
  const selectedBlueprint = selectedBlueprintQuery.data
  const selectedBlueprintPublishedVersion = getPublishedBlueprintVersion(selectedBlueprint)
  const publishedVersions = [...(blueprint?.versions ?? [])].filter((version) => version.status === 'PUBLISHED')
  const examStatusActions: UpdateExamStatusRequest['action'][] = ['SCHEDULE', 'START', 'CLOSE', 'PUBLISH_RESULTS', 'CANCEL']
  const paperStatusActions: UpdateExamPaperStatusRequest['action'][] = ['SUBMIT', 'APPROVE', 'REQUEST_REVISION', 'LOCK']
  const pagedMembers = (exam.members ?? []).slice((memberListPage - 1) * 6, memberListPage * 6)
  const totalMemberPages = Math.max(1, Math.ceil((exam.members?.length ?? 0) / 6))

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
            onClick={() => navigate(-1)}
            type="button"
          >
            Quay lại
          </button>
          <h1 className="text-3xl font-black text-blue-950">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Theo dõi thông tin kỳ thi, thành viên và đề thi trong cùng một màn.
          </p>
        </div>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {dialog}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
        <InfoItem label="Tên kỳ thi" value={exam.name} />
        <InfoItem label="Code" value={exam.code} />
        <InfoItem label="Loại" value={exam.kind} />
        <InfoItem label="Trạng thái" value={<StatusBadge status={exam.status} />} />
        <InfoItem label="Mở lúc" value={formatDateTime(exam.openAt)} />
        <InfoItem label="Đóng lúc" value={formatDateTime(exam.closeAt)} />
        <InfoItem label="Blueprint ID" value={formatNullableText(exam.blueprintId)} />
        <InfoItem label="School class ID" value={formatNullableText(exam.schoolClassId)} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
        <div className="flex flex-wrap gap-2">
          <ExamTabButton isActive={activeTab === 'blueprint'} label="Blueprint" onClick={() => setActiveTab('blueprint')} />
          <ExamTabButton isActive={activeTab === 'workflow'} label="Workflow" onClick={() => setActiveTab('workflow')} />
          <ExamTabButton isActive={activeTab === 'papers'} label="Đề thi" onClick={() => setActiveTab('papers')} />
          <ExamTabButton isActive={activeTab === 'people'} label="Phân công" onClick={() => setActiveTab('people')} />
        </div>
      </div>

      {activeTab === 'blueprint' ? (
        <div className="grid gap-4">
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Sẵn sàng quy trình</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                AUTHOR gan blueprint, REVIEWER/CHAIR doi trang thai version, CHAIR chot version su dung.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <WorkflowReadinessItem isReady={hasAuthor} readyLabel="AUTHOR ready" missingLabel="Missing AUTHOR" />
              <WorkflowReadinessItem isReady={hasReviewerOrChair} readyLabel="Version reviewer ready" missingLabel="Missing REVIEWER or CHAIR" />
              <WorkflowReadinessItem isReady={hasChair} readyLabel="CHAIR ready" missingLabel="Missing CHAIR" />
              <WorkflowReadinessItem
                isReady={Boolean(exam.blueprintVersionId)}
                readyLabel="Paper flow ready"
                missingLabel="Paper flow locked until blueprintVersionId is chosen"
              />
            </div>
          </div>

          {!hasBlueprint ? (
            <form
              className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                void (async () => {
                  if (!selectedBlueprintId) {
                    setError('Hay chon blueprint truoc khi gan vao exam.')
                    return
                  }

                  if (!(await confirm({ message: 'Ban co chac muon gan blueprint nay vao exam khong?' }))) {
                    return
                  }

                  try {
                    const result = await attachBlueprintMutation.mutateAsync({
                      blueprintId: selectedBlueprintId,
                      blueprintVersionId: null,
                      examId: exam.id,
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
              <div className="md:col-span-2">
                <h2 className="text-lg font-black text-slate-950">Gan blueprint cho exam</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Buoc 1: AUTHOR gan blueprint vao exam. Chua can co version PUBLISHED o buoc nay.
                </p>
              </div>
              {canAttachBlueprint ? (
                <>
                  <SelectField
                    label="Blueprint"
                    onChange={setSelectedBlueprintId}
                    options={[
                      { label: 'Chon blueprint', value: '' },
                      ...((availableBlueprintsQuery.data?.content ?? []).map((candidate) => ({
                        label: `${candidate.code} - ${candidate.name}`,
                        value: candidate.id,
                      }))),
                    ]}
                    value={selectedBlueprintId}
                  />
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Trang thai blueprint da chon</p>
                    <p className="text-sm font-black text-slate-950">
                      {selectedBlueprint
                        ? `${selectedBlueprint.code} - ${selectedBlueprint.name}`
                        : 'Chua chon blueprint'}
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      {selectedBlueprintId
                        ? selectedBlueprintPublishedVersion
                          ? 'Blueprint nay da co version PUBLISHED, CHAIR co the chot version sau khi gan.'
                          : 'Blueprint nay chua co version PUBLISHED. REVIEWER/CHAIR se doi trang thai version o buoc tiep theo.'
                        : 'Chi hien blueprint dang hoat dong trong truong hien tai.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Chi AUTHOR cua exam duoc gan blueprint.
                </div>
              )}
              <div className="md:col-span-2 flex justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                  disabled={!canAttachBlueprint || !selectedBlueprintId}
                  type="submit"
                >
                  AUTHOR gan blueprint
                </button>
              </div>
            </form>
          ) : null}

          {hasBlueprint && !exam.blueprintVersionId ? (
            <div className="grid gap-4">
              <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
                <InfoItem label="Ten blueprint" value={blueprint?.name ?? '-'} />
                <InfoItem label="Code" value={blueprint?.code ?? '-'} />
                <InfoItem label="Blueprint ID" value={formatNullableText(exam.blueprintId)} />
                <InfoItem label="Version dang duoc chot" value="Chua chot" />
              </div>

              {!hasReviewerOrChair ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Exam nay chua co actor doi trang thai version.
                </div>
              ) : null}

              {!hasChair ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Exam nay chua co CHAIR de chot version su dung.
                </div>
              ) : null}

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                Buoc 2: REVIEWER/CHAIR doi trang thai version trong blueprint detail. Buoc 3: CHAIR quay lai exam nay de chot version su dung.
              </div>

              <div className="flex flex-wrap justify-between gap-3">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"
                  onClick={() => navigate(`${blueprintBasePath}/${blueprint?.id}`)}
                  type="button"
                >
                  Mo blueprint de doi trang thai version
                </button>
              </div>

              {canFinalizeBlueprintVersion ? (
                <form
                  className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void (async () => {
                      if (!selectedBlueprintVersionId) {
                        setError('Hay chon version PUBLISHED truoc khi chot.')
                        return
                      }

                      if (!(await confirm({ message: 'Ban co chac muon chot version nay cho exam khong?' }))) {
                        return
                      }

                      try {
                        const result = await attachBlueprintMutation.mutateAsync({
                          blueprintId: null,
                          blueprintVersionId: selectedBlueprintVersionId,
                          examId: exam.id,
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
                  <div className="md:col-span-2">
                    <h2 className="text-lg font-black text-slate-950">Chot version su dung</h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Buoc 3: CHAIR chot blueprintVersionId. Exam paper chi mo sau khi CHAIR chot version.
                    </p>
                  </div>
                  <SelectField
                    label="Version PUBLISHED"
                    onChange={setSelectedBlueprintVersionId}
                    options={[
                      { label: 'Chon version PUBLISHED', value: '' },
                      ...publishedVersions.map((version) => ({
                        label: `Version ${version.version} - ${version.code}`,
                        value: version.id,
                      })),
                    ]}
                    value={selectedBlueprintVersionId}
                  />
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Readiness chot version</p>
                    <p className="text-sm font-black text-slate-950">
                      {selectedBlueprintVersionId
                        ? `Version duoc chon: ${publishedVersions.find((version) => version.id === selectedBlueprintVersionId)?.code ?? selectedBlueprintVersionId}`
                        : 'Chua chon version'}
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      {publishedVersions.length
                        ? 'Chi liet ke cac version dang PUBLISHED.'
                        : 'Chua co version PUBLISHED de CHAIR chot.'}
                    </p>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                      disabled={!selectedBlueprintVersionId || !publishedVersions.length}
                      type="submit"
                    >
                      CHAIR chot version su dung
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Chi CHAIR cua exam duoc chot version su dung.
                </div>
              )}
            </div>
          ) : null}

          {hasBlueprint && exam.blueprintVersionId ? (
            <div className="grid gap-4">
              <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
                <InfoItem label="Ten blueprint" value={blueprint?.name ?? '-'} />
                <InfoItem label="Code" value={blueprint?.code ?? '-'} />
                <InfoItem
                  label="Version dang duoc chot"
                  value={finalizedBlueprintVersion ? `Version ${finalizedBlueprintVersion.version} - ${finalizedBlueprintVersion.code}` : 'Khong tim thay version'}
                />
                <InfoItem label="Blueprint version ID" value={formatNullableText(exam.blueprintVersionId)} />
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Version nay dang duoc su dung de tao exam paper.
              </div>

              {!finalizedBlueprintVersion ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  Khong tai duoc version da chot tu blueprint hien tai. Hay mo blueprint de kiem tra lai version.
                </div>
              ) : null}

              {finalizedBlockingFixedSlots.length ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  Version da chot van co slot FIXED tro toi question chua PUBLISHED, nen paper flow dang bi khoa.
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                  onClick={() => navigate(`${blueprintBasePath}/${blueprint?.id}`)}
                  type="button"
                >
                  Mo chi tiet blueprint
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'blueprint' && hasBlueprint && canUpdateInfo ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void (async () => {
              if (!(await confirm({ message: 'Ban co chac muon luu thong tin exam nay khong?' }))) {
                return
              }
              try {
                const result = await updateExamMutation.mutateAsync({
                  examId: exam.id,
                  payload: {
                    description: draftDescription || exam.description || null,
                    name: draftName || exam.name,
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
          <Field label="Ten exam" value={draftName} onChange={setDraftName} placeholder={exam.name} />
          <Field label="Mo ta" value={draftDescription} onChange={setDraftDescription} placeholder={exam.description ?? ''} />
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
              Luu thong tin
            </button>
          </div>
        </form>
      ) : null}

      {activeTab === 'workflow' ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-black text-slate-950">Workflow exam</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <WorkflowReadinessItem isReady readyLabel="DRAFT" missingLabel="DRAFT" />
            <WorkflowReadinessItem isReady={exam.status === 'SCHEDULED' || exam.status === 'IN_PROGRESS' || exam.status === 'CLOSED' || exam.status === 'RESULTS_PUBLISHED'} readyLabel="SCHEDULED" missingLabel="SCHEDULED" />
            <WorkflowReadinessItem isReady={exam.status === 'IN_PROGRESS' || exam.status === 'CLOSED' || exam.status === 'RESULTS_PUBLISHED'} readyLabel="IN_PROGRESS" missingLabel="IN_PROGRESS" />
            <WorkflowReadinessItem isReady={exam.status === 'CLOSED' || exam.status === 'RESULTS_PUBLISHED'} readyLabel="CLOSED" missingLabel="CLOSED" />
            <WorkflowReadinessItem isReady={exam.status === 'RESULTS_PUBLISHED'} readyLabel="RESULTS_PUBLISHED" missingLabel={exam.status === 'CANCELLED' ? 'CANCELLED' : 'RESULTS_PUBLISHED'} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            {'Flow chuan: DRAFT -> SCHEDULED -> IN_PROGRESS -> CLOSED -> RESULTS_PUBLISHED. Can popup xac nhan truoc khi chuyen trang thai.'}
          </div>
          {canShowExamWorkflow ? (
          <div className="flex flex-wrap gap-3">
            {examStatusActions.map((action) => (
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                key={action}
                onClick={() => {
                  void (async () => {
                    try {
                      if (!(await confirm({ message: `Báº¡n cÃ³ cháº¯c muá»‘n ${getExamActionLabel(action).toLowerCase()}?` }))) {
                        return
                      }
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
                {getExamActionLabel(action)}
              </button>
            ))}
          </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Chá»‰ SCHOOL_ADMIN Ä‘Æ°á»£c Ä‘iá»u khiá»ƒn workflow exam táº­p trung.
            </div>
          )}
        </div>
      ) : null}

      <div className="grid gap-6">
        {activeTab === 'people' ? (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950">Thanh vien exam</h2>
          </div>
          {canManageMembers ? (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void (async () => {
                  if (!(await confirm({ message: 'Ban co chac muon them thanh vien vao exam nay khong?' }))) {
                    return
                  }
                  try {
                    const payload: CreateExamMemberRequest = {
                      role: memberRole,
                      userId: memberUserId,
                    }
                    const result = await createMemberMutation.mutateAsync({ examId: exam.id, payload })
                    await refresh()
                    setMemberUserId('')
                    setMessage(result)
                    setError(null)
                  } catch (submitError) {
                    setError(getErrorMessage(submitError))
                  }
                })()
              }}
            >
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                <Field
                  label="Tim giao vien"
                  value={memberSearch}
                  onChange={(value) => {
                    setMemberSearch(value)
                    setMemberPage(1)
                  }}
                  placeholder="Nhap ten hoac email"
                />
                <SelectField
                  label="Role"
                  value={memberRole}
                  onChange={(value) => setMemberRole(value as ExamMemberRole)}
                  options={[
                    { label: 'Chair', value: 'CHAIR' },
                    { label: 'Author', value: 'AUTHOR' },
                    { label: 'Reviewer', value: 'REVIEWER' },
                  ]}
                />
                <div className="self-end">
                  <button className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-slate-300" disabled={!memberUserId} type="submit">
                    Them
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                Chon giao vien o danh sach ben duoi, sau do chon role va bam Them. Exam can du AUTHOR, REVIEWER va CHAIR de workflow chay dung.
              </div>
              {memberUserId ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
                  Da chon user: {memberUserId}
                </div>
              ) : null}
              <div className="grid gap-3">
                {schoolUsersQuery.data?.content.map((schoolUser) => {
                  const displayName = schoolUser.user?.fullName?.trim() || schoolUser.user?.email || schoolUser.userId || 'Unknown'
                  const displayUserId = schoolUser.userId ?? schoolUser.user?.id ?? ''
                  return (
                    <button
                      className={`grid gap-1 rounded-lg border px-4 py-3 text-left transition ${memberUserId === displayUserId ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                      key={schoolUser.id}
                      onClick={() => setMemberUserId(displayUserId)}
                      type="button"
                    >
                      <span className="text-sm font-black text-slate-950">{displayName}</span>
                      <span className="text-xs font-semibold text-slate-500">{schoolUser.user?.email ?? displayUserId}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                <span>
                  {schoolUsersQuery.data?.totalElements ?? 0} giao vien, trang {schoolUsersQuery.data?.page ?? 1}/{schoolUsersQuery.data?.totalPages ?? 1}
                </span>
                <div className="flex gap-2">
                  <button
                    className="h-9 rounded-lg border border-slate-200 px-3 transition hover:bg-slate-50 disabled:opacity-50"
                    disabled={memberPage <= 1}
                    onClick={() => setMemberPage((current) => current - 1)}
                    type="button"
                  >
                    Truoc
                  </button>
                  <button
                    className="h-9 rounded-lg border border-slate-200 px-3 transition hover:bg-slate-50 disabled:opacity-50"
                    disabled={memberPage >= (schoolUsersQuery.data?.totalPages ?? 1)}
                    onClick={() => setMemberPage((current) => current + 1)}
                    type="button"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3">
            {pagedMembers.map((member) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4" key={member.id}>
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {member.user?.fullName?.trim() || member.user?.email || member.userId}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {member.user?.email ?? member.userId} - {member.role}
                  </p>
                </div>
                {canManageMembers ? (
                  <div className="flex gap-2">
                    <select
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      onChange={(event) => {
                        const nextRole = event.target.value as ExamMemberRole

                        if (nextRole === member.role) {
                          return
                        }

                        void (async () => {
                          try {
                            if (!(await confirm({ message: `Ban co chac muon doi role thanh ${nextRole}?` }))) {
                              return
                            }
                            const result = await updateMemberMutation.mutateAsync({
                              examId: exam.id,
                              memberId: member.id,
                              payload: { role: nextRole },
                            })
                            await refresh()
                            setMessage(result)
                            setError(null)
                          } catch (submitError) {
                            setError(getErrorMessage(submitError))
                          }
                        })()
                      }}
                      value={member.role}
                    >
                      <option value="AUTHOR">Author</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="CHAIR">Chair</option>
                    </select>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
                      onClick={() => {
                        void (async () => {
                          try {
                            if (!(await confirm({ message: 'Ban co chac muon go thanh vien nay khoi exam khong?' }))) {
                              return
                            }
                            const result = await deleteMemberMutation.mutateAsync({
                              examId: exam.id,
                              memberId: member.id,
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
                      Xoa
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
            <span>
              {exam.members?.length ?? 0} thÃ nh viÃªn, trang {memberListPage}/{totalMemberPages}
            </span>
            <div className="flex gap-2">
              <button
                className="h-9 rounded-lg border border-slate-200 px-3 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={memberListPage <= 1}
                onClick={() => setMemberListPage((current) => current - 1)}
                type="button"
              >
                Truoc
              </button>
              <button
                className="h-9 rounded-lg border border-slate-200 px-3 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={memberListPage >= totalMemberPages}
                onClick={() => setMemberListPage((current) => current + 1)}
                type="button"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
        ) : null}

        {activeTab === 'papers' ? (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">De thi / Papers</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Exam paper chi mo sau khi CHAIR chot version su dung.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-bold ${canUsePaperActions ? 'border-slate-200 text-slate-700' : 'border-slate-200 text-slate-400'}`}
                disabled={!canUsePaperActions}
                onClick={() => navigate(`${basePath}/${exam.id}/papers`)}
                type="button"
              >
                Mo danh sach papers
              </button>
              {canManagePapers ? (
                <button
                  className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold text-white ${canUsePaperActions ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  disabled={!canUsePaperActions}
                  onClick={() => {
                    void (async () => {
                      if (!canUsePaperActions) {
                        return
                      }
                      try {
                        const result = await createPaperMutation.mutateAsync(exam.id)
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
                  Tao paper
                </button>
              ) : null}
            </div>
          </div>
          {!exam.blueprintVersionId ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              CHAIR can chot blueprint version truoc khi tao paper.
            </div>
          ) : null}
          {exam.blueprintVersionId && !finalizedBlueprintVersion ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Khong tim thay version da chot tu blueprint hien tai, nen paper flow dang bi khoa.
            </div>
          ) : null}
          {finalizedBlockingFixedSlots.length ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Version da chot van co slot FIXED tro toi question chua PUBLISHED, nen cac thao tac voi paper dang bi khoa.
            </div>
          ) : null}
          <div className="grid gap-4">
            {exam.papers?.map((paper) => (
              <div className="grid gap-4 rounded-lg border border-slate-200 p-4" key={paper.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{paper.code} - Variant {paper.variant}</p>
                    <div className="mt-1"><PaperStatusBadge status={paper.status} /></div>
                  </div>
                  {canManagePapers ? (
                    <div className="flex flex-wrap gap-2">
                      {paperStatusActions.map((action) => (
                        <button
                          className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-bold ${canUsePaperActions ? 'border-slate-200 text-slate-700' : 'border-slate-200 text-slate-400'}`}
                          disabled={!canUsePaperActions}
                          key={action}
                          onClick={() => {
                            void (async () => {
                              if (!canUsePaperActions) {
                                return
                              }
                              try {
                                const result = await updatePaperStatusMutation.mutateAsync({
                                  paperId: paper.id,
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
                        className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-bold ${canUsePaperActions ? 'border-slate-200 text-slate-700' : 'border-slate-200 text-slate-400'}`}
                        disabled={!canUsePaperActions}
                        onClick={() => navigate(`${basePath}/${exam.id}/papers/${paper.id}`)}
                        type="button"
                      >
                        Chi tiet paper
                      </button>
                      <button
                        className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-bold ${canUsePaperActions ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-400'}`}
                        disabled={!canUsePaperActions}
                        onClick={() => {
                          void (async () => {
                            if (!canUsePaperActions) {
                              return
                            }
                            try {
                              const result = await deletePaperMutation.mutateAsync(paper.id)
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
                        Xoa paper
                      </button>
                    </div>
                  ) : (
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"
                      onClick={() => navigate(`${basePath}/${exam.id}/papers/${paper.id}`)}
                      type="button"
                    >
                      Chi tiet paper
                    </button>
                  )}
                </div>

                {paper.sections.map((section) => (
                  <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4" key={section.id}>
                    <p className="text-sm font-black text-slate-950">
                      Section {section.order}: {formatNullableText(section.title)}
                    </p>
                    {section.items.map((item) => (
                      <PaperItemEditor
                        canEdit={canManagePapers && canUsePaperActions}
                        item={item}
                        key={item.id}
                        onSave={async (questionId) => {
                          try {
                            const result = await updatePaperItemMutation.mutateAsync({
                              itemId: item.id,
                              paperId: paper.id,
                              payload: { questionId },
                            })
                            await refresh()
                            setMessage(result)
                            setError(null)
                          } catch (submitError) {
                            setError(getErrorMessage(submitError))
                          }
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        ) : null}
      </div>
    </section>
  )
}

function CreateExamCard({
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: (payload: CreateExamRequest) => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  return (
    <form
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          code,
          description: description || null,
          languageId: DEFAULT_LANGUAGE_ID,
          name,
        })
      }}
    >
      <Field label="Code" value={code} onChange={setCode} />
      <Field label="Ten exam" value={name} onChange={setName} />
      <Field label="Mo ta" value={description} onChange={setDescription} />
      <div className="md:col-span-3 flex justify-end gap-3">
        <button className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700" onClick={onCancel} type="button">
          Huy
        </button>
        <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" disabled={isSubmitting} type="submit">
          Tao exam
        </button>
      </div>
    </form>
  )
}

function PaperItemEditor({
  canEdit,
  item,
  onSave,
}: {
  canEdit: boolean
  item: { id: string; order: number; question?: { code?: string | null; id: string; questionText?: string | null } | null; questionId?: string | null }
  onSave: (questionId: string) => void
}) {
  const [questionId, setQuestionId] = useState(item.questionId ?? item.question?.id ?? '')
  const questionCode = (item.question?.code ?? questionId) || 'Chua gan cau hoi'

  useEffect(() => {
    setQuestionId(item.questionId ?? item.question?.id ?? '')
  }, [item.id, item.question?.id, item.questionId])

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-sm font-black text-slate-950">Item {item.order}</div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Question hien tai</p>
        <p className="mt-2 text-sm font-black text-slate-950">{questionCode}</p>
        <p className="mt-1 text-sm font-medium text-slate-600">{formatQuestionNullableText(item.question?.questionText)}</p>
      </div>
      {canEdit ? (
        <QuestionPicker
          allowStatusChange={false}
          basePath="/teacher"
          canEditQuestion={() => true}
          fixedStatus="PUBLISHED"
          mode="single"
          onSelect={(question) => {
            setQuestionId(question.id)
            onSave(question.id)
          }}
          selectedQuestionIds={questionId ? [questionId] : []}
          title="Chon cau hoi published"
        />
      ) : null}
    </div>
  )
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

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function WorkflowReadinessItem({
  isReady,
  missingLabel,
  readyLabel,
}: {
  isReady: boolean
  missingLabel: string
  readyLabel: string
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-black ${isReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {isReady ? readyLabel : missingLabel}
    </div>
  )
}

function ExamTabButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={[
        'rounded-lg px-4 py-2 text-sm font-bold transition',
        isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

export function SchoolAdminExamsPage() {
  return <ExamListPage allowCreate basePath="/school-admin/exams" kind="CENTRALIZED" title="Kiem tra tap trung" />
}

export function SchoolAdminExamDetailPage() {
  return (
    <ExamDetailPage
      basePath="/school-admin/exams"
      blueprintBasePath="/school-admin/blueprints"
      canManageMembers
      canManagePapers={false}
      canManageStatus
      canUpdateInfo
      title="Chi tiet kiem tra tap trung"
    />
  )
}

export function TeacherExamsPage() {
  return <ExamListPage allowCreate={false} basePath="/teacher/exams" kind="CENTRALIZED" title="Kiem tra tap trung cua toi" />
}

export function TeacherExamDetailPage() {
  return (
    <ExamDetailPage
      basePath="/teacher/exams"
      blueprintBasePath="/teacher/blueprints"
      canManageMembers={false}
      canManagePapers
      canManageStatus={false}
      canUpdateInfo={false}
      title="Chi tiet exam duoc giao"
    />
  )
}

export function SystemAdminExamsPage() {
  return <ExamListPage allowCreate={false} basePath="/system-admin/exams" kind="CENTRALIZED" readOnly title="Giam sat exam" />
}

export function SystemAdminExamDetailPage() {
  return (
    <ExamDetailPage
      basePath="/system-admin/exams"
      blueprintBasePath="/system-admin/blueprints"
      canManageMembers={false}
      canManagePapers={false}
      canManageStatus={false}
      canUpdateInfo={false}
      title="Chi tiet exam"
    />
  )
}
