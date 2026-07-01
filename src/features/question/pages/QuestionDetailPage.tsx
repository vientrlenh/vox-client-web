import { ArrowLeft, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useSchoolUsersBySchoolQuery } from '@/features/classes/api/useSchoolUsersBySchoolQuery'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import {
  useCreateQuestionCollaboratorMutation,
  useDeleteQuestionCollaboratorMutation,
  useUpdateQuestionCollaboratorMutation,
  useUpdateQuestionMutation,
} from '../api/useQuestionMutations'
import { useQuestionQuery } from '../api/useQuestionQuery'
import {
  canManageQuestionSharing,
  canEditQuestion,
  getQuestionActorRole,
  getQuestionReviewActions,
  resolveTeacherQuestionContext,
} from '../permissions'
import {
  type QuestionCollaboratorPermission,
  type QuestionDto,
  formatDuration,
  formatNullableText,
  formatQuestionDate,
  getQuestionCollaboratorPermissionDisplay,
  getQuestionConfidentialityDisplay,
  getQuestionSharingDisplay,
  getQuestionStatusDisplay,
  getQuestionTypeDisplay,
} from '../types'

type DetailTab = 'assets' | 'content' | 'guide' | 'sharing'
type TeacherView = 'all' | 'my' | 'review'

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Khong the tai chi tiet cau hoi.'
}

type QuestionDetailPageProps = {
  basePath: string
}

function QuestionDetailPage({ basePath }: QuestionDetailPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { questionId } = useParams()
  const user = useAppSelector((state) => state.auth.user)
  const questionQuery = useQuestionQuery(questionId ?? null)
  const question = questionQuery.data
  const [activeTab, setActiveTab] = useState<DetailTab>('content')

  const teacherView =
    ((location.state as { fromView?: TeacherView } | null)?.fromView ?? null)
  const primaryRole = getQuestionActorRole(user?.roles)
  const teacherContext = resolveTeacherQuestionContext(
    teacherView,
    question,
    user?.userId,
    user?.email,
  )
  const canEdit = canEditQuestion(question, primaryRole, teacherContext, user?.userId)
  const reviewActions = getQuestionReviewActions(
    question,
    primaryRole,
    teacherContext,
    user?.userId,
    user?.email,
  )
  const canManageSharing = canManageQuestionSharing(
    question,
    primaryRole,
    user?.userId,
    user?.email,
  )

  if (questionQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Dang tai chi tiet cau hoi...
      </section>
    )
  }

  if (questionQuery.isError || !question) {
    return (
      <section className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        <span>{getErrorMessage(questionQuery.error)}</span>
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

  const status = getQuestionStatusDisplay(question.status)

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
          <h1 className="text-3xl font-black text-blue-950">Chi tiet cau hoi</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Xem thông tin, tài liệu đính kèm, hướng dẫn chấm và chia sẻ.
          </p>
        </div>

        {canEdit || reviewActions.length > 0 ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
            onClick={() =>
              navigate(`${basePath}/questions/${question.id}/edit`, {
                state: { fromView: teacherView },
              })
            }
            type="button"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Quan ly question
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            {formatNullableText(question.code)}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'content', label: 'Nội dung' },
              { id: 'assets', label: 'Tài liệu đính kèm' },
              { id: 'guide', label: 'Hướng dẫn chấm' },
              { id: 'sharing', label: 'Chia sẻ' },
            ].map((tab) => (
              <button
                className={[
                  'rounded-lg px-4 py-2 text-sm font-bold transition',
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-white',
                ].join(' ')}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'content' ? (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailItem label="Loại câu hỏi" value={getQuestionTypeDisplay(question.type)} />
              <DetailItem label="Chia sẻ" value={getQuestionSharingDisplay(question.sharing)} />
              <DetailItem
                label="Bảo mật"
                value={getQuestionConfidentialityDisplay(question.confidentiality)}
              />
              <DetailItem label="Chủ đề" value={formatNullableText(question.topic?.name)} />
              <DetailItem
                label="Ngân hàng"
                value={formatNullableText(question.bank?.name)}
              />
              <DetailItem label="Ngày tạo" value={formatQuestionDate(question.createdAt)} />
              <DetailItem label="Cập nhật" value={formatQuestionDate(question.updatedAt)} />
              <DetailItem label="Created by" value={formatNullableText(question.createdBy)} />
            </div>

            <DetailBlock label="Nội dung câu hỏi" value={question.questionText} />
            <DetailBlock label="Instruction" value={question.instructionText} />
            <DetailBlock label="Prompt" value={question.promptText} />
            <DetailBlock label="Preparation" value={question.preparationText} />

            <div className="grid gap-4 md:grid-cols-3">
              <DetailItem
                label="Thời gian chuẩn bị"
                value={formatDuration(question.preparationTimeSeconds)}
              />
              <DetailItem
                label="Phản hồi tối thiểu"
                value={formatDuration(question.minResponseSeconds)}
              />
              <DetailItem
                label="Phản hồi tối đa"
                value={formatDuration(question.maxResponseSeconds)}
              />
            </div>
          </div>
        ) : null}

        {activeTab === 'assets' ? (
          <div className="grid gap-4">
            {question.assets?.length ? (
              question.assets.map((asset) => (
                <div className="grid gap-4 rounded-lg border border-slate-200 p-4" key={asset.id}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                      {formatNullableText(asset.type)}
                    </span>
                    <span className="text-sm font-bold text-slate-950">
                      {formatNullableText(asset.title)}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailItem label="URL" value={formatNullableText(asset.url)} />
                    <DetailItem
                      label="Thời lượng"
                      value={formatDuration(asset.durationSeconds)}
                    />
                    <DetailItem label="Alt text" value={formatNullableText(asset.altText)} />
                    <DetailItem label="Thứ tự" value={String(asset.order)} />
                  </div>
                  <DetailBlock label="Mô tả" value={asset.description} />
                  <DetailBlock label="Transcript" value={asset.transcript} />
                </div>
              ))
            ) : (
              <EmptyState text="Chưa có tài nguyên nào cho câu hỏi này." />
            )}
          </div>
        ) : null}

        {activeTab === 'guide' ? (
          question.evaluationGuide ? (
            <div className="grid gap-4">
              <DetailBlock
                label="Expected content"
                value={question.evaluationGuide.expectedContent}
              />
              <DetailBlock label="Key points" value={question.evaluationGuide.keyPoints} />
              <DetailBlock
                label="Acceptable responses"
                value={question.evaluationGuide.acceptableResponses}
              />
              <DetailBlock
                label="Off-topic examples"
                value={question.evaluationGuide.offTopicExamples}
              />
              <DetailBlock
                label="Scoring hints"
                value={question.evaluationGuide.scoringHints}
              />
              <DetailBlock
                label="Common mistakes"
                value={question.evaluationGuide.commonMistakes}
              />
            </div>
          ) : (
            <EmptyState text="Chưa có evaluation guide cho câu hỏi này." />
          )
        ) : null}

        {activeTab === 'sharing' ? (
          <QuestionSharingPanel
            canManage={canManageSharing}
            onRefresh={() => void questionQuery.refetch()}
            question={question}
          />
        ) : null}
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

function DetailBlock({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-800">
        {formatNullableText(value)}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  )
}

function QuestionSharingPanel({
  canManage,
  onRefresh,
  question,
}: {
  canManage: boolean
  onRefresh: () => void
  question: QuestionDto
}) {
  const user = useAppSelector((state) => state.auth.user)
  const updateQuestionMutation = useUpdateQuestionMutation()
  const createCollaboratorMutation = useCreateQuestionCollaboratorMutation()
  const updateCollaboratorMutation = useUpdateQuestionCollaboratorMutation()
  const deleteCollaboratorMutation = useDeleteQuestionCollaboratorMutation()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sharing, setSharing] = useState(question.sharing)
  const [collaboratorPermissions, setCollaboratorPermissions] = useState<
    Record<string, QuestionCollaboratorPermission>
  >({})
  const [teacherSearch, setTeacherSearch] = useState('')
  const [newUserId, setNewUserId] = useState('')
  const [newPermission, setNewPermission] = useState<QuestionCollaboratorPermission>('READ_ONLY')
  const { confirm, dialog } = useConfirmationDialog()
  const schoolUsersQuery = useSchoolUsersBySchoolQuery(1, 8, {
    role: 'TEACHER',
    schoolId: user?.schoolId ?? '',
    search: teacherSearch,
  })

  useEffect(() => {
    setCollaboratorPermissions(
      Object.fromEntries(
        (question.collaborators ?? []).map((collaborator) => [
          collaborator.id,
          collaborator.permission,
        ]),
      ),
    )
  }, [question.collaborators])

  return (
    <div className="grid gap-4">
      <FeedbackToast
        message={message}
        onClose={() => setMessage(null)}
        tone="success"
      />
      <FeedbackToast
        message={error}
        onClose={() => setError(null)}
        tone="error"
      />
      {dialog}

      <div className="grid gap-4 md:grid-cols-2">
        <DetailItem label="Quyền truy cập chung" value={getQuestionSharingDisplay(question.sharing)} />
        <DetailItem
          label="Số cộng tác viên"
          value={String(question.collaborators?.length ?? 0)}
        />
      </div>

      {canManage ? (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <h3 className="text-base font-black text-slate-950">Quyền riêng tư và chia sẻ chung</h3>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Cấu hình quyền truy cập chung cho question này.
              </p>
            </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Quyền truy cập chung
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950"
                onChange={(event) => setSharing(event.target.value as QuestionDto['sharing'])}
                value={sharing}
              >
                <option value="PRIVATE">Riêng tư</option>
                <option value="SCHOOL_SHARED">Chia sẻ trong trường</option>
              </select>
            </label>
            <div className="self-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                onClick={() => {
                  void (async () => {
                    if (!(await confirm({ message: 'Bạn có chắc muốn lưu thay đổi chia sẻ này không?' }))) {
                      return
                    }
                    try {
                      const result = await updateQuestionMutation.mutateAsync({
                        id: question.id,
                        payload: { sharing },
                      })
                      setMessage(result.message)
                      setError(null)
                      onRefresh()
                    } catch (submitError) {
                      setError(getErrorMessage(submitError))
                    }
                  })()
                }}
                type="button"
              >
                Lưu chia sẻ
              </button>
            </div>
          </div>
          </div>

          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <h3 className="text-base font-black text-slate-950">Gán giáo viên cộng tác</h3>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Tìm giáo viên, chọn quyền và thêm vào danh sách cộng tác viên.
              </p>
            </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Tìm giáo viên
              <input
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950"
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="Nhập tên hoặc email"
                value={teacherSearch}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Quyền
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950"
                onChange={(event) => setNewPermission(event.target.value as QuestionCollaboratorPermission)}
                value={newPermission}
              >
                <option value="READ_ONLY">Chỉ xem</option>
                <option value="CAN_USE">Được sử dụng</option>
                <option value="CAN_EDIT">Được chỉnh sửa</option>
              </select>
            </label>
            <div className="self-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
                onClick={() => {
                  void (async () => {
                    if (!(await confirm({ message: 'Bạn có chắc muốn thêm cộng tác viên này không?' }))) {
                      return
                    }
                    try {
                      const result = await createCollaboratorMutation.mutateAsync({
                        payload: {
                          permission: newPermission,
                          userId: newUserId,
                        },
                        questionId: question.id,
                      })
                      setMessage(result)
                      setError(null)
                      setNewUserId('')
                      setTeacherSearch('')
                      onRefresh()
                    } catch (submitError) {
                      setError(getErrorMessage(submitError))
                    }
                  })()
                }}
                type="button"
              >
                Thêm cộng tác viên
              </button>
            </div>
          </div>
          {newUserId ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
              Đã chọn người dùng: {newUserId}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {schoolUsersQuery.data?.content.map((schoolUser) => {
              const displayUserId = schoolUser.userId ?? schoolUser.user?.id ?? ''
              const displayName =
                schoolUser.user?.fullName?.trim() || schoolUser.user?.email || displayUserId

              return (
                <button
                  className={`grid gap-1 rounded-lg border bg-white px-4 py-3 text-left transition ${newUserId === displayUserId ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  key={schoolUser.id}
                  onClick={() => setNewUserId(displayUserId)}
                  type="button"
                >
                  <span className="text-sm font-black text-slate-950">{displayName}</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {schoolUser.user?.email ?? displayUserId}
                  </span>
                </button>
              )
            })}
          </div>
          </div>
        </div>
      ) : null}

      {question.collaborators?.length ? (
        <div className="grid gap-3">
          {question.collaborators.map((collaborator) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"
              key={collaborator.id}
            >
              <div>
                <p className="text-sm font-bold text-slate-950">
                  {collaborator.user?.fullName?.trim() || collaborator.user?.email || collaborator.userId}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {collaborator.user?.email ?? collaborator.userId} - Gán lúc: {formatQuestionDate(collaborator.assignedAt)}
                </p>
              </div>
              {canManage ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
                    onChange={(event) => {
                      void (async () => {
                        const nextPermission =
                          event.target.value as QuestionCollaboratorPermission
                        const previousPermission =
                          collaboratorPermissions[collaborator.id] ?? collaborator.permission

                        setCollaboratorPermissions((current) => ({
                          ...current,
                          [collaborator.id]: nextPermission,
                        }))

                        if (!(await confirm({ message: 'Bạn có chắc muốn cập nhật quyền cộng tác viên này không?' }))) {
                          setCollaboratorPermissions((current) => ({
                            ...current,
                            [collaborator.id]: previousPermission,
                          }))
                          return
                        }
                        try {
                          const result = await updateCollaboratorMutation.mutateAsync({
                            collaboratorId: collaborator.id,
                            payload: {
                              permission: nextPermission,
                            },
                            questionId: question.id,
                          })
                          setMessage(result)
                          setError(null)
                          onRefresh()
                        } catch (submitError) {
                          setCollaboratorPermissions((current) => ({
                            ...current,
                            [collaborator.id]: previousPermission,
                          }))
                          setError(getErrorMessage(submitError))
                        }
                      })()
                    }}
                    value={collaboratorPermissions[collaborator.id] ?? collaborator.permission}
                  >
                    <option value="READ_ONLY">Chỉ xem</option>
                    <option value="CAN_USE">Được sử dụng</option>
                    <option value="CAN_EDIT">Được chỉnh sửa</option>
                  </select>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-bold text-red-600"
                    onClick={() => {
                      void (async () => {
                        try {
                          const result = await deleteCollaboratorMutation.mutateAsync({
                            collaboratorId: collaborator.id,
                            questionId: question.id,
                          })
                          setMessage(result)
                          setError(null)
                          onRefresh()
                        } catch (submitError) {
                          setError(getErrorMessage(submitError))
                        }
                      })()
                    }}
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                  {getQuestionCollaboratorPermissionDisplay(
                    collaborator.permission,
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="Chưa có cộng tác viên nào được gán riêng." />
      )}
    </div>
  )
}

export function TeacherQuestionDetailPage() {
  return <QuestionDetailPage basePath="/teacher" />
}

export function SchoolAdminQuestionDetailPage() {
  return <QuestionDetailPage basePath="/school-admin" />
}

export function SystemAdminQuestionDetailPage() {
  return <QuestionDetailPage basePath="/system-admin" />
}

