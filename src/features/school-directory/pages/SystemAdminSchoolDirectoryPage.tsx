import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  schoolDirectoryManagementQueryKeys,
  useSchoolDirectoriesQuery,
} from '../api/useSchoolDirectoriesQuery'
import { useSchoolDirectoryQuery } from '../api/useSchoolDirectoryQuery'
import { useVerifySchoolDirectoryMutation } from '../api/useSchoolDirectoryVerifyMutation'
import { SchoolDirectoryDetailDrawer } from '../components/SchoolDirectoryDetailDrawer'
import { SchoolDirectoryPageHeader } from '../components/SchoolDirectoryPageHeader'
import { SchoolDirectoryPagination } from '../components/SchoolDirectoryPagination'
import { SchoolDirectoryTable } from '../components/SchoolDirectoryTable'
import { formatNullableText } from '../types'
import type { SchoolDirectory } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return undefined
}

export function SystemAdminSchoolDirectoryPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState<PageMessage | null>(null)

  const directoriesQuery = useSchoolDirectoriesQuery(page, pageSize)
  const directoryDetailQuery = useSchoolDirectoryQuery(selectedId)
  const verifyMutation = useVerifySchoolDirectoryMutation()
  const directories = directoriesQuery.data?.content ?? []
  const verifyingId = verifyMutation.isPending
    ? (verifyMutation.variables?.id ?? null)
    : null

  function handlePageChange(nextPage: number) {
    setPage(nextPage)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPage(DEFAULT_PAGE)
    setPageSize(nextPageSize)
  }

  function handleRefresh() {
    void directoriesQuery.refetch()
    if (selectedId) {
      void directoryDetailQuery.refetch()
    }
  }

  function openDetailDrawer(directory: SchoolDirectory) {
    setSelectedId(directory.id)
    setIsDetailOpen(true)
  }

  function closeDetailDrawer() {
    setIsDetailOpen(false)
  }

  async function handleVerify(directory: SchoolDirectory) {
    setVerifyMessage(null)

    try {
      await verifyMutation.mutateAsync({ id: directory.id })
      await queryClient.invalidateQueries({
        queryKey: schoolDirectoryManagementQueryKeys.all,
      })
      setVerifyMessage({
        text: `Đã xác minh trường "${formatNullableText(directory.name)}".`,
        tone: 'success',
      })
    } catch (error) {
      setVerifyMessage({
        text:
          getErrorMessage(error) ??
          'Không thể xác minh trường. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  return (
    <section
      aria-labelledby="system-admin-school-directory-title"
      className="grid gap-6"
    >
      <SchoolDirectoryPageHeader
        isRefreshing={
          directoriesQuery.isFetching || directoryDetailQuery.isFetching
        }
        onRefresh={handleRefresh}
      />

      {verifyMessage ? (
        <div
          className={[
            'rounded-lg border px-4 py-3 text-sm font-semibold',
            verifyMessage.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700',
          ].join(' ')}
          role={verifyMessage.tone === 'error' ? 'alert' : 'status'}
        >
          {verifyMessage.text}
        </div>
      ) : null}

      <SchoolDirectoryTable
        directories={directories}
        errorMessage={getErrorMessage(directoriesQuery.error)}
        footer={
          <SchoolDirectoryPagination
            isDisabled={directoriesQuery.isLoading || directoriesQuery.isError}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            pageSize={pageSize}
            totalElements={directoriesQuery.data?.totalElements ?? 0}
            totalPages={directoriesQuery.data?.totalPages ?? 0}
          />
        }
        isError={directoriesQuery.isError}
        isLoading={directoriesQuery.isLoading}
        onRetry={() => {
          void directoriesQuery.refetch()
        }}
        onVerify={(directory) => {
          void handleVerify(directory)
        }}
        onView={openDetailDrawer}
        selectedId={isDetailOpen ? selectedId : null}
        verifyingId={verifyingId}
      />

      <SchoolDirectoryDetailDrawer
        directory={directoryDetailQuery.data ?? null}
        errorMessage={getErrorMessage(directoryDetailQuery.error)}
        isError={directoryDetailQuery.isError}
        isLoading={Boolean(selectedId) && directoryDetailQuery.isLoading}
        onClose={closeDetailDrawer}
        onRetry={() => {
          void directoryDetailQuery.refetch()
        }}
        open={isDetailOpen}
      />
    </section>
  )
}
