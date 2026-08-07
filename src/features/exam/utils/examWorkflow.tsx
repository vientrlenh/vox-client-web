import type { ReactNode } from 'react'
import { Check, FilePenLine, LayoutList, Rocket, UserPlus, Users } from 'lucide-react'
import type { WorkflowStep } from '@/shared/ui/WorkflowStepper'
import type {
  ExamCandidateDto,
  ExamDto,
  ExamPaperDto,
  ExamScheduleDto,
  ExamScheduleStatusDto,
} from '@/features/examCore/types'

export type ExamDetailTab = 'blueprint' | 'papers' | 'people' | 'schedule' | 'students'

/** `tab` là nguồn duy nhất cho cả nút "Bước tiếp theo" lẫn tab mở mặc định khi vào trang. */
type ExamWorkflowStep = WorkflowStep & {
  cta: string
  done: boolean
  tab: ExamDetailTab
  todo: string
}

/** Số liệu thô đằng sau từng bước, để chỗ gọi hiện "kỳ thi đang tới đâu" mà không tính lại. */
type ExamWorkflowSummary = {
  /** null khi query không trả về số thí sinh lẫn danh sách thí sinh. */
  candidateCount: number | null
  lockedPaperCount: number
  paperCount: number
  publishedScheduleCount: number
  /** Đã trừ ca đã hủy. null khi không có dữ liệu ca thi. */
  scheduleCount: number | null
}

type ExamWorkflowResult = {
  completedCount: number
  /** Bước chưa xong đầu tiên; null khi đã đủ cả 5 bước. */
  currentStep: ExamWorkflowStep | null
  done: { blueprint: boolean; papers: boolean; people: boolean; schedule: boolean; students: boolean }
  steps: ExamWorkflowStep[]
  summary: ExamWorkflowSummary
  totalCount: number
}

/**
 * Năm bước khớp đúng thứ tự 5 tab bên dưới: phân công giáo viên → chốt khung đề → tạo mã đề →
 * thêm thí sinh → xếp lịch.
 *
 * <p>`schedules`/`candidates` là optional: trang chi tiết truyền vào (dữ liệu tươi nhất, ngay sau khi
 * thêm/xóa), còn trang danh sách để trống và hàm tự đọc `exam.candidateCount` + `exam.schedules` mà
 * query danh sách đã chọn sẵn — nhờ đó hai trang cho ra CÙNG một thanh tiến độ.
 *
 * <p>Chỉ khi thiếu cả hai nguồn mới suy ra từ status: backend chỉ cho action SCHEDULE khi đã có thí
 * sinh và mọi ca thi đã công bố (UpdateExamStatusUseCase.requireCentralizedScheduleReadiness), nên kỳ
 * thi rời khỏi DRAFT tức là đã qua cả hai bước đó.
 */
export function getExamWorkflowSteps(
  exam: ExamDto,
  papers: ExamPaperDto[],
  schedules?: Array<ExamScheduleDto | ExamScheduleStatusDto>,
  candidates?: ExamCandidateDto[],
): ExamWorkflowResult {
  const isScheduled = exam.status !== 'DRAFT' && exam.status !== 'CANCELLED'

  // `?? []` vì không phải query nào cũng chọn `members` — thiếu thì coi như chưa phân công, đừng ném.
  const members = exam.members ?? []
  const hasChair = members.some((member) => member.role === 'CHAIR')
  const hasAuthor = members.some((member) => member.role === 'AUTHOR')
  const peopleDone = hasChair && hasAuthor

  const blueprintDone = Boolean(exam.blueprintVersionId)

  const totalPapers = papers.length
  const lockedPapers = papers.filter((paper) => paper.status === 'LOCKED').length
  const papersDone = totalPapers > 0 && lockedPapers === totalPapers

  // Danh sách truyền vào thắng số đếm gắn sẵn trên exam: trang chi tiết vừa thêm/xóa thí sinh thì
  // `candidates` đã tươi trong khi `candidateCount` trong bundle còn là số cũ.
  const candidateCount = candidates?.length ?? exam.candidateCount ?? null
  const studentsDone = candidateCount === null ? isScheduled : candidateCount > 0

  // Ca đã hủy không tính vào "còn ca chưa công bố" — chúng không cản việc lên lịch ở backend.
  const activeSchedules = (schedules ?? exam.schedules)?.filter((schedule) => schedule.status !== 'CANCELLED')
  const draftSchedules = activeSchedules?.filter((schedule) => schedule.status === 'DRAFT').length ?? 0
  const publishedSchedules = activeSchedules?.filter((schedule) => schedule.status === 'PUBLISHED').length ?? 0
  const scheduleDone = activeSchedules
    ? activeSchedules.length > 0 && activeSchedules.every((schedule) => schedule.status === 'PUBLISHED')
    : isScheduled

  const done = {
    blueprint: blueprintDone,
    papers: papersDone,
    people: peopleDone,
    schedule: scheduleDone,
    students: studentsDone,
  }

  const definitions: Array<Omit<ExamWorkflowStep, 'icon' | 'state'> & { pendingIcon: ReactNode }> = [
    {
      cta: 'Phân công giáo viên',
      done: peopleDone,
      label: 'Phân công giáo viên',
      pendingIcon: <Users size={24} />,
      sublabel: peopleDone ? 'Đã phân công' : !hasChair ? 'Chưa có chủ tịch hội đồng' : 'Chưa có người ra đề',
      tab: 'people',
      todo: 'Kỳ thi cần cả chủ tịch hội đồng và người ra đề trước khi soạn đề.',
    },
    {
      cta: 'Chốt khung đề',
      done: blueprintDone,
      label: 'Chốt khung đề',
      pendingIcon: <LayoutList size={24} />,
      sublabel: blueprintDone ? 'Đã chốt' : exam.blueprintId ? 'Chờ chủ tịch hội đồng chốt phiên bản' : 'Chưa gắn blueprint',
      tab: 'blueprint',
      todo: exam.blueprintId
        ? 'Chọn phiên bản đã xuất bản để chủ tịch hội đồng chốt dùng cho kỳ thi.'
        : 'Gắn blueprint rồi chốt phiên bản dùng cho kỳ thi.',
    },
    {
      cta: 'Tạo mã đề',
      done: papersDone,
      label: 'Tạo mã đề',
      pendingIcon: <FilePenLine size={24} />,
      sublabel: totalPapers ? `${lockedPapers} / ${totalPapers} mã đề đã khóa` : 'Chưa có mã đề nào',
      tab: 'papers',
      todo: totalPapers ? `${lockedPapers}/${totalPapers} mã đề đã khóa. Duyệt và khóa các mã đề còn lại.` : 'Tạo mã đề để bắt đầu soạn.',
    },
    {
      cta: 'Thêm thí sinh',
      done: studentsDone,
      label: 'Thêm thí sinh',
      pendingIcon: <UserPlus size={24} />,
      sublabel: candidateCount === null
        ? studentsDone ? 'Đã có thí sinh' : 'Chưa có thí sinh nào'
        : candidateCount > 0 ? `${candidateCount} thí sinh` : 'Chưa có thí sinh nào',
      tab: 'students',
      todo: 'Thêm hoặc nhập thí sinh theo lớp/khối vào danh sách dự thi.',
    },
    {
      cta: 'Mở phân lịch',
      done: scheduleDone,
      label: 'Xếp lịch',
      pendingIcon: <Rocket size={24} />,
      sublabel: !activeSchedules
        ? scheduleDone ? 'Đã công bố ca thi' : 'Chưa có ca thi nào'
        : scheduleDone
          ? `${activeSchedules.length} ca thi đã công bố`
          : draftSchedules > 0
            ? `Còn ${draftSchedules} ca thi chưa công bố`
            : 'Chưa có ca thi nào',
      tab: 'schedule',
      todo: 'Tạo ca thi, gán phòng và giám thị, rồi công bố tất cả ca thi.',
    },
  ]

  const firstNotDoneIndex = definitions.findIndex((definition) => !definition.done)
  const steps: ExamWorkflowStep[] = definitions.map(({ pendingIcon, ...definition }, index) => ({
    ...definition,
    icon: definition.done ? <Check size={26} /> : pendingIcon,
    // Bước sau đã thật sự xong thì vẫn hiện xanh thay vì nói dối "upcoming".
    state: definition.done ? 'done' : index === firstNotDoneIndex ? 'current' : 'upcoming',
  }))

  return {
    completedCount: steps.filter((step) => step.done).length,
    currentStep: firstNotDoneIndex === -1 ? null : steps[firstNotDoneIndex],
    done,
    steps,
    summary: {
      candidateCount,
      lockedPaperCount: lockedPapers,
      paperCount: totalPapers,
      publishedScheduleCount: publishedSchedules,
      scheduleCount: activeSchedules?.length ?? null,
    },
    totalCount: steps.length,
  }
}

/**
 * Soi lại đúng điều kiện backend chặn action SCHEDULE của kỳ thi tập trung
 * (UpdateExamStatusUseCase.requireCentralizedScheduleReadiness) để hiện lý do ngay trên nút,
 * thay vì để quản trị trường bấm rồi ăn lỗi 400. Không thêm luật FE-only nào ngoài luật backend.
 */
export function getCentralizedScheduleReadiness(
  papers: ExamPaperDto[],
  schedules?: ExamScheduleDto[],
  candidates?: ExamCandidateDto[],
): { blockingReason: string | null; ready: boolean } {
  if (!schedules || !candidates) {
    return { blockingReason: 'Đang tải dữ liệu ca thi và thí sinh…', ready: false }
  }
  const active = schedules.filter((schedule) => schedule.status !== 'CANCELLED')
  const draftCount = active.filter((schedule) => schedule.status === 'DRAFT').length
  const blockingReason =
    active.length === 0
      ? 'Kỳ thi chưa có ca thi nào.'
      : active.some((schedule) => !schedule.schoolRoomId)
        ? 'Còn ca thi chưa được chọn phòng.'
        : active.some((schedule) => schedule.proctors.length === 0)
          ? 'Còn ca thi chưa có giám thị.'
          : candidates.length === 0
            ? 'Kỳ thi chưa có thí sinh nào.'
            : papers.length === 0
              ? 'Kỳ thi chưa có mã đề nào.'
              : draftCount > 0
                ? `Còn ${draftCount} ca thi đang ở trạng thái Bản nháp — công bố tất cả ca thi ở tab Xếp lịch trước khi lên lịch kỳ thi.`
                : null
  return { blockingReason, ready: blockingReason === null }
}
