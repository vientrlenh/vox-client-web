import { useState } from 'react'
import { useLocation } from 'react-router'
import { toApiError } from '@/shared/api'
import { Pagination } from '@/shared/components/Pagination'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { useSchoolsQuery } from '../api/useSchoolsQuery'
import { useUpdateSchoolStatusMutation } from '../api/useUpdateSchoolStatusMutation'
import { SchoolDetailDialog } from '../components/SchoolDetailDialog'
import { SchoolPageHeader } from '../components/SchoolPageHeader'
import { SchoolTable } from '../components/SchoolTable'
import type { School } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

export function SystemAdminSchoolsPage() {
  const location = useLocation()
  const createdMessage = (location.state as { successMessage?: string } | null)
    ?.successMessage
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [viewingSchool, setViewingSchool] = useState<School | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(
    createdMessage ? { text: createdMessage, tone: 'success' } : null,
  )
  const { confirm, dialog } = useConfirmationDialog()

  const schoolsQuery = useSchoolsQuery(page, DEFAULT_PAGE_SIZE)
  const updateStatusMutation = useUpdateSchoolStatusMutation()

  const schools = schoolsQuery.data?.content ?? []
  // Chỉ khoá đúng dòng đang gọi API, thay vì làm mờ cả bảng như trước.
  const updatingId = updateStatusMutation.isPending
    ? (updateStatusMutation.variables?.id ?? null)
    : null

  async function handleChangeStatus(school: School) {
    const schoolLabel = school.name || school.code
    const isLocking = Boolean(school.isActive)
    setPageMessage(null)

    const isConfirmed = await confirm({
      confirmLabel: isLocking ? 'Khóa trường' : 'Kích hoạt',
      message: isLocking
        ? `Khóa trường "${schoolLabel}"? Toàn bộ tài khoản thuộc trường sẽ không đăng nhập được cho tới khi kích hoạt lại.`
        : `Kích hoạt lại trường "${schoolLabel}"? Các tài khoản thuộc trường sẽ đăng nhập được trở lại.`,
      title: isLocking ? 'Khóa trường học' : 'Kích hoạt trường học',
    })

    if (!isConfirmed) {
      return
    }

    try {
      const result = await updateStatusMutation.mutateAsync({
        id: school.id,
        isActive: !school.isActive,
      })

      setPageMessage({
        text:
          result.message ??
          `Đã ${isLocking ? 'khóa' : 'kích hoạt'} trường "${schoolLabel}".`,
        tone: 'success',
      })
    } catch (error) {
      setPageMessage({ text: toApiError(error).message, tone: 'error' })
    }
  }

  return (
    <section aria-labelledby="system-admin-schools-title" className="grid gap-6">
      <SchoolPageHeader
        isRefreshing={schoolsQuery.isFetching}
        onRefresh={() => {
          void schoolsQuery.refetch()
        }}
      />

      {dialog}

      {pageMessage ? (
        <div
          className={[
            'rounded-lg border px-4 py-3 text-sm font-semibold',
            pageMessage.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700',
          ].join(' ')}
          role={pageMessage.tone === 'error' ? 'alert' : 'status'}
        >
          {pageMessage.text}
        </div>
      ) : null}

      <SchoolTable
        errorMessage={
          schoolsQuery.isError ? toApiError(schoolsQuery.error).message : undefined
        }
        footer={
          <Pagination
            currentPage={page}
            itemName="trường"
            onPageChange={setPage}
            totalElements={schoolsQuery.data?.totalElements ?? 0}
            totalPages={schoolsQuery.data?.totalPages ?? 0}
          />
        }
        isError={schoolsQuery.isError}
        isLoading={schoolsQuery.isLoading}
        onChangeStatus={(school) => {
          void handleChangeStatus(school)
        }}
        onRetry={() => {
          void schoolsQuery.refetch()
        }}
        onView={(school) => setViewingSchool(school)}
        schools={schools}
        updatingId={updatingId}
      />

      <SchoolDetailDialog
        isOpen={viewingSchool !== null}
        onClose={() => setViewingSchool(null)}
        school={viewingSchool}
      />
    </section>
  )
}
