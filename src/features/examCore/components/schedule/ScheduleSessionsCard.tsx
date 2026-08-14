import { Megaphone, Plus, Search, Sparkles, Wand2 } from 'lucide-react'
import { ActionMenuButton, type ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatDateTime, getScheduleLabel, getScheduleStatusDisplay, type ExamScheduleDto } from '../../types'

const GRID = 'grid-cols-[1.1fr_1.6fr_90px_100px_120px_56px]'

type ScheduleSessionsCardProps = {
  canEdit: boolean
  getActions: (schedule: ExamScheduleDto) => ActionMenuItem[]
  onAutoAssignPapers?: () => void
  /** Chỉ truyền khi còn học sinh chưa xếp ca — không có việc để làm thì không hiện nút. */
  onAutoFillAllSchedules?: () => void
  onCreate: () => void
  /**
   * Chỉ truyền khi còn ca ở trạng thái Bản nháp. Công bố là thao tác vận hành nên nút này KHÔNG
   * nằm trong khối `canEdit` — kỳ thi đã bắt đầu vẫn phải công bố được ca còn sót.
   */
  onPublishAllSchedules?: () => void
  onSearchChange: (value: string) => void
  onSelect: (scheduleId: string) => void
  /** Lý do không phân đề được (chưa khóa hết mã đề) — có thì nút "Phân đề tự động" bị khóa kèm tooltip. */
  paperAssignmentBlockedReason?: string
  schedules: ExamScheduleDto[]
  search: string
  selectedScheduleId?: string
  totalCount: number
}

export function ScheduleSessionsCard({
  canEdit,
  getActions,
  onAutoAssignPapers,
  onAutoFillAllSchedules,
  onCreate,
  onPublishAllSchedules,
  onSearchChange,
  onSelect,
  paperAssignmentBlockedReason,
  schedules,
  search,
  selectedScheduleId,
  totalCount,
}: ScheduleSessionsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-extrabold text-slate-900">Danh sách ca thi</h3>
        {canEdit || onPublishAllSchedules ? (
          <div className="flex flex-wrap gap-2">
            {onPublishAllSchedules ? (
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 text-[13px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                onClick={onPublishAllSchedules}
                type="button"
              >
                <Megaphone aria-hidden="true" className="size-4" />
                Công bố tất cả ca thi
              </button>
            ) : null}
            {canEdit && onAutoFillAllSchedules ? (
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={onAutoFillAllSchedules}
                type="button"
              >
                <Wand2 aria-hidden="true" className="size-4" />
                Chia đều vào tất cả ca
              </button>
            ) : null}
            {canEdit && onAutoAssignPapers ? (
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={Boolean(paperAssignmentBlockedReason)}
                onClick={onAutoAssignPapers}
                title={paperAssignmentBlockedReason}
                type="button"
              >
                <Sparkles aria-hidden="true" className="size-4" />
                Phân đề tự động (tất cả ca)
              </button>
            ) : null}
            {canEdit ? (
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 text-[13px] font-semibold text-white transition hover:bg-indigo-700"
                onClick={onCreate}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Thêm ca thi
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-[13px] text-slate-500">
        Mỗi ca gắn với đúng một phòng thi, khung giờ và giám thị phụ trách. Chọn một ca để xếp học sinh và phân đề.
      </p>

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <div className="relative min-w-50 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm ca theo phòng…"
            value={search}
          />
        </div>
      </div>

      <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200">
        <div
          className={[
            'grid gap-2.5 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500',
            GRID,
          ].join(' ')}
        >
          <span>Phòng</span>
          <span>Thời gian</span>
          <span>Học sinh</span>
          <span>Giám thị</span>
          <span>Trạng thái</span>
          <span />
        </div>
        {schedules.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            {totalCount === 0 ? 'Chưa có ca thi nào.' : 'Không tìm thấy ca thi phù hợp.'}
          </div>
        ) : (
          schedules.map((schedule) => {
            const isUnderstaffed = schedule.proctors.length < schedule.requiredProctorCount
            const statusDisplay = getScheduleStatusDisplay(schedule.status)
            const actions = getActions(schedule)
            const isSelected = schedule.id === selectedScheduleId
            return (
              <div
                aria-current={isSelected}
                aria-label={`Chọn ${getScheduleLabel(schedule)}`}
                className={[
                  'grid cursor-pointer items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left transition',
                  GRID,
                  isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50',
                ].join(' ')}
                key={schedule.id}
                onClick={() => onSelect(schedule.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(schedule.id)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className="text-[13px] font-bold text-slate-900">{getScheduleLabel(schedule)}</span>
                <span className="text-[13px] text-slate-500">
                  {formatDateTime(schedule.startDate)} – {formatDateTime(schedule.endDate)}
                </span>
                <span className="text-[13px] text-slate-900">{schedule.candidateCount}</span>
                <span className={['text-[13px]', isUnderstaffed ? 'font-semibold text-amber-700' : 'text-slate-500'].join(' ')}>
                  {schedule.proctors.length}/{schedule.requiredProctorCount}
                </span>
                <span>
                  <StatusBadge
                    label={statusDisplay.label}
                    tone={isUnderstaffed && schedule.status === 'DRAFT' ? 'warning' : statusDisplay.tone}
                  />
                </span>
                {/* Menu render qua portal nhưng event vẫn nổi theo cây React — chặn ở đây để bấm một
                    thao tác (vd. xóa ca) không kéo theo việc chọn dòng đó. */}
                <span className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                  {actions.length ? (
                    <ActionMenuButton ariaLabel={`Thao tác cho ${getScheduleLabel(schedule)}`} items={actions} />
                  ) : null}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
