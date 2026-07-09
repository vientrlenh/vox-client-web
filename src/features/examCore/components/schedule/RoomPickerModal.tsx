import { useState } from 'react'
import { DoorOpen, Search, X } from 'lucide-react'
import { useSchoolRoomsQuery } from '../../api/queries'
import type { SchoolRoomLite } from '../../types'

type RoomPickerModalProps = {
  onClose: () => void
  onSelect: (room: SchoolRoomLite) => void
}

const PAGE_SIZE = 8

export function RoomPickerModal({ onClose, onSelect }: RoomPickerModalProps) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const roomsQuery = useSchoolRoomsQuery(page, PAGE_SIZE, keyword)
  const rooms = roomsQuery.data?.content ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="room-picker-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900" id="room-picker-title">
            Chọn phòng thi
          </h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-3.5">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder="Tìm phòng theo mã hoặc tên…"
              value={keyword}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {roomsQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">Đang tải danh sách phòng…</p>
          ) : rooms.length ? (
            <div className="grid gap-2.5 py-2">
              {rooms.map((room) => (
                <button
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                  key={room.id}
                  onClick={() => onSelect(room)}
                  type="button"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{room.code}</div>
                    <div className="text-xs text-slate-500">{room.name}</div>
                  </div>
                  <DoorOpen aria-hidden="true" className="size-4 shrink-0 text-indigo-600" />
                </button>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Không tìm thấy phòng phù hợp.</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 text-xs font-semibold text-slate-500">
          <span>{roomsQuery.data?.totalElements ?? 0} phòng</span>
          <div className="flex gap-2">
            <button
              className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              disabled={page >= (roomsQuery.data?.totalPages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
