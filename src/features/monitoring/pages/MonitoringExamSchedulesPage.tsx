import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { useExamSchedulesQuery } from '@/features/examCore/api/queries'

import { useMonitorableExamQuery } from '../api/useMonitorableExams'
import type { ExamScheduleDto } from '@/features/examCore/types'

import { indexByScheduleId, useActiveSchedulesQuery } from '../api/useActiveSchedules'
import { useMonitorToken } from '../api/useMonitorToken'
import { MonitoringScheduleCard } from '../components/MonitoringScheduleCard'

const PLACEHOLDER =
  'rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500'

function isRunningAt(schedule: ExamScheduleDto, now: number): boolean {
  if (schedule.status === 'CANCELLED' || schedule.status === 'MOVED') {
    return false
  }
  const start = schedule.startDate ? new Date(schedule.startDate).getTime() : null
  const end = schedule.endDate ? new Date(schedule.endDate).getTime() : null
  if (start !== null && now < start) {
    return false
  }
  if (end !== null && now >= end) {
    return false
  }
  return true
}

export function MonitoringExamSchedulesPage() {
  const { examId } = useParams()

  // Đọc bằng quyền GIÁM SÁT, không phải `exam(id)` của màn quản lý: giám thị được phân công ca thi
  // không phải thành viên hội đồng, và mở `exam(id)` cho họ là mở luôn dashboard kỳ thi.
  const examQuery = useMonitorableExamQuery(examId ?? null)
  const schedulesQuery = useExamSchedulesQuery(examId ?? null)

  // scheduleIds rỗng nghĩa là "mọi ca đang diễn ra mà tôi được phép xem" - IssueMonitorTokenUseCase
  // tự thu hẹp lại theo vai trò (chủ tịch hội đồng thấy cả kỳ thi, giám thị chỉ thấy ca được phân).
  // Nhờ vậy trang này không cần biết trước danh sách ca mới xin được token.
  const monitorTokenQuery = useMonitorToken({ examId: examId ?? '', scheduleIds: [] })
  const activeSchedulesQuery = useActiveSchedulesQuery(monitorTokenQuery.data)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const activeByScheduleId = useMemo(
    () => indexByScheduleId(activeSchedulesQuery.data),
    [activeSchedulesQuery.data],
  )

  // Ca đang diễn ra lên trước, rồi tới ca sắp diễn ra, cuối cùng là ca đã xong - trong mỗi nhóm thì
  // theo giờ bắt đầu. Giám thị mở trang này để tìm việc cần làm ngay, không phải để tra lịch.
  const schedules = useMemo(() => {
    const all = schedulesQuery.data ?? []
    return [...all].sort((left, right) => {
      const runningDelta = Number(isRunningAt(right, now)) - Number(isRunningAt(left, now))
      if (runningDelta !== 0) {
        return runningDelta
      }
      const leftStart = left.startDate ? new Date(left.startDate).getTime() : 0
      const rightStart = right.startDate ? new Date(right.startDate).getTime() : 0
      return leftStart - rightStart
    })
  }, [schedulesQuery.data, now])

  const runningCount = useMemo(
    () => schedules.filter((schedule) => isRunningAt(schedule, now)).length,
    [schedules, now],
  )

  return (
    <section aria-labelledby="monitoring-schedules-title" className="grid gap-6">
      <div className="flex flex-col gap-3">
        {/*
          relative="path" và HAI cấp, không phải `to=".."` trần.

          Mặc định Link giải `..` theo ROUTE, mà route này khai phẳng
          (`teacher/monitoring/exams/:examId`) nên route cha chính là layout -- bấm quay lại
          văng thẳng ra trang chủ. Theo PATH thì mỗi `..` bỏ một đoạn URL:
          `/teacher/monitoring/exams/:examId` -> bỏ 2 đoạn -> `/teacher/monitoring`, đúng danh
          sách kỳ thi. Một cấp sẽ ra `/teacher/monitoring/exams` -- không có route nào ở đó.

          Dùng đường tương đối chứ không viết cứng vì trang này phục vụ cả `teacher` lẫn
          `school-admin` (xem AppRoutes: hai route khác tiền tố, chung một component).
        */}
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-800"
          relative="path"
          to="../.."
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách kỳ thi
        </Link>
        <div>
          <p className="text-sm font-black uppercase text-cyan-700">Chọn ca thi</p>
          <h1
            className="mt-2 text-3xl font-black tracking-0 text-slate-950"
            id="monitoring-schedules-title"
          >
            {examQuery.data?.name ?? 'Kỳ thi'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            {runningCount > 0
              ? `${runningCount} ca thi đang diễn ra. Nhấn vào một ca để mở phòng giám sát.`
              : 'Hiện chưa có ca thi nào đang diễn ra trong kỳ thi này.'}
          </p>
        </div>
      </div>

      {schedulesQuery.isLoading ? <p className={PLACEHOLDER}>Đang tải danh sách ca thi…</p> : null}

      {schedulesQuery.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-10 text-center text-sm font-semibold text-red-700">
          Không tải được danh sách ca thi.
        </p>
      ) : null}

      {!schedulesQuery.isLoading && !schedulesQuery.isError && schedules.length === 0 ? (
        <p className={PLACEHOLDER}>Kỳ thi này chưa có ca thi nào.</p>
      ) : null}

      {schedules.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {schedules.map((schedule) => (
            <MonitoringScheduleCard
              activeSchedule={activeByScheduleId.get(schedule.id)}
              isRunning={isRunningAt(schedule, now)}
              key={schedule.id}
              schedule={schedule}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
