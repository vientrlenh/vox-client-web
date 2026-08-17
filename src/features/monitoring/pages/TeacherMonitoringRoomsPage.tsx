import { ActiveExamsList } from '../components/ActiveExamsList'

export function TeacherMonitoringRoomsPage() {

  return (
    <section aria-labelledby="teacher-monitoring-title" className="grid gap-6">
      <div>
        <p className="text-sm font-black uppercase text-cyan-700">
          Giám sát thi
        </p>
        <h1
          className="mt-2 text-3xl font-black tracking-0 text-slate-950"
          id="teacher-monitoring-title"
        >
          Được phân công
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          Kỳ thi bạn chủ trì và bài kiểm tra trên lớp của bạn đang diễn ra. Nhấn vào một mục để chọn
          phòng giám sát
        </p>
      </div>

      <ActiveExamsList/>
    </section>
  )
}
