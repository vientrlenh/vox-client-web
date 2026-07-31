// Khung chung của hai picker người dùng trong kỳ thi (thí sinh, giám thị): cùng bố cục,
// cùng phân trang, và quan trọng hơn là cùng cách hiện lỗi. Gộp lại để nhánh `isError`
// chỉ tồn tại ở một chỗ — trước đây cả hai đều nuốt lỗi 403 thành "không tìm thấy".
//
// Component này thuần trình bày; state phân trang/tìm kiếm nằm ở `useUserPickerState` để
// mỗi modal tự gọi query hook của mình, không phải truyền hook qua prop.

import type { UseQueryResult } from '@tanstack/react-query'
import { Search, UserPlus, X } from 'lucide-react'
import { toApiError } from '@/shared/api'
import type { ExamDirectoryUser } from '../api/examDirectoryQueries'
import type { Paged } from '../types'
import type { UserPickerState } from './useUserPickerState'

type ExamDirectoryUserPickerProps = {
  countLabel: string
  emptyLabel: string
  excludeUserIds: string[]
  loadingLabel: string
  onClose: () => void
  onSelect: (user: ExamDirectoryUser) => void
  searchPlaceholder: string
  state: UserPickerState
  title: string
  titleId: string
  usersQuery: UseQueryResult<Paged<ExamDirectoryUser>>
}

export function ExamDirectoryUserPicker({
  countLabel,
  emptyLabel,
  excludeUserIds,
  loadingLabel,
  onClose,
  onSelect,
  searchPlaceholder,
  state,
  title,
  titleId,
  usersQuery,
}: ExamDirectoryUserPickerProps) {
  const { keyword, page, setKeyword, setPage } = state
  const users = (usersQuery.data?.content ?? []).filter((user) => !excludeUserIds.includes(user.userId))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900" id={titleId}>
            {title}
          </h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-3.5">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder={searchPlaceholder}
              value={keyword}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {usersQuery.isError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700">
              {toApiError(usersQuery.error).message}
            </p>
          ) : usersQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">{loadingLabel}</p>
          ) : users.length ? (
            <div className="grid gap-2.5 py-2">
              {users.map((user) => (
                <button
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                  key={user.userId}
                  onClick={() => onSelect(user)}
                  type="button"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{user.fullName ?? '-'}</div>
                    <div className="text-xs text-slate-500">{user.email ?? '-'}</div>
                  </div>
                  <UserPlus aria-hidden="true" className="size-4 shrink-0 text-indigo-600" />
                </button>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">{emptyLabel}</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 text-xs font-semibold text-slate-500">
          <span>
            {usersQuery.data?.totalElements ?? 0} {countLabel}
          </span>
          <div className="flex gap-2">
            <button
              className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              disabled={page >= (usersQuery.data?.totalPages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
