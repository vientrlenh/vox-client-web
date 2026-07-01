import { Link, MonitorPlay } from "lucide-react";
import { useActiveRooms } from "../api/useActiveRooms";

export function ActiveRoomsList() {
    const { data: rooms, isLoading, isError } = useActiveRooms()

    if (isLoading) {
        return (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500">
                Đang tải danh sách phòng đang thi…
            </p>
        )
    }

    if (isError) {
        return (
            <p className="rounded-lg border border-red-200 bg-red-50 p-10 text-center text-sm font-semibold text-red-700">
                Không tải được danh sách phòng đang thi.
            </p>
        )
    }

    if (!rooms?.length) {
        return (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500">
                Hiện chưa có phòng nào đang thi.
            </p>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
            // roomId = scheduleId
            <Link
            className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-cyan-300 hover:shadow-sm"
            key={room.roomId}
            to={`rooms/${room.roomId}`}
            >
            <div className="flex items-center justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <MonitorPlay aria-hidden="true" className="size-5" />
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {room.activeCount} đang stream
                </span>
            </div>
            <p className="mt-4 truncate text-base font-black text-slate-950">
                {room.roomId}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">
                {room.streams.length} luồng (camera/màn hình)
            </p>
            </Link>
        ))}
        </div>
    )
}