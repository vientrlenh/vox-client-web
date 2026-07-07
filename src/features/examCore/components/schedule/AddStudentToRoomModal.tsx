import { useMemo, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import type { ExamCandidateDto, ExamRoomDto } from '../../types'

type AddStudentToRoomModalProps = {
  candidates: ExamCandidateDto[]
  onAssign: (candidateId: string) => void
  onClose: () => void
  room: ExamRoomDto
}

export function AddStudentToRoomModal({ candidates, onAssign, onClose, room }: AddStudentToRoomModalProps) {
  const [keyword, setKeyword] = useState('')
  const isFull = room.occupied >= room.capacity

  const unassigned = useMemo(() => candidates.filter((candidate) => !candidate.roomId), [candidates])
  const visible = unassigned.filter((candidate) => {
    const term = keyword.trim().toLowerCase()
    return !term || candidate.studentName.toLowerCase().includes(term) || candidate.sbd.toLowerCase().includes(term)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="add-student-modal-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-900" id="add-student-modal-title">
              Thêm học sinh vào phòng {room.code}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {room.occupied}/{room.capacity} học sinh{isFull ? ' · Phòng đã đầy' : ''}
            </p>
          </div>
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
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên hoặc SBD…"
              value={keyword}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Không còn học sinh chưa xếp phòng.</p>
          ) : (
            <div className="grid gap-2 py-2">
              {visible.map((candidate) => (
                <button
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isFull}
                  key={candidate.id}
                  onClick={() => onAssign(candidate.id)}
                  type="button"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{candidate.studentName}</div>
                    <div className="text-xs text-slate-500">
                      SBD {candidate.sbd} · {candidate.schoolClassName}
                    </div>
                  </div>
                  <UserPlus aria-hidden="true" className="size-4 shrink-0 text-indigo-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
