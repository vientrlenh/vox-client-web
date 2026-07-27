import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Lock, Monitor, Plus, Search, Smartphone, UserPlus, Wand2, X } from 'lucide-react'
import { toApiError } from '@/shared/api'
import type { ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { TabPillGroup } from '@/shared/ui/TabPill'
import type { SchoolUser } from '@/features/school-users/types'
import {
  useAddProctorToScheduleMutation,
  useAssignCandidateScheduleMutation,
  useAutoFillCandidatesMutation,
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useRemoveProctorFromScheduleMutation,
  useUpdateScheduleMutation,
  useUpdateScheduleStatusMutation,
} from '../../api/mutations'
import { examQueryKeys, useExamCandidatesQuery, useExamSchedulesQuery } from '../../api/queries'
import { getCandidateName, getScheduleLabel, type ExamDeliveryMode, type ExamPaperDto, type ExamScheduleDto } from '../../types'
import { AddStudentToRoomModal } from './AddStudentToRoomModal'
import { CreateScheduleModal } from './CreateScheduleModal'
import { ManageProctorsModal } from './ManageProctorsModal'
import { MoveScheduleModal } from './MoveScheduleModal'
import { PaperAssignmentPanel } from './PaperAssignmentPanel'
import { RoomChip } from './RoomChip'
import { SessionRow } from './SessionRow'

type ScheduleSubTab = 'assign' | 'rooms' | 'sessions'

type ScheduleTabProps = {
  canManage: boolean
  deliveryMode?: ExamDeliveryMode
  // Ba trường dưới đây chỉ để dựng ràng buộc khung giờ trong modal tạo/sửa ca thi —
  // xem CreateScheduleModal. Đều là dữ liệu chỉ đọc của kỳ thi.
  examCloseAt?: string | null
  examId: string
  examOpenAt?: string | null
  examTimeDurationSecond?: number | null
  isClassTest: boolean
  onGoToPapers: () => void
  onSetDeliveryMode?: (mode: ExamDeliveryMode) => void
  papers: ExamPaperDto[]
  unlocked: boolean
}

export function ScheduleTab({
  canManage,
  deliveryMode,
  examCloseAt,
  examId,
  examOpenAt,
  examTimeDurationSecond,
  isClassTest,
  onGoToPapers,
  onSetDeliveryMode,
  papers,
  unlocked,
}: ScheduleTabProps) {
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState<ScheduleSubTab>('sessions')
  const [scheduleSearch, setScheduleSearch] = useState('')
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ExamScheduleDto | null>(null)
  const [managingProctorsFor, setManagingProctorsFor] = useState<ExamScheduleDto | null>(null)
  const [movingSchedule, setMovingSchedule] = useState<ExamScheduleDto | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmationDialog()

  const schedulesQuery = useExamSchedulesQuery(examId)
  const candidatesQuery = useExamCandidatesQuery(examId)
  const createScheduleMutation = useCreateScheduleMutation()
  const updateScheduleMutation = useUpdateScheduleMutation()
  const updateStatusMutation = useUpdateScheduleStatusMutation()
  const deleteScheduleMutation = useDeleteScheduleMutation()
  const addProctorMutation = useAddProctorToScheduleMutation()
  const removeProctorMutation = useRemoveProctorFromScheduleMutation()
  const autoFillMutation = useAutoFillCandidatesMutation()
  const assignCandidateMutation = useAssignCandidateScheduleMutation()

  const schedules = schedulesQuery.data ?? []
  const candidates = candidatesQuery.data ?? []
  const effectiveMode: ExamDeliveryMode = deliveryMode ?? (isClassTest ? 'DEVICE' : 'LAB')

  const totalProctors = schedules.reduce((sum, schedule) => sum + schedule.proctors.length, 0)
  const requiredProctors = schedules.reduce((sum, schedule) => sum + schedule.requiredProctorCount, 0)
  const hasUnassignedCandidates = candidates.some((candidate) => !candidate.scheduleId)
  const filteredSchedules = schedules.filter((schedule) => {
    const keyword = scheduleSearch.trim().toLowerCase()
    return !keyword || getScheduleLabel(schedule).toLowerCase().includes(keyword)
  })
  const selectedSchedule =
    (selectedScheduleId ? schedules.find((schedule) => schedule.id === selectedScheduleId) : undefined) ??
    filteredSchedules[0]
  const scheduleCandidates = selectedSchedule
    ? candidates.filter((candidate) => candidate.scheduleId === selectedSchedule.id)
    : []
  const visibleScheduleCandidates = scheduleCandidates.filter((candidate) => {
    const keyword = studentSearch.trim().toLowerCase()
    if (!keyword) {
      return true
    }
    return (
      getCandidateName(candidate).toLowerCase().includes(keyword) ||
      (candidate.student?.email ?? '').toLowerCase().includes(keyword)
    )
  })

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  function handleError(error: unknown) {
    setErrorMessage(toApiError(error).message)
  }

  async function handleCreateSchedule(input: { endDate: string; schoolRoomId: string; startDate: string }) {
    try {
      await createScheduleMutation.mutateAsync({ examId, payload: input })
      await invalidate()
      setShowCreateModal(false)
      setMessage('Đã tạo ca thi.')
    } catch (error) {
      handleError(error)
    }
  }

  async function handleUpdateSchedule(input: { endDate: string; schoolRoomId: string; startDate: string }) {
    if (!editingSchedule) {
      return
    }
    try {
      await updateScheduleMutation.mutateAsync({ payload: input, scheduleId: editingSchedule.id })
      await invalidate()
      setEditingSchedule(null)
      setMessage('Đã cập nhật ca thi.')
    } catch (error) {
      handleError(error)
    }
  }

  async function handleStatusAction(schedule: ExamScheduleDto, action: 'PUBLISH' | 'COMPLETE' | 'CANCEL') {
    const confirmMessages: Record<'PUBLISH' | 'COMPLETE' | 'CANCEL', string> = {
      CANCEL: `Hủy ${getScheduleLabel(schedule)}? Hành động này không thể hoàn tác.`,
      COMPLETE: `Đánh dấu ${getScheduleLabel(schedule)} đã hoàn thành?`,
      PUBLISH: `Công bố ${getScheduleLabel(schedule)}? Học sinh và giám thị sẽ thấy ca thi này.`,
    }
    if (!(await confirm({ message: confirmMessages[action], title: 'Xác nhận thao tác' }))) {
      return
    }
    try {
      await updateStatusMutation.mutateAsync({ examId, payload: { action }, scheduleId: schedule.id })
      await invalidate()
      setMessage('Đã cập nhật trạng thái ca thi.')
    } catch (error) {
      handleError(error)
    }
  }

  async function handleMoveSchedule(targetScheduleId: string) {
    if (!movingSchedule) {
      return
    }
    try {
      await updateStatusMutation.mutateAsync({
        examId,
        payload: { action: 'MOVE', targetScheduleId },
        scheduleId: movingSchedule.id,
      })
      await invalidate()
      setMovingSchedule(null)
      setMessage('Đã dời ca thi.')
    } catch (error) {
      handleError(error)
    }
  }

  async function handleDeleteSchedule(schedule: ExamScheduleDto) {
    if (
      !(await confirm({
        message: `Xóa ${getScheduleLabel(schedule)}? Chỉ xóa được khi ca chưa có thí sinh.`,
        title: 'Xóa ca thi',
      }))
    ) {
      return
    }
    try {
      await deleteScheduleMutation.mutateAsync({ examId, scheduleId: schedule.id })
      await invalidate()
      if (selectedScheduleId === schedule.id) {
        setSelectedScheduleId(null)
      }
      setMessage('Đã xóa ca thi.')
    } catch (error) {
      handleError(error)
    }
  }

  async function handleAddProctor(schedule: ExamScheduleDto, teacher: SchoolUser) {
    if (!teacher.userId) {
      return
    }
    try {
      await addProctorMutation.mutateAsync({ examId, payload: { teacherId: teacher.userId }, scheduleId: schedule.id })
      await invalidate()
    } catch (error) {
      handleError(error)
    }
  }

  async function handleRemoveProctor(schedule: ExamScheduleDto, proctorId: string) {
    try {
      await removeProctorMutation.mutateAsync({ examId, proctorId, scheduleId: schedule.id })
      await invalidate()
    } catch (error) {
      handleError(error)
    }
  }

  async function handleAutoFill() {
    try {
      await autoFillMutation.mutateAsync({ examId, scheduleIds: selectedSchedule ? [selectedSchedule.id] : undefined })
      await invalidate()
      setMessage('Đã tự động xếp học sinh.')
    } catch (error) {
      handleError(error)
    }
  }

  async function handleAssignCandidate(candidateId: string) {
    if (!selectedSchedule) {
      return
    }
    try {
      await assignCandidateMutation.mutateAsync({ candidateId, examId, scheduleId: selectedSchedule.id })
      await invalidate()
    } catch (error) {
      handleError(error)
    }
  }

  async function handleRemoveFromSchedule(candidateId: string) {
    try {
      await assignCandidateMutation.mutateAsync({ candidateId, examId, scheduleId: null })
      await invalidate()
    } catch (error) {
      handleError(error)
    }
  }

  function getScheduleActions(schedule: ExamScheduleDto): ActionMenuItem[] {
    if (!canManage) {
      return []
    }
    const items: ActionMenuItem[] = []
    if (schedule.status === 'DRAFT' || (isClassTest && schedule.status === 'PUBLISHED')) {
      items.push({ id: 'edit', label: 'Sửa ca thi', onSelect: () => setEditingSchedule(schedule) })
    }
    items.push({ id: 'proctors', label: 'Quản lý giám thị', onSelect: () => setManagingProctorsFor(schedule) })
    if (schedule.status === 'DRAFT') {
      items.push({
        id: 'publish',
        label: 'Công bố',
        onSelect: () => void handleStatusAction(schedule, 'PUBLISH'),
        tone: 'primary',
      })
    }
    if (schedule.status === 'DRAFT' || schedule.status === 'PUBLISHED') {
      items.push({ id: 'move', label: 'Dời ca', onSelect: () => setMovingSchedule(schedule) })
    }
    if (schedule.status === 'PUBLISHED') {
      items.push({
        id: 'complete',
        label: 'Đánh dấu hoàn thành',
        onSelect: () => void handleStatusAction(schedule, 'COMPLETE'),
      })
    }
    if (schedule.status === 'DRAFT' || schedule.status === 'PUBLISHED') {
      items.push({
        id: 'cancel',
        label: 'Hủy ca',
        onSelect: () => void handleStatusAction(schedule, 'CANCEL'),
        tone: 'danger',
      })
    }
    items.push({
      disabled: schedule.candidateCount > 0,
      disabledReason: schedule.candidateCount > 0 ? 'Ca đang có thí sinh' : undefined,
      id: 'delete',
      label: 'Xóa ca thi',
      onSelect: () => void handleDeleteSchedule(schedule),
      tone: 'danger',
    })
    return items
  }

  const deviceModeSection = onSetDeliveryMode ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
          <Monitor aria-hidden="true" className="size-4.5" />
        </span>
        <div>
          <div className="text-sm font-extrabold text-slate-900">Hình thức làm bài</div>
          <div className="text-xs text-slate-500">
            Chọn thiết bị thí sinh dùng để làm bài — điện thoại hoặc máy vi tính. Cả hai đều xếp ca thi, phòng và giám thị.
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
            <Smartphone aria-hidden="true" className="size-4.5 text-indigo-600" />
            <span className="text-[13px] font-bold text-slate-900">Điện thoại</span>
            {effectiveMode === 'DEVICE' ? (
              <span className="ml-auto rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                Đang chọn
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 text-xs leading-5 text-slate-600">
            Thí sinh làm bài trên điện thoại cá nhân. Vẫn xếp ca thi, phòng và giám thị như thi tập trung.
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
            <Monitor aria-hidden="true" className="size-4.5 text-slate-500" />
            <span className="text-[13px] font-bold text-slate-900">Máy vi tính</span>
            {effectiveMode === 'LAB' ? (
              <span className="ml-auto rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                Đang chọn
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 text-xs leading-5 text-slate-600">
            Thí sinh làm bài trên máy vi tính tại phòng máy của trường. Xếp ca thi, phòng và giám thị.
          </div>
        </button>
      </div>
    </div>
  ) : null

  const toasts = (
    <>
      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}
    </>
  )

  if (!unlocked) {
    return (
      <div className="mt-4 grid gap-4">
        {toasts}
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

  return (
    <div className="mt-4 grid gap-4">
      {toasts}
      {deviceModeSection}

      <div className="grid gap-3.5 sm:grid-cols-4">
        <StatBlock label="Ca thi" value={schedules.length} />
        <StatBlock label="Thí sinh" value={candidates.length} />
        <StatBlock label="Đã phân đề" value={candidates.filter((candidate) => candidate.assignedPaperId).length} />
        <StatBlock label="Giám thị" value={`${totalProctors} / ${requiredProctors}`} />
      </div>

      <TabPillGroup
        items={[
          { label: '1 · Ca thi', value: 'sessions' },
          { label: '2 · Xếp học sinh', value: 'rooms' },
          { label: '3 · Phân đề', value: 'assign' },
        ]}
        onChange={setSubTab}
        value={subTab}
      />

      <p className="text-[13px] text-slate-500">
        Quy trình: Tạo ca thi (gắn phòng &amp; khung giờ) → công bố ca → xếp học sinh vào ca → phân đề cho học sinh.
      </p>

      {subTab === 'sessions' ? (
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-500">Mỗi ca gắn với đúng một phòng thi, khung giờ và giám thị phụ trách.</p>
            {canManage ? (
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-[13px] font-semibold text-white"
                onClick={() => setShowCreateModal(true)}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Thêm ca thi
              </button>
            ) : null}
          </div>
          {schedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-400">
              Chưa có ca thi nào.
            </div>
          ) : (
            schedules.map((schedule) => (
              <SessionRow actions={getScheduleActions(schedule)} key={schedule.id} schedule={schedule} />
            ))
          )}
        </div>
      ) : null}

      {subTab === 'rooms' ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="grid gap-2.5 self-start">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Chọn ca thi</p>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
                onChange={(event) => setScheduleSearch(event.target.value)}
                placeholder="Tìm ca theo phòng…"
                value={scheduleSearch}
              />
            </div>
            <div className="grid gap-2">
              {filteredSchedules.length === 0 ? (
                <p className="px-1 text-xs text-slate-400">Không tìm thấy ca thi phù hợp.</p>
              ) : (
                filteredSchedules.map((schedule) => (
                  <RoomChip
                    active={selectedSchedule?.id === schedule.id}
                    key={schedule.id}
                    onClick={() => setSelectedScheduleId(schedule.id)}
                    schedule={schedule}
                  />
                ))
              )}
            </div>
          </div>

          {selectedSchedule ? (
            <div className="grid gap-3.5 self-start rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">{getScheduleLabel(selectedSchedule)}</div>
                  <div className="mt-1 text-[13px] text-slate-500">{selectedSchedule.candidateCount} học sinh</div>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    {hasUnassignedCandidates ? (
                      <button
                        className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        onClick={() => void handleAutoFill()}
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
                      Thêm học sinh vào ca
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Tìm theo tên hoặc email…"
                  value={studentSearch}
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1fr_100px_36px] gap-2.5 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <span>Họ tên</span>
                  <span>Mã đề</span>
                  <span />
                </div>
                <div className="max-h-100 overflow-y-auto">
                  {visibleScheduleCandidates.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-400">Chưa có học sinh nào trong ca này.</div>
                  ) : (
                    visibleScheduleCandidates.map((candidate) => {
                      const candidatePaper = papers.find((paper) => paper.id === candidate.assignedPaperId)
                      return (
                        <div
                          className="grid grid-cols-[1fr_100px_36px] items-center gap-2.5 border-t border-slate-100 px-4 py-2.5"
                          key={candidate.id}
                        >
                          <span className="text-[13px] text-slate-900">{getCandidateName(candidate)}</span>
                          <span className="text-[13px] font-semibold text-indigo-700">
                            {candidatePaper ? candidatePaper.code : '-'}
                          </span>
                          {canManage ? (
                            <button
                              aria-label={`Bỏ ${getCandidateName(candidate)} khỏi ca`}
                              className="inline-flex size-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                              onClick={() => void handleRemoveFromSchedule(candidate.id)}
                              type="button"
                            >
                              <X aria-hidden="true" className="size-4" />
                            </button>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400">
              Chưa có ca thi nào. Thêm ca thi để bắt đầu xếp học sinh.
            </div>
          )}
        </div>
      ) : null}

      {subTab === 'assign' ? (
        <PaperAssignmentPanel
          candidates={candidates}
          examId={examId}
          onApplied={() => void invalidate()}
          papers={papers}
          schedules={schedules}
        />
      ) : null}

      {showAddStudentModal && selectedSchedule ? (
        <AddStudentToRoomModal
          candidates={candidates}
          onAssign={(candidateId) => void handleAssignCandidate(candidateId)}
          onClose={() => setShowAddStudentModal(false)}
          schedule={selectedSchedule}
        />
      ) : null}

      {showCreateModal ? (
        <CreateScheduleModal
          examCloseAt={examCloseAt}
          examOpenAt={examOpenAt}
          examTimeDurationSecond={examTimeDurationSecond}
          isClassTest={isClassTest}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(input) => void handleCreateSchedule(input)}
          submitting={createScheduleMutation.isPending}
        />
      ) : null}

      {editingSchedule ? (
        <CreateScheduleModal
          examCloseAt={examCloseAt}
          examOpenAt={examOpenAt}
          examTimeDurationSecond={examTimeDurationSecond}
          initial={{
            endDate: editingSchedule.endDate,
            room: editingSchedule.room,
            startDate: editingSchedule.startDate,
          }}
          isClassTest={isClassTest}
          onClose={() => setEditingSchedule(null)}
          onSubmit={(input) => void handleUpdateSchedule(input)}
          submitLabel="Lưu thay đổi"
          submitting={updateScheduleMutation.isPending}
          title="Sửa ca thi"
        />
      ) : null}

      {managingProctorsFor ? (
        <ManageProctorsModal
          onAdd={(teacher) => void handleAddProctor(managingProctorsFor, teacher)}
          onClose={() => setManagingProctorsFor(null)}
          onRemove={(proctorId) => void handleRemoveProctor(managingProctorsFor, proctorId)}
          schedule={schedules.find((schedule) => schedule.id === managingProctorsFor.id) ?? managingProctorsFor}
        />
      ) : null}

      {movingSchedule ? (
        <MoveScheduleModal
          currentScheduleId={movingSchedule.id}
          onClose={() => setMovingSchedule(null)}
          onSelect={(targetScheduleId) => void handleMoveSchedule(targetScheduleId)}
          schedules={schedules}
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
