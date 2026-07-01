import { ActiveRoomsList } from '../components/ActiveRoomsList'

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
          Phòng thi được phân công
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          Theo dõi các phòng thi bạn gác — đang diễn ra và sắp tới. Nhấn vào
          phòng đang diễn ra để xem màn hình và camera của học sinh.
        </p>
      </div>

      <ActiveRoomsList/>
    </section>
  )
}
