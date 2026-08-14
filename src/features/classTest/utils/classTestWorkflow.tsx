import type { ReactNode } from 'react'
import { Calendar, Check, FilePenLine, UserPlus } from 'lucide-react'
import type { WorkflowStep } from '@/shared/ui/WorkflowStepper'
import type {
  ExamCandidateDto,
  ExamDto,
  ExamScheduleDto,
  ExamScheduleStatusDto,
} from '@/features/examCore/types'
import type { ScheduleProgress } from '@/features/examCore/utils/scheduleProgress'
import {
  formatScheduleProgressLabel,
  isScheduleCounted,
  isScheduleStepDone,
  summarizeSchedules,
} from '@/features/examCore/utils/scheduleProgress'

export type ClassTestDetailTab = 'blueprint' | 'papers' | 'schedule' | 'students'

/** `tab` là nguồn duy nhất cho cả nút "Bước tiếp theo" lẫn tab mở mặc định khi vào trang. */
type ClassTestWorkflowStep = WorkflowStep & {
  cta: string
  done: boolean
  tab: ClassTestDetailTab
  todo: string
}

/** Số liệu thô đằng sau từng bước, để chỗ gọi hiện "bài đang tới đâu" mà không tính lại. */
type ClassTestWorkflowSummary = {
  /** null khi không có cả danh sách học sinh lẫn `exam.candidateCount`. */
  candidateCount: number | null
  paperCount: number
  /** Đã trừ ca đã hủy/dời. null khi không có dữ liệu ca thi. */
  scheduleProgress: ScheduleProgress | null
  unlockedPaperCount: number
}

type ClassTestWorkflowResult = {
  completedCount: number
  /** Bước chưa xong đầu tiên; null khi đã đủ cả 3 bước. */
  currentStep: ClassTestWorkflowStep | null
  done: { papers: boolean; schedule: boolean; students: boolean }
  steps: ClassTestWorkflowStep[]
  summary: ClassTestWorkflowSummary
  totalCount: number
}

/**
 * Trang danh sách chỉ chọn `schedules { id status }` nên không có phòng/giám khảo để soi. Phân biệt
 * hai nguồn ở đây thay vì ép kiểu, để bước "Xếp lịch" biết mình đang tính bằng dữ liệu đầy đủ hay
 * chỉ bằng trạng thái ca.
 */
function isDetailedSchedules(
  schedules?: Array<ExamScheduleDto | ExamScheduleStatusDto>,
): schedules is ExamScheduleDto[] {
  return Array.isArray(schedules) && schedules.every((schedule) => 'proctors' in schedule)
}

/**
 * Soi lại đúng điều kiện backend chặn action SCHEDULE của bài trên lớp
 * (UpdateExamStatusUseCase.requireClassTestScheduleReady) để hiện lý do ngay trên nút, thay vì để
 * giáo viên bấm rồi ăn lỗi 400. Không thêm luật FE-only nào ngoài luật backend.
 */
export function getClassTestScheduleReadiness(
  schedules?: ExamScheduleDto[],
  candidates?: ExamCandidateDto[],
): { blockingReason: string | null; ready: boolean } {
  if (!schedules || !candidates) {
    return { blockingReason: 'Đang tải dữ liệu ca thi và học sinh…', ready: false }
  }
  // Ca đã hủy/dời không cản việc lên lịch ở backend nên cũng không được cản ở đây.
  const active = schedules.filter((schedule) => isScheduleCounted(schedule.status))
  const unassignedCandidates = candidates.filter((candidate) => !candidate.scheduleId).length
  const withoutPaper = candidates.filter((candidate) => !candidate.assignedPaperId).length
  const draftCount = active.filter((schedule) => schedule.status === 'DRAFT').length

  const blockingReason =
    active.length === 0
      ? 'Bài kiểm tra chưa có ca thi.'
      : active.some((schedule) => !schedule.schoolRoomId)
        ? 'Ca thi chưa được chọn phòng.'
        : active.some((schedule) => schedule.proctors.length === 0)
          ? 'Ca thi chưa có giám khảo.'
          : unassignedCandidates > 0
            ? `Còn ${unassignedCandidates} học sinh chưa được xếp vào ca thi.`
            : withoutPaper > 0
              ? `Còn ${withoutPaper} học sinh chưa được gán đề.`
              : draftCount > 0
                ? `Còn ${draftCount} ca thi đang ở trạng thái Bản nháp — công bố tất cả ca thi ở tab Xếp lịch trước khi lên lịch bài kiểm tra.`
                : null

  return { blockingReason, ready: blockingReason === null }
}

/**
 * Ba bước khớp đúng ba tab thao tác bên dưới: soạn đề → danh sách học sinh → xếp lịch. Tab
 * "Blueprint" là tuỳ chọn (bài trên lớp soạn tay được) nên cố ý không phải một bước.
 *
 * <p>`schedules`/`candidates` là optional: trang chi tiết truyền vào (dữ liệu tươi nhất, ngay sau khi
 * thêm/xóa), còn trang danh sách để trống và hàm tự đọc `exam.candidateCount` + `exam.schedules` mà
 * query danh sách đã chọn sẵn — nhờ đó hai trang cho ra CÙNG một thanh tiến độ.
 *
 * <p>Chỉ khi thiếu cả hai nguồn mới suy ra từ status: backend chỉ cho action SCHEDULE khi đã đủ ca
 * thi, học sinh và mã đề (UpdateExamStatusUseCase.requireClassTestScheduleReady), nên bài rời khỏi
 * DRAFT tức là đã qua cả ba bước.
 */
export function getClassTestWorkflowSteps(
  exam: ExamDto,
  schedules?: Array<ExamScheduleDto | ExamScheduleStatusDto>,
  candidates?: ExamCandidateDto[],
): ClassTestWorkflowResult {
  const isScheduled = exam.status !== 'DRAFT' && exam.status !== 'CANCELLED'

  // Bài trên lớp không còn tự gắn blueprint lúc tạo, và mã đề soạn tay cũng không sinh blueprint ẩn
  // nào — nên exam.blueprintId không nói được đề đã có nội dung thật hay chưa. Đếm trên câu hỏi.
  const papers = exam.papers
  const paperCount = papers.length
  // Phân đề (nhiều mã đề) yêu cầu mọi mã đề đã khoá; một mã đề thì hệ thống tự gán, không cần khoá trước.
  const unlockedPaperCount = papers.filter((paper) => paper.status !== 'LOCKED').length
  const papersDone = papers.some((paper) => paper.sections.some((section) => section.items.length > 0))

  // Danh sách truyền vào thắng số đếm gắn sẵn trên exam: trang chi tiết vừa thêm/xóa học sinh thì
  // `candidates` đã tươi trong khi `candidateCount` trong bundle còn là số cũ.
  const candidateCount = candidates?.length ?? exam.candidateCount ?? null
  const studentsDone = candidateCount === null ? isScheduled : candidateCount > 0

  const activeSchedules = (schedules ?? exam.schedules)?.filter((schedule) => isScheduleCounted(schedule.status))
  const scheduleProgress = summarizeSchedules(activeSchedules ?? [])
  const readiness =
    isDetailedSchedules(schedules) && candidates ? getClassTestScheduleReadiness(schedules, candidates) : null
  const scheduleDone = readiness
    ? readiness.ready
    : activeSchedules
      ? isScheduleStepDone(scheduleProgress)
      : isScheduled

  const done = { papers: papersDone, schedule: scheduleDone, students: studentsDone }

  const definitions: Array<Omit<ClassTestWorkflowStep, 'icon' | 'state'> & { pendingIcon: ReactNode }> = [
    {
      cta: 'Soạn đề bài',
      done: papersDone,
      label: 'Đề bài',
      pendingIcon: <FilePenLine size={24} />,
      sublabel: !papersDone
        ? 'Chưa có mã đề nào có câu hỏi'
        : paperCount > 1
          ? unlockedPaperCount > 0
            ? `${paperCount} mã đề · còn ${unlockedPaperCount} mã đề chưa khoá để phân đề`
            : `${paperCount} mã đề đã khoá, sẵn sàng phân đề`
          : 'Đã có câu hỏi trong đề',
      tab: 'papers',
      todo: 'Bấm "Thêm câu hỏi" ở tab Đề bài để soạn trực tiếp, hoặc gắn khung đề (không bắt buộc) ở tab Khung đề.',
    },
    {
      cta: 'Xem danh sách học sinh',
      done: studentsDone,
      label: 'Học sinh',
      pendingIcon: <UserPlus size={24} />,
      sublabel:
        candidateCount === null
          ? studentsDone
            ? 'Đã có học sinh'
            : 'Chưa có học sinh nào'
          : candidateCount > 0
            ? `${candidateCount} học sinh`
            : 'Chưa có học sinh nào',
      tab: 'students',
      todo: 'Học sinh của lớp được nạp sẵn khi tạo bài. Kiểm tra lại danh sách dự thi ở tab Học sinh.',
    },
    {
      cta: 'Mở tab Xếp lịch',
      done: scheduleDone,
      label: 'Xếp lịch',
      pendingIcon: <Calendar size={24} />,
      sublabel: !activeSchedules
        ? scheduleDone
          ? 'Đã công bố ca thi'
          : 'Chưa có ca thi nào'
        : scheduleDone
          ? formatScheduleProgressLabel(scheduleProgress)
          : (readiness?.blockingReason ?? formatScheduleProgressLabel(scheduleProgress)),
      tab: 'schedule',
      todo: 'Chọn phòng, phân giám khảo, xếp học sinh vào ca rồi công bố tất cả ca thi.',
    },
  ]

  const firstNotDoneIndex = definitions.findIndex((definition) => !definition.done)
  const steps: ClassTestWorkflowStep[] = definitions.map(({ pendingIcon, ...definition }, index) => ({
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
      paperCount,
      scheduleProgress: activeSchedules ? scheduleProgress : null,
      unlockedPaperCount,
    },
    totalCount: steps.length,
  }
}
