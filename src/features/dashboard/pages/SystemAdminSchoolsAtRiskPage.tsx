import { useState } from 'react'
import { AlertTriangle, ArrowLeft, Ban, CircleX, Clock, RefreshCw, Search, Wallet } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import {
  isSchoolRiskBucket,
  useSchoolsAtRiskQuery,
  type SchoolAtRisk,
  type SchoolRiskBucket,
  type SchoolRiskBucketCounts,
} from '../api/useSchoolsAtRiskQuery'

const fmt = (n: number) => n.toLocaleString('vi-VN')

function formatVnd(value: number) {
  return `${fmt(value)} ₫`
}

/** ISO instant từ BE -> ngày lịch Việt Nam. */
function vnDate(iso: string | null) {
  if (!iso) {
    return '—'
  }
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }
  return parsed.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
  })
}

/**
 * Số ngày còn lại tới khi hết hạn, theo NGÀY LỊCH giờ Việt Nam.
 *
 * Đếm theo ngày lịch chứ không phải elapsed/24h: gói hết hạn 8h sáng mai mà bây giờ là 9h tối thì
 * người vận hành đọc là "còn 1 ngày", trong khi phép chia cho 24 giờ trả về 0 và thành "hết hạn hôm
 * nay".
 */
function daysLeft(iso: string | null) {
  if (!iso) {
    return null
  }
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) {
    return null
  }
  const toVnDay = (date: Date) => Date.parse(`${date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })}T00:00:00Z`)
  return Math.round((toVnDay(end) - toVnDay(new Date())) / 86_400_000)
}

type BucketMeta = {
  countKey: keyof SchoolRiskBucketCounts
  hint: string
  icon: React.ReactNode
  label: string
  tint: { bg: string; fg: string }
  /** Tiêu đề bảng khi nhóm này đang mở. */
  tableHint: string
}

const BUCKETS: Record<SchoolRiskBucket, BucketMeta> = {
  EXPIRING_SOON: {
    countKey: 'expiringSoon',
    hint: '≤ 30 ngày',
    icon: <Clock aria-hidden="true" className="size-4.5" />,
    label: 'Sắp hết hạn',
    tableHint: 'Xếp theo ngày hết hạn gần nhất trước',
    tint: { bg: 'bg-amber-100', fg: 'text-amber-700' },
  },
  LAPSED: {
    countKey: 'lapsed',
    hint: 'không còn kỳ nào phủ',
    icon: <CircleX aria-hidden="true" className="size-4.5" />,
    label: 'Đã hết hạn',
    tableHint: 'Kỳ gần nhất đã kết thúc, trường chưa gia hạn',
    tint: { bg: 'bg-red-100', fg: 'text-red-700' },
  },
  SUSPENDED: {
    countKey: 'suspended',
    hint: 'mất quyền dùng ngay',
    icon: <Ban aria-hidden="true" className="size-4.5" />,
    label: 'Bị đình chỉ',
    tableHint: 'Lý do đình chỉ là thứ cần đọc trước khi gọi cho trường',
    tint: { bg: 'bg-slate-100', fg: 'text-slate-600' },
  },
  IN_DEBT: {
    countKey: 'inDebt',
    hint: 'bị chặn mở ca thi',
    icon: <Wallet aria-hidden="true" className="size-4.5" />,
    label: 'Đang nợ hạn mức',
    tableHint: 'Ví tự nạp âm — trường không mở được ca thi cho tới khi ví về 0',
    tint: { bg: 'bg-orange-100', fg: 'text-orange-700' },
  },
}

const BUCKET_ORDER: SchoolRiskBucket[] = ['EXPIRING_SOON', 'LAPSED', 'SUSPENDED', 'IN_DEBT']

function ExpiryCell({ endDate }: { endDate: string | null }) {
  const left = daysLeft(endDate)
  const tone =
    left === null ? '' : left <= 7 ? 'bg-red-50 text-red-600' : left <= 30 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'

  return (
    <>
      <span className="font-semibold text-slate-700 tabular-nums">{vnDate(endDate)}</span>
      {left === null ? null : (
        <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11.5px] font-extrabold tabular-nums ${tone}`}>
          {left < 0 ? `quá ${fmt(-left)} ngày` : left === 0 ? 'hết hạn hôm nay' : `còn ${fmt(left)} ngày`}
        </span>
      )}
    </>
  )
}

function SchoolRow({ bucket, school }: { bucket: SchoolRiskBucket; school: SchoolAtRisk }) {
  return (
    <tr className="border-t border-slate-100 text-[13.5px] text-slate-600">
      <td className="py-3.5 pr-4">
        <div className="font-bold text-slate-900">{school.schoolName}</div>
        <div className="mt-0.5 text-[12.5px] text-slate-400 tabular-nums">{school.schoolCode}</div>
      </td>
      <td className="py-3.5 pr-4">{school.planName ?? '—'}</td>
      {bucket === 'SUSPENDED' ? (
        <td className="py-3.5 pr-4">
          {/* Cột đáng giá nhất của tab này: không có lý do thì danh sách chỉ là bốn cái tên. */}
          {school.suspendedReason ? (
            <span className="text-slate-700">{school.suspendedReason}</span>
          ) : (
            <span className="text-slate-400">Không ghi lý do</span>
          )}
        </td>
      ) : (
        <td className="py-3.5 pr-4">
          <ExpiryCell endDate={school.relevantEndDate} />
        </td>
      )}
      <td
        className={`py-3.5 pr-4 text-right font-bold tabular-nums ${
          school.balanceVnd < 0 ? 'text-red-600' : 'text-slate-700'
        }`}
      >
        {formatVnd(school.balanceVnd)}
      </td>
      <td className="py-3.5 text-right">
        {/* Trang chi tiết trường CHƯA TỒN TẠI (system-admin/schools/:id). Cho tới lúc đó, chỗ gần
            nhất xem được gói và kỳ của một trường là màn "Trường & gói", lọc sẵn theo tên. */}
        <Link
          className="font-bold text-indigo-600 hover:text-indigo-700"
          to={`/system-admin/subscription/schools?keyword=${encodeURIComponent(school.schoolName)}`}
        >
          Chi tiết
        </Link>
      </td>
    </tr>
  )
}

export function SystemAdminSchoolsAtRiskPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const bucketParam = searchParams.get('bucket')
  const bucket: SchoolRiskBucket = isSchoolRiskBucket(bucketParam) ? bucketParam : 'EXPIRING_SOON'

  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const { data, isError, isFetching, isLoading, refetch } = useSchoolsAtRiskQuery({ bucket, keyword, page })

  function selectBucket(next: SchoolRiskBucket) {
    // Nhóm nằm trên URL để link từ trang tổng quan mở thẳng đúng tab, và để F5 không nhảy về tab đầu.
    setSearchParams({ bucket: next })
    setPage(1)
    setKeyword('')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải danh sách trường cần chú ý...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tải được danh sách trường cần chú ý.</p>
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

  const meta = BUCKETS[bucket]
  const { content, totalElements, totalPages } = data.schools
  const firstRow = (data.schools.page - 1) * data.schools.size + 1
  const lastRow = Math.min(data.schools.page * data.schools.size, totalElements)

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
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Trường cần chú ý</h1>
          <p className="mt-1.5 max-w-170 text-[15px] text-slate-500">
            Gói dịch vụ sắp rụng và công nợ đang chặn ca thi. Mỗi thẻ bên dưới là một danh sách riêng.
          </p>
        </div>
      </div>

      {/* Bốn thẻ lọc trên CÙNG một trang, không phải bốn trang: chúng chỉ khác nhau ở bộ lọc. */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {BUCKET_ORDER.map((key) => {
          const item = BUCKETS[key]
          const active = key === bucket
          return (
            <button
              aria-pressed={active}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                active ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
              key={key}
              onClick={() => selectBucket(key)}
              type="button"
            >
              <span
                className={`flex size-9.5 shrink-0 items-center justify-center rounded-[11px] ${item.tint.bg} ${item.tint.fg}`}
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] font-bold ${active ? 'text-indigo-900' : 'text-slate-700'}`}>
                  {item.label}
                </span>
                <span className={`mt-0.5 block text-xs ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {item.hint}
                </span>
              </span>
              <span
                className={`text-[26px] font-extrabold tracking-tight tabular-nums ${
                  active ? 'text-indigo-900' : 'text-slate-900'
                }`}
              >
                {fmt(data.counts[item.countKey])}
              </span>
            </button>
          )
        })}
      </div>

      {/* Cùng lời cảnh báo với thẻ trên trang tổng quan, vì đây là cùng bốn con số đó. */}
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
        <span className="text-[12.5px] leading-[17px] text-slate-500">
          Ba nhóm đầu loại trừ nhau; <b className="text-slate-700">đang nợ hạn mức</b> chồng lấn cả ba, nên đừng cộng
          bốn số lại. Trường chưa từng mua gói nào không nằm trong nhóm nào.
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="mb-4 flex flex-wrap items-center gap-3.5">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">{meta.label}</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">{meta.tableHint}</p>
          </div>
          <label className="ml-auto flex min-w-60 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
            <input
              className="w-full border-none text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo tên hoặc mã trường"
              value={keyword}
            />
          </label>
        </div>

        {totalElements === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-slate-500">
            {keyword.trim() ? 'Không có trường nào khớp từ khóa.' : `Không có trường nào ở nhóm "${meta.label}".`}
          </p>
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-2.5 pr-4">Trường</th>
                    <th className="pb-2.5 pr-4">Gói dịch vụ</th>
                    <th className="pb-2.5 pr-4">{bucket === 'SUSPENDED' ? 'Lý do đình chỉ' : 'Hết hạn vào'}</th>
                    <th className="pb-2.5 pr-4 text-right">Số dư ví</th>
                    <th className="pb-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {content.map((school) => (
                    <SchoolRow bucket={bucket} key={school.schoolId} school={school} />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <span className="text-[13px] text-slate-500 tabular-nums">
                  Hiện <b className="text-slate-700">{fmt(firstRow)}</b>–<b className="text-slate-700">{fmt(lastRow)}</b>{' '}
                  trên <b className="text-slate-700">{fmt(totalElements)}</b> trường
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                    disabled={data.schools.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    Trước
                  </button>
                  <span className="text-[13px] font-semibold text-slate-500 tabular-nums">
                    {data.schools.page} / {totalPages}
                  </span>
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                    disabled={data.schools.page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                  >
                    Sau
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
