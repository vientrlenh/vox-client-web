import { ArrowLeft, LayoutGrid, ListChecks, Siren } from 'lucide-react'
import { Link, useParams } from 'react-router'

export function MonitoringRoomPage() {
  const { roomId } = useParams()

  return (
    <section aria-labelledby="monitoring-room-title" className="grid gap-6">
      <div className="flex flex-col gap-3">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-800"
          to=".."
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách phòng
        </Link>
        <div>
          <p className="text-sm font-black uppercase text-cyan-700">
            Đang giám sát
          </p>
          <h1
            className="mt-2 text-3xl font-black tracking-0 text-slate-950"
            id="monitoring-room-title"
          >
            Phòng thi {roomId ?? '—'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Màn hình và camera của học sinh trong phòng sẽ hiển thị ở đây.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid place-items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <LayoutGrid aria-hidden="true" className="size-6" />
          </div>
          <p className="text-base font-black text-slate-950">
            Lưới màn hình / camera
          </p>
          <p className="max-w-md text-sm font-medium text-slate-500">
            Kết nối kênh realtime và render frame ở các bước tiếp theo.
          </p>
        </div>

        <aside className="grid h-fit gap-4">
          <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <ListChecks aria-hidden="true" className="size-5 text-slate-500" />
            <p className="text-sm font-black text-slate-950">
              Danh sách học sinh
            </p>
          </div>
          <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <Siren aria-hidden="true" className="size-5 text-slate-500" />
            <p className="text-sm font-black text-slate-950">Cảnh báo AI</p>
          </div>
        </aside>
      </div>
    </section>
  )
}
