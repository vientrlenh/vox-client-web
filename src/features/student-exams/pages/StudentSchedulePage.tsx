import { CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import { useMyExamsQuery } from '@/features/exam-results/api/useExamResultQueries'
import { ScheduleCalendar } from '@/shared/ui/ScheduleCalendar'
import { StatusBadge, type StatusTone } from '@/shared/ui/StatusBadge'
import { useStudentScheduleQuery } from '../api/useStudentScheduleQuery'

function scheduleStatus(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'ONGOING': return { label: 'Đang diễn ra', tone: 'success' }
    case 'COMPLETED': return { label: 'Đã kết thúc', tone: 'neutral' }
    case 'CANCELLED': return { label: 'Đã hủy', tone: 'danger' }
    default: return { label: 'Sắp diễn ra', tone: 'info' }
  }
}

export function StudentSchedulePage() {
  const schedulesQuery = useStudentScheduleQuery()
  const examsQuery = useMyExamsQuery()
  const examById = useMemo(() => new Map((examsQuery.data ?? []).map((exam) => [exam.id, exam])), [examsQuery.data])
  const events = useMemo(() => (schedulesQuery.data ?? []).map((schedule) => {
    const exam = examById.get(schedule.examId)
    const status = scheduleStatus(schedule.status)
    const kind = exam?.kind === 'CLASS_TEST' ? 'Bài tập' : 'Bài kiểm tra'
    return {
      id: schedule.id,
      title: exam?.title ?? `Kỳ thi ${schedule.examId}`,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      roomLabel: schedule.room?.name,
      badges: (
        <>
          <StatusBadge label={kind} tone={exam?.kind === 'CLASS_TEST' ? 'violet' : 'info'} />
          <StatusBadge label={status.label} tone={status.tone} />
        </>
      ),
    }
  }), [examById, schedulesQuery.data])

  return (
    <section className="mx-auto max-w-220">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700"><CalendarDays className="size-5" /></span>
        <div>
          <h1 className="text-[30px] font-extrabold text-slate-900">Lịch thi</h1>
          <p className="mt-1 text-sm text-slate-500">Các ca thi và bài tập đã được xếp cho bạn.</p>
        </div>
      </div>
      {schedulesQuery.isLoading || examsQuery.isLoading ? (
        <div className="mt-5 border-y border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">Đang tải lịch thi...</div>
      ) : (
        <ScheduleCalendar
          emptyAllMessage="Bạn chưa có lịch thi/bài tập nào."
          emptyDayMessage="Không có ca thi/bài tập nào trong ngày này."
          events={events}
        />
      )}
    </section>
  )
}
