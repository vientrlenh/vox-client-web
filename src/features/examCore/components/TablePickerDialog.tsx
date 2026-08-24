import { type ReactNode, useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'

export type TablePickerColumn<T> = {
  header: string
  render: (item: T) => ReactNode
}

type TablePickerDialogProps<T> = {
  columns: TablePickerColumn<T>[]
  emptyMessage: string
  getId: (item: T) => string
  getSelectedLabel: (item: T) => string
  initialSelectedId?: string | null
  isError?: boolean
  isLoading?: boolean
  isOpen: boolean
  items: T[]
  onClose: () => void
  onConfirm: (item: T) => void
  subtitle?: string
  title: string
}

/**
 * Modal chọn 1 item từ bảng, mirror UX "Chọn niên học" (SchoolGradePickerDialog): bấm 1 dòng để
 * chọn tạm (pending), bấm Xác nhận mới thật sự commit ra ngoài. Không có filter chip/phân trang
 * như bản niên học -- 2 nơi dùng component này (Rubric, Phiên bản) không có chiều lọc phụ nào và
 * danh sách luôn nạp hết 1 lần (query size cố định, không phân trang).
 */
export function TablePickerDialog<T>({
  columns,
  emptyMessage,
  getId,
  getSelectedLabel,
  initialSelectedId,
  isError,
  isLoading,
  isOpen,
  items,
  onClose,
  onConfirm,
  subtitle,
  title,
}: TablePickerDialogProps<T>) {
  const [pendingId, setPendingId] = useState(initialSelectedId ?? '')
  const [wasOpen, setWasOpen] = useState(isOpen)

  // Mỗi lần dialog mở lại (đóng -> mở), pending phải reset về đúng lựa chọn hiện tại của field --
  // không qua useEffect (React khuyến nghị chỉnh state theo prop ngay trong lúc render, tránh
  // render thừa 1 nhịp), mirror cách RubricPolicySelectField reset theo languageId.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setPendingId(initialSelectedId ?? '')
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const pendingItem = items.find((item) => getId(item) === pendingId) ?? null

  function handleConfirm() {
    if (pendingItem) {
      onConfirm(pendingItem)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="table-picker-title"
        className="grid max-h-[92vh] w-full max-w-2xl gap-5 overflow-y-auto rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-0 text-slate-950" id="table-picker-title">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            aria-label={`Đóng hộp thoại ${title.toLowerCase()}`}
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600" role="status">
            Đang tải...
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700" role="alert">
            Không thể tải danh sách.
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-sm font-black text-slate-950">{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                  <tr>
                    {columns.map((column) => (
                      <th className="px-4 py-3" key={column.header}>
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const id = getId(item)
                    const isPending = id === pendingId
                    return (
                      <tr
                        className={`cursor-pointer transition ${
                          isPending ? 'border-l-2 border-cyan-500 bg-cyan-50' : 'bg-white hover:bg-slate-50'
                        }`}
                        key={id}
                        onClick={() => setPendingId(id)}
                      >
                        {columns.map((column) => (
                          <td className="px-4 py-3 text-sm font-semibold text-slate-700" key={column.header}>
                            {column.render(item)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pendingItem ? (
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800">
            Đã chọn: {getSelectedLabel(pendingItem)}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!pendingId}
            onClick={handleConfirm}
            type="button"
          >
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  )
}
