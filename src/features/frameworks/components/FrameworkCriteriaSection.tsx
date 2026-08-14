import type { ReactNode } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import type { FrameworkCriterion, FrameworkResultBand, FrameworkSignal } from '../types'
import { formatNullableText } from '../types'

const importanceLabels: Record<string, string> = {
  HIGH: 'Cao',
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
}

function formatImportance(importance: string | null) {
  if (!importance) {
    return '-'
  }

  return importanceLabels[importance] ?? importance
}

function renderSignals(signals: { values: FrameworkSignal[] } | null) {
  if (!signals || signals.values.length === 0) {
    return <>-</>
  }

  return (
    <div className="grid gap-2">
      {signals.values.map((signal, index) => (
        <div key={`${signal.code}-${index}`}>
          <div>
            <span className="font-semibold">{signal.code}</span>
            {signal.description ? `: ${signal.description}` : ''}
            <span className="ml-1.5 text-xs font-medium text-slate-400">
              ({formatImportance(signal.importance)})
            </span>
          </div>
          {signal.evidenceHint ? (
            <div className="text-xs text-slate-400">
              Gợi ý: {signal.evidenceHint}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

type FrameworkCriterionBand = FrameworkCriterion['bands'][number]

type FrameworkCriteriaSectionProps = {
  canManage?: boolean
  criteria: FrameworkCriterion[]
  errorMessage?: string
  // Nút phụ (VD: link "Import hàng loạt") hiển thị cạnh nút thêm thủ công.
  headerExtra?: ReactNode
  isError: boolean
  isLoading: boolean
  onAddCriterion?: () => void
  onAddCriterionBand?: (criterionId: string) => void
  onDeleteCriterion?: (criterion: FrameworkCriterion) => void
  onDeleteCriterionBand?: (
    criterion: FrameworkCriterion,
    band: FrameworkCriterionBand,
  ) => void
  onEditCriterion?: (criterion: FrameworkCriterion) => void
  onEditCriterionBand?: (
    criterion: FrameworkCriterion,
    band: FrameworkCriterionBand,
  ) => void
  onRetry: () => void
  resultBands: FrameworkResultBand[]
}

export function FrameworkCriteriaSection({
  canManage = false,
  criteria,
  errorMessage,
  headerExtra,
  isError,
  isLoading,
  onAddCriterion,
  onAddCriterionBand,
  onDeleteCriterion,
  onDeleteCriterionBand,
  onEditCriterion,
  onEditCriterionBand,
  onRetry,
  resultBands,
}: FrameworkCriteriaSectionProps) {
  const sortedCriteria = [...criteria].sort((a, b) => a.order - b.order)
  const resultBandById = new Map(resultBands.map((band) => [band.id, band]))

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">Tiêu chí đánh giá</h2>
        {canManage ? (
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
              onClick={onAddCriterion}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Thêm tiêu chí
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3 px-6 py-5">
          {[1, 2, 3].map((i) => (
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
            {errorMessage ?? 'Không thể tải tiêu chí đánh giá.'}
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

      {!isLoading && !isError && sortedCriteria.length === 0 ? (
        <div className="flex items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chưa có tiêu chí đánh giá
        </div>
      ) : null}

      {!isLoading && !isError && sortedCriteria.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-120 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Mã</th>
                <th className="px-4 py-4">Tiêu chí</th>
                <th className="px-4 py-4">Mô tả</th>
                {canManage ? <th className="px-4 py-4" /> : null}
              </tr>
            </thead>
            {sortedCriteria.map((criterion) => (
              <tbody key={criterion.id}>
                <tr className="border-b border-slate-100 bg-white align-top text-sm text-blue-950">
                  <td className="px-6 py-4 font-bold">
                    {formatNullableText(criterion.code)}
                  </td>
                  <td className="px-4 py-4 font-semibold">
                    {formatNullableText(criterion.name)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatNullableText(criterion.description)}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          aria-label={`Sửa tiêu chí ${criterion.code}`}
                          className="inline-flex size-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          onClick={() => onEditCriterion?.(criterion)}
                          type="button"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          aria-label={`Xóa tiêu chí ${criterion.code}`}
                          className="inline-flex size-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => onDeleteCriterion?.(criterion)}
                          type="button"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
                {criterion.bands.length > 0 || canManage ? (
                  <tr className="border-b border-slate-100 bg-slate-50 last:border-b-0">
                    <td className="px-6 py-4" colSpan={canManage ? 4 : 3}>
                      <table className="w-full min-w-100 border-collapse text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-black text-blue-950">
                            <th className="py-2 pr-4">Thang kết quả</th>
                            <th className="px-4 py-2">Mô tả mức độ</th>
                            <th className="px-4 py-2">Dấu hiệu tích cực</th>
                            <th className="px-4 py-2">Dấu hiệu tiêu cực</th>
                            {canManage ? <th className="px-4 py-2" /> : null}
                          </tr>
                        </thead>
                        <tbody>
                          {criterion.bands.map((band) => {
                            const resultBand = resultBandById.get(
                              band.frameworkResultBandId,
                            )

                            return (
                              <tr
                                className="border-b border-slate-100 align-top text-sm text-blue-950 last:border-b-0"
                                key={band.id}
                              >
                                <td className="py-3 pr-4 font-semibold">
                                  {formatNullableText(resultBand?.label)}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {formatNullableText(band.descriptor)}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {renderSignals(band.positiveSignals)}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {renderSignals(band.negativeSignals)}
                                </td>
                                {canManage ? (
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        aria-label="Sửa mức thang kết quả"
                                        className="inline-flex size-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                                        onClick={() =>
                                          onEditCriterionBand?.(
                                            criterion,
                                            band,
                                          )
                                        }
                                        type="button"
                                      >
                                        <Pencil
                                          aria-hidden="true"
                                          className="size-4"
                                        />
                                      </button>
                                      <button
                                        aria-label="Xóa mức thang kết quả"
                                        className="inline-flex size-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                        onClick={() =>
                                          onDeleteCriterionBand?.(
                                            criterion,
                                            band,
                                          )
                                        }
                                        type="button"
                                      >
                                        <X
                                          aria-hidden="true"
                                          className="size-4"
                                        />
                                      </button>
                                    </div>
                                  </td>
                                ) : null}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {canManage ? (
                        <div className="mt-3">
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                            onClick={() => onAddCriterionBand?.(criterion.id)}
                            type="button"
                          >
                            <Plus aria-hidden="true" className="size-4" />
                            Thêm mức đánh giá
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            ))}
          </table>
        </div>
      ) : null}
    </section>
  )
}
