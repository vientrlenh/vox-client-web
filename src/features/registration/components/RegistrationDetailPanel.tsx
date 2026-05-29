import type { ReactNode } from 'react'
import { ChevronUp } from 'lucide-react'
import type { RegisterForm } from '../types'
import {
  formatNullableText,
  formatRegisterFormDate,
  formatStudentCount,
} from '../types'
import { RegistrationStatusBadge } from './RegistrationStatusBadge'

type RegistrationDetailPanelProps = {
  errorMessage?: string
  form: RegisterForm | null
  isError: boolean
  isLoading: boolean
  onRetry: () => void
}

type DetailRow = {
  label: string
  value: ReactNode
}

function DetailRows({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="grid gap-4">
      {rows.map((row) => (
        <div className="grid grid-cols-[120px_12px_1fr] gap-3" key={row.label}>
          <dt className="text-sm text-slate-600">{row.label}</dt>
          <dd className="text-sm text-slate-500">:</dd>
          <dd className="min-w-0 break-words text-sm font-bold text-blue-950">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function RegistrationDetailPanel({
  errorMessage,
  form,
  isError,
  isLoading,
  onRetry,
}: RegistrationDetailPanelProps) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">
          Chi tiết đơn đăng ký
        </h2>
        <ChevronUp aria-hidden="true" className="size-5 text-blue-950" />
      </div>

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải chi tiết đơn đăng ký...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải chi tiết đơn đăng ký.'}
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

      {!isLoading && !isError && !form ? (
        <div className="flex min-h-80 items-center justify-center px-6 py-12 text-center text-sm font-bold text-slate-500">
          Chọn một đơn đăng ký để xem chi tiết
        </div>
      ) : null}

      {!isLoading && !isError && form ? (
        <div className="grid gap-6 px-6 py-6">
          <DetailRows
            rows={[
              {
                label: 'Họ và tên liên hệ',
                value: formatNullableText(form.contactFullName),
              },
              {
                label: 'Mã định danh',
                value: formatNullableText(form.identityNumber),
              },
              {
                label: 'Ngày sinh',
                value: formatRegisterFormDate(form.dateOfBirth),
              },
              {
                label: 'Email',
                value: formatNullableText(form.contactEmail),
              },
              {
                label: 'Số điện thoại',
                value: formatNullableText(form.contactPhone),
              },
              {
                label: 'Địa chỉ liên hệ',
                value: formatNullableText(form.contactAddress),
              },
            ]}
          />

          <hr className="border-slate-200" />

          <DetailRows
            rows={[
              {
                label: 'Tên trường',
                value: formatNullableText(form.schoolName),
              },
              {
                label: 'Tên miền trường',
                value: formatNullableText(form.schoolDomain),
              },
              {
                label: 'Địa chỉ trường',
                value: formatNullableText(form.schoolAddress),
              },
              {
                label: 'Mã bưu chính',
                value: formatNullableText(form.postalCode),
              },
            ]}
          />

          <hr className="border-slate-200" />

          <DetailRows
            rows={[
              {
                label: 'Chức vụ',
                value: formatNullableText(form.position),
              },
              {
                label: 'Số học sinh',
                value: formatStudentCount(form.studentCount),
              },
            ]}
          />

          <hr className="border-slate-200" />

          <DetailRows
            rows={[
              {
                label: 'Trạng thái',
                value: <RegistrationStatusBadge status={form.status} />,
              },
            ]}
          />
        </div>
      ) : null}
    </aside>
  )
}
