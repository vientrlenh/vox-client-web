import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { toApiError } from '@/shared/api'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import {
  useExamDirectoryClassesQuery,
  useExamDirectoryGradesQuery,
} from '../api/examDirectoryQueries'
import type { ExamKind } from '../types'

type ImportCandidatesModalProps = {
  examId: string
  examKind: ExamKind
  onClose: () => void
  onImportClass: (schoolClassId: string) => void
  onImportGrade: (schoolGradeId: string) => void
  submitting?: boolean
}

const PAGE_SIZE = 8
const SEARCH_DEBOUNCE_MS = 300

export function ImportCandidatesModal({
  examId,
  examKind,
  onClose,
  onImportClass,
  onImportGrade,
  submitting = false,
}: ImportCandidatesModalProps) {
  // Nhập theo niên khóa gom mọi lớp của niên khóa đó, vượt phạm vi của người tạo bài
  // trên lớp — BE từ chối thẳng, nên ở đây ẩn hẳn lối vào thay vì để người dùng đâm vào lỗi.
  const allowGradeImport = examKind !== 'CLASS_TEST'
  const [source, setSource] = useState<'class' | 'grade'>('class')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const debouncedKeyword = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS)

  const classesQuery = useExamDirectoryClassesQuery(examId, page, PAGE_SIZE, debouncedKeyword)
  const gradesQuery = useExamDirectoryGradesQuery(examId, page, PAGE_SIZE, debouncedKeyword, {
    enabled: allowGradeImport,
  })

  const activeQuery = source === 'class' ? classesQuery : gradesQuery
  const classes = classesQuery.data?.content ?? []
  const grades = gradesQuery.data?.content ?? []

  function handleTabChange(next: 'class' | 'grade') {
    setSource(next)
    setKeyword('')
    setPage(1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="import-candidates-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900" id="import-candidates-title">
            Nhập thí sinh hàng loạt
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

        {allowGradeImport ? (
          <div className="flex gap-2 border-b border-slate-200 px-6 py-3.5">
            <button
              className={[
                'h-9 flex-1 rounded-full text-xs font-bold transition',
                source === 'class' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => handleTabChange('class')}
              type="button"
            >
              Theo lớp
            </button>
            <button
              className={[
                'h-9 flex-1 rounded-full text-xs font-bold transition',
                source === 'grade' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => handleTabChange('grade')}
              type="button"
            >
              Theo niên khóa
            </button>
          </div>
        ) : null}

        <div className="border-b border-slate-200 px-6 py-3.5">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder={source === 'class' ? 'Tìm lớp theo tên hoặc mã…' : 'Tìm niên khóa theo tên hoặc mã…'}
              value={keyword}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {activeQuery.isError ? (
            // Không gộp lỗi vào nhánh "không tìm thấy": 403 hiện ra dưới dạng danh sách
            // rỗng đúng là cách bug phân quyền này ẩn mình suốt.
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700">
              {toApiError(activeQuery.error).message}
            </p>
          ) : source === 'class' ? (
            classesQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-slate-400">Đang tải danh sách lớp…</p>
            ) : classes.length ? (
              <div className="grid gap-2.5 py-2">
                {classes.map((schoolClass) => (
                  <button
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={submitting}
                    key={schoolClass.id}
                    onClick={() => onImportClass(schoolClass.id)}
                    type="button"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{schoolClass.name}</div>
                      <div className="text-xs text-slate-500">{schoolClass.code}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">Không tìm thấy lớp phù hợp.</p>
            )
          ) : gradesQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">Đang tải danh sách niên khóa…</p>
          ) : grades.length ? (
            <div className="grid gap-2.5 py-2">
              {grades.map((grade) => (
                <button
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={submitting}
                  key={grade.id}
                  onClick={() => onImportGrade(grade.id)}
                  type="button"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{grade.name}</div>
                    <div className="text-xs text-slate-500">{grade.code}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Không tìm thấy niên khóa phù hợp.</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 text-xs font-semibold text-slate-500">
          <span>
            {activeQuery.data?.totalElements ?? 0} {source === 'class' ? 'lớp' : 'niên khóa'}
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
              disabled={page >= (activeQuery.data?.totalPages ?? 1)}
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
