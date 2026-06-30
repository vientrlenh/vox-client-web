import { MonitorPlay } from 'lucide-react'
import { useAppSelector } from '@/app/store/hooks'

export function TeacherMonitoringRoomsPage() {
  const user = useAppSelector((state) => state.auth.user)

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

      <div className="grid place-items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
          <MonitorPlay aria-hidden="true" className="size-6" />
        </div>
        <p className="text-base font-black text-slate-950">
          Danh sách phòng sẽ hiển thị ở đây
        </p>
        <p className="max-w-md text-sm font-medium text-slate-500">
          Khung màn hình đã sẵn sàng. Dữ liệu phòng thi được kết nối ở bước tiếp
          theo ({user?.email ?? 'giám thị'}).
        </p>
      </div>
    </section>
  )
}
