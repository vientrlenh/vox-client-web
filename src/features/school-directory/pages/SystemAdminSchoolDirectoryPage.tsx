import { useState } from 'react'
import { useSchoolDirectoriesQuery } from '../api/useSchoolDirectoriesQuery'
import { useSchoolDirectoryQuery } from '../api/useSchoolDirectoryQuery'
import { SchoolDirectoryDetailDrawer } from '../components/SchoolDirectoryDetailDrawer'
import { SchoolDirectoryPageHeader } from '../components/SchoolDirectoryPageHeader'
import { SchoolDirectoryPagination } from '../components/SchoolDirectoryPagination'
import { SchoolDirectoryTable } from '../components/SchoolDirectoryTable'
import type { SchoolDirectory } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

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
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const directoriesQuery = useSchoolDirectoriesQuery(page, pageSize)
  const directoryDetailQuery = useSchoolDirectoryQuery(selectedId)
  const directories = directoriesQuery.data?.content ?? []

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
        onView={openDetailDrawer}
        selectedId={isDetailOpen ? selectedId : null}
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
