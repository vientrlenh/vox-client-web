import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, FileText, Lock, ShieldCheck, UserPlus } from 'lucide-react'
import { toApiError } from '@/shared/api'
import type { ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import type { ExamDirectoryUser } from '../../api/examDirectoryQueries'
import {
  useAddProctorToScheduleMutation,
  useApplyPaperAssignmentsMutation,
  useAssignCandidateScheduleMutation,
  useAutoFillCandidatesMutation,
  useBulkAssignCandidateScheduleMutation,
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useRemoveProctorFromScheduleMutation,
  useUpdateScheduleMutation,
  useUpdateScheduleStatusMutation,
} from '../../api/mutations'
import {
  examQueryKeys,
  useExamCandidatesQuery,
  useExamSchedulesQuery,
  useStudentBusySlotsQuery,
} from '../../api/queries'
import { getScheduleLabel, type ExamCandidateDto, type ExamPaperDto, type ExamScheduleDto } from '../../types'
import { AddStudentToRoomModal } from './AddStudentToRoomModal'
import { CreateScheduleModal } from './CreateScheduleModal'
import { ManageProctorsModal } from './ManageProctorsModal'
import { MoveScheduleModal } from './MoveScheduleModal'
import { getSchedulePublishBlockingReason } from '../../utils/schedulePublish'
import { computeAssignments } from './paperAssignment'
import { ScheduleSessionDetail } from './ScheduleSessionDetail'
import { ScheduleSessionsCard } from './ScheduleSessionsCard'

type ScheduleTabProps = {
  canManage: boolean
  // Ba trường dưới đây chỉ để dựng ràng buộc khung giờ trong modal tạo/sửa ca thi —
  // xem CreateScheduleModal. Đều là dữ liệu chỉ đọc của kỳ thi.
  examCloseAt?: string | null
  examId: string
  examOpenAt?: string | null
  examTimeDurationSecond?: number | null
  isClassTest: boolean
  // Kỳ thi đã bắt đầu (IN_PROGRESS trở lên): backend khoá mọi thao tác xếp lịch, chỉ còn cho
  // công bố/hoàn thành/hủy ca vì đó là thao tác vận hành trong lúc thi.
  locked?: boolean
  onGoToPapers: () => void
  papers: ExamPaperDto[]
  unlocked: boolean
}

export function ScheduleTab({
  canManage,
  examCloseAt,
  examId,
  examOpenAt,
  examTimeDurationSecond,
  isClassTest,
  locked = false,
  onGoToPapers,
  papers,
  unlocked,
}: ScheduleTabProps) {
  const queryClient = useQueryClient()
  const [scheduleSearch, setScheduleSearch] = useState('')
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [studentPage, setStudentPage] = useState(1)
  // Bản nháp phân đề: candidateId -> paperId. Chỉ là lớp phủ lên `candidate.assignedPaperId` của
  // server cho tới khi bấm "Áp dụng phân đề".
  const [paperDraft, setPaperDraft] = useState<Map<string, string>>(new Map())
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
  const bulkAssignCandidateMutation = useBulkAssignCandidateScheduleMutation()
  const applyPaperAssignmentsMutation = useApplyPaperAssignmentsMutation()

  const schedules = schedulesQuery.data ?? []
  const candidates = useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data])
  // Quyền sửa lịch = quyền quản lý + kỳ thi chưa bắt đầu.
  const canEdit = canManage && !locked

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

  // Chỉ hỏi backend khi modal thêm học sinh đang mở, và chỉ về những người có thể được thêm vào ca
  // này (người đã ở trong ca thì không phải hỏi).
  const activeScheduleId = selectedSchedule?.id
  const addableCandidates = useMemo(
    () =>
      showAddStudentModal && activeScheduleId
        ? candidates.filter((candidate) => candidate.scheduleId !== activeScheduleId)
        : [],
    [candidates, activeScheduleId, showAddStudentModal],
  )
  const busySlotsQuery = useStudentBusySlotsQuery(
    selectedSchedule && showAddStudentModal ? [selectedSchedule.id] : [],
    addableCandidates.map((candidate) => candidate.studentId),
  )

  // Làm mờ chứ không lọc bỏ: người dùng cần biết học sinh có tồn tại nhưng đang kẹt, và vì sao.
  // Đây chỉ là lớp tiện dụng — backend vẫn chặn khi submit.
  const conflictReasonByCandidateId = useMemo(() => {
    const busyStudentIds = new Set((busySlotsQuery.data ?? []).map((slot) => slot.studentId))
    const reasons = new Map<string, string>()
    for (const candidate of addableCandidates) {
      if (busyStudentIds.has(candidate.studentId)) {
        reasons.set(candidate.id, 'Đã có ca thi khác trùng giờ với ca này')
      }
    }
    return reasons
  }, [addableCandidates, busySlotsQuery.data])

  const lockedPapers = papers.filter((paper) => paper.status === 'LOCKED')
  const lockedPaperIds = lockedPapers.map((paper) => paper.id)
  // Backend đòi mọi mã đề LOCKED mới cho phân đề — chặn sớm ở đây thay vì để bấm rồi lỗi.
  const paperAssignmentBlockedReason =
    papers.length === 0 || lockedPapers.length !== papers.length
      ? 'Cần khóa tất cả mã đề ở tab Đề bài trước khi phân đề.'
      : undefined

  function resolvePaperId(candidate: ExamCandidateDto) {
    return paperDraft.get(candidate.id) ?? candidate.assignedPaperId ?? null
  }

  function mergePaperDraft(assignments: Map<string, string>) {
    setPaperDraft((current) => {
      const next = new Map(current)
      assignments.forEach((paperId, candidateId) => next.set(candidateId, paperId))
      return next
    })
  }

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
      PUBLISH: `Công bố ${getScheduleLabel(schedule)}? Học sinh và giám thị sẽ thấy ca thi này, và không sửa được phòng/khung giờ nữa.`,
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

  /**
   * Công bố hàng loạt các ca còn Bản nháp. Cả hai loại bài đều đòi mọi ca đã công bố mới lên lịch
   * được (UpdateExamStatusUseCase), nên mở từng menu để bấm "Công bố" là việc lặp không cần thiết.
   *
   * <p>Bỏ qua sẵn những ca backend chắc chắn từ chối (thiếu giám thị, chưa có thí sinh, còn thí sinh
   * chưa có đề) thay vì để lượt chạy đứt giữa chừng ở ca đầu tiên hỏng: một ca thiếu điều kiện không
   * phải lý do để các ca còn lại không được công bố. Vẫn chạy tuần tự để lỗi ngoài dự đoán của ca nào
   * hiện đúng message của ca đó.
   */
  async function handlePublishAllSchedules() {
    const draftSchedules = schedules.filter((schedule) => schedule.status === 'DRAFT')
    if (draftSchedules.length === 0) {
      return
    }
    const evaluated = draftSchedules.map((schedule) => ({
      reason: getSchedulePublishBlockingReason(schedule, candidates),
      schedule,
    }))
    const readySchedules = evaluated.filter((entry) => entry.reason === null).map((entry) => entry.schedule)
    const skippedCount = draftSchedules.length - readySchedules.length
    if (readySchedules.length === 0) {
      // Mỗi ca có thể vướng một lý do khác nhau; chỉ nêu đích danh khi cả loạt cùng một lý do, còn lại
      // trỏ người dùng về menu từng ca thay vì nói như thể chỉ có một nguyên nhân.
      const reasons = new Set(evaluated.map((entry) => entry.reason))
      setErrorMessage(
        reasons.size === 1
          ? `Chưa ca thi nào công bố được: ${[...reasons][0]}`
          : 'Chưa ca thi nào công bố được — mở menu từng ca để xem lý do.',
      )
      return
    }
    const skippedNote = skippedCount > 0 ? ` ${skippedCount} ca chưa đủ điều kiện sẽ được bỏ qua.` : ''
    if (
      !(await confirm({
        message: `Công bố ${readySchedules.length} ca thi? Học sinh và giám thị sẽ thấy các ca này, và không sửa được phòng/khung giờ nữa.${skippedNote}`,
        title: 'Công bố tất cả ca thi',
      }))
    ) {
      return
    }
    let publishedCount = 0
    try {
      for (const schedule of readySchedules) {
        await updateStatusMutation.mutateAsync({ examId, payload: { action: 'PUBLISH' }, scheduleId: schedule.id })
        publishedCount += 1
      }
      setMessage(
        skippedCount > 0
          ? `Đã công bố ${publishedCount} ca thi, bỏ qua ${skippedCount} ca chưa đủ điều kiện.`
          : `Đã công bố ${publishedCount} ca thi.`,
      )
    } catch (error) {
      handleError(error)
    } finally {
      // Ca nào đã công bố xong vẫn phải hiện đúng trạng thái mới, kể cả khi ca sau ném lỗi.
      await invalidate()
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
        message: `Xóa ${getScheduleLabel(schedule)}? Chỉ xóa được khi ca chưa có thí sinh và chưa có giám thị.`,
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

  async function handleAddProctor(schedule: ExamScheduleDto, teacher: ExamDirectoryUser) {
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

  /** Rải đều học sinh chưa có ca ra TẤT CẢ ca (backend round-robin theo thứ tự giờ bắt đầu). */
  async function handleAutoFillAllSchedules() {
    const unassignedCount = candidates.filter((candidate) => !candidate.scheduleId).length
    if (
      !(await confirm({
        message: `Chia đều ${unassignedCount} học sinh chưa xếp ca ra tất cả ca thi? Học sinh đã có ca giữ nguyên, không bị xáo trộn.`,
        title: 'Tự động chia đều',
      }))
    ) {
      return
    }
    try {
      // Không truyền scheduleIds = mọi ca DRAFT/PUBLISHED của kỳ thi.
      await autoFillMutation.mutateAsync({ examId })
      await invalidate()
      setMessage('Đã chia đều học sinh vào các ca thi.')
    } catch (error) {
      handleError(error)
    }
  }

  async function handleAssignCandidates(candidateIds: string[]) {
    if (!selectedSchedule || candidateIds.length === 0) {
      return
    }
    try {
      await bulkAssignCandidateMutation.mutateAsync({ candidateIds, examId, scheduleId: selectedSchedule.id })
      await invalidate()
      setShowAddStudentModal(false)
      setMessage(`Đã xếp ${candidateIds.length} học sinh vào ${getScheduleLabel(selectedSchedule)}.`)
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

  async function handleRemoveManyFromSchedule(candidateIds: string[]) {
    if (candidateIds.length === 0) {
      return
    }
    try {
      await bulkAssignCandidateMutation.mutateAsync({ candidateIds, examId, scheduleId: null })
      await invalidate()
      setMessage(`Đã gỡ ${candidateIds.length} học sinh khỏi ca thi.`)
    } catch (error) {
      handleError(error)
    }
  }

  /** Chia đều mã đề trong đúng ca đang chọn. */
  function handleAssignPapersForSchedule() {
    if (!selectedSchedule) {
      return
    }
    mergePaperDraft(computeAssignments(scheduleCandidates, lockedPaperIds, false, true))
  }

  /** Chia đều mã đề trong TỪNG ca cho toàn kỳ thi (thí sinh chưa có ca thì không phân). */
  function handleAssignPapersForAllSchedules() {
    const assignable = candidates.filter((candidate) => candidate.scheduleId)
    mergePaperDraft(computeAssignments(assignable, lockedPaperIds, true, true))
  }

  async function handleApplyPaperDraft() {
    const assignments = Array.from(paperDraft.entries())
      .filter(([, paperId]) => Boolean(paperId))
      .map(([candidateId, paperId]) => ({ candidateId, paperId }))
    if (assignments.length === 0) {
      return
    }
    try {
      await applyPaperAssignmentsMutation.mutateAsync({ assignments, examId })
      await invalidate()
      setPaperDraft(new Map())
      setMessage(`Đã phân đề cho ${assignments.length} học sinh.`)
    } catch (error) {
      handleError(error)
    }
  }

  function getScheduleActions(schedule: ExamScheduleDto): ActionMenuItem[] {
    if (!canManage) {
      return []
    }
    const items: ActionMenuItem[] = []
    if (canEdit && (schedule.status === 'DRAFT' || (isClassTest && schedule.status === 'PUBLISHED'))) {
      items.push({ id: 'edit', label: 'Sửa ca thi', onSelect: () => setEditingSchedule(schedule) })
    }
    if (canEdit) {
      items.push({ id: 'proctors', label: 'Quản lý giám thị', onSelect: () => setManagingProctorsFor(schedule) })
    }
    // Công bố / hoàn thành / hủy ca là thao tác vận hành nên vẫn dùng được khi kỳ thi đang diễn ra.
    if (schedule.status === 'DRAFT') {
      const publishBlockingReason = getSchedulePublishBlockingReason(schedule, candidates)
      items.push({
        disabled: Boolean(publishBlockingReason),
        disabledReason: publishBlockingReason ?? undefined,
        id: 'publish',
        label: 'Công bố',
        onSelect: () => void handleStatusAction(schedule, 'PUBLISH'),
        tone: 'primary',
      })
    }
    if (canEdit && (schedule.status === 'DRAFT' || schedule.status === 'PUBLISHED')) {
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
    if (canEdit) {
      // Backend chặn xóa khi ca còn thí sinh hoặc còn giám thị — dòng giám thị không có cascade nên
      // ca xóa mềm mà còn giám thị vẫn hiện ở màn điểm danh.
      const blockingReason =
        schedule.candidateCount > 0
          ? 'Ca đang có thí sinh'
          : schedule.proctors.length > 0
            ? 'Ca đang có giám thị'
            : undefined
      items.push({
        disabled: Boolean(blockingReason),
        disabledReason: blockingReason,
        id: 'delete',
        label: 'Xóa ca thi',
        onSelect: () => void handleDeleteSchedule(schedule),
        tone: 'danger',
      })
    }
    return items
  }

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

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={<CalendarClock size={19} />} iconTone="indigo" label="Ca thi" value={schedules.length} />
        <StatCard icon={<UserPlus size={19} />} iconTone="emerald" label="Thí sinh" value={candidates.length} />
        <StatCard
          icon={<FileText size={19} />}
          iconTone="violet"
          label="Đã phân đề"
          value={candidates.filter((candidate) => candidate.assignedPaperId).length}
        />
        <StatCard
          icon={<ShieldCheck size={19} />}
          iconTone="amber"
          label="Giám thị"
          value={`${totalProctors} / ${requiredProctors}`}
        />
      </div>

      {canManage && locked ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          Kỳ thi đã bắt đầu — không thể thay đổi lịch thi. Chỉ còn công bố, hoàn thành hoặc hủy ca.
        </div>
      ) : null}

      <ScheduleSessionsCard
        canEdit={canEdit}
        getActions={getScheduleActions}
        onAutoAssignPapers={canEdit ? handleAssignPapersForAllSchedules : undefined}
        onAutoFillAllSchedules={
          canEdit && hasUnassignedCandidates ? () => void handleAutoFillAllSchedules() : undefined
        }
        onCreate={() => setShowCreateModal(true)}
        onPublishAllSchedules={
          canManage && schedules.some((schedule) => schedule.status === 'DRAFT')
            ? () => void handlePublishAllSchedules()
            : undefined
        }
        onSearchChange={setScheduleSearch}
        onSelect={(scheduleId) => {
          setSelectedScheduleId(scheduleId)
          setStudentPage(1)
        }}
        paperAssignmentBlockedReason={paperAssignmentBlockedReason}
        schedules={filteredSchedules}
        search={scheduleSearch}
        selectedScheduleId={selectedSchedule?.id}
        totalCount={schedules.length}
      />

      {selectedSchedule ? (
        <ScheduleSessionDetail
          canEdit={canEdit}
          candidates={scheduleCandidates}
          hasUnassignedCandidates={hasUnassignedCandidates}
          lockedPapers={lockedPapers}
          onAddStudent={() => setShowAddStudentModal(true)}
          onApplyPaperDraft={() => void handleApplyPaperDraft()}
          onAssignPapersForSchedule={handleAssignPapersForSchedule}
          onAutoFill={() => void handleAutoFill()}
          onChangePaper={(candidateId, paperId) => mergePaperDraft(new Map([[candidateId, paperId]]))}
          onPageChange={setStudentPage}
          onRemoveCandidate={(candidateId) => void handleRemoveFromSchedule(candidateId)}
          onRemoveCandidates={(candidateIds) => void handleRemoveManyFromSchedule(candidateIds)}
          onSearchChange={(value) => {
            setStudentSearch(value)
            setStudentPage(1)
          }}
          page={studentPage}
          paperAssignmentBlockedReason={paperAssignmentBlockedReason}
          paperDraftCount={paperDraft.size}
          resolvePaperId={resolvePaperId}
          schedule={selectedSchedule}
          search={studentSearch}
        />
      ) : null}

      {showAddStudentModal && selectedSchedule ? (
        <AddStudentToRoomModal
          candidates={candidates}
          conflictReasonByCandidateId={conflictReasonByCandidateId}
          onAssign={(candidateIds) => void handleAssignCandidates(candidateIds)}
          onClose={() => setShowAddStudentModal(false)}
          schedule={selectedSchedule}
          schedules={schedules}
          submitting={bulkAssignCandidateMutation.isPending}
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
          examId={examId}
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
