import { useState } from 'react'
import { X } from 'lucide-react'
import { toApiError } from '@/shared/api'
import { AiConfidenceThresholdField } from '@/features/examCore/components/AiConfidenceThresholdField'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { ExamStreamSetupField } from '@/features/examCore/components/ExamStreamSetupField'
import { RubricPolicyPicker, type RubricPolicySelection } from '@/features/examCore/components/RubricPolicyPicker'
import {
  toDateTimeLocalValue,
  toExamStreamSetup,
  toIsoDateTime,
  toUpdateStreamPayload,
  type ExamDto,
} from '@/features/examCore/types'
import { useUpdateExamMutation } from '../api/useExamMutations'
import type { ExamStreamSetup } from '../types'

type EditExamModalProps = {
  exam: ExamDto
  onClose: () => void
  onSaved: () => void
}

export function EditExamModal({ exam, onClose, onSaved }: EditExamModalProps) {
  const updateMutation = useUpdateExamMutation()
  const [name, setName] = useState(exam.name)
  const [description, setDescription] = useState(exam.description ?? '')
  const [openAt, setOpenAt] = useState(toDateTimeLocalValue(exam.openAt))
  const [closeAt, setCloseAt] = useState(toDateTimeLocalValue(exam.closeAt))
  const [streamSetup, setStreamSetup] = useState<ExamStreamSetup>(
    toExamStreamSetup(exam.requiredStreamType, exam.streamTypePermission),
  )
  const [policySelection, setPolicySelection] = useState<RubricPolicySelection>({
    assessmentPolicyId: null,
    isBlocked: false,
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number | null>(
    exam.aiConfidenceThresholdPercent ?? null,
  )

  async function handleSubmit() {
    setErrorMessage(null)
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên kỳ thi.')
      return
    }
    const openIso = toIsoDateTime(openAt)
    const closeIso = toIsoDateTime(closeAt)
    if (openIso && closeIso && new Date(openIso).getTime() >= new Date(closeIso).getTime()) {
      setErrorMessage('Thời gian mở bài phải nhỏ hơn thời gian đóng bài.')
      return
    }
    try {
      await updateMutation.mutateAsync({
        examId: exam.id,
        payload: {
          // Không đổi chính sách thì bỏ hẳn field: API sửa hiểu vắng mặt là "giữ nguyên".
          ...(policySelection.assessmentPolicyId ? { assessmentPolicyId: policySelection.assessmentPolicyId } : {}),
          closeAt: closeIso,
          description: description || null,
          // CENTRALIZED luôn dùng OTP và mỗi thí sinh 1 lượt duy nhất - không cho nhập tay (mục H.8).
          maxAttempt: 1,
          name: name.trim(),
          openAt: openIso,
          requiresOtp: true,
          // Gửi kể cả khi null: lệnh sửa hiểu vắng mặt là "giữ nguyên", mà null ở đây là giá trị
          // hợp lệ ("không đặt ngưỡng") -- hai thứ khác nhau.
          aiConfidenceThresholdPercent: confidenceThreshold,
          // Chỉ 1 lượt thi nên mọi cách chốt điểm đều cho ra cùng kết quả — cố định HIGHEST thay vì
          // bắt người dùng chọn giữa 5 phương án tương đương.
          resultDecisionMethod: 'HIGHEST',
          ...toUpdateStreamPayload(streamSetup),
        },
      })
      onSaved()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section className="flex max-h-full w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl" role="dialog">
        <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900">Sửa thông tin kỳ thi</h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="grid gap-3.5 overflow-y-auto px-6 py-5">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Tên kỳ thi
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mô tả
            <textarea
              className="min-h-20 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Mở lúc
              <input
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                onChange={(event) => setOpenAt(event.target.value)}
                type="datetime-local"
                value={openAt}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Đóng lúc
              <input
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                onChange={(event) => setCloseAt(event.target.value)}
                type="datetime-local"
                value={closeAt}
              />
            </label>
          </div>
          <ExamStreamSetupField
            description="Quyết định học viên phải chia sẻ những gì trong lúc thi."
            name="editStreamSetup"
            onChange={setStreamSetup}
            value={streamSetup}
          />

          <AiConfidenceThresholdField onChange={setConfidenceThreshold} value={confidenceThreshold} />

          <RubricPolicyPicker languageId={exam.languageId} onChange={setPolicySelection} scope="school" />
        </div>
        <div className="flex justify-end gap-2.5 border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-60"
            disabled={updateMutation.isPending || policySelection.isBlocked}
            onClick={() => void handleSubmit()}
            title={policySelection.isBlocked ? 'Chọn một chính sách đánh giá phù hợp trước khi lưu' : undefined}
            type="button"
          >
            Lưu
          </button>
        </div>
      </section>
    </div>
  )
}
