import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useFinalizePreviewQuery } from '@/features/grading'
import { useExamAppealsQuery } from '@/features/reevaluation'

const APPEAL_PREVIEW_SIZE = 5

type PublishReadinessPanelProps = {
  /** Người xem tự chốt sổ được? School admin thì có; chủ tịch kỳ thi tập trung thì không. */
  canFinalize: boolean
  examId: string
}

const APPEAL_STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Đã duyệt, chờ giao người chấm',
  GRADING: 'Đang chấm lại',
  PENDING: 'Chờ nhà trường duyệt',
}

function Row({ danger, label, value }: { danger?: boolean; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-[12.5px] font-semibold text-slate-600">{label}</span>
      <span
        className={`text-[13.5px] font-extrabold ${
          danger && value > 0 ? 'text-amber-600' : 'text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Vì sao nút "Công bố kết quả" chưa bấm được.
 *
 * Lý do tồn tại là một lỗ hổng quy trình, không phải nhu cầu trang trí: chủ tịch hội đồng
 * bấm được PUBLISH_RESULTS (`UpdateExamStatusUseCase.authorizeMutation` cho phép), nhưng
 * `requirePublishReadiness` đòi MỌI bài đã RELEASED hoặc INVALID, mà đưa bài tới đó là
 * việc chốt sổ — thứ chủ tịch kỳ thi TẬP TRUNG không làm được. Không có bảng này thì họ
 * bấm nút, nhận đúng một câu "còn N kết quả chưa RELEASED", và không còn màn nào tra được
 * N bài đó là bài nào: hàng đợi chấm và danh sách phúc khảo toàn trường đều chỉ school
 * admin xem được.
 *
 * Chỉ ĐỌC, và đóng phạm vi trong đúng kỳ thi này (BE:
 * `ExamGradingAccessService.authorizeSchoolAdminOrExamChair`). Quyền phân công chấm và
 * quyền duyệt/từ chối đơn phúc khảo vẫn thuộc nhà trường — nên khi còn vướng, bảng nói
 * thẳng ai là người gỡ được thay vì mời bấm một nút không tồn tại.
 */
export function PublishReadinessPanel({ canFinalize, examId }: PublishReadinessPanelProps) {
  const previewQuery = useFinalizePreviewQuery(examId)
  const preview = previewQuery.data
  const openAppeals = preview?.openAppeals ?? 0

  // Chỉ hỏi danh sách đơn khi preview đã nói là có — tránh một query thừa cho kỳ thi sạch.
  const appealsQuery = useExamAppealsQuery(
    openAppeals > 0 ? examId : '',
    1,
    APPEAL_PREVIEW_SIZE,
  )

  if (previewQuery.isLoading) {
    return (
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Đang kiểm tra tình trạng chấm…
        </p>
      </section>
    )
  }

  if (!preview) {
    return null
  }

  const pending = preview.pendingUnassigned + preview.pendingAssigned
  const blocked = pending > 0 || openAppeals > 0

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
      <header className="flex items-center gap-2">
        {blocked ? (
          <AlertTriangle aria-hidden="true" className="size-4.5 text-amber-600" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="size-4.5 text-emerald-600" />
        )}
        <h3 className="text-sm font-extrabold text-slate-900">
          {blocked ? 'Chưa công bố kết quả được' : 'Sẵn sàng công bố kết quả'}
        </h3>
      </header>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
        <Row label="Tổng số bài" value={preview.total} />
        <Row label="Đã chốt, sẵn sàng công bố" value={preview.readyToFinalize} />
        <Row danger label="Chờ chấm, chưa giao ai" value={preview.pendingUnassigned} />
        <Row danger label="Chờ chấm, đang có người cầm" value={preview.pendingAssigned} />
        <Row danger label="Đơn phúc khảo chưa xong" value={openAppeals} />
        <Row label="Bài đã vô hiệu" value={preview.invalid} />
      </div>

      {!blocked ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] font-medium leading-relaxed text-emerald-800">
          Mọi bài đã ở trạng thái chốt được. Bấm <b>Công bố kết quả</b> để chốt đậu/rớt và trả điểm
          cho học sinh.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {pending > 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-[12.5px] font-medium leading-relaxed text-amber-800">
              Còn <b>{pending} bài chưa chấm xong</b>.{' '}
              {canFinalize
                ? 'Chấm nốt, hoặc dùng "Chốt sổ" ở trang chấm bài để công bố các bài đó theo điểm AI đang có.'
                : 'Phân công chấm và chốt sổ là việc của nhà trường — hàng đợi chấm dùng chung giáo viên toàn trường, nên hội đồng không tự gán được. Hãy báo quản trị trường xử lý nốt phần này.'}
            </p>
          ) : null}

          {openAppeals > 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
              <p className="text-[12.5px] font-medium leading-relaxed text-red-800">
                Còn <b>{openAppeals} đơn phúc khảo chưa xong</b>. Đây là rào cứng: chốt sổ không bỏ
                qua được, kể cả khi chấp nhận điểm AI.{' '}
                {canFinalize ? null : 'Quyền duyệt và giao người chấm phúc khảo thuộc nhà trường.'}
              </p>

              {appealsQuery.data?.content?.length ? (
                <ul className="mt-2.5 space-y-1.5">
                  {appealsQuery.data.content.map((appeal) => (
                    <li
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px] text-red-900"
                      key={appeal.id}
                    >
                      <span className="font-bold">{appeal.studentName}</span>
                      {appeal.className ? (
                        <span className="text-red-700">({appeal.className})</span>
                      ) : null}
                      <span className="text-red-700">
                        — {APPEAL_STATUS_LABEL[appeal.status] ?? appeal.status}
                      </span>
                      {appeal.reviewerName ? (
                        <span className="text-red-700">· {appeal.reviewerName}</span>
                      ) : null}
                      {appeal.overdue ? (
                        <span className="font-bold text-red-700">· quá hạn</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {openAppeals > APPEAL_PREVIEW_SIZE ? (
                <p className="mt-2 text-[12px] font-semibold text-red-700">
                  …và {openAppeals - APPEAL_PREVIEW_SIZE} đơn khác.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
