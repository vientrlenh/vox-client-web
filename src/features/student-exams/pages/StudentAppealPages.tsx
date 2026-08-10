import { ArrowLeft, ArrowRight, CalendarClock, CircleX, FileText, Scale } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { formatScore } from '@/features/exam-results/types'
import { APPEAL_SCOPE_TEXT } from '@/features/reevaluation'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { StatusBadge, type StatusTone } from '@/shared/ui/StatusBadge'
import { useMyAppealQuery, useMyAppealsQuery } from '../api/useStudentAppealQueries'

function formatDate(value?: string | null) {
  if (!value) return 'Không có'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function appealStatus(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'PUBLISHED': return { label: 'Đã công bố', tone: 'success' }
    case 'REJECTED': return { label: 'Bị từ chối', tone: 'danger' }
    case 'PENDING': return { label: 'Chờ xử lý', tone: 'warning' }
    default: return { label: 'Đang xử lý', tone: 'info' }
  }
}

export function StudentAppealsPage() {
  const appealsQuery = useMyAppealsQuery()
  const appeals = appealsQuery.data?.content ?? []
  return (
    <section className="mx-auto max-w-220">
      <h1 className="text-[30px] font-extrabold text-slate-900">Đơn phúc khảo của tôi</h1>
      <p className="mt-2 text-sm text-slate-500">Theo dõi tiến độ và kết quả các yêu cầu đã gửi.</p>
      {appealsQuery.isLoading ? <div className="mt-5 border-y border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">Đang tải đơn phúc khảo...</div> : null}
      {!appealsQuery.isLoading && appeals.length === 0 ? <div className="mt-5 border-y border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">Bạn chưa gửi đơn phúc khảo nào.</div> : null}
      <div className="mt-5 divide-y divide-slate-100 border-y border-slate-200 bg-white">
        {appeals.map((appeal) => {
          const status = appealStatus(appeal.status)
          return (
            <Link className="flex flex-wrap items-center gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-5" key={appeal.id} to={`/student/appeals/${appeal.id}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-extrabold text-slate-900">{appeal.examName}</p><StatusBadge label={status.label} tone={status.tone} />{appeal.overdue ? <StatusBadge label="Quá hạn" tone="danger" /> : null}</div>
                <p className="mt-1 text-sm text-slate-500">{appeal.className ?? 'Chưa có lớp'} · {APPEAL_SCOPE_TEXT}</p>
                <p className="mt-1 text-xs text-slate-400">Gửi lúc {formatDate(appeal.requestedAt)}</p>
              </div>
              <div className="flex items-center gap-3"><span className="text-sm font-bold text-cyan-700">{formatScore(appeal.originalScore)}</span><ArrowRight className="size-4 text-slate-400" /></div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export function StudentAppealDetailPage() {
  const { appealId } = useParams()
  const appealQuery = useMyAppealQuery(appealId ?? null)
  const appeal = appealQuery.data
  if (appealQuery.isLoading) return <section className="mx-auto max-w-180"><div className="border-y border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">Đang tải chi tiết đơn...</div></section>
  if (!appeal) return <section className="mx-auto max-w-180"><p className="text-sm text-slate-500">Không tìm thấy đơn phúc khảo.</p></section>
  const status = appealStatus(appeal.status)
  return (
    <section className="mx-auto max-w-180">
      <Link className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-700" to="/student/appeals"><ArrowLeft className="size-4" />Quay lại danh sách</Link>
      <DetailHeaderCard metaItems={[{ icon: <CalendarClock className="size-4" />, label: `Gửi ${formatDate(appeal.requestedAt)}` }, { icon: <Scale className="size-4" />, label: appeal.className ?? 'Chưa có lớp' }]} statusLabel={status.label} statusTone={status.tone} title={appeal.examName} />
      <div className="mt-5 grid gap-4">
        <div className="border-y border-slate-200 bg-white px-5 py-4"><p className="text-xs font-bold uppercase text-slate-400">Lý do phúc khảo</p><p className="mt-2 text-sm leading-6 text-slate-700">{appeal.reason}</p>{appeal.notes ? <><p className="mt-4 text-xs font-bold uppercase text-slate-400">Ghi chú của bạn</p><p className="mt-2 text-sm leading-6 text-slate-700">{appeal.notes}</p></> : null}<p className="mt-4 text-xs text-slate-500">Hạn xử lý: {formatDate(appeal.deadline)}</p></div>
        {appeal.status === 'PUBLISHED' ? (
          <div className="border-y border-emerald-200 bg-emerald-50 px-5 py-5">
            <div className="flex flex-wrap items-center gap-4"><div><p className="text-xs font-bold uppercase text-slate-500">Điểm ban đầu</p><p className="mt-1 text-2xl font-extrabold text-slate-700">{formatScore(appeal.originalScore)}</p></div><ArrowRight className="size-5 text-emerald-600" /><div><p className="text-xs font-bold uppercase text-emerald-700">Điểm sau phúc khảo</p><p className="mt-1 text-2xl font-extrabold text-emerald-700">{formatScore(appeal.finalScore)}</p></div></div>
            <div className="mt-4 border-t border-emerald-200 pt-4"><p className="flex items-center gap-2 text-sm font-bold text-emerald-900"><FileText className="size-4" />Ghi chú công bố</p><p className="mt-2 text-sm leading-6 text-emerald-900">{appeal.decisionNote || 'Không có ghi chú bổ sung.'}</p></div>
          </div>
        ) : null}
        {/* Đơn bị từ chối cũng phải nói vì sao: BE bắt buộc người duyệt nhập lý do và trả về
            qua `decisionNote`, trước đây FE chỉ vẽ field này trong nhánh PUBLISHED nên học
            sinh chỉ thấy mỗi badge "Bị từ chối". */}
        {appeal.status === 'REJECTED' ? (
          <div className="border-y border-red-200 bg-red-50 px-5 py-5">
            <p className="flex items-center gap-2 text-sm font-bold text-red-900"><CircleX className="size-4" />Lý do từ chối</p>
            <p className="mt-2 text-sm leading-6 text-red-900">{appeal.decisionNote || 'Không có lý do được ghi nhận.'}</p>
            <p className="mt-4 border-t border-red-200 pt-4 text-xs text-red-700">Từ chối lúc {formatDate(appeal.resolvedAt)} · Điểm giữ nguyên {formatScore(appeal.originalScore)}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
