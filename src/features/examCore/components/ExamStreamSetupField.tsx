import { EXAM_STREAM_SETUPS, type ExamStreamSetup } from '../types'

type ExamStreamSetupFieldProps = {
  description: string
  name?: string
  onChange: (value: ExamStreamSetup) => void
  value: ExamStreamSetup
}

/**
 * Chọn mức giám sát cho bài thi — dùng chung cho 4 form: tạo/sửa kỳ thi tập trung và tạo/sửa bài
 * kiểm tra trên lớp.
 *
 * <p>`description` là prop chứ không cố định trong component vì mỗi form nói với một đối tượng khác
 * nhau (học viên / học sinh) và vì chỉ form tạo mới cần nhắc rằng đây là quyết định mặc định.
 *
 * <p>`name` phải khác nhau khi có nhiều nhóm radio cùng render trên một trang, nếu không trình
 * duyệt coi chúng là một nhóm.
 */
export function ExamStreamSetupField({ description, name = 'streamSetup', onChange, value }: ExamStreamSetupFieldProps) {
  return (
    <fieldset className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <legend className="text-sm font-bold text-slate-700">Giám sát thi</legend>
      <p className="text-xs text-slate-500">{description}</p>

      <div className="mt-1.5 grid gap-2">
        {EXAM_STREAM_SETUPS.map((option) => {
          const isSelected = value === option.value
          const isWarning = option.tone === 'warning'
          return (
            <label
              className={`grid cursor-pointer grid-cols-[auto_1fr] items-start gap-2.5 rounded-lg border bg-white p-3 transition ${
                isSelected
                  ? isWarning
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : 'border-indigo-300 ring-2 ring-indigo-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              key={option.value}
            >
              <input
                checked={isSelected}
                className="mt-0.5 accent-indigo-600"
                name={name}
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              <span className="grid gap-0.5">
                <span className="text-[13px] font-bold text-slate-900">{option.label}</span>
                <span className={`text-xs ${isWarning && isSelected ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
                  {option.hint}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
