import { useRef, useState } from 'react'
import { Eye, Plus, Trash2 } from 'lucide-react'
import type { QuestionDto } from '@/features/question/types'
import { toApiError } from '@/shared/api'
import { autoDistributeWeights, distributeEvenlyWeights } from '@/shared/weightDistribution'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { QuestionPicker } from '@/features/examCore/components/QuestionPicker'
import { useCreateExamPaperMutation } from '@/features/examCore/api/mutations'
import { buildTimeQuotaWarning, getQuestionAttemptSeconds } from '@/features/examCore/utils/timeQuota'
import { formatNullableText } from '@/features/examCore/types'
import { useMySubscriptionQuery } from '@/features/subscription_school/api/useMySubscriptionQuery'
import {
  newClassTestSection,
  parseOptionalSectionWeight,
  validateOptionalSectionWeights,
  type ClassTestSectionDraft,
} from '../sectionDraft'

type ClassTestPaperComposerProps = {
  examId: string
  onClose: () => void
  onCreated: () => void | Promise<void>
}

/**
 * Soạn một mã đề mới cho bài kiểm tra trên lớp bằng câu hỏi trực tiếp.
 *
 * <p>Trước đây bước này nằm trong form tạo bài nên mỗi bài chỉ có đúng một đề. Giờ nó là hành động
 * lặp lại được ở trang chi tiết, để giáo viên soạn nhiều mã đề rồi phân đề cho học sinh.
 */
export function ClassTestPaperComposer({ examId, onClose, onCreated }: ClassTestPaperComposerProps) {
  const createPaperMutation = useCreateExamPaperMutation()
  const subscriptionQuery = useMySubscriptionQuery()
  const submitLockedRef = useRef(false)
  const [sections, setSections] = useState<ClassTestSectionDraft[]>([newClassTestSection(1)])
  const [pickerForSectionKey, setPickerForSectionKey] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const maxTimePerAttemptMin = subscriptionQuery.data?.plan?.maxTimePerAttemptMin ?? null
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0)
  const durationSeconds = sections.reduce(
    (sum, section) => sum + section.questions.reduce((inner, question) => inner + getQuestionAttemptSeconds(question), 0),
    0,
  )
  const quotaWarning = buildTimeQuotaWarning('Mã đề', durationSeconds, maxTimePerAttemptMin)
  const pickerSection = pickerForSectionKey ? sections.find((section) => section.key === pickerForSectionKey) : null

  function addSection() {
    setSections((current) => [...current, newClassTestSection(current.length + 1)])
  }

  function removeSection(sectionKey: string) {
    setSections((current) => current.filter((section) => section.key !== sectionKey))
  }

  function updateSection(sectionKey: string, patch: Partial<ClassTestSectionDraft>) {
    setSections((current) => current.map((section) => (section.key === sectionKey ? { ...section, ...patch } : section)))
  }

  function addQuestionToSection(sectionKey: string, question: QuestionDto) {
    setSections((current) => {
      if (current.some((section) => section.questions.some((existing) => existing.id === question.id))) {
        return current
      }
      return current.map((section) =>
        section.key === sectionKey ? { ...section, questions: [...section.questions, question] } : section,
      )
    })
  }

  function removeQuestionFromSection(sectionKey: string, questionId: string) {
    setSections((current) =>
      current.map((section) => {
        if (section.key !== sectionKey) {
          return section
        }
        const restWeights = Object.fromEntries(
          Object.entries(section.questionWeights).filter(([id]) => id !== questionId),
        )
        return { ...section, questions: section.questions.filter((question) => question.id !== questionId), questionWeights: restWeights }
      }),
    )
  }

  function updateQuestionWeight(sectionKey: string, questionId: string, weight: string) {
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? { ...section, questionWeights: { ...section.questionWeights, [questionId]: weight } }
          : section,
      ),
    )
  }

  function autoDistributeQuestionWeights(sectionKey: string) {
    setSections((current) =>
      current.map((section) => {
        if (section.key !== sectionKey) {
          return section
        }
        const resolved = distributeEvenlyWeights(section.questions.length)
        const questionWeights = { ...section.questionWeights }
        section.questions.forEach((question, index) => {
          questionWeights[question.id] = String(resolved[index])
        })
        return { ...section, questionWeights }
      }),
    )
  }

  async function handleSubmit() {
    setErrorMessage(null)
    const parsedSectionWeights = sections.map((section) => parseOptionalSectionWeight(section.weight))

    if (sections.length === 0 || sections.every((section) => section.questions.length === 0)) {
      setErrorMessage('Phải có ít nhất một phần với ít nhất một câu hỏi.')
      return
    }
    for (const section of sections) {
      if (!section.title.trim()) {
        setErrorMessage('Mỗi phần phải có tên.')
        return
      }
      if (section.questions.length === 0) {
        setErrorMessage(`Phần "${section.title}" phải có ít nhất một câu hỏi.`)
        return
      }
    }
    const sectionWeightError = validateOptionalSectionWeights(parsedSectionWeights)
    if (sectionWeightError) {
      setErrorMessage(sectionWeightError)
      return
    }
    if (quotaWarning) {
      setErrorMessage(`${quotaWarning} Không thể tạo mã đề vượt quota của trường.`)
      return
    }
    if (submitLockedRef.current || createPaperMutation.isPending) {
      return
    }

    submitLockedRef.current = true
    try {
      await createPaperMutation.mutateAsync({
        examId,
        payload: {
          sections: sections.map((section, index) => {
            const resolvedWeights = autoDistributeWeights(
              section.questions.map((question) =>
                section.questionWeights[question.id]?.trim() ? Number(section.questionWeights[question.id]) : null,
              ),
            )
            return {
              instruction: section.instruction.trim() || null,
              questions: section.questions.map((question, questionIndex) => ({
                questionId: question.id,
                weight: resolvedWeights[questionIndex],
              })),
              title: section.title.trim(),
              weight: parsedSectionWeights[index],
            }
          }),
          source: 'questions',
        },
      })
      await onCreated()
      onClose()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    } finally {
      submitLockedRef.current = false
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <section className="my-8 w-full max-w-220 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Soạn mã đề mới</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chọn câu hỏi trực tiếp cho từng phần. Mỗi mã đề là một bộ câu hỏi riêng — tạo nhiều mã đề rồi phân cho
              học sinh ở tab Xếp lịch.
            </p>
          </div>
          <button className="shrink-0 text-sm font-bold text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            Đóng
          </button>
        </div>

        <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
        {quotaWarning ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
            {quotaWarning}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-slate-600">
            {sections.length} phần · {totalQuestions} câu hỏi
          </p>
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3.5 text-[13px] font-bold text-indigo-600 hover:bg-indigo-50"
            onClick={addSection}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" /> Thêm phần
          </button>
        </div>

        <div className="mt-3 grid gap-3">
          {sections.map((section) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4" key={section.key}>
              <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
                <label className="grid gap-1 text-xs font-bold text-slate-600">
                  Tên phần
                  <input
                    className="h-9.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                    onChange={(event) => updateSection(section.key, { title: event.target.value })}
                    value={section.title}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-600">
                  Hướng dẫn
                  <input
                    className="h-9.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                    onChange={(event) => updateSection(section.key, { instruction: event.target.value })}
                    value={section.instruction}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-600">
                  Trọng số
                  <input
                    className="h-9.5 w-24 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                    onChange={(event) => updateSection(section.key, { weight: event.target.value })}
                    placeholder="tự chia"
                    step="0.01"
                    type="number"
                    value={section.weight}
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setPickerForSectionKey(section.key)}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-3.5" /> Thêm câu hỏi
                </button>
                {sections.length > 1 ? (
                  <button
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 text-xs font-bold text-red-600 hover:bg-red-50"
                    onClick={() => removeSection(section.key)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" /> Xoá phần
                  </button>
                ) : null}
              </div>

              {section.questions.length === 0 ? (
                <p className="mt-2.5 text-xs text-slate-500">Chưa có câu hỏi nào trong phần này.</p>
              ) : (
                <>
                  <div className="mt-2.5 grid gap-1.5">
                    {section.questions.map((question, index) => (
                      <div
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm"
                        key={question.id}
                      >
                        <span className="font-semibold text-slate-800">
                          {index + 1}. {question.code} — {formatNullableText(question.questionText)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                            Trọng số
                            <input
                              className="h-7 w-16 rounded-lg border border-slate-200 px-1.5 text-xs font-medium text-slate-900"
                              onChange={(event) => updateQuestionWeight(section.key, question.id, event.target.value)}
                              step="0.01"
                              type="number"
                              value={section.questionWeights[question.id] ?? ''}
                            />
                          </label>
                          <a
                            aria-label={`Xem chi tiết ${question.code}`}
                            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                            href={`/teacher/questions/${question.id}`}
                            rel="noopener noreferrer"
                            target="_blank"
                            title="Xem chi tiết câu hỏi"
                          >
                            <Eye aria-hidden="true" className="size-3.5" />
                          </a>
                          <button
                            className="inline-flex h-7 items-center justify-center rounded-full border border-red-200 px-2.5 text-xs font-bold text-red-600 hover:bg-red-50"
                            onClick={() => removeQuestionFromSection(section.key, question.id)}
                            type="button"
                          >
                            Bỏ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                    onClick={() => autoDistributeQuestionWeights(section.key)}
                    type="button"
                  >
                    Chia trọng số câu hỏi tự động
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex h-10.5 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Huỷ
          </button>
          <button
            className="inline-flex h-10.5 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={createPaperMutation.isPending || Boolean(quotaWarning)}
            onClick={handleSubmit}
            title={quotaWarning ?? undefined}
            type="button"
          >
            {createPaperMutation.isPending ? 'Đang tạo…' : 'Tạo mã đề'}
          </button>
        </div>
      </section>

      {pickerSection ? (
        <QuestionPicker
          excludeQuestionIds={sections
            .filter((section) => section.key !== pickerSection.key)
            .flatMap((section) => section.questions.map((question) => question.id))}
          onClose={() => setPickerForSectionKey(null)}
          onSelect={(question) => addQuestionToSection(pickerSection.key, question)}
          scope="teacher"
          selectedQuestionIds={pickerSection.questions.map((question) => question.id)}
        />
      ) : null}
    </div>
  )
}
