import { Table } from 'lucide-react'
import {
  avatarClasses,
  formatScore,
  initials,
  reviewerItemsForItem,
  type AppealItem,
  type AppealReviewer,
} from '../types'

type CompareTableProps = {
  item: AppealItem
  reviewers: AppealReviewer[]
}

/**
 * Bảng đối chiếu điểm cho MỘT phần thi: mốc hiện hành / các giám khảo / trung bình lại / Δ.
 *
 * Cột mốc là `baselineScores` của phần đó — vòng đầu là điểm AI, vòng phúc khảo sau là
 * điểm chấm tay của vòng trước, nên nhãn cột đổi theo dữ liệu chứ không cứng là "AI".
 */
export function CompareTable({ item, reviewers }: CompareTableProps) {
  const entries = reviewerItemsForItem(reviewers, item.appealItemId)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 text-[13px] font-extrabold text-slate-900">
        <Table className="size-4.5 text-cyan-700" />
        Bảng đối chiếu điểm theo tiêu chí
        {item.partLabel ? (
          <span className="font-bold text-slate-400">· {item.partLabel}</span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-140 border-collapse text-center">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-2.5 text-left text-[11px] font-extrabold uppercase text-slate-500">
                Tiêu chí
              </th>
              <th className="px-2.5 py-2.5 text-[11px] font-extrabold uppercase text-violet-600">
                Điểm hiện hành
              </th>
              {entries.map(({ reviewer }, index) => {
                const displayName = reviewer.reviewerName || `Người chấm ${index + 1}`
                return (
                  <th
                    className="px-2.5 py-2.5 text-[11px] font-extrabold text-cyan-700"
                    key={reviewer.reviewerId}
                  >
                    <div className="mx-auto flex min-w-20 max-w-28 flex-col items-center gap-1 leading-tight">
                      <span
                        className={`inline-flex size-7 items-center justify-center rounded-full text-[10px] font-bold ${avatarClasses(displayName)}`}
                      >
                        {initials(displayName)}
                      </span>
                      <span className="text-[11.5px] font-bold normal-case text-slate-700">
                        {displayName}
                      </span>
                    </div>
                  </th>
                )
              })}
              <th className="px-2.5 py-2.5 text-[11px] font-extrabold uppercase text-slate-700">
                TB lại
              </th>
              <th className="px-4 py-2.5 text-[11px] font-extrabold uppercase text-slate-500">Δ</th>
            </tr>
          </thead>
          <tbody>
            {item.baselineScores.map((c) => {
              const reviewerValues = entries
                .map(({ item: report }) => report.scores.find((s) => s.criterionId === c.criterionId))
                .map((found) => (found ? found.score : null))
                .filter((v): v is number => v != null)
              const reAvg = reviewerValues.length
                ? reviewerValues.reduce((x, y) => x + y, 0) / reviewerValues.length
                : c.score
              const delta = reAvg - c.score
              const deltaColor =
                delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-slate-400'
              return (
                <tr className="border-t border-slate-100" key={c.criterionId}>
                  <td className="px-4 py-3 text-left">
                    <div className="text-[13.5px] font-bold text-slate-700">{c.label}</div>
                    <div className="text-[11px] font-medium text-slate-400">{c.criterionCode}</div>
                  </td>
                  <td className="px-2.5 py-3 text-sm font-bold text-slate-400">
                    {formatScore(c.score)}
                  </td>
                  {entries.map(({ reviewer, item: report }) => {
                    const found = report.scores.find((s) => s.criterionId === c.criterionId)
                    return (
                      <td
                        className="px-2.5 py-3 text-sm font-bold text-slate-700"
                        key={reviewer.reviewerId}
                      >
                        {formatScore(found ? found.score : null)}
                      </td>
                    )
                  })}
                  <td className="px-2.5 py-3">
                    <span className="inline-flex h-7 min-w-10 items-center justify-center rounded-lg bg-cyan-50 px-1.5 text-sm font-extrabold text-cyan-700">
                      {formatScore(reAvg)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-extrabold ${deltaColor}`}>
                    {(delta > 0 ? '+' : '') + formatScore(delta)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
