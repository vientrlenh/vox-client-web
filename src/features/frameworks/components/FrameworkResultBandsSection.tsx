import type { ReactNode } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import type { FrameworkResultBand } from '../types'
import { formatNullableText } from '../types'

type FrameworkResultBandsSectionProps = {
  canManage?: boolean
  errorMessage?: string
  // Nút phụ (VD: link "Import hàng loạt") hiển thị cạnh nút thêm thủ công.
  headerExtra?: ReactNode
  isError: boolean
  isLoading: boolean
  onAddResultBand?: () => void
  onDeleteResultBand?: (band: FrameworkResultBand) => void
  onEditResultBand?: (band: FrameworkResultBand) => void
  onRetry: () => void
  resultBands: FrameworkResultBand[]
}

export function FrameworkResultBandsSection({
  canManage = false,
  errorMessage,
  headerExtra,
  isError,
  isLoading,
  onAddResultBand,
  onDeleteResultBand,
  onEditResultBand,
  onRetry,
  resultBands,
}: FrameworkResultBandsSectionProps) {
  const sortedResultBands = [...resultBands].sort((a, b) => a.order - b.order)

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">Thang kết quả</h2>
        {canManage ? (
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
              onClick={onAddResultBand}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Thêm thang kết quả
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3 px-6 py-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              className="h-12 animate-pulse rounded-lg bg-slate-100"
              key={i}
            />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải thang kết quả.'}
          </p>
          <button
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            onClick={onRetry}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && sortedResultBands.length === 0 ? (
        <div className="flex items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chưa có thang kết quả
        </div>
      ) : null}

      {!isLoading && !isError && sortedResultBands.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-100 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Mã</th>
                <th className="px-4 py-4">Nhãn</th>
                <th className="px-4 py-4">Mô tả</th>
                <th className="px-4 py-4">Thứ tự</th>
                {canManage ? <th className="px-4 py-4" /> : null}
              </tr>
            </thead>
            <tbody>
              {sortedResultBands.map((band) => (
                <tr
                  className="border-b border-slate-100 bg-white align-top text-sm text-blue-950 last:border-b-0"
                  key={band.id}
                >
                  <td className="px-6 py-4 font-bold">
                    {formatNullableText(band.code)}
                  </td>
                  <td className="px-4 py-4 font-semibold">
                    {formatNullableText(band.label)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatNullableText(band.description)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{band.order}</td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          aria-label={`Sửa thang kết quả ${band.code}`}
                          className="inline-flex size-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          onClick={() => onEditResultBand?.(band)}
                          type="button"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          aria-label={`Xóa thang kết quả ${band.code}`}
                          className="inline-flex size-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => onDeleteResultBand?.(band)}
                          type="button"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
