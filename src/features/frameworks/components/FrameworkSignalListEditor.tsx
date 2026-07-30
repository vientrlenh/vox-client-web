import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { FrameworkSignalInput, SignalImportance } from '../types'

type FrameworkSignalListEditorProps = {
  disabled?: boolean
  onChange: (signals: FrameworkSignalInput[]) => void
  signals: FrameworkSignalInput[]
}

const emptyForm = {
  code: '',
  description: '',
  evidenceHint: '',
  importance: 'MEDIUM' as SignalImportance,
}

export function FrameworkSignalListEditor({
  disabled,
  onChange,
  signals,
}: FrameworkSignalListEditorProps) {
  const [form, setForm] = useState(emptyForm)

  function handleAdd() {
    if (!form.code.trim() || !form.description.trim()) {
      return
    }

    onChange([
      ...signals,
      {
        code: form.code.trim(),
        description: form.description.trim(),
        evidenceHint: form.evidenceHint.trim() || null,
        importance: form.importance,
      },
    ])
    setForm(emptyForm)
  }

  function handleRemove(index: number) {
    onChange(signals.filter((_, i) => i !== index))
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5">
        {signals.map((signal, index) => (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
            key={`${signal.code}-${index}`}
          >
            {signal.code}: {signal.description}
            {!disabled ? (
              <button
                aria-label={`Xóa dấu hiệu ${signal.code}`}
                className="text-slate-400 hover:text-red-600"
                onClick={() => handleRemove(index)}
                type="button"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            ) : null}
          </span>
        ))}
      </div>

      {!disabled ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            className="h-8 w-20 rounded border border-slate-200 px-2 text-xs font-medium text-blue-950 outline-none focus:border-indigo-500"
            onChange={(event) =>
              setForm((current) => ({ ...current, code: event.target.value }))
            }
            placeholder="Mã"
            value={form.code}
          />
          <input
            className="h-8 min-w-32 flex-1 rounded border border-slate-200 px-2 text-xs font-medium text-blue-950 outline-none focus:border-indigo-500"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Mô tả"
            value={form.description}
          />
          <select
            className="h-8 rounded border border-slate-200 px-1 text-xs font-medium text-blue-950 outline-none focus:border-indigo-500"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                importance: event.target.value as SignalImportance,
              }))
            }
            value={form.importance}
          >
            <option value="HIGH">Cao</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp</option>
          </select>
          <input
            className="h-8 min-w-28 flex-1 rounded border border-slate-200 px-2 text-xs font-medium text-blue-950 outline-none focus:border-indigo-500"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                evidenceHint: event.target.value,
              }))
            }
            placeholder="Gợi ý minh chứng"
            value={form.evidenceHint}
          />
          <button
            aria-label="Thêm dấu hiệu"
            className="inline-flex size-8 items-center justify-center rounded border border-slate-200 text-indigo-700 hover:bg-indigo-50"
            onClick={handleAdd}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
