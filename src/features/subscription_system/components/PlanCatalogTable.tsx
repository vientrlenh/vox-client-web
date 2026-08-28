import { ArrowRight, Star } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { SubscriptionPlan, SubscriptionPlanListItem } from '../types'
import { formatPeriod, formatVnd, getPlanStatusDisplay } from '../types'

type PlanCatalogTableProps = {
  isLoading: boolean
  items: SubscriptionPlanListItem[]
  onArchive: (plan: SubscriptionPlan) => void
  onDeleteDraft: (plan: SubscriptionPlan) => void
  onEdit: (plan: SubscriptionPlan) => void
  onOpenDetail: (plan: SubscriptionPlan) => void
  onPublish: (plan: SubscriptionPlan) => void
  onUpdateReplacement: (plan: SubscriptionPlan) => void
  planNameById: Map<string, string>
}

const actionClassName =
  'rounded text-[13px] font-bold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-slate-300'

/**
 * Bảng chứ không phải lưới thẻ: thẻ dùng để BÁN, bảng dùng để QUẢN LÝ. Ở đây cần soi cùng lúc trạng
 * thái, chu kỳ và dây chuyền gói thay thế — và mỗi chu kỳ là một gói riêng nên số dòng nhân lên theo
 * số biến thể, thứ mà lưới thẻ không chịu được.
 *
 * Hạn mức và số trường đang dùng CỐ Ý không có ở đây: chúng đẩy bảng tràn ngang mà không giúp tìm
 * hay so gói. Xem trang chi tiết.
 */
export function PlanCatalogTable({
  isLoading,
  items,
  onArchive,
  onDeleteDraft,
  onEdit,
  onOpenDetail,
  onPublish,
  onUpdateReplacement,
  planNameById,
}: PlanCatalogTableProps) {
  if (isLoading) {
    return <p className="px-6 py-10 text-center text-sm font-bold text-slate-500">Đang tải danh sách gói...</p>
  }

  if (items.length === 0) {
    return <p className="px-6 py-10 text-center text-sm font-bold text-slate-500">Chưa có gói dịch vụ nào.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
            <th className="px-6 py-3.5">Gói</th>
            <th className="px-4 py-3.5">Chu kỳ</th>
            <th className="px-4 py-3.5 text-right">Giá</th>
            <th className="px-4 py-3.5">Trạng thái</th>
            <th className="px-6 py-3.5 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ isMostPopular, subscription: plan }) => {
            const status = getPlanStatusDisplay(plan.status)
            const replacementName = plan.replacedByPlanId
              ? planNameById.get(plan.replacedByPlanId) ?? 'gói khác'
              : null
            const isArchived = plan.status === 'ARCHIVED'

            return (
              <tr
                className={`border-b border-slate-100 last:border-b-0 ${isMostPopular ? 'bg-indigo-50/40' : ''}`}
                key={plan.id}
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-bold ${isArchived ? 'text-slate-500' : 'text-blue-950'}`}>
                        {plan.name}
                      </span>
                      {isMostPopular ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                          <Star aria-hidden="true" className="size-3 fill-current" />
                          Phổ biến
                        </span>
                      ) : null}
                    </div>
                    {replacementName ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                        <ArrowRight aria-hidden="true" className="size-3" />
                        Thay bằng {replacementName}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">
                  {formatPeriod(plan.periodType, plan.periodCount)}
                </td>
                <td className="px-4 py-4 text-right text-sm font-bold text-blue-950 tabular-nums">
                  {formatVnd(plan.priceVnd)}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge label={status.label} tone={status.tone} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-end gap-3.5">
                    <button className={actionClassName} onClick={() => onOpenDetail(plan)} type="button">
                      Chi tiết
                    </button>

                    {plan.status === 'DRAFT' ? (
                      <>
                        <button className={actionClassName} onClick={() => onPublish(plan)} type="button">
                          Xuất bản
                        </button>
                        <button
                          className="rounded text-[13px] font-bold text-red-600 transition hover:text-red-700"
                          onClick={() => onDeleteDraft(plan)}
                          type="button"
                        >
                          Xóa
                        </button>
                      </>
                    ) : null}

                    {plan.status === 'ACTIVE' ? (
                      <>
                        <button className={actionClassName} onClick={() => onEdit(plan)} type="button">
                          Sửa
                        </button>
                        <button
                          className="rounded text-[13px] font-bold text-slate-500 transition hover:text-slate-700"
                          onClick={() => onArchive(plan)}
                          type="button"
                        >
                          Ngừng bán
                        </button>
                      </>
                    ) : null}

                    {isArchived ? (
                      <button className={actionClassName} onClick={() => onUpdateReplacement(plan)} type="button">
                        Đổi gói thay thế
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
