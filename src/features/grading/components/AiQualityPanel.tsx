import { Bot } from 'lucide-react'
import { useAiQualityReportQuery } from '../api/useGradingQueries'
import { avatarClasses, formatPercent, formatScore, initials } from '../types'

type AiQualityPanelProps = {
  examId?: string
}

function Metric({ hint, label, value }: { hint?: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="text-[12.5px] font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[26px] font-extrabold leading-none text-slate-900">{value}</div>
      {hint ? <div className="mt-1.5 text-[11.5px] font-medium text-slate-400">{hint}</div> : null}
    </div>
  )
}

/**
 * "AI chấm lệch bao nhiêu", đo từ chính dữ liệu hậu kiểm. Mẫu số là các vòng hậu
 * kiểm ĐÃ HOÀN THÀNH — vòng chấm lần đầu không tính, vì ở đó điểm AI vốn chưa được
 * coi là chốt.
 */
export function AiQualityPanel({ examId }: AiQualityPanelProps) {
  const reportQuery = useAiQualityReportQuery(examId)
  const report = reportQuery.data

  if (reportQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-400">
        Đang tải báo cáo…
      </div>
    )
  }

  if (!report || report.reviewed === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
        Chưa có vòng hậu kiểm nào hoàn thành{examId ? ' trong kỳ thi này' : ''} — chưa đo được độ
        lệch của AI.
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-2.5 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
        <Bot className="mt-0.5 size-4.5 shrink-0 text-violet-600" />
        <span className="text-[12.5px] font-medium leading-relaxed text-violet-800">
          Số liệu tính trên <b>{report.reviewed} bài đã hậu kiểm xong</b>
          {examId ? '' : ' của toàn trường'}. Tỉ lệ sửa điểm cao nghĩa là nên tăng tỉ lệ hậu kiểm
          hoặc xem lại rubric.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          hint={`${report.upheld} giữ nguyên · ${report.invalidated} vô hiệu`}
          label="Đã hậu kiểm"
          value={String(report.reviewed)}
        />
        <Metric
          hint={`${report.regraded} bài bị sửa điểm`}
          label="Tỉ lệ sửa điểm"
          value={formatPercent(report.regradeRate)}
        />
        <Metric
          hint="Chỉ tính trên các bài bị sửa điểm"
          label="Lệch trung bình"
          value={formatScore(report.averageDelta)}
        />
        <Metric label="Lệch lớn nhất" value={formatScore(report.maxDelta)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-[12.5px] font-extrabold text-slate-700">
          Theo giáo viên hậu kiểm
        </div>
        {report.byTeacher.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">Chưa có dữ liệu.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase text-slate-500">
                    Giáo viên
                  </th>
                  <th className="px-4 py-3 text-[11px] font-extrabold uppercase text-slate-500">
                    Đã hậu kiểm
                  </th>
                  <th className="px-4 py-3 text-[11px] font-extrabold uppercase text-slate-500">
                    Sửa điểm
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase text-slate-500">
                    Lệch trung bình
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.byTeacher.map((row) => {
                  const name = row.teacherName ?? 'Không rõ'
                  return (
                    <tr className="border-b border-slate-100 last:border-b-0" key={row.teacherId ?? name}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold ${avatarClasses(name)}`}
                          >
                            {initials(name)}
                          </span>
                          <span className="text-[13px] font-bold text-slate-800">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-slate-600">
                        {row.reviewed}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-slate-600">
                        {row.regraded}
                      </td>
                      <td className="px-5 py-3 text-right text-[13px] font-extrabold text-slate-900">
                        {formatScore(row.averageDelta)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
