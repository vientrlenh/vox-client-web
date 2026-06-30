import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { useSchoolGradeLevelsQuery } from '@/features/grades/api/useSchoolGradeLevelsQuery'
import { useSchoolGradesQuery } from '@/features/grades/api/useSchoolGradesQuery'
import type { SchoolGrade } from '@/features/grades/types'
import { formatGradeDateOnly, getGradeStatusDisplay } from '@/features/grades/types'

export type { SchoolGrade }

type SelectedGrade = {
  code: string
  id: string
  name: string
}

type SchoolGradePickerDialogProps = {
  initialGradeId?: string
  isOpen: boolean
  onClose: () => void
  onSelect: (grade: SelectedGrade) => void
  zIndex?: 'z-50' | 'z-60'
}

const GRADE_PAGE_SIZE = 8
const LEVEL_PAGE_SIZE = 100

export function SchoolGradePickerDialog({
  initialGradeId,
  isOpen,
  onClose,
  onSelect,
  zIndex = 'z-50',
}: SchoolGradePickerDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <SchoolGradePickerDialogContent
      initialGradeId={initialGradeId}
      key={initialGradeId ?? 'new'}
      onClose={onClose}
      onSelect={onSelect}
      zIndex={zIndex}
    />
  )
}

type ContentProps = {
  initialGradeId?: string
  onClose: () => void
  onSelect: (grade: SelectedGrade) => void
  zIndex: 'z-50' | 'z-60'
}

function SchoolGradePickerDialogContent({
  initialGradeId,
  onClose,
  onSelect,
  zIndex,
}: ContentProps) {
  const [selectedLevelId, setSelectedLevelId] = useState('')
  const [gradePage, setGradePage] = useState(1)
  const [pendingGradeId, setPendingGradeId] = useState(initialGradeId ?? '')

  const levelsQuery = useSchoolGradeLevelsQuery(1, LEVEL_PAGE_SIZE)
  const gradesQuery = useSchoolGradesQuery(
    gradePage,
    GRADE_PAGE_SIZE,
    selectedLevelId || undefined,
  )

  const levels = levelsQuery.data?.content ?? []
  const grades = gradesQuery.data?.content ?? []
  const totalGrades = gradesQuery.data?.totalElements ?? 0
  const totalPages = gradesQuery.data?.totalPages ?? 0

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  function handleLevelSelect(levelId: string) {
    setSelectedLevelId(levelId)
    setGradePage(1)
  }

  function handleConfirm() {
    const grade = grades.find((g) => g.id === pendingGradeId)

    if (grade) {
      onSelect({ code: grade.code, id: grade.id, name: grade.name })
      onClose()
    }
  }

  const pendingGrade = grades.find((g) => g.id === pendingGradeId) ?? null

  return (
    <div
      className={`fixed inset-0 ${zIndex} grid place-items-center bg-slate-950/45 px-4 py-6`}
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="grade-picker-title"
        className="grid max-h-[92vh] w-full max-w-3xl gap-5 overflow-y-auto rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-black tracking-0 text-slate-950"
              id="grade-picker-title"
            >
              Chọn niên học
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Lọc theo cấp khối rồi chọn niên học phù hợp.
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại chọn niên học"
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-bold text-slate-700">Lọc theo cấp khối</p>
          {levelsQuery.isLoading ? (
            <p className="text-xs font-semibold text-slate-500">
              Đang tải cấp khối...
            </p>
          ) : levelsQuery.isError ? (
            <p className="text-xs font-semibold text-red-600">
              Không thể tải danh sách cấp khối.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
                  selectedLevelId === ''
                    ? 'border-cyan-500 bg-cyan-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => handleLevelSelect('')}
                type="button"
              >
                Tất cả
              </button>
              {levels.map((level) => (
                <button
                  className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
                    selectedLevelId === level.id
                      ? 'border-cyan-500 bg-cyan-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  key={level.id}
                  onClick={() => handleLevelSelect(level.id)}
                  type="button"
                >
                  {level.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <GradeTable
          grades={grades}
          isError={gradesQuery.isError}
          isLoading={gradesQuery.isLoading}
          onRetry={() => void gradesQuery.refetch()}
          onRowClick={(grade) => setPendingGradeId(grade.id)}
          pendingGradeId={pendingGradeId}
        />

        <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
          <span>
            {totalGrades} niên học, trang {totalPages ? gradePage : 0}/
            {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
              disabled={gradesQuery.isLoading || gradePage <= 1}
              onClick={() => setGradePage((p) => p - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
              disabled={gradesQuery.isLoading || gradePage >= totalPages}
              onClick={() => setGradePage((p) => p + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>

        {pendingGrade ? (
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800">
            Đã chọn: {pendingGrade.name} ({pendingGrade.code})
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!pendingGradeId}
            onClick={handleConfirm}
            type="button"
          >
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  )
}

type GradeTableProps = {
  grades: SchoolGrade[]
  isError: boolean
  isLoading: boolean
  onRetry: () => void
  onRowClick: (grade: SchoolGrade) => void
  pendingGradeId: string
}

function GradeTable({
  grades,
  isError,
  isLoading,
  onRetry,
  onRowClick,
  pendingGradeId,
}: GradeTableProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600"
        role="status"
      >
        Đang tải danh sách niên học...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="grid gap-3 rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700"
        role="alert"
      >
        <span>Không thể tải danh sách niên học.</span>
        <button
          className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
          onClick={onRetry}
          type="button"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (!grades.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm font-black text-slate-950">Chưa có niên học</p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Thử chọn cấp khối khác.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Niên học</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày bắt đầu</th>
              <th className="px-4 py-3">Ngày kết thúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grades.map((grade) => {
              const isPending = grade.id === pendingGradeId
              const status = getGradeStatusDisplay(grade.status)

              return (
                <tr
                  className={`cursor-pointer transition ${
                    isPending
                      ? 'border-l-2 border-cyan-500 bg-cyan-50'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                  key={grade.id}
                  onClick={() => onRowClick(grade)}
                >
                  <td className="px-4 py-3">
                    <div className="grid">
                      <span className="text-sm font-black text-slate-950">
                        {grade.name}
                      </span>
                      <span className="mt-0.5 text-xs font-bold text-slate-500">
                        {grade.code}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                    {formatGradeDateOnly(grade.startDate)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                    {formatGradeDateOnly(grade.endDate)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
