import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Laptop, Lock, MonitorSmartphone, Plus, Search, UserPlus, Wand2, X } from 'lucide-react'
import { TabPillGroup } from '@/shared/ui/TabPill'
import {
  useAddRoomToScheduleMutation,
  useAssignCandidateToRoomMutation,
  useAutoFillRoomsMutation,
  useCreateScheduleMutation,
  useRemoveCandidateFromRoomMutation,
} from '../../api/useExamMutations'
import {
  examQueryKeys,
  useExamCandidatesQuery,
  useExamRoomsQuery,
  useExamSchedulesQuery,
} from '../../api/useExamQueries'
import type { ExamDeliveryMode, ExamPaperDto } from '../../types'
import { AddStudentToRoomModal } from './AddStudentToRoomModal'
import { PaperAssignmentPanel } from './PaperAssignmentPanel'
import { RoomChip } from './RoomChip'
import { SessionRow } from './SessionRow'

type ScheduleSubTab = 'assign' | 'rooms' | 'sessions'

type ScheduleTabProps = {
  deliveryMode?: ExamDeliveryMode
  examId: string
  isClassTest: boolean
  onGoToPapers: () => void
  onSetDeliveryMode?: (mode: ExamDeliveryMode) => void
  papers: ExamPaperDto[]
  unlocked: boolean
}

export function ScheduleTab({
  deliveryMode,
  examId,
  isClassTest,
  onGoToPapers,
  onSetDeliveryMode,
  papers,
  unlocked,
}: ScheduleTabProps) {
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState<ScheduleSubTab>('sessions')
  const [roomSearch, setRoomSearch] = useState('')
  const [scheduleFilterId, setScheduleFilterId] = useState('all')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [studentClassFilter, setStudentClassFilter] = useState('all')
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)

  const schedulesQuery = useExamSchedulesQuery(examId)
  const roomsQuery = useExamRoomsQuery(examId)
  const candidatesQuery = useExamCandidatesQuery(examId)
  const createScheduleMutation = useCreateScheduleMutation()
  const addRoomMutation = useAddRoomToScheduleMutation()
  const autoFillMutation = useAutoFillRoomsMutation()
  const assignCandidateMutation = useAssignCandidateToRoomMutation()
  const removeCandidateMutation = useRemoveCandidateFromRoomMutation()

  const schedules = schedulesQuery.data ?? []
  const rooms = roomsQuery.data ?? []
  const candidates = candidatesQuery.data ?? []
  const effectiveMode: ExamDeliveryMode = deliveryMode ?? (isClassTest ? 'DEVICE' : 'LAB')

  const totalProctors = schedules.reduce((sum, schedule) => sum + schedule.proctors.length, 0)
  const requiredProctors = schedules.reduce((sum, schedule) => sum + schedule.requiredProctorCount, 0)
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.code.toLowerCase().includes(roomSearch.trim().toLowerCase())
    const matchesSchedule = scheduleFilterId === 'all' || room.scheduleId === scheduleFilterId
    return matchesSearch && matchesSchedule
  })
  const selectedRoom = (selectedRoomId ? rooms.find((room) => room.id === selectedRoomId) : undefined) ?? filteredRooms[0]
  const selectedRoomSchedule = selectedRoom ? schedules.find((schedule) => schedule.id === selectedRoom.scheduleId) : undefined
  const roomCandidates = selectedRoom ? candidates.filter((candidate) => candidate.roomId === selectedRoom.id) : []
  const roomClassOptions = Array.from(new Set(roomCandidates.map((candidate) => candidate.schoolClassName)))
  const visibleRoomCandidates = roomCandidates.filter((candidate) => {
    const keyword = studentSearch.trim().toLowerCase()
    const matchesKeyword =
      !keyword || candidate.studentName.toLowerCase().includes(keyword) || candidate.sbd.toLowerCase().includes(keyword)
    const matchesClass = studentClassFilter === 'all' || candidate.schoolClassName === studentClassFilter
    return matchesKeyword && matchesClass
  })

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  async function handleAddSchedule() {
    const label = window.prompt('Tên ca thi mới (ví dụ: Ca 5 · Bù):')
    if (!label?.trim()) {
      return
    }
    const now = new Date()
    await createScheduleMutation.mutateAsync({
      examId,
      payload: { endDate: now.toISOString(), label: label.trim(), startDate: now.toISOString() },
    })
    await invalidate()
  }

  async function handleAddRoom(scheduleId: string) {
    const code = window.prompt('Mã phòng mới (ví dụ: P.305):')
    if (!code?.trim()) {
      return
    }
    await addRoomMutation.mutateAsync({ payload: { capacity: 25, code: code.trim() }, scheduleId })
    await invalidate()
  }

  async function handleAutoFill(scheduleId: string) {
    await autoFillMutation.mutateAsync({ examId, scheduleId })
    await invalidate()
  }

  async function handleAssignCandidate(candidateId: string) {
    if (!selectedRoom) {
      return
    }
    await assignCandidateMutation.mutateAsync({ candidateId, roomId: selectedRoom.id, scheduleId: selectedRoom.scheduleId })
    await invalidate()
  }

  async function handleRemoveFromRoom(candidateId: string) {
    await removeCandidateMutation.mutateAsync({ candidateId })
    await invalidate()
  }

  const deviceModeSection =
    isClassTest && onSetDeliveryMode ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
            <MonitorSmartphone aria-hidden="true" className="size-4.5" />
          </span>
          <div>
            <div className="text-sm font-extrabold text-slate-900">Hình thức làm bài</div>
            <div className="text-xs text-slate-500">
              Chọn nơi học sinh làm bài trên lớp — có thể thi ngay trên thiết bị của học sinh.
            </div>
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <button
            className={[
              'min-w-55 flex-1 rounded-xl border p-3.5 text-left transition',
              effectiveMode === 'DEVICE' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50',
            ].join(' ')}
            onClick={() => onSetDeliveryMode('DEVICE')}
            type="button"
          >
            <div className="flex items-center gap-2">
              <MonitorSmartphone aria-hidden="true" className="size-4.5 text-indigo-600" />
              <span className="text-[13px] font-bold text-slate-900">Thiết bị học sinh</span>
              {effectiveMode === 'DEVICE' ? (
                <span className="ml-auto rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Đang chọn
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 text-xs leading-5 text-slate-600">
              Học sinh dùng điện thoại/laptop cá nhân. Không cần xếp phòng máy, chỉ cần khung giờ mở – đóng bài.
            </div>
          </button>
          <button
            className={[
              'min-w-55 flex-1 rounded-xl border p-3.5 text-left transition',
              effectiveMode === 'LAB' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50',
            ].join(' ')}
            onClick={() => onSetDeliveryMode('LAB')}
            type="button"
          >
            <div className="flex items-center gap-2">
              <Laptop aria-hidden="true" className="size-4.5 text-slate-500" />
              <span className="text-[13px] font-bold text-slate-900">Phòng máy của trường</span>
              {effectiveMode === 'LAB' ? (
                <span className="ml-auto rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Đang chọn
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 text-xs leading-5 text-slate-600">
              Thi tập trung tại phòng máy. Xếp chỗ và phân đề theo phòng như bên dưới.
            </div>
          </button>
        </div>
      </div>
    ) : null

  if (!unlocked) {
    return (
      <div className="mt-4 grid gap-4">
        {deviceModeSection}
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Lock aria-hidden="true" className="size-7" />
          </span>
          <div className="mt-1 text-[16px] font-extrabold text-slate-900">Phân lịch chưa được mở</div>
          <p className="max-w-105 text-[13px] leading-6 text-slate-500">
            Tab này sẽ tự động mở khi tất cả mã đề đã được duyệt và khóa. Hãy hoàn tất bước soạn &amp; duyệt đề trước.
          </p>
          <button
            className="mt-2.5 inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4.5 text-[13px] font-bold text-indigo-600 transition hover:bg-slate-50"
            onClick={onGoToPapers}
            type="button"
          >
            Quay lại Đề thi
          </button>
        </div>
      </div>
    )
  }

  if (effectiveMode === 'DEVICE') {
    return (
      <div className="mt-4 grid gap-4">
        {deviceModeSection}
        <div className="rounded-2xl border border-slate-200 bg-white p-5.5 text-[13px] text-slate-600">
          Học sinh làm bài trực tiếp trên thiết bị cá nhân trong khung giờ mở – đóng bài đã cấu hình ở phần thông tin
          chung. Không cần xếp ca thi/phòng máy.
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <StatBlock label="Thí sinh" value={candidates.length} />
          <StatBlock label="Mã đề đã khóa" value={papers.filter((paper) => paper.status === 'LOCKED').length} />
        </div>
        <PaperAssignmentPanel candidates={candidates} onApplied={() => void invalidate()} papers={papers} rooms={[]} />
      </div>
    )
  }

  return (
    <div className="mt-4 grid gap-4">
      {deviceModeSection}

      <div className="grid gap-3.5 sm:grid-cols-4">
        <StatBlock label="Ca thi" value={schedules.length} />
        <StatBlock label="Phòng thi" value={rooms.length} />
        <StatBlock label="Thí sinh" value={candidates.length} />
        <StatBlock label="Giám thị" value={`${totalProctors} / ${requiredProctors}`} />
      </div>

      <TabPillGroup
        items={[
          { label: '1 · Ca thi', value: 'sessions' },
          { label: '2 · Phòng & học sinh', value: 'rooms' },
          { label: '3 · Phân đề', value: 'assign' },
        ]}
        onChange={setSubTab}
        value={subTab}
      />

      <p className="text-[13px] text-slate-500">
        Quy trình: Tạo ca thi → thêm phòng thi vào ca → thêm học sinh vào phòng → phân đề cho học sinh.
      </p>

      {subTab === 'sessions' ? (
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-500">Mỗi ca gồm khung giờ, phòng thi và giám thị phụ trách.</p>
            <button
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-[13px] font-semibold text-white"
              onClick={handleAddSchedule}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Thêm ca thi
            </button>
          </div>
          {schedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-400">
              Chưa có ca thi nào.
            </div>
          ) : (
            schedules.map((schedule) => {
              const scheduleRooms = rooms.filter((room) => schedule.roomIds.includes(room.id))
              return (
                <SessionRow
                  key={schedule.id}
                  roomLabel={scheduleRooms.length ? scheduleRooms.map((room) => room.code).join(', ') : undefined}
                  schedule={schedule}
                />
              )
            })
          )}
        </div>
      ) : null}

      {subTab === 'rooms' ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="grid gap-2.5 self-start">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Chọn phòng thi</p>
              {schedules.length ? (
                <button
                  className="text-xs font-bold text-indigo-600 hover:underline"
                  onClick={() => void handleAddRoom(scheduleFilterId !== 'all' ? scheduleFilterId : schedules[0].id)}
                  type="button"
                >
                  + Thêm phòng
                </button>
              ) : null}
            </div>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
                onChange={(event) => setRoomSearch(event.target.value)}
                placeholder="Tìm phòng…"
                value={roomSearch}
              />
            </div>
            <select
              className="h-9.5 rounded-lg border border-slate-200 px-2.5 text-[13px] text-slate-900"
              onChange={(event) => setScheduleFilterId(event.target.value)}
              value={scheduleFilterId}
            >
              <option value="all">Tất cả ca</option>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.label}
                </option>
              ))}
            </select>
            <div className="grid gap-2">
              {filteredRooms.length === 0 ? (
                <p className="px-1 text-xs text-slate-400">Không tìm thấy phòng phù hợp.</p>
              ) : (
                filteredRooms.map((room) => {
                  const roomSchedule = schedules.find((schedule) => schedule.id === room.scheduleId)
                  return (
                    <RoomChip
                      active={selectedRoom?.id === room.id}
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      room={room}
                      sessionLabel={roomSchedule?.label}
                    />
                  )
                })
              )}
            </div>
          </div>

          {selectedRoom ? (
            <div className="grid gap-3.5 self-start rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">{selectedRoom.code}</div>
                  <div className="mt-1 text-[13px] text-slate-500">
                    {selectedRoomSchedule?.label ?? '—'} · Sức chứa {selectedRoom.capacity} · Đã thêm {selectedRoom.occupied}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRoomSchedule &&
                  candidates.some((candidate) => candidate.scheduleId === selectedRoomSchedule.id && !candidate.roomId) ? (
                    <button
                      className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      onClick={() => void handleAutoFill(selectedRoomSchedule.id)}
                      type="button"
                    >
                      <Wand2 aria-hidden="true" className="size-3.5" />
                      Tự động xếp
                    </button>
                  ) : null}
                  <button
                    className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-[13px] font-semibold text-white"
                    onClick={() => setShowAddStudentModal(true)}
                    type="button"
                  >
                    <UserPlus aria-hidden="true" className="size-4" />
                    Thêm học sinh vào phòng
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <div className="relative min-w-50 flex-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Tìm theo tên hoặc SBD…"
                    value={studentSearch}
                  />
                </div>
                <select
                  className="h-9.5 rounded-lg border border-slate-200 px-2.5 text-[13px] text-slate-900"
                  onChange={(event) => setStudentClassFilter(event.target.value)}
                  value={studentClassFilter}
                >
                  <option value="all">Tất cả lớp</option>
                  {roomClassOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[110px_1fr_80px_90px_36px] gap-2.5 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <span>SBD</span>
                  <span>Họ tên</span>
                  <span>Lớp</span>
                  <span>Mã đề</span>
                  <span />
                </div>
                <div className="max-h-100 overflow-y-auto">
                  {visibleRoomCandidates.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-400">Chưa có học sinh nào trong phòng này.</div>
                  ) : (
                    visibleRoomCandidates.map((candidate) => {
                      const candidatePaper = papers.find((paper) => paper.id === candidate.paperId)
                      return (
                        <div
                          className="grid grid-cols-[110px_1fr_80px_90px_36px] items-center gap-2.5 border-t border-slate-100 px-4 py-2.5"
                          key={candidate.id}
                        >
                          <span className="font-mono text-xs font-bold text-slate-900">{candidate.sbd}</span>
                          <span className="text-[13px] text-slate-900">{candidate.studentName}</span>
                          <span className="text-[13px] text-slate-500">{candidate.schoolClassName}</span>
                          <span className="text-[13px] font-semibold text-indigo-700">
                            {candidatePaper ? candidatePaper.code : '-'}
                          </span>
                          <button
                            aria-label={`Bỏ ${candidate.studentName} khỏi phòng`}
                            className="inline-flex size-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                            onClick={() => void handleRemoveFromRoom(candidate.id)}
                            type="button"
                          >
                            <X aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400">
              Chưa có phòng thi nào. Thêm phòng ở bước Ca thi để bắt đầu xếp học sinh.
            </div>
          )}
        </div>
      ) : null}

      {subTab === 'assign' ? (
        <PaperAssignmentPanel candidates={candidates} onApplied={() => void invalidate()} papers={papers} rooms={rooms} />
      ) : null}

      {showAddStudentModal && selectedRoom ? (
        <AddStudentToRoomModal
          candidates={candidates}
          onAssign={(candidateId) => void handleAssignCandidate(candidateId)}
          onClose={() => setShowAddStudentModal(false)}
          room={selectedRoom}
        />
      ) : null}
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1.5 text-[22px] font-extrabold text-slate-900">{value}</div>
    </div>
  )
}
