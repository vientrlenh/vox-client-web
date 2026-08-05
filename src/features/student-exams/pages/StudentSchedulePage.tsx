import { CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import { ScheduleCalendar } from '@/shared/ui/ScheduleCalendar'
import { StatusBadge, type StatusTone } from '@/shared/ui/StatusBadge'
import { useStudentScheduleQuery } from '../api/useStudentScheduleQuery'

// BE chỉ trả về ca PUBLISHED/COMPLETED/CANCELLED cho học sinh — ca nháp và ca đã dời đã bị lọc.
function scheduleStatus(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'COMPLETED': return { label: 'Đã kết thúc', tone: 'neutral' }
    case 'CANCELLED': return { label: 'Đã hủy', tone: 'danger' }
    default: return { label: 'Sắp diễn ra', tone: 'info' }
  }
}

export function StudentSchedulePage() {
  const schedulesQuery = useStudentScheduleQuery()
  const events = useMemo(() => (schedulesQuery.data ?? []).map((schedule) => {
    const status = scheduleStatus(schedule.status)
    const isClassTest = schedule.exam?.kind === 'CLASS_TEST'
    return {
      id: schedule.id,
      title: schedule.exam?.name ?? `Kỳ thi ${schedule.examId}`,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      roomLabel: schedule.room?.name,
      badges: (
        <>
          <StatusBadge label={isClassTest ? 'Bài tập' : 'Bài kiểm tra'} tone={isClassTest ? 'violet' : 'info'} />
          <StatusBadge label={status.label} tone={status.tone} />
        </>
      ),
    }
  }), [schedulesQuery.data])

  return (
    <section className="mx-auto max-w-220">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700"><CalendarDays className="size-5" /></span>
        <div>
          <h1 className="text-[30px] font-extrabold text-slate-900">Lịch thi</h1>
          <p className="mt-1 text-sm text-slate-500">Các ca thi và bài tập đã được xếp cho bạn.</p>
        </div>
      </div>
      {schedulesQuery.isLoading ? (
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
