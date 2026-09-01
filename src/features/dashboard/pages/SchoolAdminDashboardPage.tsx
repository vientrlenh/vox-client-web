import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Ban,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Coins,
  FileQuestion,
  Flag,
  Gavel,
  Hourglass,
  Info,
  Loader,
  Lock,
  Megaphone,
  PenLine,
  Play,
  RefreshCw,
  Repeat,
  Sparkles,
  SquarePen,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { formatVndWhole, toNumber } from '@/features/balance_school/model'
import { useAiQualityReportQuery } from '@/features/grading/api/useGradingQueries'
import type { AiQualityReport } from '@/features/grading/types'
import { daysUntil } from '@/features/subscription_school/types'
import { DateRangeFilter, type DateRangeValue } from '@/shared/ui/DateRangeFilter'
import { useExamStatusRangeQuery } from '../api/useExamStatusRangeQuery'
import { useNearestCentralizedExamQuery, type NearestCentralizedExam } from '../api/useNearestCentralizedExamQuery'
import { useQuestionBankStatsQuery, type QuestionBankStats } from '../api/useQuestionBankStatsQuery'
import { useSchoolAdminDashboardQuery, type SchoolAdminDashboard } from '../api/useSchoolAdminDashboardQuery'
import { AiCostSection } from '../components/AiCostSection'

const EXAM_STATUS = [
  { color: '#94A3B8', icon: <SquarePen aria-hidden="true" className="size-4.5" />, key: 'draft' as const, label: 'Bản nháp' },
  { color: '#4F46E5', icon: <CalendarClock aria-hidden="true" className="size-4.5" />, key: 'scheduled' as const, label: 'Đã lên lịch' },
  { color: '#F59E0B', icon: <Play aria-hidden="true" className="size-4.5" />, key: 'inProgress' as const, label: 'Đang diễn ra' },
  { color: '#06B6D4', icon: <Lock aria-hidden="true" className="size-4.5" />, key: 'closed' as const, label: 'Đã đóng' },
  { color: '#10B981', icon: <Flag aria-hidden="true" className="size-4.5" />, key: 'resultsPublished' as const, label: 'Đã công bố KQ' },
  { color: '#EF4444', icon: <Ban aria-hidden="true" className="size-4.5" />, key: 'cancelled' as const, label: 'Đã hủy' },
]

const APPEAL_STATUS = [
  { color: '#F59E0B', hot: true, icon: <Hourglass aria-hidden="true" className="size-4" />, key: 'pending' as const, label: 'Chờ xử lý' },
  { color: '#4F46E5', icon: <Loader aria-hidden="true" className="size-4" />, key: 'processing' as const, label: 'Đang xử lý' },
  { color: '#10B981', icon: <Megaphone aria-hidden="true" className="size-4" />, key: 'published' as const, label: 'Đã công bố' },
  { color: '#94A3B8', icon: <X aria-hidden="true" className="size-4" />, key: 'rejected' as const, label: 'Từ chối' },
]

const fmt = (n: number) => n.toLocaleString('vi-VN')

function formatVnd(value: number) {
  return `${fmt(value)} ₫`
}

/**
 * Dưới ngưỡng này thì hiện băng cảnh báo "sắp cạn".
 *
 * Một tỉ lệ chứ không phải một số tiền cố định: 2 triệu còn lại là thoải mái với trường 200 học sinh
 * và là sắp hết với trường 3.000 học sinh. Đây cố ý KHÔNG phải dự báo theo tốc độ tiêu — muốn nói
 * "còn đủ cho 62 bài" thì phải có mức tiêu trung bình mỗi bài, thứ backend chưa trả về.
 */
const LOW_FUNDING_RATIO = 0.15

/**
 * Băng chặn ở đầu trang, chỉ hiện khi có chuyện.
 *
 * Số dư ví âm là thứ chặn giám thị mở ca thi bằng OTP (SchoolSubscriptionDebtGuardService), và trước
 * bản này dashboard KHÔNG hiển thị số dư ở bất kỳ đâu — trường phát hiện mình bị khoá khi đã có một
 * phòng đầy học sinh ngồi chờ.
 */
function FundingBanner({ funding, onTopUp }: { funding: SchoolAdminDashboard['funding']; onTopUp: () => void }) {
  const total = toNumber(funding.examQuotaTotalVnd)
  const spendable = toNumber(funding.spendableVnd)

  if (funding.locked) {
    return (
      <div className="flex items-start gap-3.5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4.5" role="alert">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-red-100 text-red-700">
          <Lock aria-hidden="true" className="size-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold text-red-800">Trường đang bị khóa — không mở được ca thi mới</div>
          <p className="mt-1 text-[13.5px] leading-5 text-red-700">
            Chi phí AI thực tế đã tiêu hết hạn mức gói và ăn sang ví tự nạp, hiện ở{' '}
            <b className="tabular-nums">{formatVndWhole(funding.balanceVnd)}</b>. Giám thị sẽ không mở được ca thi bằng
            mã OTP cho tới khi số dư về 0.
          </p>
          <button
            className="mt-3 inline-flex h-9 items-center rounded-full bg-red-600 px-4 text-[13.5px] font-bold text-white transition hover:bg-red-700"
            onClick={onTopUp}
            type="button"
          >
            Nạp tiền vào ví
          </button>
        </div>
      </div>
    )
  }

  // Trường chưa có gói thì total = 0: tỉ lệ vô nghĩa, và hai ô hạn mức ở thẻ chi phí AI đã nói rồi.
  if (total <= 0 || spendable > total * LOW_FUNDING_RATIO) {
    return null
  }

  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4.5" role="alert">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-amber-100 text-amber-700">
        <AlertTriangle aria-hidden="true" className="size-5.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-extrabold text-amber-800">Hạn mức chấm thi sắp hết</div>
        <p className="mt-1 text-[13.5px] leading-5 text-amber-700">
          Còn <b className="tabular-nums">{formatVndWhole(funding.spendableVnd)}</b> trên tổng{' '}
          <b className="tabular-nums">{formatVndWhole(funding.examQuotaTotalVnd)}</b>. Hết hạn mức là mọi bài chấm tiếp
          theo trừ thẳng vào ví, và ví âm thì trường bị khóa mở ca thi.
        </p>
        <button
          className="mt-3 inline-flex h-9 items-center rounded-full border border-amber-300 bg-white px-4 text-[13.5px] font-bold text-amber-800 transition hover:bg-amber-100"
          onClick={onTopUp}
          type="button"
        >
          Mua thêm hạn mức
        </button>
      </div>
    </div>
  )
}

function UnscoredRow({
  count,
  hint,
  icon,
  label,
  linkTo,
  tone,
  trailing,
}: {
  count: number
  hint: string
  icon: React.ReactNode
  label: string
  linkTo?: string
  tone: 'alert' | 'plain'
  trailing?: React.ReactNode
}) {
  const body = (
    <>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${tone === 'alert' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-900">{label}</div>
        <div className="mt-0.5 text-[12.5px] text-slate-500">{hint}</div>
      </div>
      {trailing}
      <span className="w-11 shrink-0 text-right text-[22px] font-extrabold text-slate-900 tabular-nums">{count}</span>
    </>
  )

  const shell = `flex items-center gap-3.5 rounded-xl border px-4 py-3.5 ${tone === 'alert' ? 'border-red-200 bg-red-50/55' : 'border-slate-200 bg-slate-50/60'}`

  if (!linkTo) {
    return <div className={shell}>{body}</div>
  }
  return (
    <Link className={`${shell} transition hover:border-indigo-300 hover:bg-indigo-50/40`} to={linkTo}>
      {body}
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-slate-400" />
    </Link>
  )
}

/**
 * Bài đã thi xong mà học sinh chưa có điểm, chia theo thứ đang chặn.
 *
 * Bốn dòng cộng lại đúng bằng `total` — backend đảm bảo năm nhóm loại trừ nhau (hai nhóm AI gộp thành
 * một dòng ở đây).
 */
function UnscoredWorkloadCard({ unscored }: { unscored: SchoolAdminDashboard['unscored'] }) {
  if (unscored.total === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
        <h3 className="text-base font-extrabold tracking-tight text-slate-900">Bài chưa ra được điểm</h3>
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-[13.5px] font-semibold text-emerald-800">
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-emerald-600" />
          <span>Mọi bài đã thi đều đã có điểm hoặc đang được chấm đúng hạn.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Bài chưa ra được điểm</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Mỗi dòng là một thứ đang chặn, kèm việc phải làm để gỡ</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">{unscored.total}</div>
          <div className="text-[11.5px] font-semibold text-slate-500">tổng số bài</div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {unscored.aiFailed > 0 ? (
          <UnscoredRow
            count={unscored.aiFailed}
            hint="Chọn nhờ AI chấm lại, hoặc đưa vào hàng đợi giáo viên"
            icon={<AlertTriangle aria-hidden="true" className="size-4.5" />}
            label="AI chấm lỗi, chưa ai xử lý"
            linkTo="/school-admin/grading-failures"
            tone="alert"
            trailing={
              <div className="flex shrink-0 gap-1.5">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 tabular-nums">
                  {unscored.aiFailedRetryLeft} còn lượt AI
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 tabular-nums">
                  {unscored.aiFailedNoRetryLeft} chỉ còn chấm tay
                </span>
              </div>
            }
          />
        ) : null}
        {unscored.awaitingAssignment > 0 ? (
          <UnscoredRow
            count={unscored.awaitingAssignment}
            hint="Bài nằm trong hàng đợi nhưng chưa giáo viên nào nhận"
            icon={<Users aria-hidden="true" className="size-4.5" />}
            label="Đã chuyển người chấm, chưa phân công ai"
            linkTo="/school-admin/grading"
            tone="plain"
          />
        ) : null}
        {unscored.assignedOverdue > 0 ? (
          <UnscoredRow
            count={unscored.assignedOverdue}
            hint="Nhắc giáo viên, hoặc đổi người khác"
            icon={<Hourglass aria-hidden="true" className="size-4.5" />}
            label="Đã phân công nhưng quá hạn chấm"
            linkTo="/school-admin/grading"
            tone="plain"
          />
        ) : null}
        {unscored.assignedInProgress > 0 ? (
          <UnscoredRow
            count={unscored.assignedInProgress}
            hint="Đang trong hạn — chưa cần can thiệp"
            icon={<Loader aria-hidden="true" className="size-4.5" />}
            label="Đã phân công, giáo viên đang chấm"
            linkTo="/school-admin/grading"
            tone="plain"
          />
        ) : null}
      </div>

      <div className="mt-4.5 flex items-center justify-between border-t border-slate-100 pt-4 text-[13.5px] text-slate-600">
        <span>
          Thuộc <b className="text-slate-900 tabular-nums">{unscored.examCount}</b> kỳ thi
          {unscored.oldestWaitingDays !== null ? (
            <>
              {' '}
              · bài cũ nhất đã chờ <b className="text-slate-900 tabular-nums">{unscored.oldestWaitingDays} ngày</b>
            </>
          ) : null}
        </span>
        <a className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700" href="/school-admin/grading">
          Mở bảng điều phối chấm
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

/**
 * Kỳ thi đã đóng mà còn bài trống.
 *
 * Công bố điểm chặn cả `retryGradingExamSession` lẫn `handOffGradingToHuman`, nên bấm công bố lúc còn
 * bài trống là chốt sổ vĩnh viễn cho đúng những bài đó. Đây là thứ duy nhất trên trang có hạn chót
 * thật, nên nó đứng trên cả thẻ hàng đợi.
 */
function ExamsAwaitingPublishCard({ exams }: { exams: SchoolAdminDashboard['examsAwaitingPublish'] }) {
  if (exams.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-orange-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-orange-50 text-orange-700">
          <Megaphone aria-hidden="true" className="size-4.5" />
        </span>
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Kỳ thi sắp công bố điểm</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Công bố xong là đóng vĩnh viễn cả hai lối ra cho bài chưa có điểm</p>
        </div>
        <span className="ml-auto rounded-full bg-orange-100 px-3 py-1 text-[12.5px] font-extrabold text-orange-800">
          {exams.length} kỳ
        </span>
      </div>

      <div className="flex flex-col gap-3.5">
        {exams.map((exam) => (
          <div className="rounded-xl border border-slate-200 p-4.5" key={exam.examId}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold text-slate-900">{exam.name}</div>
                <div className="mt-1 text-[13px] text-slate-500">
                  {exam.code}
                  {exam.closeAt ? ` · đóng ${formatDate(exam.closeAt)}` : ''}
                </div>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-cyan-50 px-3 py-1 text-[12.5px] font-extrabold text-cyan-700">
                Đã đóng
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3.5">
                <div className="text-[22px] font-extrabold text-orange-800 tabular-nums">{exam.unscoredCount}</div>
                <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">bài chưa có điểm</div>
              </div>
              {/* Hai ô AI dẫn thẳng sang màn xử lý, ĐÃ lọc sẵn theo kỳ và theo nhóm định mức: hai
                  nhóm này cần hai hành động khác nhau nên mở chung một danh sách là bắt người dùng
                  tự lọc lại bằng mắt. */}
              <Link
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                to={`/school-admin/grading-failures?examId=${exam.examId}&allowance=retry-left`}
              >
                <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">{exam.aiFailedRetryLeft}</div>
                <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">AI lỗi, còn lượt chấm lại</div>
              </Link>
              <Link
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                to={`/school-admin/grading-failures?examId=${exam.examId}&allowance=no-retry`}
              >
                <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">{exam.aiFailedNoRetryLeft}</div>
                <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">đã dùng hết lượt AI</div>
              </Link>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
                <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">{exam.awaitingHumanGrading}</div>
                <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">đang chờ giáo viên chấm</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <AlertTriangle aria-hidden="true" className="size-4.5 shrink-0 text-orange-600" />
              <span className="flex-1 text-[13.5px] leading-5 text-slate-700">
                Bấm <b>Công bố điểm</b> khi còn {exam.unscoredCount} bài trống là chốt luôn: sau đó không chấm lại bằng
                AI được nữa, cũng không chuyển người chấm được nữa.
              </span>
              {/* Nhãn nói đúng thứ nó mở: màn kết quả liệt kê MỌI thí sinh của kỳ, không phải riêng
                  bài trống. Đường đi tới đúng bài trống là hai ô AI ở trên và bảng điều phối chấm. */}
              <Link
                className="inline-flex shrink-0 items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700"
                to={`/school-admin/exam-results?examId=${exam.examId}`}
              >
                Xem kết quả kỳ thi
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * "AI chấm lệch bao nhiêu ở trường mình", đo từ chính các vòng hậu kiểm giáo viên đã chấm.
 *
 * Với một sản phẩm mà điểm số do AI đặt, đây là con số quyết định hiệu trưởng có tin hệ thống hay
 * không — `aiQualityReport` vốn đã có từ lâu mà chưa màn hình nào dùng tới.
 */
function AiQualityCard({ isLoading, report }: { isLoading: boolean; report: AiQualityReport | undefined }) {
  const reviewed = report?.reviewed ?? 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-cyan-50 text-cyan-700">
          <Sparkles aria-hidden="true" className="size-4.5" />
        </span>
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Chất lượng chấm của AI</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Đo từ chính các vòng hậu kiểm giáo viên đã làm</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-[13.5px] text-slate-400">Đang tải...</p>
      ) : reviewed === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[13.5px] text-slate-600">
          <Info aria-hidden="true" className="size-5 shrink-0 text-slate-400" />
          <span>Chưa có vòng hậu kiểm nào hoàn thành — chưa đo được AI chấm lệch bao nhiêu.</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3.5">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
              <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">
                {report?.regradeRate === null || report?.regradeRate === undefined
                  ? '—'
                  : `${Math.round(report.regradeRate)}%`}
              </div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">bài bị sửa điểm</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
              <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">
                {report?.averageDelta == null ? '—' : report.averageDelta.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
              </div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">lệch trung bình</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
              <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">
                {report?.maxDelta == null ? '—' : report.maxDelta.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
              </div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">lệch lớn nhất</div>
            </div>
          </div>
          <div className="mt-4 text-[12.5px] text-slate-500 tabular-nums">
            {report?.regraded ?? 0} / {reviewed} bài hậu kiểm bị sửa điểm
          </div>
        </>
      )}
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mt-2 flex items-center gap-3.5">
      <span className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-slate-400">{label}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

function Kpi({
  accent,
  cta,
  icon,
  label,
  onCta,
  sub,
  tint,
  unit,
  value,
}: {
  accent?: boolean
  cta?: string
  icon: React.ReactNode
  label: string
  onCta?: () => void
  sub: React.ReactNode
  tint?: { bg: string; fg: string }
  unit?: string
  value: React.ReactNode
}) {
  return (
    <div
      className={
        accent
          ? 'flex min-h-38 flex-col rounded-2xl bg-linear-to-br from-indigo-600 to-cyan-500 p-5 text-white shadow-lg shadow-indigo-950/20'
          : 'flex min-h-38 flex-col rounded-2xl border border-slate-200 bg-white p-5'
      }
    >
      <div className="flex items-center gap-2.5">
        <span
          className={
            accent
              ? 'flex size-10 items-center justify-center rounded-[11px] bg-white/20 text-white'
              : `flex size-10 items-center justify-center rounded-[11px] ${tint?.bg} ${tint?.fg}`
          }
        >
          {icon}
        </span>
        <span className={accent ? 'text-sm font-semibold text-white/85' : 'text-sm font-semibold text-slate-500'}>{label}</span>
      </div>
      <div className={accent ? 'mt-3.5 text-4xl font-extrabold tracking-tight' : 'mt-3.5 text-4xl font-extrabold tracking-tight text-slate-900'}>
        {value}
        {unit ? <small className="ml-1 text-base font-bold text-slate-400">{unit}</small> : null}
      </div>
      <div className={accent ? 'mt-3 text-sm text-white/85' : 'mt-3 text-sm text-slate-500'}>{sub}</div>
      {cta ? (
        <button
          className="mt-auto inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-white/25"
          onClick={onCta}
          type="button"
        >
          {cta}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

function Donut({ center, segments, sub }: { center: number; segments: { color: string; label: string; value: number }[]; sub: string }) {
  const visible = segments.filter((s) => s.value > 0)
  const total = visible.reduce((s, x) => s + x.value, 0)
  const stops = total
    ? visible
        .reduce<{ acc: number; parts: string[] }>(
          (state, s) => {
            const from = (state.acc / total) * 360
            const acc = state.acc + s.value
            const to = (acc / total) * 360
            return { acc, parts: [...state.parts, `${s.color} ${from}deg ${to}deg`] }
          },
          { acc: 0, parts: [] },
        )
        .parts.join(',')
    : '#E2E8F0 0deg 360deg'

  return (
    <div className="flex items-center gap-6">
      <div className="size-40 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="m-6.5 flex size-27 flex-col items-center justify-center rounded-full bg-white">
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{fmt(center)}</div>
          <div className="mt-0.5 text-xs font-semibold text-slate-500">{sub}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3.5">
        {segments.map((s) => (
          <div className="flex items-center gap-2.5" key={s.label}>
            <span className="size-3 shrink-0 rounded-[4px]" style={{ background: s.color }} />
            <span className="text-sm font-semibold text-slate-600">{s.label}</span>
            <span className="ml-auto text-base font-extrabold text-slate-900 tabular-nums">{fmt(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatExamDateTime(value: string | null) {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('vi-VN', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' })
}

const NEAREST_EXAM_STATUS_DISPLAY: Record<NearestCentralizedExam['status'], { label: string; tone: string }> = {
  CANCELLED: { label: 'Đã hủy', tone: 'bg-red-50 text-red-700' },
  CLOSED: { label: 'Đã đóng', tone: 'bg-cyan-50 text-cyan-700' },
  DRAFT: { label: 'Bản nháp', tone: 'bg-slate-100 text-slate-600' },
  IN_PROGRESS: { label: 'Đang diễn ra', tone: 'bg-amber-50 text-amber-700' },
  RESULTS_PUBLISHED: { label: 'Đã công bố KQ', tone: 'bg-emerald-50 text-emerald-700' },
  SCHEDULED: { label: 'Đã lên lịch', tone: 'bg-indigo-50 text-indigo-700' },
}

function NearestCentralizedExamCard({ exam, isLoading }: { exam: NearestCentralizedExam | null | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-700">
            <CalendarClock aria-hidden="true" className="size-4.5" />
          </span>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Kỳ thi tập trung gần nhất</h3>
        </div>
        <p className="mt-2 text-[13.5px] text-slate-400">Đang tải...</p>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-700">
            <CalendarClock aria-hidden="true" className="size-4.5" />
          </span>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Kỳ thi tập trung gần nhất</h3>
        </div>
        <p className="mt-2 text-[13.5px] text-slate-500">Trường chưa có kỳ thi tập trung nào.</p>
      </div>
    )
  }

  const ended = exam.status === 'CLOSED' || exam.status === 'RESULTS_PUBLISHED' || (exam.closeAt ? new Date(exam.closeAt) < new Date() : false)
  const display = NEAREST_EXAM_STATUS_DISPLAY[exam.status]
  const present = Math.max(exam.totalCandidates - exam.absentCandidates, 0)
  const absentPct = exam.totalCandidates > 0 ? Math.round((exam.absentCandidates / exam.totalCandidates) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-700">
          <CalendarClock aria-hidden="true" className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Kỳ thi tập trung gần nhất</h3>
          <p className="mt-0.5 truncate text-[13px] text-slate-500">
            {exam.name} · {exam.code}
          </p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-3 py-1 text-[12.5px] font-extrabold ${ended ? 'bg-cyan-50 text-cyan-700' : display.tone}`}>
          {ended ? 'Đã kết thúc' : display.label}
        </span>
      </div>

      <div className="mb-4.5 flex items-center gap-2 text-[13.5px] text-slate-600">
        <CalendarDays aria-hidden="true" className="size-4.5 shrink-0 text-slate-400" />
        <span>
          {formatExamDateTime(exam.openAt)} – {formatExamDateTime(exam.closeAt)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
          <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">{exam.totalCandidates}</div>
          <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">Thí sinh</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
          <div className="text-[22px] font-extrabold text-emerald-700 tabular-nums">{present}</div>
          <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">Có mặt</div>
        </div>
        <div
          className={`rounded-xl border px-4 py-3.5 ${exam.absentCandidates > 0 ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-slate-50/60'}`}
        >
          <div className={`text-[22px] font-extrabold tabular-nums ${exam.absentCandidates > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {exam.absentCandidates}
          </div>
          <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">Vắng mặt{exam.totalCandidates > 0 ? ` (${absentPct}%)` : ''}</div>
        </div>
      </div>

      <div className="mt-4.5 flex items-center justify-end border-t border-slate-100 pt-4">
        <a
          className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700"
          href={`/school-admin/exams/${exam.examId}`}
        >
          Xem chi tiết kỳ thi
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

function ExamStatusCard({
  c,
  isError,
  isFetching,
  onRangeChange,
  onRetry,
  range,
}: {
  c: SchoolAdminDashboard['examStatusCounts']
  isError: boolean
  isFetching: boolean
  onRangeChange: (range: DateRangeValue) => void
  onRetry: () => void
  range: DateRangeValue
}) {
  const segments = EXAM_STATUS.map((s) => ({ color: s.color, label: s.label, value: c[s.key] }))
  const live = c.inProgress + c.scheduled

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Trạng thái kỳ thi</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Phân bố kỳ thi của trường theo trạng thái trong khoảng thời gian đã chọn</p>
        </div>
        <div className="ml-auto text-right text-[22px] font-extrabold text-slate-900 tabular-nums">
          {c.total}
          <small className="block text-[11.5px] font-semibold text-slate-500">tổng kỳ thi</small>
        </div>
      </div>
      <DateRangeFilter onChange={onRangeChange} value={range} />
      {isError ? (
        <div className="mt-4.5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          <AlertTriangle aria-hidden="true" className="size-4.5 shrink-0" />
          <span className="flex-1">Không lọc được theo khoảng thời gian này — số liệu bên dưới đang là tổng toàn thời gian.</span>
          <button className="shrink-0 font-bold underline underline-offset-2" onClick={onRetry} type="button">
            Thử lại
          </button>
        </div>
      ) : null}
      <div className={isFetching ? 'mt-4.5 opacity-50 transition-opacity' : 'mt-4.5 transition-opacity'}>
        <Donut center={c.total} segments={segments} sub="kỳ thi" />
      </div>
      <div className="mt-5.5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
          <Play aria-hidden="true" className="size-4.5 text-amber-500" />
          <span>
            <b className="text-slate-900">{live}</b> kỳ thi sắp tới & đang diễn ra
          </span>
        </div>
        <a className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700" href="/school-admin/exams">
          Quản lý kỳ thi
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

/** Quá mốc này thì ô đồng hồ chuyển màu cảnh báo. Chưa có SLA cấu hình được — xem ghi chú bàn giao. */
const APPEAL_STALE_DAYS = 7

const UNPROCESSED_APPEAL_STATUS = APPEAL_STATUS.filter((s) => s.key === 'pending' || s.key === 'processing')
const PROCESSED_APPEAL_STATUS = APPEAL_STATUS.filter((s) => s.key === 'published' || s.key === 'rejected')

function AppealStatusGroup({
  a,
  statuses,
  tone,
  total,
}: {
  a: SchoolAdminDashboard['appealStats']
  statuses: typeof APPEAL_STATUS
  tone: 'open' | 'resolved'
  total: number
}) {
  const toneClass =
    tone === 'open'
      ? { badge: 'bg-orange-100 text-orange-800', border: 'border-orange-200 bg-orange-50/40', icon: 'bg-orange-100 text-orange-700' }
      : { badge: 'bg-emerald-100 text-emerald-800', border: 'border-slate-200 bg-slate-50/60', icon: 'bg-emerald-100 text-emerald-700' }

  return (
    <div className={`rounded-[16px] border p-4 ${toneClass.border}`}>
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className={`flex size-8 items-center justify-center rounded-[10px] ${toneClass.icon}`}>
          {tone === 'open' ? <Hourglass aria-hidden="true" className="size-4" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
        </span>
        <span className="text-[13.5px] font-extrabold text-slate-800">{tone === 'open' ? 'Chưa xử lý' : 'Đã xử lý'}</span>
        <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-extrabold tabular-nums ${toneClass.badge}`}>
          {total}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {statuses.map((s) => (
          <div className="rounded-xl border border-white bg-white/70 p-3" key={s.key}>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="text-[12px] font-bold text-slate-600">{s.label}</span>
            </div>
            <div className="text-[26px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">{a[s.key]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Appeals({ a, oldestPendingDays }: { a: SchoolAdminDashboard['appealStats']; oldestPendingDays: number | null }) {
  const total = APPEAL_STATUS.reduce((s, x) => s + a[x.key], 0)
  const open = a.pending + a.processing
  const resolved = a.published + a.rejected
  const rate = resolved ? Math.round((a.published / resolved) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5" id="appeals">
      <div className="mb-4.5 flex items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Yêu cầu khiếu nại</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Phúc khảo điểm thi trong toàn trường, theo trạng thái xử lý</p>
        </div>
        <div className="ml-auto text-right text-[22px] font-extrabold text-slate-900 tabular-nums">
          {total}
          <small className="block text-[11.5px] font-semibold text-slate-500">tổng đơn</small>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <AppealStatusGroup a={a} statuses={UNPROCESSED_APPEAL_STATUS} tone="open" total={open} />
        <AppealStatusGroup a={a} statuses={PROCESSED_APPEAL_STATUS} tone="resolved" total={resolved} />
      </div>
      {/* Số ĐƠN không cho biết có đơn nào đang trễ hay không — 12 đơn nộp sáng nay và 12 đơn nộp ba
          tuần trước nhìn giống hệt nhau trên bốn ô đếm ở trên. Đồng hồ mới là thứ đáng đọc. */}
      {oldestPendingDays !== null ? (
        <div
          className={`mt-3.5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px] font-semibold ${oldestPendingDays >= APPEAL_STALE_DAYS ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50/60 text-slate-600'}`}
        >
          <Hourglass aria-hidden="true" className="size-4.5 shrink-0" />
          <span>
            Đơn chờ lâu nhất đã chờ <b className="tabular-nums">{oldestPendingDays} ngày</b>
          </span>
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-[13.5px] text-slate-600">
        <a className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700" href="/school-admin/reevaluation">
          Xử lý khiếu nại
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
          <Flag aria-hidden="true" className="size-4.5" />
          {rate}% được chấp thuận
        </span>
      </div>
    </div>
  )
}

/**
 * Chiều cao theo căn bậc hai thay vì tuyến tính: gói dịch vụ trả theo năm nên 1 tháng gia hạn
 * thường lớn hơn hẳn các tháng chỉ mua thêm token — nếu scale tuyến tính, những tháng mua thêm nhỏ
 * sẽ tụt xuống gần như bằng 0 cạnh tháng gia hạn, nhìn không phân biệt được. Căn bậc hai nén bớt
 * chênh lệch đó lại để cột nào cũng còn nhìn thấy được chiều cao thực.
 */
function spendingHeightPct(amount: number, maxAmount: number) {
  if (maxAmount <= 0) {
    return 1.5
  }
  return Math.max((Math.sqrt(amount) / Math.sqrt(maxAmount)) * 100, amount > 0 ? 4 : 1.5)
}

function SpendingChart({ monthlySpending, revenue }: { monthlySpending: SchoolAdminDashboard['monthlySpending']; revenue: number }) {
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentYear = String(now.getFullYear())

  const thisMonth = monthlySpending.find((m) => m.month === currentMonthKey)?.amount ?? 0
  const thisYear = monthlySpending.filter((m) => m.month.startsWith(currentYear)).reduce((sum, m) => sum + m.amount, 0)
  const tokenTopUpTotal = monthlySpending.reduce((sum, m) => sum + m.tokenTopUpAmount, 0)
  const max = Math.max(...monthlySpending.map((m) => m.amount), 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start justify-between gap-3.5">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-emerald-50 text-emerald-700">
            <Wallet aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-slate-900">Chi tiêu của trường</h3>
            <p className="mt-0.5 text-[13px] text-slate-500">Hóa đơn đã thanh toán theo từng tháng — gói dịch vụ & mua thêm token</p>
          </div>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500">Tháng này</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{fmt(thisMonth)} ₫</div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500">Năm nay</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{fmt(thisYear)} ₫</div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500">Tổng cộng</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{fmt(revenue)} ₫</div>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-4 text-[12.5px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: '#4F46E5' }} />
          Gói dịch vụ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: '#F59E0B' }} />
          Mua thêm token
          {tokenTopUpTotal > 0 ? <b className="text-slate-700">({fmt(tokenTopUpTotal)} ₫)</b> : null}
        </span>
      </div>

      <div className="flex h-40 items-end gap-2 border-b border-slate-100 pb-0.5">
        {monthlySpending.map((m) => {
          const [year, month] = m.month.split('-')
          const isCurrent = m.month === currentMonthKey
          const totalHeightPct = spendingHeightPct(m.amount, max)
          const tokenSharePct = m.amount > 0 ? (m.tokenTopUpAmount / m.amount) * 100 : 0

          return (
            <div className="flex flex-1 flex-col items-center justify-end gap-1.5" key={m.month}>
              <div
                className="flex w-full flex-col justify-end overflow-hidden rounded-t-[5px] transition-all"
                style={{ height: `${totalHeightPct}%` }}
                title={`Tháng ${Number(month)}/${year}: ${fmt(m.amount)} ₫ (gói ${fmt(m.subscriptionAmount)} ₫ · token ${fmt(m.tokenTopUpAmount)} ₫)`}
              >
                <div className="w-full shrink-0" style={{ background: '#F59E0B', height: `${tokenSharePct}%` }} />
                <div className={`w-full flex-1 ${isCurrent ? 'bg-linear-to-t from-indigo-600 to-cyan-500' : 'bg-indigo-200'}`} />
              </div>
              <span className={`text-[11px] font-bold ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>T{Number(month)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const QUESTION_STATUS = [
  { color: '#94A3B8', icon: <SquarePen aria-hidden="true" className="size-4.5" />, key: 'draft' as const, label: 'Bản nháp' },
  { color: '#F59E0B', icon: <Hourglass aria-hidden="true" className="size-4.5" />, key: 'submittedForReview' as const, label: 'Chờ duyệt' },
  { color: '#FB923C', icon: <PenLine aria-hidden="true" className="size-4.5" />, key: 'revisionRequested' as const, label: 'Yêu cầu chỉnh sửa' },
  { color: '#4F46E5', icon: <CheckCircle2 aria-hidden="true" className="size-4.5" />, key: 'approved' as const, label: 'Đã duyệt' },
  { color: '#EF4444', icon: <XCircle aria-hidden="true" className="size-4.5" />, key: 'rejected' as const, label: 'Bị từ chối' },
  { color: '#10B981', icon: <Megaphone aria-hidden="true" className="size-4.5" />, key: 'published' as const, label: 'Đã xuất bản' },
  { color: '#64748B', icon: <Archive aria-hidden="true" className="size-4.5" />, key: 'archived' as const, label: 'Lưu trữ' },
]

function QuestionBankStatsCard({ isLoading, stats }: { isLoading: boolean; stats: QuestionBankStats | undefined }) {
  const s = stats ?? {
    approved: 0,
    archived: 0,
    description: 0,
    draft: 0,
    longAnswer: 0,
    opinion: 0,
    published: 0,
    readAloud: 0,
    rejected: 0,
    revisionRequested: 0,
    shortAnswer: 0,
    submittedForReview: 0,
    totalQuestionBanks: 0,
    totalQuestions: 0,
  }
  const max = Math.max(...QUESTION_STATUS.map((item) => s[item.key]), 1)
  const pendingReview = s.submittedForReview + s.revisionRequested

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-700">
          <FileQuestion aria-hidden="true" className="size-4.5" />
        </span>
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Câu hỏi của trường</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Ngân hàng câu hỏi & tiến trình duyệt</p>
        </div>
        <div className="ml-auto text-right text-[22px] font-extrabold text-slate-900 tabular-nums">
          {s.totalQuestions}
          <small className="block text-[11.5px] font-semibold text-slate-500">{s.totalQuestionBanks} ngân hàng</small>
        </div>
      </div>
      <div className={isLoading ? 'flex flex-col gap-3 opacity-50 transition-opacity' : 'flex flex-col gap-3 transition-opacity'}>
        {QUESTION_STATUS.map((item) => (
          <div className="flex items-center gap-3.5" key={item.key}>
            <span className="flex w-40 shrink-0 items-center gap-1.5 text-[13px] font-semibold text-slate-600">
              {item.label}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ background: item.color, width: `${(s[item.key] / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-[15px] font-extrabold text-slate-900 tabular-nums">{s[item.key]}</span>
          </div>
        ))}
      </div>
      <div className="mt-5.5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
          <Hourglass aria-hidden="true" className="size-4.5 text-amber-500" />
          <span>
            <b className="text-slate-900">{pendingReview}</b> câu hỏi đang chờ duyệt
          </span>
        </div>
        <a className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700" href="/school-admin/questions/all">
          Quản lý câu hỏi
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

function toIsoRangeBound(date: string | null, endOfDay: boolean) {
  return date ? `${date}T${endOfDay ? '23:59:59' : '00:00:00'}Z` : null
}

export function SchoolAdminDashboardPage() {
  const user = useAppSelector((state) => state.auth.user)
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useSchoolAdminDashboardQuery()
  const [examDateRange, setExamDateRange] = useState<DateRangeValue>({ from: null, to: null })
  const { dateFrom, dateTo } = useMemo(
    () => ({ dateFrom: toIsoRangeBound(examDateRange.from, false), dateTo: toIsoRangeBound(examDateRange.to, true) }),
    [examDateRange],
  )
  const {
    data: rangedExamStatus,
    isError: isRangedExamStatusError,
    isFetching: isRangedExamStatusFetching,
    refetch: refetchRangedExamStatus,
  } = useExamStatusRangeQuery(dateFrom, dateTo)
  const { data: questionBankStats, isLoading: isQuestionBankStatsLoading } = useQuestionBankStatsQuery()
  const { data: nearestExam, isLoading: isNearestExamLoading } = useNearestCentralizedExamQuery()
  // Bỏ trống examId = toàn trường, đúng thứ trang tổng quan cần.
  const { data: aiQualityReport, isLoading: isAiQualityLoading } = useAiQualityReportQuery()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải tổng quan trường...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tải được dữ liệu tổng quan trường.</p>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700" onClick={() => refetch()} type="button">
          Thử lại
        </button>
      </div>
    )
  }

  const c = data.examStatusCounts
  const rangedCounts = rangedExamStatus ?? c
  const hasTokenSub = data.tokenAllocated > 0

  const renewal = data.subscriptionRenewal
  const renewalDaysLeft = renewal ? daysUntil(renewal.endDate) : null
  const renewalExpired = renewalDaysLeft !== null && renewalDaysLeft < 0
  const renewalUrgent = renewalDaysLeft !== null && renewalDaysLeft >= 0 && renewalDaysLeft <= 7
  const renewalTint = !renewal
    ? { bg: 'bg-slate-100', fg: 'text-slate-500' }
    : renewalExpired || renewalUrgent
      ? { bg: 'bg-red-50', fg: 'text-red-700' }
      : { bg: 'bg-indigo-50', fg: 'text-indigo-700' }

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start gap-5">
        <div>
          <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900">Tổng quan trường</h1>
          <p className="mt-1.5 max-w-160 text-[15px] text-slate-500">
            Việc đang chặn học sinh có điểm, rồi mới tới báo cáo
            {user?.email ? ` · ${user.email}` : ''}.
          </p>
        </div>
      </div>

      <FundingBanner funding={data.funding} onTopUp={() => navigate('/school-admin/balance')} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {/* "Còn chấm được" thay cho "% hạn mức đã dùng": một tỉ lệ không nói được lúc nào trường bị
            khoá, mà đó mới là câu hỏi. Ví âm KHÔNG bị trừ vào đây — backend đã áp luật đó một lần. */}
        <Kpi
          icon={<Wallet aria-hidden="true" className="size-5.5" />}
          label="Còn chấm được"
          sub={
            <span className="font-semibold text-slate-600">
              Hạn mức thi còn {formatVndWhole(data.funding.examQuotaRemainingVnd)} · ví{' '}
              <b className={data.funding.locked ? 'text-red-700' : 'text-slate-900'}>
                {formatVndWhole(data.funding.balanceVnd)}
              </b>
            </span>
          }
          tint={data.funding.locked ? { bg: 'bg-red-50', fg: 'text-red-700' } : { bg: 'bg-orange-50', fg: 'text-orange-700' }}
          value={
            <span className={data.funding.locked ? 'text-red-700' : undefined}>
              {formatVndWhole(data.funding.spendableVnd)}
            </span>
          }
        />
        <Kpi
          accent
          cta={data.unscored.total > 0 ? 'Xử lý ngay' : undefined}
          icon={<Users aria-hidden="true" className="size-5.5" />}
          label="Bài chưa có điểm"
          onCta={() => navigate('/school-admin/grading')}
          sub="Học sinh đã thi xong, chưa nhận được điểm"
          value={data.unscored.total}
        />
        {/* Số ngày của đơn CŨ NHẤT, không phải số đơn: 12 đơn nộp sáng nay và 12 đơn nộp ba tuần
            trước là hai tình huống hoàn toàn khác nhau mà một con số đếm không phân biệt được. */}
        <Kpi
          icon={<Gavel aria-hidden="true" className="size-5.5" />}
          label="Khiếu nại chờ lâu nhất"
          sub={
            <span className="font-semibold text-slate-600">
              <b className="text-slate-900 tabular-nums">{data.appealStats.pending}</b> đơn đang chờ
            </span>
          }
          tint={{ bg: 'bg-amber-50', fg: 'text-amber-700' }}
          unit={data.oldestPendingAppealDays === null ? undefined : 'ngày'}
          value={data.oldestPendingAppealDays === null ? '—' : data.oldestPendingAppealDays}
        />
      </div>

      <ExamsAwaitingPublishCard exams={data.examsAwaitingPublish} />

      <UnscoredWorkloadCard unscored={data.unscored} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <NearestCentralizedExamCard exam={nearestExam} isLoading={isNearestExamLoading} />
        <AiQualityCard isLoading={isAiQualityLoading} report={aiQualityReport} />
      </div>

      <SectionDivider label="Báo cáo" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          cta={!renewal || renewalUrgent ? (renewal ? 'Gia hạn ngay' : 'Đăng ký gói') : undefined}
          icon={<Repeat aria-hidden="true" className="size-5.5" />}
          label="Còn lại đến khi gia hạn"
          onCta={() => navigate('/school-admin/subscription')}
          sub={
            renewal ? (
              <span className="font-semibold text-slate-600">
                {renewal.planName ?? 'Gói dịch vụ'} · hết hạn <b className="text-slate-900">{formatDate(renewal.endDate)}</b>
              </span>
            ) : (
              <span className="font-semibold text-slate-600">Chưa có gói đăng ký đang hoạt động</span>
            )
          }
          tint={renewalTint}
          unit={renewal && !renewalExpired ? 'ngày' : undefined}
          value={!renewal ? '—' : renewalExpired ? 'Hết hạn' : renewalDaysLeft}
        />
        <Kpi
          icon={<Coins aria-hidden="true" className="size-5.5" />}
          label="Hạn mức chấm thi đã dùng"
          sub={<span className="font-semibold text-slate-600">{formatVnd(data.tokenUsed)} / {formatVnd(data.tokenAllocated)}</span>}
          tint={{ bg: 'bg-indigo-50', fg: 'text-indigo-700' }}
          value={hasTokenSub ? `${Math.round((data.tokenUsed / data.tokenAllocated) * 100)}%` : '—'}
        />
        <Kpi
          icon={<Play aria-hidden="true" className="size-5.5" />}
          label="Kỳ thi sắp tới & đang diễn ra"
          sub={<span className="font-semibold text-slate-600">Trên tổng {fmt(c.total)} kỳ thi của trường</span>}
          tint={{ bg: 'bg-cyan-50', fg: 'text-cyan-700' }}
          value={c.inProgress + c.scheduled}
        />
      </div>

      <ExamStatusCard
        c={rangedCounts}
        isError={isRangedExamStatusError}
        isFetching={isRangedExamStatusFetching}
        onRangeChange={setExamDateRange}
        onRetry={() => void refetchRangedExamStatus()}
        range={examDateRange}
      />

      <AiCostSection />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.35fr]">
        <Appeals a={data.appealStats} oldestPendingDays={data.oldestPendingAppealDays} />
        <QuestionBankStatsCard isLoading={isQuestionBankStatsLoading} stats={questionBankStats} />
      </div>

      <SpendingChart monthlySpending={data.monthlySpending} revenue={data.revenue} />

      <div className="text-[13px] text-slate-400">
        Chỉ tính hóa đơn ở trạng thái <b className="text-slate-600">đã trả</b>.
      </div>
    </section>
  )
}
