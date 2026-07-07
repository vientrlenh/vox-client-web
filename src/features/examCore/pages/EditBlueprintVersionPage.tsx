import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toApiError } from '@/shared/api'
import { QuestionPicker } from '../components/QuestionPicker'
import { examQueryKeys, useExamBlueprintQuery } from '../api/queries'
import {
  useUpdateBlueprintVersionMutation,
  type UpdateBlueprintVersionSectionInput,
  type UpdateBlueprintVersionSlotInput,
} from '../api/mutations'
import {
  toDateTimeLocalValue,
  toIsoDateTime,
  type ExamBlueprintDto,
  type ExamBlueprintSectionDto,
  type ExamBlueprintSlotType,
  type ExamBlueprintVersionDto,
} from '../types'

const QUESTION_TYPE_OPTIONS = ['READ_ALOUD', 'SHORT_ANSWER', 'LONG_ANSWER', 'OPINION', 'DESCRIPTION'] as const
const DIFFICULTY_OPTIONS = ['EASY', 'MEDIUM', 'HARD'] as const

let keySeed = 0
function nextKey(prefix: string) {
  keySeed += 1
  return `${prefix}-${keySeed}`
}

type FixedQuestionRef = { code?: string | null; id: string; questionText?: string | null }

type SlotDraft = {
  difficulty: string
  fixedQuestion: FixedQuestionRef | null
  id?: string
  key: string
  prepTimeSecondsOverride: string
  questionType: string
  responseTimeSecondsOverride: string
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
  sectionTimeLimitMinutes: string
  sectionWeight: string
  slots: SlotDraft[]
  title: string
}

function newSlot(): SlotDraft {
  return {
    difficulty: 'MEDIUM',
    fixedQuestion: null,
    key: nextKey('slot'),
    prepTimeSecondsOverride: '',
    questionType: 'SHORT_ANSWER',
    responseTimeSecondsOverride: '',
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
    sectionTimeLimitMinutes: '',
    sectionWeight: '',
    slots: [newSlot()],
    title: `Phần ${order}`,
  }
}

function sectionWeightOf(section: SectionDraft): number {
  return section.sectionWeight.trim() ? Number(section.sectionWeight) : 1
}

function slotFromDto(slot: ExamBlueprintSectionDto['slots'][number]): SlotDraft {
  return {
    difficulty: slot.selectionSpec?.difficulty ?? 'MEDIUM',
    fixedQuestion: slot.fixedQuestion ?? null,
    id: slot.id,
    key: nextKey('slot'),
    prepTimeSecondsOverride: slot.prepTimeSecondsOverride != null ? String(slot.prepTimeSecondsOverride) : '',
    questionType: slot.selectionSpec?.questionType ?? 'SHORT_ANSWER',
    responseTimeSecondsOverride: slot.responseTimeSecondsOverride != null ? String(slot.responseTimeSecondsOverride) : '',
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
    sectionTimeLimitMinutes: section.sectionTimeLimitSeconds ? String(Math.round(section.sectionTimeLimitSeconds / 60)) : '',
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
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy phiên bản blueprint.</section>
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

  const [description, setDescription] = useState(version.description ?? '')
  const [totalTimeLimitMinutes, setTotalTimeLimitMinutes] = useState(
    version.totalTimeLimitSeconds ? String(Math.round(version.totalTimeLimitSeconds / 60)) : '',
  )
  const [effectiveFrom, setEffectiveFrom] = useState(toDateTimeLocalValue(version.effectiveFrom))
  const [effectiveTo, setEffectiveTo] = useState(toDateTimeLocalValue(version.effectiveTo))
  const [sections, setSections] = useState<SectionDraft[]>(
    version.sections.length ? version.sections.map(sectionFromDto) : [newSection(1)],
  )
  const [pickerForSlotKey, setPickerForSlotKey] = useState<string | null>(null)

  const detailPath = `${basePath}/${blueprint.id}`
  const weightSum = sections.reduce((sum, section) => sum + sectionWeightOf(section), 0)

  function sectionSlotWeightSum(section: SectionDraft): number {
    return section.slots.reduce((sum, slot) => sum + (slot.weight.trim() ? Number(slot.weight) : 1), 0)
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

  async function handleSubmit() {
    if (sections.length === 0) {
      window.alert('Phiên bản phải có ít nhất một phần.')
      return
    }
    for (const section of sections) {
      if (!section.title.trim()) {
        window.alert('Mỗi phần phải có tên.')
        return
      }
      if (section.slots.length === 0) {
        window.alert(`Phần "${section.title}" phải có ít nhất một ô câu hỏi.`)
        return
      }
      for (const slot of section.slots) {
        if (slot.slotType === 'FIXED' && !slot.fixedQuestion) {
          window.alert(`Phần "${section.title}" có ô câu hỏi chưa chọn câu hỏi cố định.`)
          return
        }
      }
      if (Math.abs(sectionSlotWeightSum(section) - 1) >= 0.01) {
        window.alert(`Tổng trọng số các ô câu hỏi trong phần "${section.title}" phải bằng 1.00.`)
        return
      }
    }
    if (Math.abs(weightSum - 1) >= 0.01) {
      window.alert('Tổng trọng số các phần phải bằng 1.00.')
      return
    }

    const sectionsPayload: UpdateBlueprintVersionSectionInput[] = sections.map((section, sectionIndex) => ({
      id: section.id ?? null,
      instruction: section.instruction.trim() || null,
      order: sectionIndex + 1,
      sectionTimeLimitSeconds: section.sectionTimeLimitMinutes.trim() ? Number(section.sectionTimeLimitMinutes) * 60 : null,
      sectionWeight: sectionWeightOf(section),
      slots: section.slots.map((slot, slotIndex): UpdateBlueprintVersionSlotInput => ({
        id: slot.id ?? null,
        fixedQuestionId: slot.slotType === 'FIXED' ? slot.fixedQuestion?.id ?? null : null,
        order: slotIndex + 1,
        prepTimeSecondsOverride: slot.prepTimeSecondsOverride.trim() ? Number(slot.prepTimeSecondsOverride) : null,
        responseTimeSecondsOverride: slot.responseTimeSecondsOverride.trim() ? Number(slot.responseTimeSecondsOverride) : null,
        selectionSpec:
          slot.slotType === 'SELECTION'
            ? {
                difficulty: slot.difficulty || null,
                questionType: slot.questionType || null,
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
          totalTimeLimitSeconds: totalTimeLimitMinutes.trim() ? Number(totalTimeLimitMinutes) * 60 : null,
        },
        versionId: version.id,
      })
      await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
      navigate(detailPath, { state: { successMessage: 'Đã cập nhật phiên bản.' } })
    } catch (error) {
      window.alert(toApiError(error).message)
    }
  }

  const activeSlot = pickerForSlotKey
    ? sections.flatMap((section) => section.slots.map((slot) => ({ section, slot }))).find(({ slot }) => slot.key === pickerForSlotKey)
    : null

  return (
    <section className="mx-auto max-w-240">
      <button className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600" onClick={() => navigate(detailPath)} type="button">
        ← {blueprint.name}
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-extrabold text-slate-900">Cập nhật phiên bản {version.code}</h1>
        <p className="mt-1 text-sm text-slate-500">Chỉnh sửa cấu trúc đề và thông tin phiên bản (chỉ áp dụng khi đang là bản nháp).</p>

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
            Tổng thời lượng (phút)
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setTotalTimeLimitMinutes(event.target.value)}
              placeholder="Để trống nếu chưa đặt"
              type="number"
              value={totalTimeLimitMinutes}
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
          <div className="grid content-end text-sm font-semibold text-slate-500 sm:col-span-2">
            Tổng trọng số các phần hiện tại: <span className={weightSum === 1 ? 'text-emerald-600' : 'text-amber-600'}>{weightSum.toFixed(2)}</span>{' '}
            (nên bằng 1.00 trước khi xuất bản)
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
                  Thời lượng phần (phút)
                  <input
                    className="h-10.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                    onChange={(event) => updateSection(section.key, { sectionTimeLimitMinutes: event.target.value })}
                    placeholder="Không bắt buộc"
                    type="number"
                    value={section.sectionTimeLimitMinutes}
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
                        <span className="text-xs font-semibold text-slate-700">
                          {slot.fixedQuestion.code} · {slot.fixedQuestion.questionText}
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
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-600 hover:bg-slate-50"
                        onClick={() => setPickerForSlotKey(slot.key)}
                        type="button"
                      >
                        {slot.fixedQuestion ? 'Đổi câu hỏi' : 'Chọn câu hỏi'}
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
                            {option}
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
                            {option}
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
              <button
                className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-center text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                onClick={() => addSlot(section.key)}
                type="button"
              >
                + Thêm ô câu hỏi
              </button>
            </div>
            <p className="mt-2.5 text-xs font-semibold text-slate-500">
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
          disabled={updateVersionMutation.isPending}
          onClick={() => void handleSubmit()}
          type="button"
        >
          Lưu thay đổi
        </button>
      </div>

      {activeSlot ? (
        <QuestionPicker
          onClose={() => setPickerForSlotKey(null)}
          onSelect={(question) => {
            updateSlot(activeSlot.section.key, activeSlot.slot.key, { fixedQuestion: question })
            setPickerForSlotKey(null)
          }}
          publishedOnly
          scope="teacher"
          selectedQuestionIds={[]}
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
