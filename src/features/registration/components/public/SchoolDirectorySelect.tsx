import { Check, Loader2, Search } from 'lucide-react'
import { useState } from 'react'
import { useSchoolDirectoriesQuery } from '../../api/useSchoolDirectoriesQuery'
import type { SchoolDirectory } from '../../types'
import { RequiredMark } from './RegistrationFormFields'

const DIRECTORY_PAGE_SIZE = 8

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Không thể tải danh mục trường. Vui lòng thử lại.'
}

export function SchoolDirectorySelect({
  disabled,
  onSelect,
  selected,
}: {
  disabled?: boolean
  onSelect: (directory: SchoolDirectory | null) => void
  selected: SchoolDirectory | null
}) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const directoriesQuery = useSchoolDirectoriesQuery(1, DIRECTORY_PAGE_SIZE, search)
  const directories = directoriesQuery.data?.content ?? []

  function handleSearch() {
    onSelect(null)
    setSearch(searchInput.trim())
  }

  return (
    <div className="grid gap-3">
      <span className="block text-xs font-bold leading-4 text-blue-950">
        Chọn trường từ danh mục <RequiredMark />
      </span>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            disabled={disabled}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSearch()
              }
            }}
            placeholder="Tìm theo tên trường"
            type="search"
            value={searchInput}
          />
        </div>
        <button
          className="inline-flex h-10 shrink-0 items-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={handleSearch}
          type="button"
        >
          Tìm
        </button>
      </div>

      {selected ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-emerald-800">
              {selected.name}
            </p>
            {selected.domain ? (
              <p className="truncate text-[11px] font-medium text-emerald-700">
                {selected.domain}
              </p>
            ) : null}
          </div>
          <button
            className="shrink-0 text-[11px] font-bold text-emerald-700 underline-offset-2 hover:underline disabled:opacity-60"
            disabled={disabled}
            onClick={() => onSelect(null)}
            type="button"
          >
            Đổi
          </button>
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
          {directoriesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs font-semibold text-slate-500">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Đang tải danh mục...
            </div>
          ) : null}

          {directoriesQuery.isError ? (
            <div className="px-3 py-6 text-center text-xs font-semibold text-red-600">
              {getErrorMessage(directoriesQuery.error)}
            </div>
          ) : null}

          {!directoriesQuery.isLoading &&
          !directoriesQuery.isError &&
          directories.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs font-semibold text-slate-500">
              Không tìm thấy trường phù hợp.
            </div>
          ) : null}

          {!directoriesQuery.isError
            ? directories.map((directory) => (
                <button
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-indigo-50 disabled:cursor-not-allowed"
                  disabled={disabled}
                  key={directory.id}
                  onClick={() => onSelect(directory)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-blue-950">
                      {directory.name}
                    </span>
                    <span className="block truncate text-[11px] font-medium text-slate-500">
                      {[directory.domain, directory.province]
                        .filter(Boolean)
                        .join(' · ') || 'Không có thông tin'}
                    </span>
                  </span>
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-indigo-500 opacity-0"
                  />
                </button>
              ))
            : null}
        </div>
      )}
    </div>
  )
}
