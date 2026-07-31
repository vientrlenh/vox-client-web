import { useState } from 'react'
import { Scale, Search, UsersRound, X } from 'lucide-react'
import { useAssignableTeachersQuery } from '../api/useGradingQueries'
import {
  localDateTimeToIso,
  type GradingRoundType,
  type GradingSampleSelectionMode,
} from '../types'
import { DeadlineField } from './ActionDialog'
import { RoundTypePicker } from './RoundTypePicker'
import { TeacherPickerCard } from './TeacherPickerCard'

export type AutoAssignInput = {
  deadlineAt: string | null
  percent?: number
  roundType: GradingRoundType
  selectionMode: GradingSampleSelectionMode
  teacherIds: string[]
}

type AutoAssignDialogProps = {
  examName?: string | null
  isPending?: boolean
  onCancel: () => void
  onConfirm: (input: AutoAssignInput) => void
  unassignedCount: number
}

// MANUAL_LIST không có ở đây: nó cần một danh sách bài chỉ định, mà admin chọn bài
// bằng cách tick dòng ngoài bảng rồi bấm "Phân công" — không phải qua modal này.
const SELECTION_MODES: Array<{
  hint: string
  label: string
  value: Exclude<GradingSampleSelectionMode, 'MANUAL_LIST'>
}> = [
  {
    hint: 'Giao hết bài đang ở đúng trạng thái của vòng đã chọn.',
    label: 'Toàn bộ',
    value: 'ALL',
  },
  {
    hint: 'Bốc ngẫu nhiên một tỉ lệ — dùng cho hậu kiểm theo mẫu.',
    label: 'Ngẫu nhiên N%',
    value: 'RANDOM_PERCENT',
  },
  {
    hint: 'Ưu tiên bài AI kém tự tin hoặc điểm sát ngưỡng đạt.',
    label: 'Rủi ro cao',
    value: 'RISK_BASED',
  },
]

/**
 * Chọn vòng chấm + cách chọn bài + nhóm giáo viên, rồi để BE chia đều.
 *
 * <p>BE cân theo TẢI THẬT (số phân công đang mở mỗi người đang giữ), không chia vòng
 * tròn từ 0 — nên chạy lại lần hai không dồn hết vào người đầu danh sách, và bài đã
 * có phân công đang mở bị bỏ qua.
 */
export function AutoAssignDialog({
  examName,
  isPending,
  onCancel,
  onConfirm,
  unassignedCount,
}: AutoAssignDialogProps) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [roundType, setRoundType] = useState<GradingRoundType>('INITIAL')
  const [selectionMode, setSelectionMode] = useState<GradingSampleSelectionMode>('ALL')
  const [percent, setPercent] = useState(20)
  const [deadline, setDeadline] = useState('')
  const teachersQuery = useAssignableTeachersQuery(search)
  const teachers = teachersQuery.data ?? []

  function togglePick(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  // Ước tính chỉ đúng ở chế độ ALL: hai chế độ còn lại thu hẹp tập bài theo luật của
  // BE (tỉ lệ / điểm rủi ro) nên FE không đoán được mẫu số.
  const estimateBase = selectionMode === 'ALL' ? unassignedCount : null
  const perTeacher =
    estimateBase != null && picked.length > 0 ? Math.floor(estimateBase / picked.length) : 0
  const remainder = estimateBase != null && picked.length > 0 ? estimateBase % picked.length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Phân công tự động</h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Chọn vòng chấm và tập bài{examName ? ` của ${examName}` : ''}, hệ thống chia đều cho
              nhóm giáo viên được chọn.
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <Scale className="mt-0.5 size-4.5 shrink-0 text-blue-700" />
            <span className="text-[12.5px] font-medium leading-relaxed text-blue-700">
              Hệ thống cân theo <b>số bài mỗi người đang giữ</b> (gộp cả bốn vòng), không chia đều
              từ số 0 — người đang rảnh sẽ nhận nhiều hơn. Bài đã có phân công đang mở được bỏ qua.
            </span>
          </div>

          <div className="mt-4 text-[12.5px] font-bold text-slate-600">Vòng chấm</div>
          <div className="mt-2">
            <RoundTypePicker onChange={setRoundType} value={roundType} />
          </div>

          <div className="mt-4 text-[12.5px] font-bold text-slate-600">Chọn bài thế nào</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {SELECTION_MODES.map((mode) => {
              const active = mode.value === selectionMode
              return (
                <button
                  className={[
                    'rounded-xl border px-4 py-3 text-left transition',
                    active
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                  key={mode.value}
                  onClick={() => setSelectionMode(mode.value)}
                  type="button"
                >
                  <div className="text-[13px] font-extrabold text-slate-900">{mode.label}</div>
                  <div className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500">
                    {mode.hint}
                  </div>
                </button>
              )
            })}
          </div>

          {selectionMode === 'RANDOM_PERCENT' ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="text-[12.5px] font-bold text-slate-600" htmlFor="auto-percent">
                Tỉ lệ chọn mẫu
              </label>
              <input
                className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-center text-[14px] font-extrabold text-cyan-600 outline-none focus:border-cyan-400"
                id="auto-percent"
                max={100}
                min={1}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (!Number.isNaN(next)) {
                    setPercent(Math.max(1, Math.min(100, next)))
                  }
                }}
                type="number"
                value={percent}
              />
              <span className="text-[12px] font-semibold text-slate-400">
                % số bài đủ điều kiện (1–100)
              </span>
            </div>
          ) : null}

          <DeadlineField
            hint="Áp cho toàn bộ phân công tạo ra trong lần này."
            id="auto-assign-deadline"
            label="Hạn chấm"
            onChange={setDeadline}
            value={deadline}
          />

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm giáo viên theo tên…"
              type="search"
              value={search}
            />
          </div>

          <div className="mt-4">
            {teachersQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-slate-400">Đang tải…</div>
            ) : teachers.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Không tìm thấy giáo viên phù hợp.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
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
        </div>

        <div className="border-t border-slate-200 px-6 py-5">
          {picked.length > 0 && estimateBase != null && estimateBase > 0 ? (
            <p className="mb-3 text-center text-[12.5px] font-semibold text-slate-500">
              Ước tính mỗi giáo viên nhận <b className="text-slate-900">~{perTeacher} bài</b>
              {remainder > 0 ? ` (${remainder} người nhận thêm 1 bài)` : ''}
            </p>
          ) : null}
          <div className="flex gap-2.5">
            <button
              className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              onClick={onCancel}
              type="button"
            >
              Hủy
            </button>
            <button
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-600 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={picked.length === 0 || isPending}
              onClick={() =>
                onConfirm({
                  deadlineAt: localDateTimeToIso(deadline),
                  percent: selectionMode === 'RANDOM_PERCENT' ? percent : undefined,
                  roundType,
                  selectionMode,
                  teacherIds: picked,
                })
              }
              type="button"
            >
              <UsersRound className="size-4.5" />
              Phân công {picked.length > 0 ? `cho ${picked.length} giáo viên` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
