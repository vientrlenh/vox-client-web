import { CalendarClock, CheckSquare, ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useMyProctorSchedulesQuery } from '@/features/examCore/api/queries'
import { scheduleStatusView } from '@/shared/lib/scheduleStatus'
import { ScheduleCalendar } from '@/shared/ui/ScheduleCalendar'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'

export function ProctorScheduleListPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const schedulesQuery = useMyProctorSchedulesQuery()
  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data])
  const basePath = location.pathname.startsWith('/school-admin')
    ? '/school-admin/proctor-attendance'
    : '/teacher/proctor-attendance'
  const upcomingCount = schedules.filter((schedule) => schedule.startDate && new Date(schedule.startDate).getTime() > Date.now()).length
  const events = schedules.map((schedule) => {
    // Trước đây in thẳng mã trạng thái (`PUBLISHED`) ra badge. Vừa là chữ kỹ thuật lộ ra
    // giao diện, vừa sai nghĩa: không job nào chuyển ca sang COMPLETED khi hết giờ nên ca nào
    // cũng PUBLISHED mãi, kể cả ca đã thi xong tuần trước.
    const status = scheduleStatusView(schedule.status, schedule.startDate, schedule.endDate)
    return {
      id: schedule.scheduleId,
      title: schedule.examName ?? schedule.examId,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      roomLabel: schedule.roomName,
      badges: <StatusBadge label={status.label} tone={status.tone} />,
      // Nút KHÔNG khoá theo trạng thái: ca đã kết thúc thì giám thị và nhà trường vẫn phải
      // mở lại được danh sách điểm danh để đối chiếu.
      action: (
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-700" onClick={() => navigate(`${basePath}/${schedule.scheduleId}`)} type="button">
          Điểm danh<ArrowRight className="size-4" />
        </button>
      ),
    }
  })

  return (
    <section className="grid gap-6">
      <div><p className="text-sm font-black uppercase text-cyan-700">Điểm danh giám thị</p><h1 className="mt-2 text-3xl font-black text-slate-950">Lịch ca thi được phân công</h1></div>
      <div className="grid gap-4 sm:grid-cols-2"><StatCard icon={<CheckSquare size={19} />} iconTone="indigo" label="Tổng ca được gán" value={schedules.length} /><StatCard icon={<CalendarClock size={19} />} iconTone="amber" label="Ca sắp tới" value={upcomingCount} /></div>
      {schedulesQuery.isLoading ? <div className="border-y border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">Đang tải lịch coi thi...</div> : <ScheduleCalendar emptyAllMessage="Bạn chưa được phân công ca thi nào." emptyDayMessage="Không có ca coi thi trong ngày này." events={events} />}
    </section>
  )
}
