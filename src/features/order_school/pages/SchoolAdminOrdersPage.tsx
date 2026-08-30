import { useState } from 'react'
import { Link } from 'react-router'
import { Receipt } from 'lucide-react'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useMyOrdersQuery } from '../api/useOrderQueries'
import { formatDateTime, formatRemaining, formatVnd } from '../format'
import { getOrderStatusDisplay } from '../types'

const DEFAULT_PAGE = 1
const PAGE_SIZE = 20

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

export function SchoolAdminOrdersPage() {
  const [page, setPage] = useState(DEFAULT_PAGE)
  const ordersQuery = useMyOrdersQuery(page, PAGE_SIZE)

  const orders = ordersQuery.data?.content ?? []
  const totalPages = ordersQuery.data?.totalPages ?? 0

  return (
    <section aria-labelledby="school-admin-orders-title" className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black text-blue-950 sm:text-3xl" id="school-admin-orders-title">
          Đơn hàng
        </h1>
        <p className="mt-2 text-[15px] text-slate-500">
          Lịch sử đặt mua gói và nạp thêm của trường, kèm trạng thái thanh toán từng đơn.
        </p>
      </div>

      <ErrorBanner message={ordersQuery.isError ? getErrorMessage(ordersQuery.error) ?? 'Không tải được đơn hàng.' : null} />

      {ordersQuery.isLoading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm font-semibold text-slate-500">
          Đang tải đơn hàng...
        </p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Receipt aria-hidden="true" className="mx-auto size-9 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">Trường chưa có đơn hàng nào</p>
          <p className="mt-1 text-sm text-slate-500">Đơn sẽ xuất hiện ở đây sau khi bạn đăng ký hoặc gia hạn gói.</p>
          <Link
            className="mt-5 inline-flex h-11 items-center rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            to="/school-admin/subscription/plans"
          >
            Xem các gói dịch vụ
          </Link>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            {/* Cùng lý do như PlanCatalogTable: để bảng tự chia thì cột Nội dung — thứ duy nhất nhận
                ra dòng — bị các cột số ép hẹp lại, và bề rộng đổi theo từng trang. */}
            <table className="w-full min-w-200 table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                  <th className="px-6 py-3.5" scope="col">Nội dung</th>
                  <th className="w-36 px-4 py-3.5" scope="col">Ngày đặt</th>
                  <th className="w-40 px-4 py-3.5 text-right" scope="col">Số tiền</th>
                  <th className="w-48 px-4 py-3.5" scope="col">Trạng thái</th>
                  <th className="w-40 px-6 py-3.5 text-right" scope="col">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const display = getOrderStatusDisplay(order.status)
                  const remaining = order.status === 'PENDING' ? formatRemaining(order.expiresAt) : null
                  const fee = order.chargedFeeVnd ?? 0

                  return (
                    <tr
                      className={`border-b border-slate-100 last:border-b-0 ${
                        order.status === 'PENDING' ? 'bg-amber-50/40' : ''
                      }`}
                      key={order.id}
                    >
                      <td className="px-6 py-4">
                        <div className="text-[13.5px] font-bold wrap-break-word text-blue-950">
                          {order.description ?? 'Đơn hàng'}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">#{order.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-600 tabular-nums">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-[13.5px] font-bold text-blue-950 tabular-nums">
                          {formatVnd(order.totalAmountVnd)}
                        </div>
                        {fee > 0 ? (
                          <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
                            gồm phí {formatVnd(fee)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge label={display.label} tone={display.tone} />
                        {remaining ? (
                          <div className="mt-1.5 text-[11.5px] text-amber-700 tabular-nums">Còn {remaining}</div>
                        ) : null}
                        {order.invoice ? (
                          <div className="mt-1.5 font-mono text-[11px] text-slate-500">
                            {order.invoice.invoiceNumber}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          className="text-[13px] font-semibold text-indigo-600 transition hover:text-indigo-800"
                          to={`/school-admin/orders/${order.id}`}
                        >
                          {order.status === 'PENDING' ? 'Tiếp tục thanh toán' : 'Xem chi tiết'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-xs font-medium text-slate-500">
                Trang <span className="font-bold text-blue-950 tabular-nums">{page}</span> / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page <= 1 || ordersQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(DEFAULT_PAGE, current - 1))}
                  type="button"
                >
                  Trước
                </button>
                <button
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page >= totalPages || ordersQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </section>
  )
}
