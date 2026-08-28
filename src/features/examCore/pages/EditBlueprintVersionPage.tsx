import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { getQuestionTypeDisplay } from '@/features/question/types'
import { toApiError } from '@/shared/api'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { distributeEvenlyWeights } from '@/shared/weightDistribution'
import { useMySubscriptionQuery } from '@/features/subscription_school/api/useMySubscriptionQuery'
import { QuestionPicker } from '../components/QuestionPicker'
import { examQueryKeys, useExamBlueprintQuery } from '../api/queries'
import { buildTimeQuotaWarning, getQuestionAttemptSeconds } from '../utils/timeQuota'
import {
  useUpdateBlueprintVersionMutation,
  type UpdateBlueprintVersionSectionInput,
  type UpdateBlueprintVersionSlotInput,
} from '../api/mutations'
import {
  formatDurationSeconds,
  getQuestionDifficultyDisplay,
  toDateTimeLocalValue,
  toIsoDateTime,
  type ExamBlueprintDto,
  type ExamBlueprintSectionDto,
  type ExamBlueprintSlotType,
  type ExamBlueprintVersionDto,
} from '../types'

const QUESTION_TYPE_OPTIONS = ['SHORT_ANSWER', 'LONG_ANSWER', 'OPINION', 'DESCRIPTION'] as const
const DEFAULT_QUESTION_TYPE = 'SHORT_ANSWER'
const DIFFICULTY_OPTIONS = ['EASY', 'MEDIUM', 'HARD'] as const

let keySeed = 0
function nextKey(prefix: string) {
  keySeed += 1
  return `${prefix}-${keySeed}`
}

function normalizeQuestionType(questionType?: string | null): string {
  return questionType && (QUESTION_TYPE_OPTIONS as readonly string[]).includes(questionType)
    ? questionType
    : DEFAULT_QUESTION_TYPE
}

type FixedQuestionRef = {
  code?: string | null
  id: string
  maxResponseSeconds?: number | null
  minResponseSeconds?: number | null
  preparationTimeSeconds?: number | null
  questionText?: string | null
}

function QuestionTimingSummary({
  question,
}: {
  question: Pick<FixedQuestionRef, 'maxResponseSeconds' | 'minResponseSeconds' | 'preparationTimeSeconds'>
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500">
      <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
        Chuẩn bị: {formatDurationSeconds(question.preparationTimeSeconds)}
      </span>
      <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
        Tối thiểu: {formatDurationSeconds(question.minResponseSeconds)}
      </span>
      <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
        Tối đa: {formatDurationSeconds(question.maxResponseSeconds)}
      </span>
    </div>
  )
}

type SlotDraft = {
  difficulty: string
  fixedQuestion: FixedQuestionRef | null
  fixedQuestionId: string | null
  id?: string
  key: string
  questionType: string
  skillCode: string
  slotType: ExamBlueprintSlotType
  targetBandLevel: string
  topicId: string
  weight: string
}

type SectionDraft = {
  id?: string
  instruction: string
  key: string
  sectionWeight: string
  slots: SlotDraft[]
  title: string
}

function newSlot(): SlotDraft {
  return {
    difficulty: 'MEDIUM',
    fixedQuestion: null,
    fixedQuestionId: null,
    key: nextKey('slot'),
    questionType: DEFAULT_QUESTION_TYPE,
    skillCode: '',
    slotType: 'FIXED',
    targetBandLevel: '',
    topicId: '',
    weight: '1',
  }
}

function newSection(order: number): SectionDraft {
  return {
    instruction: '',
    key: nextKey('section'),
    sectionWeight: '',
    slots: [newSlot()],
    title: `Part ${order}`,
  }
}

function sectionWeightOf(section: SectionDraft): number {
  return section.sectionWeight.trim() ? Number(section.sectionWeight) : 1
}

function slotFromDto(slot: ExamBlueprintSectionDto['slots'][number]): SlotDraft {
  return {
    difficulty: slot.selectionSpec?.difficulty ?? 'MEDIUM',
    fixedQuestion: slot.fixedQuestion ?? null,
    fixedQuestionId: slot.fixedQuestionId ?? null,
    id: slot.id,
    key: nextKey('slot'),
    questionType: normalizeQuestionType(slot.selectionSpec?.questionType),
    skillCode: slot.selectionSpec?.skillCode ?? '',
    slotType: slot.slotType,
    targetBandLevel: slot.selectionSpec?.targetBandLevel ?? '',
    topicId: slot.selectionSpec?.topicId ?? '',
    weight: slot.weight != null ? String(slot.weight) : '1',
  }
}

function sectionFromDto(section: ExamBlueprintSectionDto): SectionDraft {
  return {
    id: section.id,
    instruction: section.instruction ?? '',
    key: nextKey('section'),
    sectionWeight: section.sectionWeight != null ? String(section.sectionWeight) : '',
    slots: section.slots.map(slotFromDto),
    title: section.title,
  }
}

function EditBlueprintVersionPage({ basePath }: { basePath: string }) {
  const navigate = useNavigate()
  const { blueprintId, versionId } = useParams()
  const blueprintQuery = useExamBlueprintQuery(blueprintId ?? null)
  const blueprint = blueprintQuery.data
  const version = blueprint?.versions.find((candidate) => candidate.id === versionId) ?? null
  const detailPath = blueprintId ? `${basePath}/${blueprintId}` : basePath

  if (blueprintQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (!blueprint || !version) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy phiên bản khung đề.</section>
    )
  }

  if (version.status !== 'DRAFT') {
    return (
      <section className="mx-auto max-w-240">
        <button className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600" onClick={() => navigate(detailPath)} type="button">
          ← {blueprint.name}
        </button>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
          Phiên bản {version.code} không còn ở trạng thái bản nháp nên không thể chỉnh sửa.
        </div>
      </section>
    )
  }

  return <EditVersionForm basePath={basePath} blueprint={blueprint} key={version.id} version={version} />
}

type EditVersionFormProps = {
  basePath: string
  blueprint: ExamBlueprintDto
  version: ExamBlueprintVersionDto
}

function EditVersionForm({ basePath, blueprint, version }: EditVersionFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateVersionMutation = useUpdateBlueprintVersionMutation()
  const subscriptionQuery = useMySubscriptionQuery()
  const submitLockedRef = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [description, setDescription] = useState(version.description ?? '')
  const [effectiveFrom, setEffectiveFrom] = useState(toDateTimeLocalValue(version.effectiveFrom))
  const [effectiveTo, setEffectiveTo] = useState(toDateTimeLocalValue(version.effectiveTo))
  const [sections, setSections] = useState<SectionDraft[]>(
    version.sections.length ? version.sections.map(sectionFromDto) : [newSection(1)],
  )
  const [pickerForSlotKey, setPickerForSlotKey] = useState<string | null>(null)

  const detailPath = `${basePath}/${blueprint.id}`
  const weightSum = sections.reduce((sum, section) => sum + sectionWeightOf(section), 0)
  const knownDurationSeconds = sections.reduce((sum, section) => sum + sectionDurationSeconds(section), 0)
  const hasHiddenFixedQuestions = sections.some((section) =>
    section.slots.some((slot) => slot.slotType === 'FIXED' && Boolean(slot.fixedQuestionId) && !slot.fixedQuestion),
  )
  const totalDurationSeconds = hasHiddenFixedQuestions
    ? Math.max(knownDurationSeconds, version.totalTimeLimitSeconds ?? 0)
    : knownDurationSeconds
  const maxTimePerAttemptMin = subscriptionQuery.data?.plan?.maxTimePerAttemptMin ?? null
  const quotaWarning = buildTimeQuotaWarning('Phiên bản khung đề này', totalDurationSeconds, maxTimePerAttemptMin)

  function sectionSlotWeightSum(section: SectionDraft): number {
    return section.slots.reduce((sum, slot) => sum + (slot.weight.trim() ? Number(slot.weight) : 1), 0)
  }

  function sectionDurationSeconds(section: SectionDraft): number {
    return section.slots.reduce(
      (sum, slot) => sum + (slot.slotType === 'FIXED' && slot.fixedQuestion ? getQuestionAttemptSeconds(slot.fixedQuestion) : 0),
      0,
    )
  }

  function totalDurationIfQuestionSelected(slotKey: string, question: FixedQuestionRef): number {
    let knownSeconds = 0
    let stillHasHiddenFixedQuestions = false
    for (const section of sections) {
      for (const slot of section.slots) {
        if (slot.slotType !== 'FIXED') {
          continue
        }
        const fixedQuestion = slot.key === slotKey ? question : slot.fixedQuestion
        const fixedQuestionId = slot.key === slotKey ? question.id : slot.fixedQuestionId
        if (fixedQuestion) {
          knownSeconds += getQuestionAttemptSeconds(fixedQuestion)
        }
        if (fixedQuestionId && !fixedQuestion) {
          stillHasHiddenFixedQuestions = true
        }
      }
    }
    return stillHasHiddenFixedQuestions ? Math.max(knownSeconds, version.totalTimeLimitSeconds ?? 0) : knownSeconds
  }

  function handleSelectFixedQuestion(sectionKey: string, slotKey: string, question: FixedQuestionRef) {
    const nextDurationSeconds = totalDurationIfQuestionSelected(slotKey, question)
    const nextQuotaWarning = buildTimeQuotaWarning('Phiên bản khung đề này', nextDurationSeconds, maxTimePerAttemptMin)
    if (nextQuotaWarning) {
      setErrorMessage(`${nextQuotaWarning} Bạn vẫn có thể đổi câu, nhưng không thể lưu cho tới khi giảm thời lượng.`)
    }
    updateSlot(sectionKey, slotKey, { fixedQuestion: question, fixedQuestionId: question.id })
    setPickerForSlotKey(null)
  }

  function updateSection(sectionKey: string, patch: Partial<SectionDraft>) {
    setSections((current) => current.map((section) => (section.key === sectionKey ? { ...section, ...patch } : section)))
  }

  function updateSlot(sectionKey: string, slotKey: string, patch: Partial<SlotDraft>) {
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? { ...section, slots: section.slots.map((slot) => (slot.key === slotKey ? { ...slot, ...patch } : slot)) }
          : section,
      ),
    )
  }

  function addSection() {
    setSections((current) => [...current, newSection(current.length + 1)])
  }

  function removeSection(sectionKey: string) {
    setSections((current) => current.filter((section) => section.key !== sectionKey))
  }

  function addSlot(sectionKey: string) {
    setSections((current) =>
      current.map((section) => (section.key === sectionKey ? { ...section, slots: [...section.slots, newSlot()] } : section)),
    )
  }

  function removeSlot(sectionKey: string, slotKey: string) {
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey ? { ...section, slots: section.slots.filter((slot) => slot.key !== slotKey) } : section,
      ),
    )
  }

  function autoDistributeSectionWeights() {
    const resolved = distributeEvenlyWeights(sections.length)
    setSections((current) => current.map((section, index) => ({ ...section, sectionWeight: String(resolved[index]) })))
  }

  function autoDistributeSlotWeights(sectionKey: string) {
    setSections((current) =>
      current.map((section) => {
        if (section.key !== sectionKey) {
          return section
        }
        const resolved = distributeEvenlyWeights(section.slots.length)
        return { ...section, slots: section.slots.map((slot, index) => ({ ...slot, weight: String(resolved[index]) })) }
      }),
    )
  }

  async function handleSubmit() {
    setErrorMessage(null)

    if (sections.length === 0) {
      setErrorMessage('Phiên bản phải có ít nhất một phần.')
      return
    }
    for (const section of sections) {
      if (!section.title.trim()) {
        setErrorMessage('Mỗi phần phải có tên.')
        return
      }
      if (section.slots.length === 0) {
        setErrorMessage(`Phần "${section.title}" phải có ít nhất một ô câu hỏi.`)
        return
      }
      for (const slot of section.slots) {
        if (slot.slotType === 'FIXED' && !slot.fixedQuestion && !slot.fixedQuestionId) {
          setErrorMessage(`Phần "${section.title}" có ô câu hỏi chưa chọn câu hỏi cố định.`)
          return
        }
      }
      if (Math.abs(sectionSlotWeightSum(section) - 1) >= 0.01) {
        setErrorMessage(`Tổng trọng số các ô câu hỏi trong phần "${section.title}" phải bằng 1.00.`)
        return
      }
    }
    if (Math.abs(weightSum - 1) >= 0.01) {
      setErrorMessage('Tổng trọng số các phần phải bằng 1.00.')
      return
    }
    if (quotaWarning) {
      setErrorMessage(`${quotaWarning} Không thể lưu phiên bản vượt quota của trường.`)
      return
    }
    if (submitLockedRef.current || updateVersionMutation.isPending) {
      return
    }
    submitLockedRef.current = true

    const sectionsPayload: UpdateBlueprintVersionSectionInput[] = sections.map((section, sectionIndex) => ({
      id: section.id ?? null,
      instruction: section.instruction.trim() || null,
      order: sectionIndex + 1,
      sectionTimeLimitSeconds: null,
      sectionWeight: sectionWeightOf(section),
      slots: section.slots.map((slot, slotIndex): UpdateBlueprintVersionSlotInput => ({
        id: slot.id ?? null,
        fixedQuestionId: slot.slotType === 'FIXED' ? slot.fixedQuestionId ?? slot.fixedQuestion?.id ?? null : null,
        order: slotIndex + 1,
        prepTimeSecondsOverride: null,
        responseTimeSecondsOverride: null,
        selectionSpec:
          slot.slotType === 'SELECTION'
            ? {
                difficulty: slot.difficulty || null,
                questionType: normalizeQuestionType(slot.questionType),
                skillCode: slot.skillCode.trim() || null,
                targetBandLevel: slot.targetBandLevel.trim() || null,
                topicId: slot.topicId.trim() || null,
              }
            : null,
        slotType: slot.slotType,
        weight: slot.weight.trim() ? Number(slot.weight) : 1,
      })),
      title: section.title.trim(),
    }))

    try {
      await updateVersionMutation.mutateAsync({
        payload: {
          description: description.trim() || null,
          effectiveFrom: toIsoDateTime(effectiveFrom),
          effectiveTo: toIsoDateTime(effectiveTo),
          sections: sectionsPayload,
          totalTimeLimitSeconds: totalDurationSeconds,
        },
        versionId: version.id,
      })
      await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
      navigate(detailPath, { state: { successMessage: 'Đã cập nhật phiên bản.' } })
    } catch (error) {
      submitLockedRef.current = false
      setErrorMessage(toApiError(error).message)
    }
  }

  const activeSlot = pickerForSlotKey
    ? sections.flatMap((section) => section.slots.map((slot) => ({ section, slot }))).find(({ slot }) => slot.key === pickerForSlotKey)
    : null
  const pickerExcludeQuestionIds = sections
    .flatMap((section) => section.slots)
    .filter((slot) => slot.key !== pickerForSlotKey)
    .map((slot) => slot.fixedQuestionId)
    .filter(Boolean) as string[]

  return (
    <section className="mx-auto max-w-240">
      <button className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600" onClick={() => navigate(detailPath)} type="button">
        ← {blueprint.name}
      </button>

      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-extrabold text-slate-900">Cập nhật phiên bản {version.code}</h1>
        <p className="mt-1 text-sm text-slate-500">Chỉnh sửa cấu trúc đề và thông tin phiên bản (chỉ áp dụng khi đang là bản nháp).</p>
        <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-3.5 py-2.5 text-sm font-semibold text-cyan-800">
          Thời lượng phiên bản khung đề dự kiến: {formatDurationSeconds(totalDurationSeconds)}.
          <span className="ml-1 text-xs font-medium text-cyan-700">
            Tính từ câu cố định đã chọn; ô chọn ngẫu nhiên sẽ cộng thêm khi gán câu vào mã đề.
            {hasHiddenFixedQuestions ? ' Một số câu cố định bị ẩn nội dung nên đang dùng tổng thời lượng server trả về.' : ''}
          </span>
        </div>
        {quotaWarning ? (
          <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
            {quotaWarning} Không thể lưu phiên bản vượt quota của trường.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mô tả (không bắt buộc)
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Hiệu lực từ (không bắt buộc)
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setEffectiveFrom(event.target.value)}
              type="datetime-local"
              value={effectiveFrom}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Hiệu lực đến (không bắt buộc)
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setEffectiveTo(event.target.value)}
              type="datetime-local"
              value={effectiveTo}
            />
          </label>
          <div className="grid content-end gap-2 text-sm font-semibold text-slate-500 sm:col-span-2">
            <span>
              Tổng trọng số các phần hiện tại: <span className={weightSum === 1 ? 'text-emerald-600' : 'text-amber-600'}>{weightSum.toFixed(2)}</span>{' '}
              (nên bằng 1.00 trước khi xuất bản)
            </span>
            <button
              className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
              onClick={autoDistributeSectionWeights}
              type="button"
            >
              Chia trọng số phần tự động
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3.5">
        {sections.map((section) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-5.5" key={section.key}>
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                  Tên phần
                  <input
                    className="h-10.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                    onChange={(event) => updateSection(section.key, { title: event.target.value })}
                    value={section.title}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                  Trọng số phần
                  <input
                    className="h-10.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                    onChange={(event) => updateSection(section.key, { sectionWeight: event.target.value })}
                    placeholder="VD: 0.5"
                    step="0.01"
                    type="number"
                    value={section.sectionWeight}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                  Hướng dẫn (không bắt buộc)
                  <input
                    className="h-10.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                    onChange={(event) => updateSection(section.key, { instruction: event.target.value })}
                    value={section.instruction}
                  />
                </label>
              </div>
              {sections.length > 1 ? (
                <button
                  aria-label={`Xóa ${section.title}`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => removeSection(section.key)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-3.5 grid gap-2.5">
              {section.slots.map((slot, slotIndex) => (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5" key={slot.key}>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-500">Ô {slotIndex + 1}</span>
                    <select
                      className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700"
                      onChange={(event) => updateSlot(section.key, slot.key, { slotType: event.target.value as ExamBlueprintSlotType })}
                      value={slot.slotType}
                    >
                      <option value="FIXED">Cố định</option>
                      <option value="SELECTION">Chọn ngẫu nhiên</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      Trọng số
                      <input
                        className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-900"
                        onChange={(event) => updateSlot(section.key, slot.key, { weight: event.target.value })}
                        step="0.01"
                        type="number"
                        value={slot.weight}
                      />
                    </label>
                    <button
                      aria-label={`Xóa ô ${slotIndex + 1}`}
                      className="ml-auto inline-flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => removeSlot(section.key, slot.key)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>

                  {slot.slotType === 'FIXED' ? (
                    <div className="mt-2.5 flex items-center gap-2.5">
                      {slot.fixedQuestion ? (
                        <div className="min-w-0 flex-1">
                          {/* line-clamp-2 thay cho truncate: xem chú thích cùng chỗ trong
                              CreateBlueprintVersionPage. */}
                          <p
                            className="line-clamp-2 text-xs font-semibold text-slate-700"
                            title={`${slot.fixedQuestion.code} · ${slot.fixedQuestion.questionText}`}
                          >
                            {slot.fixedQuestion.code} · {slot.fixedQuestion.questionText}
                          </p>
                          <QuestionTimingSummary question={slot.fixedQuestion} />
                        </div>
                      ) : slot.fixedQuestionId ? (
                        <span className="text-xs font-semibold text-slate-500">
                          Đã chọn câu hỏi — bạn không có quyền xem nội dung
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-600">Chưa chọn câu hỏi</span>
                      )}
                      {slot.fixedQuestion ? (
                        <a
                          aria-label={`Xem chi tiết ${slot.fixedQuestion.code}`}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          href={`${basePath.replace(/\/blueprints$/, '/questions')}/${slot.fixedQuestion.id}`}
                          rel="noopener noreferrer"
                          target="_blank"
                          title="Xem chi tiết câu hỏi"
                        >
                          <Eye aria-hidden="true" className="size-3.5" />
                        </a>
                      ) : null}
                      <button
                        className="h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-600 hover:bg-slate-50"
                        onClick={() => setPickerForSlotKey(slot.key)}
                        title={slot.fixedQuestionId && !slot.fixedQuestion ? 'Đã có câu hỏi được gán — đổi sẽ thay thế câu hỏi hiện tại' : undefined}
                        type="button"
                      >
                        {slot.fixedQuestion || slot.fixedQuestionId ? 'Đổi câu hỏi' : 'Chọn câu hỏi'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      <select
                        className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-900"
                        onChange={(event) => updateSlot(section.key, slot.key, { questionType: event.target.value })}
                        value={slot.questionType}
                      >
                        {QUESTION_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {getQuestionTypeDisplay(option)}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-900"
                        onChange={(event) => updateSlot(section.key, slot.key, { difficulty: event.target.value })}
                        value={slot.difficulty}
                      >
                        {DIFFICULTY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {getQuestionDifficultyDisplay(option)}
                          </option>
                        ))}
                      </select>
                      <input
                        className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-900"
                        onChange={(event) => updateSlot(section.key, slot.key, { skillCode: event.target.value })}
                        placeholder="Skill code (không bắt buộc)"
                        value={slot.skillCode}
                      />
                      <input
                        className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-900"
                        onChange={(event) => updateSlot(section.key, slot.key, { topicId: event.target.value })}
                        placeholder="Topic ID (không bắt buộc)"
                        value={slot.topicId}
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2.5">
                <button
                  className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-center text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                  onClick={() => addSlot(section.key)}
                  type="button"
                >
                  + Thêm ô câu hỏi
                </button>
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                  onClick={() => autoDistributeSlotWeights(section.key)}
                  type="button"
                >
                  Chia trọng số ô câu hỏi tự động
                </button>
              </div>
            </div>
            <p className="mt-2.5 text-xs font-semibold text-slate-500">
              Thời lượng phần này: <span className="text-cyan-700">{formatDurationSeconds(sectionDurationSeconds(section))}</span> ·{' '}
              Tổng trọng số các ô câu hỏi trong phần này:{' '}
              <span className={sectionSlotWeightSum(section) === 1 ? 'text-emerald-600' : 'text-amber-600'}>
                {sectionSlotWeightSum(section).toFixed(2)}
              </span>{' '}
              (nên bằng 1.00 trước khi xuất bản)
            </p>
          </div>
        ))}

        <button
          className="inline-flex h-10.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-600 hover:bg-slate-50"
          onClick={addSection}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Thêm phần
        </button>
      </div>

      <div className="mt-5 flex justify-end gap-2.5">
        <button
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          onClick={() => navigate(detailPath)}
          type="button"
        >
          Hủy
        </button>
        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60"
          disabled={updateVersionMutation.isPending || Boolean(quotaWarning)}
          onClick={() => void handleSubmit()}
          title={quotaWarning ?? undefined}
          type="button"
        >
          {updateVersionMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>

      {activeSlot ? (
        <QuestionPicker
          excludeQuestionIds={pickerExcludeQuestionIds}
          onClose={() => setPickerForSlotKey(null)}
          onSelect={(question) => handleSelectFixedQuestion(activeSlot.section.key, activeSlot.slot.key, question)}
          publishedOnly
          questionDetailBasePath={basePath.replace(/\/blueprints$/, '')}
          scope="teacher"
          selectedQuestionIds={activeSlot.slot.fixedQuestionId ? [activeSlot.slot.fixedQuestionId] : []}
        />
      ) : null}
    </section>
  )
}

export function TeacherEditBlueprintVersionPage() {
  return <EditBlueprintVersionPage basePath="/teacher/blueprints" />
}

export function SchoolAdminEditBlueprintVersionPage() {
  return <EditBlueprintVersionPage basePath="/school-admin/blueprints" />
}
