import { MonitorPlay } from 'lucide-react'
import { useAppSelector } from '@/app/store/hooks'

export function SchoolAdminMonitoringRoomsPage() {
  const user = useAppSelector((state) => state.auth.user)

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
          Phòng đang thi
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          Toàn bộ phòng thi đang diễn ra trong trường. Nhấn vào một phòng để xem
          màn hình và camera của học sinh trong phòng đó.
        </p>
      </div>

      <div className="grid place-items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
          <MonitorPlay aria-hidden="true" className="size-6" />
        </div>
        <p className="text-base font-black text-slate-950">
          Danh sách phòng đang thi sẽ hiển thị ở đây
        </p>
        <p className="max-w-md text-sm font-medium text-slate-500">
          Khung màn hình đã sẵn sàng. Dữ liệu phòng thi được kết nối ở bước tiếp
          theo ({user?.email ?? 'school admin'}).
        </p>
      </div>
    </section>
  )
}
