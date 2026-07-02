import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { useQuestionBanksQuery } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionTopicsQuery } from '@/features/question-topic/api/useQuestionTopicsQuery'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { QuestionPicker } from '../components/QuestionPicker'
import {
  useCreateBlueprintMutation,
  useCreateBlueprintSectionMutation,
  useCreateBlueprintSlotMutation,
  useCreateBlueprintVersionMutation,
  useDeleteBlueprintMutation,
  useDeleteBlueprintSectionMutation,
  useDeleteBlueprintSlotMutation,
  useUpdateBlueprintMutation,
  useUpdateBlueprintSectionMutation,
  useUpdateBlueprintSlotMutation,
  useUpdateBlueprintVersionStatusMutation,
} from '../api/useExamMutations'
import { examQueryKeys, useExamBlueprintQuery, useExamBlueprintsQuery } from '../api/useExamQueries'
import type {
  CreateExamBlueprintRequest,
  CreateExamBlueprintSectionRequest,
  CreateExamBlueprintSlotRequest,
  CreateExamBlueprintVersionRequest,
  ExamBlueprintSectionDto,
  ExamBlueprintSectionInput,
  ExamBlueprintSlotDto,
  ExamBlueprintSlotInput,
  ExamBlueprintVersionDto,
  QuestionSelectionSpec,
} from '../types'
import {
  formatDateTime,
  formatNullableText,
  getBlueprintVersionStatusDisplay,
} from '../types'

const DEFAULT_LANGUAGE_ID = '00000000-0000-0000-0000-000000000001'

const QUESTION_TYPE_OPTIONS = [
  { label: 'Đọc to', value: 'READ_ALOUD' },
  { label: 'Trả lời ngắn', value: 'SHORT_ANSWER' },
  { label: 'Trả lời dài', value: 'LONG_ANSWER' },
  { label: 'Ý kiến', value: 'OPINION' },
  { label: 'Mô tả', value: 'DESCRIPTION' },
] as const

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Không thể xử lý blueprint.'
}

function getVersionWorkflowErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
    if ('message' in error && typeof error.message === 'string') {
      const normalized = error.message.toLowerCase()

      if (
        normalized.includes('creator') ||
        normalized.includes('author') ||
        normalized.includes('chinh minh') ||
        normalized.includes('tac gia')
      ) {
        return 'Người tạo version không được tự đổi trạng thái version của chính mình.'
      }
    }

    return 'Chỉ CHAIR hoặc REVIEWER của exam đã gán blueprint này mới được đổi trạng thái version.'
  }

  return getErrorMessage(error)
}

function createSelectionSpec(): QuestionSelectionSpec {
  return {
    difficulty: null,
    questionType: null,
    skillCode: null,
    targetBandLevel: null,
    topicId: null,
  }
}

function createDefaultSlotInput(order: number): ExamBlueprintSlotInput {
  return {
    order,
    selectionSpec: createSelectionSpec(),
    slotType: 'SELECTION',
    weight: 1,
  }
}

function createDefaultSectionInput(order: number): ExamBlueprintSectionInput {
  return {
    instruction: '',
    order,
    sectionTimeLimitSeconds: 0,
    sectionWeight: 1,
    slots: [createDefaultSlotInput(1)],
    title: `Section ${order}`,
  }
}

function cloneDraftSection(section: ExamBlueprintSectionDto): ExamBlueprintSectionDto {
  return {
    ...section,
    slots: section.slots.map((slot) => ({
      ...slot,
      fixedQuestion: slot.fixedQuestion ? { ...slot.fixedQuestion } : null,
      selectionSpec: slot.selectionSpec ? { ...slot.selectionSpec } : null,
    })),
  }
}

function normalizeSectionPayload(
  section: Pick<
    ExamBlueprintSectionDto | ExamBlueprintSectionInput,
    'instruction' | 'order' | 'sectionTimeLimitSeconds' | 'sectionWeight' | 'title'
  >,
): CreateExamBlueprintSectionRequest {
  return {
    instruction: section.instruction?.trim() || null,
    order: Number(section.order) || 1,
    sectionTimeLimitSeconds: section.sectionTimeLimitSeconds ?? null,
    sectionWeight: section.sectionWeight ?? null,
    title: section.title.trim(),
  }
}

function normalizeSlotPayload(
  slot: Pick<
    ExamBlueprintSlotDto | ExamBlueprintSlotInput,
    | 'fixedQuestionId'
    | 'order'
    | 'prepTimeSecondsOverride'
    | 'responseTimeSecondsOverride'
    | 'selectionSpec'
    | 'slotType'
    | 'weight'
  >,
): CreateExamBlueprintSlotRequest {
  return {
    fixedQuestionId: slot.slotType === 'FIXED' ? slot.fixedQuestionId || null : null,
    order: Number(slot.order) || 1,
    prepTimeSecondsOverride: slot.prepTimeSecondsOverride ?? null,
    responseTimeSecondsOverride: slot.responseTimeSecondsOverride ?? null,
    selectionSpec:
      slot.slotType === 'SELECTION'
        ? {
            difficulty: slot.selectionSpec?.difficulty?.trim() || null,
            questionType: slot.selectionSpec?.questionType?.trim() || null,
            skillCode: slot.selectionSpec?.skillCode?.trim() || null,
            targetBandLevel: slot.selectionSpec?.targetBandLevel?.trim() || null,
            topicId: slot.selectionSpec?.topicId?.trim() || null,
          }
        : null,
    slotType: slot.slotType,
    weight: slot.weight ?? null,
  }
}

function getPublishBlockers(version: ExamBlueprintVersionDto) {
  return version.sections.flatMap((section) =>
    section.slots
      .filter(
        (slot) =>
          slot.slotType === 'FIXED' &&
          slot.fixedQuestion &&
          slot.fixedQuestion.status !== 'PUBLISHED',
      )
      .map((slot) => ({
        questionCode: slot.fixedQuestion?.code ?? slot.fixedQuestionId ?? 'unknown',
        sectionTitle: section.title,
        slotOrder: slot.order,
        status: slot.fixedQuestion?.status ?? '-',
      })),
  )
}

type BlueprintListPageProps = {
  allowCreate?: boolean
  basePath: string
  readOnly?: boolean
  title: string
}

function BlueprintListPage({ allowCreate = false, basePath, readOnly = false, title }: BlueprintListPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmationDialog()
  const blueprintsQuery = useExamBlueprintsQuery({ keyword, page: 1, size: 10 })
  const createMutation = useCreateBlueprintMutation()
  const deleteMutation = useDeleteBlueprintMutation()

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-950">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Quản lý danh sách blueprint và version của đề thi.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"
            onClick={() => void blueprintsQuery.refetch()}
            type="button"
          >
            Làm mới
          </button>
          {!readOnly && allowCreate ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
              onClick={() => setShowCreate((current) => !current)}
              type="button"
            >
              {showCreate ? 'Đóng form' : 'Tạo blueprint'}
            </button>
          ) : null}
        </div>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {dialog}

      {showCreate ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault()
            const formElement = event.currentTarget
            void (async () => {
              if (!(await confirm({ message: 'Bạn có chắc muốn tạo blueprint này không?' }))) {
                return
              }
              const form = new FormData(formElement)
              const payload: CreateExamBlueprintRequest = {
                code: String(form.get('code') ?? ''),
                description: String(form.get('description') ?? '') || null,
                languageId: DEFAULT_LANGUAGE_ID,
                name: String(form.get('name') ?? ''),
              }
              try {
                const result = await createMutation.mutateAsync(payload)
                await refresh()
                setMessage(result.message)
                setError(null)
                setShowCreate(false)
              } catch (submitError) {
                setError(getErrorMessage(submitError))
              }
            })()
          }}
        >
          <Field label="Code" name="code" />
          <Field label="Ten blueprint" name="name" />
          <Field label="Mo ta" name="description" />
          <div className="md:col-span-3 flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
              Tao blueprint
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <Field label="Tu khoa" name="keyword" onValueChange={setKeyword} value={keyword} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Blueprint</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Thao tac</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {blueprintsQuery.data?.content.map((blueprint) => (
              <tr key={blueprint.id}>
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <span className="text-sm font-black text-slate-950">{blueprint.name}</span>
                    <span className="text-xs font-medium text-slate-500">{formatNullableText(blueprint.description)}</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-600">{blueprint.code}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">{blueprint.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">{formatDateTime(blueprint.updatedAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
                      onClick={() => navigate(`${basePath}/${blueprint.id}`)}
                      type="button"
                    >
                      Chi tiet
                    </button>
                    {!readOnly ? (
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600"
                        onClick={() => {
                          void (async () => {
                            try {
                              const result = await deleteMutation.mutateAsync(blueprint.id)
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
                        Xóa
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

type BlueprintDetailPageProps = {
  canEdit: boolean
  title: string
}

function BlueprintDetailPage({ canEdit, title }: BlueprintDetailPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { blueprintId } = useParams()
  const blueprintQuery = useExamBlueprintQuery(blueprintId ?? null)
  const blueprint = blueprintQuery.data
  const updateBlueprintMutation = useUpdateBlueprintMutation()
  const createVersionMutation = useCreateBlueprintVersionMutation()
  const updateVersionStatusMutation = useUpdateBlueprintVersionStatusMutation()
  const createSectionMutation = useCreateBlueprintSectionMutation()
  const updateSectionMutation = useUpdateBlueprintSectionMutation()
  const deleteSectionMutation = useDeleteBlueprintSectionMutation()
  const createSlotMutation = useCreateBlueprintSlotMutation()
  const updateSlotMutation = useUpdateBlueprintSlotMutation()
  const deleteSlotMutation = useDeleteBlueprintSlotMutation()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sections, setSections] = useState<ExamBlueprintSectionInput[]>([
    createDefaultSectionInput(1),
  ])
  const [draftSectionsByVersion, setDraftSectionsByVersion] = useState<
    Record<string, ExamBlueprintSectionDto[]>
  >({})
  const [selectionBankBySlot, setSelectionBankBySlot] = useState<Record<string, string>>({})
  const { confirm, dialog } = useConfirmationDialog()

  const questionBanksQuery = useQuestionBanksQuery('teacher', 0, 100, canEdit, {
    status: 'PUBLISHED',
  })

  useEffect(() => {
    if (!blueprint?.versions) {
      return
    }

    setDraftSectionsByVersion((current) => {
      const next = { ...current }
      for (const version of blueprint.versions ?? []) {
        if (version.status === 'DRAFT') {
          next[version.id] = version.sections.map(cloneDraftSection)
        }
      }
      return next
    })
  }, [blueprint])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  function setDraftSections(
    versionId: string,
    updater: (sectionsState: ExamBlueprintSectionDto[]) => ExamBlueprintSectionDto[],
  ) {
    setDraftSectionsByVersion((current) => ({
      ...current,
      [versionId]: updater(current[versionId] ?? []),
    }))
  }

  function updateCreateSlot(
    sectionIndex: number,
    slotIndex: number,
    updater: (slot: ExamBlueprintSlotInput) => ExamBlueprintSlotInput,
  ) {
    setSections((current) =>
      current.map((item, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? {
              ...item,
              slots: item.slots.map((currentSlot, currentSlotIndex) =>
                currentSlotIndex === slotIndex ? updater(currentSlot) : currentSlot,
              ),
            }
          : item,
      ),
    )
  }

  function updateDraftSection(
    versionId: string,
    sectionId: string,
    updater: (section: ExamBlueprintSectionDto) => ExamBlueprintSectionDto,
  ) {
    setDraftSections(versionId, (current) =>
      current.map((section) => (section.id === sectionId ? updater(section) : section)),
    )
  }

  function updateDraftSlot(
    versionId: string,
    sectionId: string,
    slotId: string,
    updater: (slot: ExamBlueprintSlotDto) => ExamBlueprintSlotDto,
  ) {
    setDraftSections(versionId, (current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              slots: section.slots.map((slot) => (slot.id === slotId ? updater(slot) : slot)),
            }
          : section,
      ),
    )
  }

  async function handleSaveDraftSection(versionId: string, section: ExamBlueprintSectionDto) {
    if (!section.title.trim()) {
      setError('Tiêu đề section không được để trống.')
      return
    }

    if (!(await confirm({ message: 'Bạn có chắc muốn lưu section draft này không?' }))) {
      return
    }

    try {
      const result = await updateSectionMutation.mutateAsync({
        payload: normalizeSectionPayload(section),
        sectionId: section.id,
      })
      await refresh()
      setMessage(result)
      setError(null)
    } catch (submitError) {
      setError(getErrorMessage(submitError))
      setDraftSections(versionId, () =>
        blueprint?.versions?.find((version) => version.id === versionId)?.sections.map(cloneDraftSection) ?? [],
      )
    }
  }

  async function handleAddDraftSection(version: ExamBlueprintVersionDto) {
    try {
      const result = await createSectionMutation.mutateAsync({
        payload: normalizeSectionPayload({
          instruction: '',
          order: version.sections.length + 1,
          sectionTimeLimitSeconds: 0,
          sectionWeight: 1,
          title: `Section ${version.sections.length + 1}`,
        }),
        versionId: version.id,
      })
      await refresh()
      setMessage(result)
      setError(null)
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    }
  }

  async function handleDeleteDraftSection(sectionId: string) {
    try {
      const result = await deleteSectionMutation.mutateAsync(sectionId)
      await refresh()
      setMessage(result)
      setError(null)
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    }
  }

  async function handleSaveDraftSlot(slotId: string, slot: ExamBlueprintSlotDto) {
    if (slot.slotType === 'FIXED' && !slot.fixedQuestionId) {
      setError('Slot FIXED cần chọn fixed question trước khi lưu.')
      return
    }

    if (!(await confirm({ message: 'Bạn có chắc muốn lưu slot draft này không?' }))) {
      return
    }

    try {
      const result = await updateSlotMutation.mutateAsync({
        payload: normalizeSlotPayload(slot),
        slotId,
      })
      await refresh()
      setMessage(result)
      setError(null)
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    }
  }

  async function handleAddDraftSlot(section: ExamBlueprintSectionDto) {
    try {
      const result = await createSlotMutation.mutateAsync({
        payload: normalizeSlotPayload({
          order: section.slots.length + 1,
          selectionSpec: createSelectionSpec(),
          slotType: 'SELECTION',
          weight: 1,
        }),
        sectionId: section.id,
      })
      await refresh()
      setMessage(result)
      setError(null)
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    }
  }

  async function handleDeleteDraftSlot(slotId: string) {
    try {
      const result = await deleteSlotMutation.mutateAsync(slotId)
      await refresh()
      setMessage(result)
      setError(null)
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    }
  }

  if (!blueprint) {
    if (blueprintQuery.isLoading) {
      return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">Dang tai blueprint...</section>
    }
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Khong tim thay blueprint.</section>
  }

  return (
    <section className="grid gap-6">
      <div>
        <button className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600" onClick={() => navigate(-1)} type="button">
          Quay lai
        </button>
        <h1 className="text-3xl font-black text-blue-950">{title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Xem thông tin blueprint, version và soạn editor chi tiết cho draft version.
        </p>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {dialog}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
        <InfoItem label="Ten" value={blueprint.name} />
        <InfoItem label="Code" value={blueprint.code} />
        <InfoItem label="Active" value={blueprint.isActive ? 'Yes' : 'No'} />
        <InfoItem label="Updated" value={formatDateTime(blueprint.updatedAt)} />
      </div>

      {canEdit ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void (async () => {
              try {
                const result = await updateBlueprintMutation.mutateAsync({
                  blueprintId: blueprint.id,
                  payload: {
                    description: description || blueprint.description || null,
                    name: name || blueprint.name,
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
          <Field label="Ten blueprint" name="blueprint-name" onValueChange={setName} value={name} />
          <Field label="Mo ta" name="blueprint-description" onValueChange={setDescription} value={description} />
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
Lưu thông tin
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Versions</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Bước này dành cho REVIEWER/CHAIR đổi trạng thái version. AUTHOR không tự đổi trạng thái version của chính mình.
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          {blueprint.versions?.map((version) => {
            const status = getBlueprintVersionStatusDisplay(version.status)
            const publishBlockers = getPublishBlockers(version)
            const draftSections = draftSectionsByVersion[version.id] ?? version.sections

            return (
              <div className="grid gap-4 rounded-lg border border-slate-200 p-4" key={version.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid gap-2">
                    <p className="text-sm font-black text-slate-950">Version {version.version} - {version.code}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
                      <span className="text-xs font-semibold text-slate-500">
                        Tong thoi gian: {version.totalTimeLimitSeconds ?? 0} giay
                      </span>
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="flex gap-2">
                      {version.status !== 'PUBLISHED' ? (
                        <button
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"
                          onClick={() => {
                            void (async () => {
                              try {
                                const result = await updateVersionStatusMutation.mutateAsync({
                                  payload: { action: 'PUBLISH' },
                                  versionId: version.id,
                                })
                                await refresh()
                                setMessage(result)
                                setError(null)
                              } catch (submitError) {
                                setError(getVersionWorkflowErrorMessage(submitError))
                              }
                            })()
                          }}
                          type="button"
                        >
                          REVIEWER/CHAIR đưa về PUBLISHED
                        </button>
                      ) : null}
                      {version.status === 'PUBLISHED' ? (
                        <button
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"
                          onClick={() => {
                            void (async () => {
                              try {
                                const result = await updateVersionStatusMutation.mutateAsync({
                                  payload: { action: 'ARCHIVE' },
                                  versionId: version.id,
                                })
                                await refresh()
                                setMessage(result)
                                setError(null)
                              } catch (submitError) {
                                setError(getVersionWorkflowErrorMessage(submitError))
                              }
                            })()
                          }}
                          type="button"
                        >
                          REVIEWER/CHAIR đưa về ARCHIVED
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {publishBlockers.length ? (
                  <Notice tone="error">
                    {`Version nay con ${publishBlockers.length} slot FIXED tro toi question chua PUBLISHED: `}
                    {publishBlockers
                      .map(
                        (blocker) =>
                          `${blocker.sectionTitle}/slot ${blocker.slotOrder} (${blocker.questionCode} - ${blocker.status})`,
                      )
                      .join(', ')}
                  </Notice>
                ) : null}

                {version.status === 'DRAFT' && canEdit ? (
                  <div className="grid gap-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-950">Editor draft version</h3>
                        <p className="mt-1 text-sm font-medium text-slate-600">
                          Thêm, sửa, xóa section và slot ngay trên version DRAFT nay.
                        </p>
                      </div>
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                        onClick={() => void handleAddDraftSection(version)}
                        type="button"
                      >
                        Thêm Section
                      </button>
                    </div>

                    {draftSections.map((section) => (
                      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4" key={section.id}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-950">
                              Section {section.order}: {section.title}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              Blur o input de luu section, slot co nut luu rieng khi can.
                            </p>
                          </div>
                          <button
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600"
                            onClick={() => void handleDeleteDraftSection(section.id)}
                            type="button"
                          >
                            Xoa section
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                          <Field
                            label="Thu tu"
                            name={`draft-section-order-${section.id}`}
                            onBlur={() => void handleSaveDraftSection(version.id, section)}
                            onValueChange={(value) =>
                              updateDraftSection(version.id, section.id, (current) => ({
                                ...current,
                                order: Number(value) || 1,
                              }))
                            }
                            value={String(section.order)}
                          />
                          <Field
                            label="Tieu de section"
                            name={`draft-section-title-${section.id}`}
                            onBlur={() => void handleSaveDraftSection(version.id, section)}
                            onValueChange={(value) =>
                              updateDraftSection(version.id, section.id, (current) => ({
                                ...current,
                                title: value,
                              }))
                            }
                            value={section.title}
                          />
                          <Field
                            label="Section time"
                            name={`draft-section-time-${section.id}`}
                            onBlur={() => void handleSaveDraftSection(version.id, section)}
                            onValueChange={(value) =>
                              updateDraftSection(version.id, section.id, (current) => ({
                                ...current,
                                sectionTimeLimitSeconds: Number(value) || 0,
                              }))
                            }
                            value={String(section.sectionTimeLimitSeconds ?? 0)}
                          />
                          <Field
                            label="Section weight"
                            name={`draft-section-weight-${section.id}`}
                            onBlur={() => void handleSaveDraftSection(version.id, section)}
                            onValueChange={(value) =>
                              updateDraftSection(version.id, section.id, (current) => ({
                                ...current,
                                sectionWeight: Number(value) || 1,
                              }))
                            }
                            value={String(section.sectionWeight ?? 1)}
                          />
                        </div>

                        <Field
                          label="Instruction"
                          name={`draft-section-instruction-${section.id}`}
                          onBlur={() => void handleSaveDraftSection(version.id, section)}
                          onValueChange={(value) =>
                            updateDraftSection(version.id, section.id, (current) => ({
                              ...current,
                              instruction: value,
                            }))
                          }
                          value={section.instruction ?? ''}
                        />

                        <div className="flex justify-end">
                          <button
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
                            onClick={() => void handleAddDraftSlot(section)}
                            type="button"
                          >
                            Them slot
                          </button>
                        </div>

                        {section.slots.map((slot) => {
                          const topicQueryKey = slot.id || `${section.id}-${slot.order}`

                          return (
                            <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4" key={slot.id}>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-slate-950">
                                    Slot {slot.order} - {slot.slotType}
                                  </p>
                                  {slot.fixedQuestion?.code ? (
                                    <p className="mt-1 text-xs font-medium text-slate-500">
                                      Fixed question: {slot.fixedQuestion.code}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"
                                    onClick={() => void handleSaveDraftSlot(slot.id, slot)}
                                    type="button"
                                  >
                                    Luu slot
                                  </button>
                                  <button
                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600"
                                    onClick={() => void handleDeleteDraftSlot(slot.id)}
                                    type="button"
                                  >
                                    Xoa slot
                                  </button>
                                </div>
                              </div>

                              <div className="grid gap-4 md:grid-cols-5">
                                <Field
                                  label="Thu tu"
                                  name={`draft-slot-order-${slot.id}`}
                                  onValueChange={(value) =>
                                    updateDraftSlot(version.id, section.id, slot.id, (current) => ({
                                      ...current,
                                      order: Number(value) || 1,
                                    }))
                                  }
                                  value={String(slot.order)}
                                />
                                <SelectField
                                  label="Slot type"
                                  onChange={(value) =>
                                    updateDraftSlot(version.id, section.id, slot.id, (current) => ({
                                      ...current,
                                      fixedQuestionId: value === 'FIXED' ? current.fixedQuestionId ?? null : null,
                                      selectionSpec:
                                        value === 'SELECTION'
                                          ? current.selectionSpec ?? createSelectionSpec()
                                          : null,
                                      slotType: value as ExamBlueprintSlotDto['slotType'],
                                    }))
                                  }
                                  options={[
                                    { label: 'Fixed', value: 'FIXED' },
                                    { label: 'Selection', value: 'SELECTION' },
                                  ]}
                                  value={slot.slotType}
                                />
                                <Field
                                  label="Weight"
                                  name={`draft-slot-weight-${slot.id}`}
                                  onValueChange={(value) =>
                                    updateDraftSlot(version.id, section.id, slot.id, (current) => ({
                                      ...current,
                                      weight: Number(value) || 1,
                                    }))
                                  }
                                  value={String(slot.weight ?? 1)}
                                />
                                <Field
                                  label="Prep time"
                                  name={`draft-slot-prep-${slot.id}`}
                                  onValueChange={(value) =>
                                    updateDraftSlot(version.id, section.id, slot.id, (current) => ({
                                      ...current,
                                      prepTimeSecondsOverride: Number(value) || 0,
                                    }))
                                  }
                                  value={String(slot.prepTimeSecondsOverride ?? 0)}
                                />
                                <Field
                                  label="Response time"
                                  name={`draft-slot-response-${slot.id}`}
                                  onValueChange={(value) =>
                                    updateDraftSlot(version.id, section.id, slot.id, (current) => ({
                                      ...current,
                                      responseTimeSecondsOverride: Number(value) || 0,
                                    }))
                                  }
                                  value={String(slot.responseTimeSecondsOverride ?? 0)}
                                />
                              </div>

                              {slot.slotType === 'FIXED' ? (
                                <div className="grid gap-3">
                                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                                    {slot.fixedQuestion
                                      ? `Dang chon ${slot.fixedQuestion.code} - ${formatNullableText(slot.fixedQuestion.questionText)}`
                                      : 'Chua chon question co dinh cho slot nay.'}
                                  </div>
                                  <QuestionPicker
                                    allowStatusChange={false}
                                    fixedStatus="PUBLISHED"
                                    mode="single"
                                    onSelect={(question) => {
                                      const nextSlot = {
                                        ...slot,
                                        fixedQuestion: {
                                          code: question.code,
                                          id: question.id,
                                          questionText: question.questionText,
                                          status: question.status,
                                        },
                                        fixedQuestionId: question.id,
                                      }
                                      updateDraftSlot(version.id, section.id, slot.id, () => nextSlot)
                                      void handleSaveDraftSlot(slot.id, nextSlot)
                                    }}
                                    selectedQuestionIds={slot.fixedQuestionId ? [slot.fixedQuestionId] : []}
                                    title="Question picker"
                                  />
                                </div>
                              ) : (
                                <SelectionSpecEditor
                                  bankOptions={questionBanksQuery.data?.content ?? []}
                                  canEdit={canEdit}
                                  selectionBankBySlot={selectionBankBySlot}
                                  selectionSpec={slot.selectionSpec}
                                  setSelectionBankBySlot={setSelectionBankBySlot}
                                  slotKey={topicQueryKey}
                                  onSelectionSpecChange={(nextSelectionSpec) =>
                                    updateDraftSlot(version.id, section.id, slot.id, (current) => ({
                                      ...current,
                                      selectionSpec: nextSelectionSpec,
                                    }))
                                  }
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  version.sections.map((section) => (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4" key={section.id}>
                      <p className="text-sm font-black text-slate-950">
                        Section {section.order}: {section.title}
                      </p>
                      <div className="mt-2 grid gap-2">
                        {section.slots.map((slot) => (
                          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700" key={slot.id}>
                            Slot {slot.order} - {slot.slotType}
                            {slot.fixedQuestion?.code ? ` - ${slot.fixedQuestion.code}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </div>

      {canEdit ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6"
          onSubmit={(event) => {
            event.preventDefault()

            for (const section of sections) {
              if (!section.title.trim()) {
                setError('Moi section phai co tieu de.')
                return
              }
              for (const slot of section.slots) {
                if (slot.slotType === 'FIXED' && !slot.fixedQuestionId) {
                  setError(`Section ${section.order} co slot FIXED chua chon question.`)
                  return
                }
              }
            }

            const payload: CreateExamBlueprintVersionRequest = {
              sections: sections.map((section) => ({
                ...normalizeSectionPayload(section),
                slots: section.slots.map((slot) => normalizeSlotPayload(slot)),
              })),
              totalTimeLimitSeconds: sections.reduce(
                (sum, section) => sum + (section.sectionTimeLimitSeconds ?? 0),
                0,
              ),
            }
            void (async () => {
              try {
                const result = await createVersionMutation.mutateAsync({
                  blueprintId: blueprint.id,
                  payload,
                })
                await refresh()
                setSections([createDefaultSectionInput(1)])
                setMessage(result)
                setError(null)
              } catch (submitError) {
                setError(getErrorMessage(submitError))
              }
            })()
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Tao draft version</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Flow nay dung cho tao moi hoan toan. Draft da ton tai thi sua o editor phia tren.
              </p>
            </div>
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
              onClick={() =>
                setSections((current) => [...current, createDefaultSectionInput(current.length + 1)])
              }
              type="button"
            >
              Them section
            </button>
          </div>

          {sections.map((section, sectionIndex) => (
            <div className="grid gap-4 rounded-lg border border-slate-200 p-4" key={`section-${sectionIndex}`}>
              <div className="flex justify-between gap-3">
                <p className="text-sm font-black text-slate-950">Section moi #{sectionIndex + 1}</p>
                {sections.length > 1 ? (
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600"
                    onClick={() =>
                      setSections((current) =>
                        current
                          .filter((_, index) => index !== sectionIndex)
                          .map((item, index) => ({ ...item, order: index + 1 })),
                      )
                    }
                    type="button"
                  >
                    Xoa section
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Field
                  label="Tieu de section"
                  name={`section-title-${sectionIndex}`}
                  onValueChange={(value) =>
                    setSections((current) =>
                      current.map((item, index) => (index === sectionIndex ? { ...item, title: value } : item)),
                    )
                  }
                  value={section.title}
                />
                <Field
                  label="Thu tu"
                  name={`section-order-${sectionIndex}`}
                  onValueChange={(value) =>
                    setSections((current) =>
                      current.map((item, index) =>
                        index === sectionIndex ? { ...item, order: Number(value) || 1 } : item,
                      ),
                    )
                  }
                  value={String(section.order)}
                />
                <Field
                  label="Section time"
                  name={`section-time-${sectionIndex}`}
                  onValueChange={(value) =>
                    setSections((current) =>
                      current.map((item, index) =>
                        index === sectionIndex ? { ...item, sectionTimeLimitSeconds: Number(value) || 0 } : item,
                      ),
                    )
                  }
                  value={String(section.sectionTimeLimitSeconds ?? 0)}
                />
                <Field
                  label="Section weight"
                  name={`section-weight-${sectionIndex}`}
                  onValueChange={(value) =>
                    setSections((current) =>
                      current.map((item, index) =>
                        index === sectionIndex ? { ...item, sectionWeight: Number(value) || 1 } : item,
                      ),
                    )
                  }
                  value={String(section.sectionWeight ?? 1)}
                />
              </div>

              <Field
                label="Instruction"
                name={`section-instruction-${sectionIndex}`}
                onValueChange={(value) =>
                  setSections((current) =>
                    current.map((item, index) => (index === sectionIndex ? { ...item, instruction: value } : item)),
                  )
                }
                value={section.instruction ?? ''}
              />

              {section.slots.map((slot, slotIndex) => {
                const createSlotKey = `create-${sectionIndex}-${slotIndex}`

                return (
                  <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4" key={`slot-${sectionIndex}-${slotIndex}`}>
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">Slot #{slotIndex + 1}</p>
                      {section.slots.length > 1 ? (
                        <button
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600"
                          onClick={() =>
                            setSections((current) =>
                              current.map((item, currentSectionIndex) =>
                                currentSectionIndex === sectionIndex
                                  ? {
                                      ...item,
                                      slots: item.slots
                                        .filter((_, currentSlotIndex) => currentSlotIndex !== slotIndex)
                                        .map((currentSlot, nextSlotIndex) => ({
                                          ...currentSlot,
                                          order: nextSlotIndex + 1,
                                        })),
                                    }
                                  : item,
                              ),
                            )
                          }
                          type="button"
                        >
                          Xoa slot
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-5">
                      <Field
                        label="Thu tu"
                        name={`slot-order-${sectionIndex}-${slotIndex}`}
                        onValueChange={(value) =>
                          updateCreateSlot(sectionIndex, slotIndex, (currentSlot) => ({
                            ...currentSlot,
                            order: Number(value) || 1,
                          }))
                        }
                        value={String(slot.order)}
                      />
                      <SelectField
                        label="Slot type"
                        onChange={(value) =>
                          updateCreateSlot(sectionIndex, slotIndex, (currentSlot) => ({
                            ...currentSlot,
                            fixedQuestionId: value === 'FIXED' ? currentSlot.fixedQuestionId ?? null : null,
                            selectionSpec:
                              value === 'SELECTION'
                                ? currentSlot.selectionSpec ?? createSelectionSpec()
                                : null,
                            slotType: value as ExamBlueprintSlotInput['slotType'],
                          }))
                        }
                        options={[
                          { label: 'Fixed', value: 'FIXED' },
                          { label: 'Selection', value: 'SELECTION' },
                        ]}
                        value={slot.slotType}
                      />
                      <Field
                        label="Weight"
                        name={`slot-weight-${sectionIndex}-${slotIndex}`}
                        onValueChange={(value) =>
                          updateCreateSlot(sectionIndex, slotIndex, (currentSlot) => ({
                            ...currentSlot,
                            weight: Number(value) || 1,
                          }))
                        }
                        value={String(slot.weight ?? 1)}
                      />
                      <Field
                        label="Prep time"
                        name={`slot-prep-${sectionIndex}-${slotIndex}`}
                        onValueChange={(value) =>
                          updateCreateSlot(sectionIndex, slotIndex, (currentSlot) => ({
                            ...currentSlot,
                            prepTimeSecondsOverride: Number(value) || 0,
                          }))
                        }
                        value={String(slot.prepTimeSecondsOverride ?? 0)}
                      />
                      <Field
                        label="Response time"
                        name={`slot-response-${sectionIndex}-${slotIndex}`}
                        onValueChange={(value) =>
                          updateCreateSlot(sectionIndex, slotIndex, (currentSlot) => ({
                            ...currentSlot,
                            responseTimeSecondsOverride: Number(value) || 0,
                          }))
                        }
                        value={String(slot.responseTimeSecondsOverride ?? 0)}
                      />
                    </div>

                    {slot.slotType === 'FIXED' ? (
                      <div className="grid gap-3">
                        <p className="text-sm font-bold text-slate-700">
                          Chon cau hoi co dinh cho slot nay
                        </p>
                        <QuestionPicker
                          allowStatusChange={false}
                          fixedStatus="PUBLISHED"
                          mode="single"
                          onSelect={(question) =>
                            updateCreateSlot(sectionIndex, slotIndex, (currentSlot) => ({
                              ...currentSlot,
                              fixedQuestionId: question.id,
                            }))
                          }
                          selectedQuestionIds={slot.fixedQuestionId ? [slot.fixedQuestionId] : []}
                          title="Question picker"
                        />
                      </div>
                    ) : (
                      <SelectionSpecEditor
                        bankOptions={questionBanksQuery.data?.content ?? []}
                        canEdit={canEdit}
                        selectionBankBySlot={selectionBankBySlot}
                        selectionSpec={slot.selectionSpec}
                        setSelectionBankBySlot={setSelectionBankBySlot}
                        slotKey={createSlotKey}
                        onSelectionSpecChange={(nextSelectionSpec) =>
                          updateCreateSlot(sectionIndex, slotIndex, (currentSlot) => ({
                            ...currentSlot,
                            selectionSpec: nextSelectionSpec,
                          }))
                        }
                      />
                    )}
                  </div>
                )
              })}

              <div className="flex justify-end">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"
                  onClick={() =>
                    setSections((current) =>
                      current.map((item, currentSectionIndex) =>
                        currentSectionIndex === sectionIndex
                          ? {
                              ...item,
                              slots: [...item.slots, createDefaultSlotInput(item.slots.length + 1)],
                            }
                          : item,
                      ),
                    )
                  }
                  type="button"
                >
                  Them slot
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
              Tao draft version
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function Field({
  label,
  name,
  onBlur,
  onValueChange,
  value,
}: {
  label: string
  name: string
  onBlur?: () => void
  onValueChange?: (value: string) => void
  value?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        name={name}
        onBlur={onBlur}
        onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
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

function SelectionSpecEditor({
  bankOptions,
  canEdit,
  onSelectionSpecChange,
  selectionBankBySlot,
  selectionSpec,
  setSelectionBankBySlot,
  slotKey,
}: {
  bankOptions: Array<{ code: string; id: string; name: string }>
  canEdit: boolean
  onSelectionSpecChange: (selectionSpec: QuestionSelectionSpec) => void
  selectionBankBySlot: Record<string, string>
  selectionSpec?: QuestionSelectionSpec | null
  setSelectionBankBySlot: Dispatch<SetStateAction<Record<string, string>>>
  slotKey: string
}) {
  const selectedBankId = selectionBankBySlot[slotKey] || bankOptions[0]?.id || ''
  const questionTopicsQuery = useQuestionTopicsQuery(
    'teacher',
    selectedBankId,
    0,
    100,
    canEdit && Boolean(selectedBankId),
    { status: 'PUBLISHED' },
  )

  const currentSelectionSpec = {
    ...createSelectionSpec(),
    ...selectionSpec,
  }

  return (
    <div className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Question bank
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
            onChange={(event) =>
              setSelectionBankBySlot((current) => ({
                ...current,
                [slotKey]: event.target.value,
              }))
            }
            value={selectedBankId}
          >
            <option value="">Chon bank de loc topic</option>
            {bankOptions.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.code} - {bank.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Question type
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
            onChange={(event) =>
              onSelectionSpecChange({
                ...currentSelectionSpec,
                questionType: event.target.value || null,
              })
            }
            value={currentSelectionSpec.questionType ?? ''}
          >
            <option value="">Khong gioi han</option>
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Difficulty"
          name={`selection-difficulty-${slotKey}`}
          onValueChange={(value) =>
            onSelectionSpecChange({
              ...currentSelectionSpec,
              difficulty: value || null,
            })
          }
          value={currentSelectionSpec.difficulty ?? ''}
        />
        <Field
          label="Target band"
          name={`selection-band-${slotKey}`}
          onValueChange={(value) =>
            onSelectionSpecChange({
              ...currentSelectionSpec,
              targetBandLevel: value || null,
            })
          }
          value={currentSelectionSpec.targetBandLevel ?? ''}
        />
        <Field
          label="Skill code"
          name={`selection-skill-${slotKey}`}
          onValueChange={(value) =>
            onSelectionSpecChange({
              ...currentSelectionSpec,
              skillCode: value || null,
            })
          }
          value={currentSelectionSpec.skillCode ?? ''}
        />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Topic
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
            onChange={(event) =>
              onSelectionSpecChange({
                ...currentSelectionSpec,
                topicId: event.target.value || null,
              })
            }
            value={currentSelectionSpec.topicId ?? ''}
          >
            <option value="">Khong gioi han</option>
            {questionTopicsQuery.data?.content.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.code} - {topic.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
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

export function TeacherBlueprintsPage() {
  return <BlueprintListPage allowCreate={false} basePath="/teacher/blueprints" title="Blueprint de thi" />
}

export function TeacherBlueprintDetailPage() {
  return <BlueprintDetailPage canEdit title="Chi tiet blueprint" />
}

export function SchoolAdminBlueprintsPage() {
  return <BlueprintListPage basePath="/school-admin/blueprints" readOnly title="Giam sat blueprint de thi" />
}

export function SchoolAdminBlueprintDetailPage() {
  return <BlueprintDetailPage canEdit={false} title="Chi tiet blueprint" />
}

export function SystemAdminBlueprintsPage() {
  return <BlueprintListPage basePath="/system-admin/blueprints" readOnly title="Giam sat blueprint he thong" />
}

export function SystemAdminBlueprintDetailPage() {
  return <BlueprintDetailPage canEdit={false} title="Chi tiet blueprint" />
}
