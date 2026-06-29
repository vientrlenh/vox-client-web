import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import {
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
import { examQueryKeys, useExamQuery, useExamsQuery } from '../api/useExamQueries'
import type {
  CreateExamRequest,
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

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Khong the xu ly yeu cau hien tai.'
}

function StatusBadge({ status }: { status?: string | null }) {
  const display = getExamStatusDisplay(status)
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${display.className}`}>{display.label}</span>
}

function PaperStatusBadge({ status }: { status?: string | null }) {
  const display = getExamPaperStatusDisplay(status)
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${display.className}`}>{display.label}</span>
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
            Theo doi danh sach exam va mo chi tiet de thao tac.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={() => void examsQuery.refetch()}
            type="button"
          >
            Lam moi
          </button>
          {allowCreate ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
              onClick={() => setShowCreate((current) => !current)}
              type="button"
            >
              {showCreate ? 'Dong form' : 'Tao exam'}
            </button>
          ) : null}
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {showCreate ? (
        <CreateExamCard
          isSubmitting={createExamMutation.isPending}
          onCancel={() => setShowCreate(false)}
          onSubmit={async (payload) => {
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
        <Field label="Tu khoa" value={keyword} onChange={setKeyword} />
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
              <th className="px-4 py-3">Exam</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Open</th>
              <th className="px-4 py-3">Close</th>
              <th className="px-4 py-3 text-right">Thao tac</th>
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
                      Chi tiet
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
                        Xoa
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
            {examsQuery.data?.totalElements ?? 0} exam, trang {examsQuery.data?.page ?? 1}/{examsQuery.data?.totalPages ?? 1}
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
  canManageMembers: boolean
  canManagePapers: boolean
  canManageStatus: boolean
  canUpdateInfo: boolean
  title: string
}

function ExamDetailPage({
  canManageMembers,
  canManagePapers,
  canManageStatus,
  canUpdateInfo,
  title,
}: ExamDetailPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { examId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const updateExamMutation = useUpdateExamMutation()
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

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (examQuery.isLoading) {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">Dang tai chi tiet exam...</section>
  }

  if (!exam) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Khong tim thay exam.</section>
  }

  const examStatusActions: UpdateExamStatusRequest['action'][] = ['SCHEDULE', 'START', 'CLOSE', 'PUBLISH_RESULTS', 'CANCEL']
  const paperStatusActions: UpdateExamPaperStatusRequest['action'][] = ['SUBMIT', 'APPROVE', 'REQUEST_REVISION', 'LOCK']

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
            onClick={() => navigate(-1)}
            type="button"
          >
            Quay lai
          </button>
          <h1 className="text-3xl font-black text-blue-950">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Theo doi thong tin exam, member va paper trong cung mot man.
          </p>
        </div>
      </div>

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
        <InfoItem label="Ten exam" value={exam.name} />
        <InfoItem label="Code" value={exam.code} />
        <InfoItem label="Loai" value={exam.kind} />
        <InfoItem label="Trang thai" value={<StatusBadge status={exam.status} />} />
        <InfoItem label="Open" value={formatDateTime(exam.openAt)} />
        <InfoItem label="Close" value={formatDateTime(exam.closeAt)} />
        <InfoItem label="Blueprint ID" value={formatNullableText(exam.blueprintId)} />
        <InfoItem label="School class ID" value={formatNullableText(exam.schoolClassId)} />
      </div>

      {canUpdateInfo ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void (async () => {
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

      {canManageStatus ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-black text-slate-950">Workflow exam</h2>
          <div className="flex flex-wrap gap-3">
            {examStatusActions.map((action) => (
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
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
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950">Thanh vien exam</h2>
          </div>
          {canManageMembers ? (
            <form
              className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
              onSubmit={(event) => {
                event.preventDefault()
                void (async () => {
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
              <Field label="User ID" value={memberUserId} onChange={setMemberUserId} />
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
                <button className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
                  Them
                </button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3">
            {exam.members?.map((member) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4" key={member.id}>
                <div>
                  <p className="text-sm font-black text-slate-950">{member.userId}</p>
                  <p className="text-xs font-medium text-slate-500">{member.role}</p>
                </div>
                {canManageMembers ? (
                  <div className="flex gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
                      onClick={() => {
                        const nextRole: ExamMemberRole =
                          member.role === 'AUTHOR'
                            ? 'REVIEWER'
                            : member.role === 'REVIEWER'
                              ? 'CHAIR'
                              : 'AUTHOR'
                        void (async () => {
                          try {
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
                      type="button"
                    >
                      Doi role
                    </button>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600"
                      onClick={() => {
                        void (async () => {
                          try {
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
        </div>

        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950">De thi / Papers</h2>
            {canManagePapers ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                onClick={() => {
                  void (async () => {
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
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"
                          key={action}
                          onClick={() => {
                            void (async () => {
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
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600"
                        onClick={() => {
                          void (async () => {
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
                  ) : null}
                </div>

                {paper.sections.map((section) => (
                  <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4" key={section.id}>
                    <p className="text-sm font-black text-slate-950">
                      Section {section.order}: {formatNullableText(section.title)}
                    </p>
                    {section.items.map((item) => (
                      <PaperItemEditor
                        canEdit={canManagePapers}
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

  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[120px_minmax(0,1fr)_auto]">
      <div className="text-sm font-black text-slate-950">Item {item.order}</div>
      <div className="grid gap-1">
        <input
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
          disabled={!canEdit}
          onChange={(event) => setQuestionId(event.target.value)}
          placeholder="Question ID"
          value={questionId}
        />
        <p className="text-xs font-medium text-slate-500">
          {item.question?.code ? `${item.question.code} - ` : ''}{formatNullableText(item.question?.questionText)}
        </p>
      </div>
      {canEdit ? (
        <button
          className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
          onClick={() => onSave(questionId)}
          type="button"
        >
          Luu
        </button>
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

function Notice({ children, tone }: { children: ReactNode; tone: 'error' | 'success' }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {children}
    </div>
  )
}

export function SchoolAdminExamsPage() {
  return <ExamListPage allowCreate basePath="/school-admin/exams" kind="CENTRALIZED" title="Kiem tra tap trung" />
}

export function SchoolAdminExamDetailPage() {
  return (
    <ExamDetailPage
      basePath="/school-admin/exams"
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
      canManageMembers={false}
      canManagePapers
      canManageStatus
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
      canManageMembers={false}
      canManagePapers={false}
      canManageStatus={false}
      canUpdateInfo={false}
      title="Chi tiet exam"
    />
  )
}
