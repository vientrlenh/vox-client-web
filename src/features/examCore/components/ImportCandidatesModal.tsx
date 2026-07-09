import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useSchoolClassesQuery } from '@/features/classes/api/useSchoolClassesQuery'
import { useSchoolGradesQuery } from '@/features/grades/api/useSchoolGradesQuery'

type ImportCandidatesModalProps = {
  onClose: () => void
  onImportClass: (schoolClassId: string) => void
  onImportGrade: (schoolGradeId: string) => void
  submitting?: boolean
}

const PAGE_SIZE = 8

export function ImportCandidatesModal({ onClose, onImportClass, onImportGrade, submitting = false }: ImportCandidatesModalProps) {
  const [source, setSource] = useState<'class' | 'grade'>('class')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const classesQuery = useSchoolClassesQuery(page, PAGE_SIZE, {
    languageId: '',
    schoolGradeId: '',
    search: keyword,
    status: '',
  })
  const gradesQuery = useSchoolGradesQuery(page, PAGE_SIZE)

  const classes = classesQuery.data?.content ?? []
  const grades = (gradesQuery.data?.content ?? []).filter((grade) =>
    keyword.trim() ? grade.name.toLowerCase().includes(keyword.trim().toLowerCase()) : true,
  )

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
            Theo khối
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
              placeholder={source === 'class' ? 'Tìm lớp theo tên hoặc mã…' : 'Tìm khối theo tên…'}
              value={keyword}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {source === 'class' ? (
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
            <p className="py-8 text-center text-sm text-slate-400">Đang tải danh sách khối…</p>
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
            <p className="py-8 text-center text-sm text-slate-400">Không tìm thấy khối phù hợp.</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 text-xs font-semibold text-slate-500">
          <span>
            {source === 'class' ? classesQuery.data?.totalElements ?? 0 : gradesQuery.data?.totalElements ?? 0}{' '}
            {source === 'class' ? 'lớp' : 'khối'}
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
              disabled={
                page >=
                (source === 'class' ? classesQuery.data?.totalPages ?? 1 : gradesQuery.data?.totalPages ?? 1)
              }
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
