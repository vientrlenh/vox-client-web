import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DoorOpen, Laptop, Lock, MonitorSmartphone, Plus, Search, Wand2 } from 'lucide-react'
import { TabPillGroup } from '@/shared/ui/TabPill'
import {
  useAddRoomToScheduleMutation,
  useAutoFillRoomsMutation,
  useCreateScheduleMutation,
} from '../../api/useExamMutations'
import {
  examQueryKeys,
  useExamCandidatesQuery,
  useExamRoomsQuery,
  useExamSchedulesQuery,
} from '../../api/useExamQueries'
import type { ExamDeliveryMode, ExamPaperDto } from '../../types'
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

  const schedulesQuery = useExamSchedulesQuery(examId)
  const roomsQuery = useExamRoomsQuery(examId)
  const candidatesQuery = useExamCandidatesQuery(examId)
  const createScheduleMutation = useCreateScheduleMutation()
  const addRoomMutation = useAddRoomToScheduleMutation()
  const autoFillMutation = useAutoFillRoomsMutation()

  const schedules = schedulesQuery.data ?? []
  const rooms = roomsQuery.data ?? []
  const candidates = candidatesQuery.data ?? []
  const effectiveMode: ExamDeliveryMode = deliveryMode ?? (isClassTest ? 'DEVICE' : 'LAB')

  const totalProctors = schedules.reduce((sum, schedule) => sum + schedule.proctors.length, 0)
  const requiredProctors = schedules.reduce((sum, schedule) => sum + schedule.requiredProctorCount, 0)
  const filteredRooms = rooms.filter((room) => room.code.toLowerCase().includes(roomSearch.trim().toLowerCase()))

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
          { label: '2 · Phòng', value: 'rooms' },
          { label: '3 · Phân đề', value: 'assign' },
        ]}
        onChange={setSubTab}
        value={subTab}
      />

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
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
                onChange={(event) => setRoomSearch(event.target.value)}
                placeholder="Tìm phòng…"
                value={roomSearch}
              />
            </div>
            <p className="text-xs text-slate-400">{filteredRooms.length} phòng</p>
          </div>
          <div className="grid gap-4">
            {schedules.map((schedule) => {
              const scheduleRooms = filteredRooms.filter((room) => room.scheduleId === schedule.id)
              const unassignedCount = candidates.filter(
                (candidate) => candidate.scheduleId === schedule.id && !candidate.roomId,
              ).length
              if (roomSearch && scheduleRooms.length === 0) {
                return null
              }
              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-4.5" key={schedule.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="text-sm font-extrabold text-slate-900">{schedule.label}</div>
                    <div className="flex gap-2">
                      {unassignedCount > 0 ? (
                        <button
                          className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-3.5 text-xs font-bold text-white"
                          onClick={() => handleAutoFill(schedule.id)}
                          type="button"
                        >
                          <Wand2 aria-hidden="true" className="size-3.5" />
                          Tự động xếp {unassignedCount} học sinh
                        </button>
                      ) : null}
                      <button
                        className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        onClick={() => handleAddRoom(schedule.id)}
                        type="button"
                      >
                        <DoorOpen aria-hidden="true" className="size-3.5" />
                        Thêm phòng
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {scheduleRooms.length === 0 ? (
                      <p className="col-span-full text-xs text-slate-400">Chưa có phòng nào cho ca này.</p>
                    ) : (
                      scheduleRooms.map((room) => <RoomChip key={room.id} room={room} />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {subTab === 'assign' ? <AssignPapersView candidates={candidates} papers={papers} rooms={rooms} schedules={schedules} /> : null}
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

function AssignPapersView({
  candidates,
  papers,
  rooms,
  schedules,
}: {
  candidates: ReturnType<typeof useExamCandidatesQuery>['data']
  papers: ExamPaperDto[]
  rooms: ReturnType<typeof useExamRoomsQuery>['data']
  schedules: ReturnType<typeof useExamSchedulesQuery>['data']
}) {
  const lockedPapers = useMemo(() => (papers ?? []).filter((paper) => paper.status === 'LOCKED'), [papers])
  const allRooms = rooms ?? []
  const allCandidates = candidates ?? []

  if (lockedPapers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-400">
        Cần khóa ít nhất một mã đề ở tab Đề thi trước khi phân đề theo phòng.
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-slate-500">
        Mỗi phòng được gán một mã đề cố định để tránh học sinh ngồi cạnh nhau làm cùng đề.
      </p>
      {(schedules ?? []).map((schedule) => {
        const scheduleRooms = allRooms.filter((room) => room.scheduleId === schedule.id)
        if (!scheduleRooms.length) {
          return null
        }
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-4.5" key={schedule.id}>
            <div className="text-sm font-extrabold text-slate-900">{schedule.label}</div>
            <div className="mt-3 grid gap-2">
              {scheduleRooms.map((room, index) => {
                const paper = lockedPapers[index % lockedPapers.length]
                const roomCandidates = allCandidates.filter((candidate) => candidate.roomId === room.id)
                return (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5"
                    key={room.id}
                  >
                    <span className="text-[13px] font-bold text-slate-900">{room.code}</span>
                    <span className="text-xs text-slate-500">{roomCandidates.length} học sinh</span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      {paper.code} · Mã đề {paper.variant}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
