import { useState } from 'react'
import { Search, TimerReset } from 'lucide-react'
import { useAssignableTeachersQuery } from '../api/useGradingQueries'
import { localDateTimeToIso } from '../types'
import { ActionDialog, DeadlineField } from './ActionDialog'
import { TeacherPickerCard } from './TeacherPickerCard'

export type ReclaimOverdueInputValue = {
  newDeadlineAt: string | null
  reassignToTeacherIds: string[]
}

type ReclaimOverdueDialogProps = {
  examName?: string | null
  isPending?: boolean
  onCancel: () => void
  onConfirm: (input: ReclaimOverdueInputValue) => void
  overdueCount: number
  // Số phân công admin đang tick; 0 nghĩa là thu hồi toàn bộ bài quá hạn của kỳ thi.
  selectedCount: number
}

/**
 * Thu hồi phân công quá hạn. Không chọn giáo viên thay thế thì bài chỉ quay về hàng
 * chưa giao; chọn thì BE giao lại ngay trong cùng thao tác.
 */
export function ReclaimOverdueDialog({
  examName,
  isPending,
  onCancel,
  onConfirm,
  overdueCount,
  selectedCount,
}: ReclaimOverdueDialogProps) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [deadline, setDeadline] = useState('')
  const teachersQuery = useAssignableTeachersQuery(search)
  const teachers = teachersQuery.data ?? []

  function togglePick(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  return (
    <ActionDialog
      confirmLabel={picked.length > 0 ? 'Thu hồi và giao lại' : 'Thu hồi'}
      icon={<TimerReset className="size-6" />}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() =>
        onConfirm({
          newDeadlineAt: localDateTimeToIso(deadline),
          reassignToTeacherIds: picked,
        })
      }
      subtitle={
        selectedCount > 0 ? (
          <>
            <b className="text-slate-700">{selectedCount} phân công</b> đang chọn.
          </>
        ) : (
          <>
            Toàn bộ <b className="text-slate-700">{overdueCount} phân công quá hạn</b>
            {examName ? ` của ${examName}` : ' của phạm vi đang xem'}.
          </>
        )
      }
      title="Thu hồi phân công quá hạn"
      tone="amber"
      width="lg"
    >
      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-[13px] leading-relaxed text-amber-800">
        Phân công quá hạn sẽ bị đóng lại. Nếu bạn <b>không</b> chọn giáo viên thay thế, bài quay về
        hàng chưa giao để phân công lại sau.
      </p>

      <DeadlineField
        hint="Chỉ áp dụng cho các phân công được giao lại trong lần này."
        id="reclaim-deadline"
        label="Hạn chấm mới"
        onChange={setDeadline}
        value={deadline}
      />

      <div className="mt-4 text-[12.5px] font-bold text-slate-600">
        Giao lại cho <span className="font-semibold text-slate-400">(không bắt buộc)</span>
      </div>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm giáo viên theo tên…"
          type="search"
          value={search}
        />
      </div>
      <div className="mt-3 max-h-64 overflow-y-auto">
        {teachersQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">Đang tải…</div>
        ) : teachers.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Không tìm thấy giáo viên phù hợp.
          </div>
        ) : (
          <div className="grid gap-3">
            {teachers.map((teacher) => (
              <TeacherPickerCard
                key={teacher.id}
                onToggle={() => togglePick(teacher.id)}
                selected={picked.includes(teacher.id)}
                teacher={teacher}
              />
            ))}
          </div>
        )}
      </div>
    </ActionDialog>
  )
}
