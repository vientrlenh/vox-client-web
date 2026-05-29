import type { ReactNode } from 'react'
import { Check, Eye, X } from 'lucide-react'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import type { RegisterForm } from '../types'
import { formatNullableText } from '../types'
import { RegistrationStatusBadge } from './RegistrationStatusBadge'

type RegistrationTableProps = {
  errorMessage?: string
  footer?: ReactNode
  forms: RegisterForm[]
  isActionPending?: boolean
  isError: boolean
  isLoading: boolean
  onApprove: (form: RegisterForm) => void
  onReject: (form: RegisterForm) => void
  onRetry: () => void
  onSelect: (id: string) => void
  selectedId: string | null
}

function canDecideRegisterForm(status?: string | null) {
  const normalized = status?.trim().toUpperCase() ?? ''

  return normalized === 'PENDING' || normalized === 'WAITING'
}

export function RegistrationTable({
  errorMessage,
  footer,
  forms,
  isActionPending = false,
  isError,
  isLoading,
  onApprove,
  onReject,
  onRetry,
  onSelect,
  selectedId,
}: RegistrationTableProps) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">
          Danh sách đơn đăng ký
        </h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải danh sách đơn đăng ký...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải danh sách đơn đăng ký.'}
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

      {!isLoading && !isError && forms.length === 0 ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chưa có đơn đăng ký
        </div>
      ) : null}

      {!isLoading && !isError && forms.length > 0 ? (
        <div className="min-h-80 flex-1 overflow-x-auto">
          <table className="w-full min-w-210 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Người liên hệ</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Số điện thoại</th>
                <th className="px-4 py-4">Tên trường</th>
                <th className="px-4 py-4">Chức vụ</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => {
                const isSelected = form.id === selectedId
                const canDecide = canDecideRegisterForm(form.status)
                const decisionDisabledReason = isActionPending
                  ? 'Đang xử lý thao tác trước đó'
                  : canDecide
                    ? undefined
                    : 'Chỉ có thể xử lý đơn đăng ký đang chờ duyệt'

                return (
                  <tr
                    className={[
                      'border-b border-slate-100 align-top text-sm text-blue-950 last:border-b-0',
                      isSelected ? 'bg-indigo-50/50' : 'bg-white',
                    ].join(' ')}
                    key={form.id}
                  >
                    <td className="px-6 py-5 font-bold">
                      {formatNullableText(form.contactFullName)}
                    </td>
                    <td className="max-w-44 wrap-break-word px-4 py-5">
                      {formatNullableText(form.contactEmail)}
                    </td>
                    <td className="px-4 py-5">
                      {formatNullableText(form.contactPhone)}
                    </td>
                    <td className="px-4 py-5">
                      {formatNullableText(form.schoolName)}
                    </td>
                    <td className="px-4 py-5">
                      {formatNullableText(form.position)}
                    </td>
                    <td className="px-4 py-5">
                      <RegistrationStatusBadge status={form.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <ActionMenuButton
                          ariaLabel={`Mở hành động cho ${formatNullableText(
                            form.contactFullName,
                          )}`}
                          items={[
                            {
                              icon: Eye,
                              id: 'view',
                              label: 'Xem chi tiết',
                              onSelect: () => onSelect(form.id),
                              tone: 'primary',
                            },
                            {
                              disabled: Boolean(decisionDisabledReason),
                              disabledReason: decisionDisabledReason,
                              icon: Check,
                              id: 'approve',
                              label: 'Duyệt',
                              onSelect: () => onApprove(form),
                              tone: 'success',
                            },
                            {
                              disabled: Boolean(decisionDisabledReason),
                              disabledReason: decisionDisabledReason,
                              icon: X,
                              id: 'reject',
                              label: 'Từ chối',
                              onSelect: () => onReject(form),
                              tone: 'danger',
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {footer}
    </section>
  )
}
