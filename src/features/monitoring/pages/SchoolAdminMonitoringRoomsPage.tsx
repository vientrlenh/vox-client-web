import { ActiveExamsList } from '../components/ActiveExamsList'

export function SchoolAdminMonitoringRoomsPage() {

  return (
    <section aria-labelledby="school-admin-monitoring-title" className="grid gap-6">
      <div>
        <p className="text-sm font-black uppercase text-cyan-700">
          Giám sát thi
        </p>
        <h1
          className="mt-2 text-3xl font-black tracking-0 text-slate-950"
          id="school-admin-monitoring-title"
        >
          Kỳ thi đang diễn ra
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          Các kỳ thi tập trung đang diễn ra trong trường. Nhấn vào một kỳ thi để chọn phòng giám sát
        </p>
      </div>

      <ActiveExamsList/>
    </section>
  )
}
