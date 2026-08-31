import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
  Waypoints,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { shortVnDay, vnDateTime, vnDayAfterIso, vnDayStartIso } from '@/shared/lib/vnDateRange'
import {
  useGradingFailureOverviewQuery,
  useGradingFailureSessionsQuery,
  type GradingFailureGroup,
} from '../api/useGradingFailuresQuery'

const fmt = (n: number) => n.toLocaleString('vi-VN')

/**
 * Nhóm nào đang mở.
 *
 * Ba trạng thái RIÊNG BIỆT, không gộp được vào một `string | null`: chữ ký null đã là nhóm "không rõ
 * nguyên nhân" — một nhóm THẬT — nên nó không thể đồng thời mang nghĩa "chưa chọn gì" hay "đã đóng
 * hết". Gộp lại thì đóng nhóm bất kỳ sẽ mở nhóm không rõ nguyên nhân.
 */
type Selection =
  /** Chưa ai bấm gì: nhóm đông nhất mở sẵn, tính ra từ dữ liệu chứ không lưu vào state. */
  | { kind: 'auto' }
  | { kind: 'none' }
  | { kind: 'group'; signature: string | null }

function isGroupOpen(group: GradingFailureGroup, selection: Selection, groups: GradingFailureGroup[]) {
  if (selection.kind === 'none') {
    return false
  }
  if (selection.kind === 'group') {
    return selection.signature === group.signature
  }
  return groups.length > 0 && groups[0].signature === group.signature
}

function groupTitle(group: GradingFailureGroup) {
  return group.signature === null ? 'Không rõ nguyên nhân' : (group.sampleError ?? group.signature)
}

function Stat({
  hint,
  icon,
  label,
  tone = 'plain',
  value,
}: {
  hint: string
  icon: React.ReactNode
  label: string
  tone?: 'plain' | 'danger' | 'success'
  value: React.ReactNode
}) {
  const shell =
    tone === 'danger'
      ? 'border-red-200 bg-red-50'
      : 'border-slate-200 bg-white'
  const labelColor = tone === 'danger' ? 'text-red-900' : 'text-slate-700'
  const hintColor = tone === 'danger' ? 'text-red-700' : 'text-slate-400'
  const valueColor = tone === 'danger' ? 'text-red-700' : tone === 'success' ? 'text-emerald-700' : 'text-slate-900'

  return (
    <div className={`flex items-center gap-3.5 rounded-2xl border p-4.5 ${shell}`}>
      <span
        className={`flex size-9.5 shrink-0 items-center justify-center rounded-[11px] ${
          tone === 'danger'
            ? 'bg-red-100 text-red-700'
            : tone === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-indigo-50 text-indigo-700'
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-bold ${labelColor}`}>{label}</div>
        <div className={`mt-0.5 text-xs ${hintColor}`}>{hint}</div>
      </div>
      <span className={`text-[26px] font-extrabold tracking-tight tabular-nums ${valueColor}`}>{value}</span>
    </div>
  )
}

function StatusBadge({ handedOff, retryable }: { handedOff: boolean; retryable: boolean }) {
  if (handedOff) {
    return (
      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11.5px] font-bold text-violet-700">
        Đã chuyển người chấm
      </span>
    )
  }
  if (!retryable) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11.5px] font-bold text-amber-700">
        Đã công bố điểm
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-bold text-slate-600">Chưa xử lý</span>
  )
}

function SessionTable({
  dateFrom,
  dateTo,
  signature,
}: {
  dateFrom: string | null
  dateTo: string | null
  signature: string | null
}) {
  // Nơi gọi gắn `key` theo chữ ký nhóm, nên đổi nhóm là component này được dựng lại và trang tự về
  // 1 — không cần effect đồng bộ. Giữ trang 4 khi mở một nhóm chỉ có 2 trang sẽ ra bảng rỗng mà
  // không có gì giải thích.
  const [page, setPage] = useState(1)

  const { data, isError, isFetching, isLoading, refetch } = useGradingFailureSessionsQuery({
    dateFrom,
    dateTo,
    page,
    signature,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-10 text-[13.5px] text-slate-500">
        <RefreshCw aria-hidden="true" className="size-4.5 animate-spin text-indigo-600" />
        Đang tải danh sách phiên...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
        <AlertTriangle aria-hidden="true" className="size-7 text-red-500" />
        <p className="text-[13.5px] text-slate-500">Không tải được danh sách phiên.</p>
        <button
          className="text-[13.5px] font-bold text-indigo-600 underline underline-offset-2"
          onClick={() => void refetch()}
          type="button"
        >
          Thử lại
        </button>
      </div>
    )
  }

  const firstRow = (data.page - 1) * data.size + 1
  const lastRow = Math.min(data.page * data.size, data.totalElements)

  return (
    <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400">
              <th className="pb-2.5 pr-4 font-bold">Trường</th>
              <th className="pb-2.5 pr-4 font-bold">Kỳ thi</th>
              <th className="pb-2.5 pr-4 font-bold">Thí sinh</th>
              <th className="pb-2.5 pr-4 font-bold">Nộp lúc</th>
              <th className="pb-2.5 pr-4 text-center font-bold">Lần thử</th>
              <th className="pb-2.5 pr-4 font-bold">Xử lý</th>
              <th className="pb-2.5 font-bold" />
            </tr>
          </thead>
          <tbody>
            {data.content.map((session) => (
              <tr className="border-t border-slate-100 text-[13.5px] text-slate-600" key={session.sessionId}>
                <td className="py-3.5 pr-4">
                  <div className="font-bold text-slate-900">{session.schoolName ?? 'Kỳ thi hệ thống'}</div>
                  {session.schoolCode ? (
                    <div className="mt-0.5 text-[12.5px] text-slate-400 tabular-nums">{session.schoolCode}</div>
                  ) : null}
                </td>
                <td className="py-3.5 pr-4">{session.examName}</td>
                <td className="py-3.5 pr-4">{session.candidateName ?? '—'}</td>
                <td className="py-3.5 pr-4 tabular-nums">{vnDateTime(session.failedAt)}</td>
                <td className="py-3.5 pr-4 text-center font-bold tabular-nums text-amber-700">
                  {session.retryCount ?? '—'}
                </td>
                <td className="py-3.5 pr-4">
                  <StatusBadge handedOff={session.handedOff} retryable={session.retryable} />
                </td>
                <td className="py-3.5 text-right">
                  {/* Màn chi tiết phiên đã có sẵn, kèm cả hai nút Chấm lại và Chuyển người chấm --
                      không dựng lại ở đây, chỉ dẫn sang. */}
                  <Link
                    className="font-bold text-indigo-600 hover:text-indigo-700"
                    to={`/school-admin/exam-results/${session.sessionId}`}
                  >
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <span className="text-[13px] text-slate-500 tabular-nums">
            Hiện <b className="text-slate-700">{fmt(firstRow)}</b>–<b className="text-slate-700">{fmt(lastRow)}</b> trên{' '}
            <b className="text-slate-700">{fmt(data.totalElements)}</b> phiên
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={data.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Trước
            </button>
            <span className="text-[13px] font-semibold text-slate-500 tabular-nums">
              {data.page} / {data.totalPages}
            </span>
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SystemAdminGradingFailuresPage() {
  const [searchParams] = useSearchParams()

  /**
   * Khoảng thời gian ĐỌC TỪ URL và không sửa được ở đây: con số trên trang tổng quan và danh sách
   * này phải luôn nói cùng một cửa sổ. Cho đổi khoảng tại chỗ là mở đường cho hai màn hình cạnh nhau
   * hiện hai con số khác nhau mà không ai biết số nào đúng — muốn đổi thì đổi ở trang tổng quan.
   */
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const { dateFrom, dateTo } = useMemo(
    () => ({ dateFrom: vnDayStartIso(from), dateTo: vnDayAfterIso(to) }),
    [from, to],
  )

  const { data, isError, isLoading, refetch } = useGradingFailureOverviewQuery(dateFrom, dateTo)

  // Nhóm đông nhất mở sẵn: người trực vào đây để biết "một sự cố hay nghìn sự cố", và câu trả lời
  // gần như luôn nằm ở nhóm lớn nhất. Suy ra từ dữ liệu chứ không ghi vào state trong một effect --
  // ghi kiểu đó thì mỗi lần query chạy lại nền là nhóm người dùng vừa đóng lại tự bật lên.
  const [selection, setSelection] = useState<Selection>({ kind: 'auto' })

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải danh sách phiên chấm lỗi...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tải được danh sách phiên chấm lỗi.</p>
        <button
          className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
          onClick={() => void refetch()}
          type="button"
        >
          Thử lại
        </button>
      </div>
    )
  }

  const windowLabel = from && to ? `${shortVnDay(from)} – ${shortVnDay(to)}` : '14 ngày gần nhất'
  const blockedCount = data.sessionCount - data.retryableCount

  return (
    <section className="grid gap-5">
      <div className="grid gap-3">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-[13.5px] font-bold text-slate-500 hover:text-slate-700"
          to="/system-admin/dashboard"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Tổng quan hệ thống
        </Link>
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Phiên chấm lỗi</h1>
            <p className="mt-1.5 max-w-175 text-[15px] text-slate-500">
              Phiên thi AI chấm không xong. Gom theo nguyên nhân trước, vì một sự cố dịch vụ làm hỏng hàng trăm phiên
              cùng lúc — danh sách phẳng thì không đọc được.
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5">
            <Calendar aria-hidden="true" className="size-4 text-slate-400" />
            <span className="text-[12.5px] font-semibold text-slate-400">Cùng khoảng với trang tổng quan</span>
            <span className="text-[13px] font-bold text-slate-900 tabular-nums">{windowLabel}</span>
          </span>
        </div>
      </div>

      {data.sessionCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 aria-hidden="true" className="size-7" />
          </span>
          <div>
            <div className="text-base font-extrabold tracking-tight text-slate-900">Không có phiên nào chấm lỗi</div>
            <p className="mt-1.5 text-[13.5px] text-slate-500">
              Trong khoảng {windowLabel}, mọi phiên đã chấm đều thành công.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              hint="trong khoảng đã chọn"
              icon={<AlertTriangle aria-hidden="true" className="size-5" />}
              label="Phiên chấm lỗi"
              tone="danger"
              value={fmt(data.sessionCount)}
            />
            <Stat
              hint="nhóm khác nhau"
              icon={<Waypoints aria-hidden="true" className="size-5" />}
              label="Nguyên nhân"
              value={fmt(data.causeCount)}
            />
            <Stat
              hint="có phiên hỏng trong khoảng"
              icon={<Building2 aria-hidden="true" className="size-5" />}
              label="Trường bị ảnh hưởng"
              value={fmt(data.schoolCount)}
            />
            <Stat
              hint={
                blockedCount > 0 ? `${fmt(blockedCount)} kỳ đã công bố điểm` : 'mọi kỳ đều chưa công bố điểm'
              }
              icon={<RefreshCw aria-hidden="true" className="size-5" />}
              label="Chấm lại được"
              tone="success"
              value={fmt(data.retryableCount)}
            />
          </div>

          {/* Nhóm bị cắt là DẤU HIỆU CHẨN ĐOÁN, không phải chuyện phân trang: chuẩn hóa thông điệp
              lỗi mà không gom được thì số nhóm nở gần bằng số phiên, và lúc đó cả trang mất tác dụng. */}
          {data.groupsTruncated > 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <span className="text-[12.5px] leading-[18px] text-amber-900">
                Còn <b>{fmt(data.groupsTruncated)}</b> nhóm nữa không hiện ở đây. Số nhóm lớn bất thường thường nghĩa là
                thông điệp lỗi chưa gom được về cùng chữ ký, chứ không phải hệ thống đang có ngần ấy sự cố khác nhau.
              </span>
            </div>
          ) : null}

          <div className="grid gap-3.5">
            {data.groups.map((group) => {
              const open = isGroupOpen(group, selection, data.groups)
              const blocked = group.sessionCount - group.retryableCount
              return (
                <div
                  className={`overflow-hidden rounded-2xl border bg-white ${
                    open ? 'border-indigo-300' : 'border-slate-200'
                  }`}
                  key={group.signature ?? '__unknown__'}
                >
                  <button
                    aria-expanded={open}
                    className={`flex w-full flex-wrap items-center gap-3.5 px-5.5 py-4.5 text-left ${
                      open ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                    }`}
                    onClick={() =>
                      setSelection(open ? { kind: 'none' } : { kind: 'group', signature: group.signature })
                    }
                    type="button"
                  >
                    {open ? (
                      <ChevronDown aria-hidden="true" className="size-4.5 shrink-0 text-indigo-600" />
                    ) : (
                      <ChevronRight aria-hidden="true" className="size-4.5 shrink-0 text-slate-400" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2.5">
                        <span className="truncate text-base font-extrabold tracking-tight text-slate-900">
                          {groupTitle(group)}
                        </span>
                        {group.signature === null ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-bold text-slate-600">
                            KHÔNG CÓ LÝ DO ĐƯỢC LƯU
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-[13px] text-slate-500 tabular-nums">
                        {vnDateTime(group.firstFailedAt)} – {vnDateTime(group.lastFailedAt)} · {fmt(group.schoolCount)}{' '}
                        trường · {fmt(group.examCount)} kỳ thi
                      </span>
                    </span>
                    <span className="text-[26px] font-extrabold tracking-tight text-slate-900 tabular-nums">
                      {fmt(group.sessionCount)}
                    </span>
                  </button>

                  {open ? (
                    <div className="border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 px-5.5 py-3.5">
                        <Info aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
                        <span className="text-[13px] text-slate-500">
                          <b className="text-slate-700 tabular-nums">{fmt(group.retryableCount)}</b> phiên chấm lại được
                          {blocked > 0 ? (
                            <>
                              {' '}
                              — <b className="text-slate-700 tabular-nums">{fmt(blocked)}</b> phiên thuộc kỳ đã công bố
                              điểm nên bị chặn.
                            </>
                          ) : (
                            '.'
                          )}
                        </span>
                      </div>
                      <div className="px-5.5 py-4.5">
                        {/* `key` theo chữ ký: mở nhóm khác là dựng lại bảng, nên số trang tự về 1. */}
                        <SessionTable
                          dateFrom={dateFrom}
                          dateTo={dateTo}
                          key={group.signature ?? '__unknown__'}
                          signature={group.signature}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Hand-off cố ý KHÔNG đổi trạng thái phiên (xem HandOffGradingToHumanUseCase), nên phiên
              đã giao cho giáo viên vẫn nằm trong danh sách này. Cột "Xử lý" là thứ duy nhất phân biệt. */}
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <span className="text-[12.5px] leading-[17px] text-slate-500">
              Chuyển người chấm <b className="text-slate-700">không</b> gỡ phiên khỏi danh sách này — phiên vẫn ở trạng
              thái chấm lỗi vì đó là sự thật. Cột <b className="text-slate-700">Xử lý</b> là thứ duy nhất phân biệt phiên
              đã có người nhận với phiên chưa ai đụng tới.
            </span>
          </div>
        </>
      )}
    </section>
  )
}
