import { ArrowLeftRight, ArrowRight, Ban, CopyPlus, Eye, Pencil, Star, Trash2, UploadCloud } from 'lucide-react'
import { ActionMenuButton, type ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { SubscriptionPlan, SubscriptionPlanListItem } from '../types'
import { formatPeriod, formatVnd, getPlanStatusDisplay } from '../types'

type PlanCatalogTableProps = {
  isLoading: boolean
  items: SubscriptionPlanListItem[]
  onArchive: (plan: SubscriptionPlan) => void
  onCreateReplacement: (plan: SubscriptionPlan) => void
  onDeleteDraft: (plan: SubscriptionPlan) => void
  onEdit: (plan: SubscriptionPlan) => void
  onOpenDetail: (plan: SubscriptionPlan) => void
  onPublish: (plan: SubscriptionPlan) => void
  onUpdateReplacement: (plan: SubscriptionPlan) => void
  planNameById: Map<string, string>
}

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
  onCreateReplacement,
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

  /**
   * Sửa CHỈ mở cho gói nháp. UpdateSubscriptionPlanUseCase khóa sửa mọi gói đã xuất bản -- gia hạn
   * đọc giá và hạn mức LIVE từ chính gói đó, nên sửa tại chỗ là âm thầm đổi giá của trường đang dùng.
   * Muốn đổi gói đã bán thì ngừng bán rồi tạo gói mới kèm gói thay thế.
   */
  function actionsFor(plan: SubscriptionPlan): ActionMenuItem[] {
    const menuItems: ActionMenuItem[] = [
      { icon: Eye, id: 'detail', label: 'Chi tiết', onSelect: () => onOpenDetail(plan) },
    ]

    if (plan.status === 'DRAFT') {
      menuItems.push(
        { icon: Pencil, id: 'edit', label: 'Sửa', onSelect: () => onEdit(plan) },
        { icon: UploadCloud, id: 'publish', label: 'Xuất bản', onSelect: () => onPublish(plan), tone: 'primary' },
        { icon: Trash2, id: 'delete-draft', label: 'Xóa', onSelect: () => onDeleteDraft(plan), tone: 'danger' },
      )
    }

    if (plan.status === 'ACTIVE') {
      menuItems.push(
        { icon: CopyPlus, id: 'create-replacement', label: 'Tạo gói thay thế', onSelect: () => onCreateReplacement(plan) },
        { icon: Ban, id: 'archive', label: 'Ngừng bán', onSelect: () => onArchive(plan), tone: 'warning' },
      )
    }

    if (plan.status === 'ARCHIVED') {
      menuItems.push({
        icon: ArrowLeftRight,
        id: 'update-replacement',
        label: 'Đổi gói thay thế',
        onSelect: () => onUpdateReplacement(plan),
      })
    }

    return menuItems
  }

  return (
    <div className="overflow-x-auto">
      {/*
        table-fixed + bề rộng chốt cho bốn cột phụ. Để bảng tự chia (auto layout) thì bề rộng mỗi cột
        do NỘI DUNG DÀI NHẤT quyết định -- cột Gói, thứ duy nhất dùng để nhận ra dòng, sẽ bị co lại
        tùy nội dung các cột khác. Hành động giờ chỉ còn một nút "..." (ActionMenuButton) nên bề rộng
        cố định nhỏ, không đổi theo số thao tác khả dụng của từng trạng thái gói.

        Chỉ cột Gói bỏ trống bề rộng nên nó nhận toàn bộ phần dư -- tên gói là thứ đáng được giãn ra
        khi màn hình rộng, còn "12 tháng" hay một cái pill trạng thái thì không.
      */}
      <table className="w-full min-w-240 table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
            <th className="px-6 py-3.5" scope="col">Gói</th>
            <th className="w-28 px-4 py-3.5" scope="col">Chu kỳ</th>
            <th className="w-40 px-4 py-3.5 text-right" scope="col">Giá</th>
            <th className="w-32 px-4 py-3.5" scope="col">Trạng thái</th>
            <th className="w-16 px-6 py-3.5 text-right" scope="col">Hành động</th>
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
                      <span
                        className={`min-w-0 wrap-break-word text-sm font-bold ${
                          isArchived ? 'text-slate-500' : 'text-blue-950'
                        }`}
                      >
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
                  <div className="flex justify-end">
                    <ActionMenuButton ariaLabel={`Mở thao tác cho gói ${plan.name}`} items={actionsFor(plan)} />
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
