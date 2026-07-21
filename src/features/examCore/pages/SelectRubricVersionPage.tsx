import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  useSchoolRubricsWithPublishedVersionsQuery,
  useTeacherRubricVersionsQueries,
  useTeacherRubricsQuery,
} from '../api/rubricQueries'
import { toApiError } from '@/shared/api'
import type { RubricVersionDto } from '../types'

const DEFAULT_RETURN_TO = '/school-admin/exams/create'
const DEFAULT_TEACHER_RETURN_TO = '/teacher/class-tests/create'

type SelectRubricVersionLocationState = {
  draft?: unknown
  languageId?: string | null
  returnTo?: string
} | null

export function SchoolAdminSelectRubricVersionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as SelectRubricVersionLocationState
  const returnTo = state?.returnTo ?? DEFAULT_RETURN_TO
  const [keyword, setKeyword] = useState('')
  const rubricsQuery = useSchoolRubricsWithPublishedVersionsQuery({ keyword, languageId: state?.languageId })

  function handleSelect(version: RubricVersionDto) {
    navigate(returnTo, {
      state: {
        draft: state?.draft,
        selectedRubricVersion: { code: version.code, id: version.id, name: version.name, version: version.version },
      },
    })
  }

  return (
    <section className="mx-auto max-w-200">
      <button
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600"
        onClick={() => navigate(returnTo, { state: { draft: state?.draft } })}
        type="button"
      >
        ← Quay lại
      </button>

      <h1 className="text-[26px] font-extrabold text-slate-900">Chọn phiên bản thang đánh giá</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Chỉ hiển thị các phiên bản Rubric đã xuất bản (PUBLISHED). Chọn một phiên bản để gắn cho kỳ thi.
      </p>

      <input
        className="mt-4 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="Tìm rubric theo mã hoặc tên…"
        value={keyword}
      />

      <div className="mt-4 grid gap-3.5">
        {rubricsQuery.isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">Đang tải…</div>
        ) : null}

        {rubricsQuery.data?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            Không tìm thấy bộ tiêu chí (Rubric) phù hợp.
          </div>
        ) : null}

        {rubricsQuery.data?.map((rubric) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-5" key={rubric.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-900">{rubric.name}</h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{rubric.code}</p>
              </div>
            </div>

            {rubric.versions.length === 0 ? (
              <p className="mt-3 text-[13px] text-slate-400">Chưa có phiên bản nào được xuất bản.</p>
            ) : (
              <div className="mt-3.5 overflow-x-auto">
                <table className="w-full min-w-120 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                      <th className="py-2 pr-3">Phiên bản</th>
                      <th className="py-2 pr-3">Mã</th>
                      <th className="py-2 pr-3">Tên</th>
                      <th className="py-2 pr-0 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubric.versions.map((version) => (
                      <tr className="border-b border-slate-100 last:border-0" key={version.id}>
                        <td className="py-2.5 pr-3 font-bold text-slate-900">v{version.version}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{version.code}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{version.name}</td>
                        <td className="py-2.5 pr-0 text-right">
                          <button
                            className="inline-flex h-8 items-center justify-center rounded-full bg-indigo-600 px-3.5 text-xs font-bold text-white"
                            onClick={() => handleSelect(version)}
                            type="button"
                          >
                            Chọn
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export function TeacherSelectRubricVersionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as SelectRubricVersionLocationState
  const returnTo = state?.returnTo ?? DEFAULT_TEACHER_RETURN_TO
  const [keyword, setKeyword] = useState('')
  const rubricsQuery = useTeacherRubricsQuery({ keyword, languageId: state?.languageId })
  const rubricIds = useMemo(() => rubricsQuery.data?.map((rubric) => rubric.id) ?? [], [rubricsQuery.data])
  const rubricVersionsQueries = useTeacherRubricVersionsQueries(rubricIds)

  function handleSelect(rubric: { languageId: string }, version: { code: string; id: string; name: string; version: number }) {
    navigate(returnTo, {
      state: {
        draft: state?.draft,
        // A rubric version's assessment policies are scoped to the rubric's own language, so we
        // carry it along here (there's no separate language field on the class-test form to source it from).
        selectedRubricVersion: { ...version, languageId: rubric.languageId },
      },
    })
  }

  return (
    <section className="mx-auto max-w-200">
      <button
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600"
        onClick={() => navigate(returnTo, { state: { draft: state?.draft } })}
        type="button"
      >
        ← Quay lại
      </button>

      <h1 className="text-[26px] font-extrabold text-slate-900">Chọn phiên bản thang đánh giá</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Chỉ hiển thị các phiên bản Rubric đã xuất bản (PUBLISHED). Chọn một phiên bản để gắn cho bài trên lớp.
      </p>

      <input
        className="mt-4 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="Tìm rubric theo mã hoặc tên…"
        value={keyword}
      />

      <div className="mt-4 grid gap-3.5">
        {rubricsQuery.isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">Đang tải…</div>
        ) : null}

        {rubricsQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
            Không tải được danh sách rubric: {toApiError(rubricsQuery.error).message}
          </div>
        ) : null}

        {rubricsQuery.data?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            Không tìm thấy bộ tiêu chí (Rubric) phù hợp.
          </div>
        ) : null}

        {rubricsQuery.data?.map((rubric, index) => {
          const versionsQuery = rubricVersionsQueries[index]
          return (
            <div className="rounded-2xl border border-slate-200 bg-white p-5" key={rubric.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-extrabold text-slate-900">{rubric.name}</h3>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{rubric.code}</p>
                </div>
              </div>

              {versionsQuery?.isLoading ? <p className="mt-3 text-[13px] text-slate-400">Đang tải…</p> : null}
              {versionsQuery?.isError ? (
                <p className="mt-3 text-[13px] font-semibold text-red-600">
                  Không tải được phiên bản: {toApiError(versionsQuery.error).message}
                </p>
              ) : null}
              {versionsQuery?.data?.length === 0 ? (
                <p className="mt-3 text-[13px] text-slate-400">Chưa có phiên bản nào được xuất bản.</p>
              ) : null}

              {versionsQuery?.data && versionsQuery.data.length > 0 ? (
                <div className="mt-3.5 overflow-x-auto">
                  <table className="w-full min-w-120 border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                        <th className="py-2 pr-3">Phiên bản</th>
                        <th className="py-2 pr-3">Mã</th>
                        <th className="py-2 pr-3">Tên</th>
                        <th className="py-2 pr-0 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versionsQuery.data.map((version) => (
                        <tr className="border-b border-slate-100 last:border-0" key={version.id}>
                          <td className="py-2.5 pr-3 font-bold text-slate-900">v{version.version}</td>
                          <td className="py-2.5 pr-3 text-slate-600">{version.code}</td>
                          <td className="py-2.5 pr-3 text-slate-600">{version.name}</td>
                          <td className="py-2.5 pr-0 text-right">
                            <button
                              className="inline-flex h-8 items-center justify-center rounded-full bg-indigo-600 px-3.5 text-xs font-bold text-white"
                              onClick={() => handleSelect(rubric, version)}
                              type="button"
                            >
                              Chọn
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
