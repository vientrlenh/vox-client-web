import { useEffect, useState } from 'react'
import {
  useMatchingSchoolAssessmentPoliciesQuery,
  useMatchingTeacherAssessmentPoliciesQuery,
} from '../api/assessmentPolicyQueries'
import {
  useSchoolRubricsWithPublishedVersionsQuery,
  useTeacherRubricVersionsQueries,
  useTeacherRubricsQuery,
} from '../api/rubricQueries'
import { formatDate, getAssessmentPolicyStrictnessLabel } from '../types'

export type RubricPolicySelection = {
  /** null = không đổi chính sách; form sửa phải BỎ HẲN field khỏi payload chứ không gửi null. */
  assessmentPolicyId: string | null
  /** Đang resolve hoặc còn mơ hồ -> chặn submit, y như nút "Tạo kỳ thi" ở form tạo. */
  isBlocked: boolean
}

type RubricPolicyPickerProps = {
  languageId?: string | null
  onChange: (selection: RubricPolicySelection) => void
  scope: 'school' | 'teacher'
}

const SELECT_CLASS = 'h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900'

/**
 * Đổi chính sách đánh giá của một bài đã tồn tại, bằng cách chọn lại Rubric -> Phiên bản rồi để hệ
 * thống tự tìm chính sách đã xuất bản khớp với cặp đó (đúng logic của hai form tạo).
 *
 * <p>Đây cũng là đường duy nhất đổi khung năng lực (framework) của bài: Exam không giữ framework,
 * nó nằm trên assessment policy (frameworkVersionId + rubricVersionId).
 *
 * <p>Mặc định component ở trạng thái "giữ nguyên chính sách hiện tại" và không gửi gì lên. Lý do
 * không prefill sẵn hai select theo chính sách đang gắn: từ assessmentPolicyId phải tra ngược ra
 * rubricVersionId -> rubricId, mà query lấy 1 chính sách theo id chỉ mở cho SCHOOL_ADMIN — làm được
 * cho admin nhưng không làm được cho giáo viên thì hai form sẽ lệch nhau.
 */
export function RubricPolicyPicker({ languageId, onChange, scope }: RubricPolicyPickerProps) {
  const [isChanging, setIsChanging] = useState(false)
  const [rubricId, setRubricId] = useState('')
  const [rubricVersionId, setRubricVersionId] = useState('')
  const [manualPolicyId, setManualPolicyId] = useState<string | null>(null)

  const isSchool = scope === 'school'
  const schoolRubricsQuery = useSchoolRubricsWithPublishedVersionsQuery(
    { languageId },
    { enabled: isChanging && isSchool },
  )
  const teacherRubricsQuery = useTeacherRubricsQuery({ languageId }, { enabled: isChanging && !isSchool })
  // Chỉ nạp version của đúng rubric đang chọn: hook nhận mảng nên mảng rỗng = không bắn request nào.
  const teacherVersionsQueries = useTeacherRubricVersionsQueries(!isSchool && rubricId ? [rubricId] : [])

  const rubrics = (isSchool ? schoolRubricsQuery.data : teacherRubricsQuery.data) ?? []
  const versions = isSchool
    ? (schoolRubricsQuery.data?.find((rubric) => rubric.id === rubricId)?.versions ?? [])
    : (teacherVersionsQueries[0]?.data ?? [])
  const isLoadingVersions = isSchool ? schoolRubricsQuery.isLoading : Boolean(teacherVersionsQueries[0]?.isLoading)

  const schoolPoliciesQuery = useMatchingSchoolAssessmentPoliciesQuery(
    { languageId, rubricVersionId },
    { enabled: isSchool },
  )
  const teacherPoliciesQuery = useMatchingTeacherAssessmentPoliciesQuery(
    { languageId, rubricVersionId },
    { enabled: !isSchool },
  )
  const policiesQuery = isSchool ? schoolPoliciesQuery : teacherPoliciesQuery
  const matchingPolicies = policiesQuery.data ?? []

  // Chỉ 1 chính sách khớp -> tự dùng luôn; nhiều chính sách khớp -> chờ người dùng chọn tay.
  const resolvedPolicyId = matchingPolicies.length === 1 ? matchingPolicies[0].id : manualPolicyId
  const isResolving = Boolean(rubricVersionId) && policiesQuery.isLoading
  const hasNoMatchingPolicy = Boolean(rubricVersionId) && !isResolving && matchingPolicies.length === 0
  const hasAmbiguousPolicy =
    Boolean(rubricVersionId) && !isResolving && matchingPolicies.length > 1 && !manualPolicyId

  const assessmentPolicyId = isChanging ? resolvedPolicyId : null
  // Ở chế độ "giữ nguyên" thì không có gì để chặn, kể cả khi lần chọn dở trước đó còn mơ hồ.
  const isBlocked = isChanging && (isResolving || hasAmbiguousPolicy)

  useEffect(() => {
    onChange({ assessmentPolicyId, isBlocked })
    // onChange do form truyền xuống, không đưa vào deps để tránh vòng lặp khi form khai báo inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentPolicyId, isBlocked])

  function startChanging() {
    setIsChanging(true)
  }

  function keepCurrentPolicy() {
    setIsChanging(false)
    setRubricId('')
    setRubricVersionId('')
    setManualPolicyId(null)
  }

  function selectRubric(nextRubricId: string) {
    setRubricId(nextRubricId)
    setRubricVersionId('')
    setManualPolicyId(null)
  }

  function selectRubricVersion(nextRubricVersionId: string) {
    setRubricVersionId(nextRubricVersionId)
    setManualPolicyId(null)
  }

  return (
    <div className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <span className="text-sm font-bold text-slate-700">Chính sách đánh giá</span>
      <p className="text-xs text-slate-500">
        Quyết định thang điểm và khung năng lực dùng để chấm bài. Chọn lại phiên bản thang đánh giá để đổi.
      </p>

      {!isChanging ? (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3.5">
          <p className="text-[13px] text-slate-700">Đang dùng chính sách đánh giá hiện tại.</p>
          <button
            className="inline-flex h-9.5 items-center justify-center rounded-full border border-indigo-200 bg-white px-4 text-[13px] font-bold text-indigo-600 hover:bg-indigo-50"
            onClick={startChanging}
            type="button"
          >
            Đổi chính sách đánh giá
          </button>
        </div>
      ) : (
        <div className="mt-1.5 grid gap-2.5 rounded-lg border border-indigo-200 bg-white p-3.5">
          <label className="grid gap-1.5 text-[13px] font-bold text-slate-700">
            Thang đánh giá (Rubric)
            <select className={SELECT_CLASS} onChange={(event) => selectRubric(event.target.value)} value={rubricId}>
              <option value="">Chọn thang đánh giá</option>
              {rubrics.map((rubric) => (
                <option key={rubric.id} value={rubric.id}>
                  {rubric.name} ({rubric.code})
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-[13px] font-bold text-slate-700">
            Phiên bản đã xuất bản
            <select
              className={SELECT_CLASS}
              disabled={!rubricId || isLoadingVersions}
              onChange={(event) => selectRubricVersion(event.target.value)}
              value={rubricVersionId}
            >
              <option value="">{isLoadingVersions ? 'Đang tải…' : 'Chọn phiên bản'}</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name} (v{version.version})
                </option>
              ))}
            </select>
          </label>

          {rubricId && !isLoadingVersions && versions.length === 0 ? (
            <p className="text-xs font-semibold text-amber-700">
              Thang đánh giá này chưa có phiên bản nào được xuất bản. Chọn thang khác.
            </p>
          ) : null}

          {isResolving ? <p className="text-xs text-slate-400">Đang tìm chính sách đánh giá phù hợp…</p> : null}

          {hasNoMatchingPolicy ? (
            <p className="text-xs font-semibold text-amber-700">
              Chưa có chính sách đánh giá đã xuất bản cho phiên bản này. Chọn phiên bản khác, hoặc giữ nguyên chính
              sách hiện tại.
            </p>
          ) : null}

          {matchingPolicies.length > 1 ? (
            <div className="grid gap-1.5">
              <p className="text-xs font-semibold text-slate-600">
                Có {matchingPolicies.length} chính sách khớp — chọn một:
              </p>
              {matchingPolicies.map((policy) => (
                <button
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold ${
                    manualPolicyId === policy.id
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  key={policy.id}
                  onClick={() => setManualPolicyId(policy.id)}
                  type="button"
                >
                  <span>
                    Phiên bản {policy.version} · {getAssessmentPolicyStrictnessLabel(policy.strictness)} · Điểm đạt{' '}
                    {policy.passingScore ?? '-'}
                  </span>
                  <span>
                    {formatDate(policy.effectiveFrom)}
                    {policy.effectiveTo ? ` – ${formatDate(policy.effectiveTo)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {resolvedPolicyId && matchingPolicies.length === 1 ? (
            <p className="text-xs font-semibold text-emerald-700">
              Sẽ đổi sang chính sách: {getAssessmentPolicyStrictnessLabel(matchingPolicies[0].strictness)} · Điểm đạt{' '}
              {matchingPolicies[0].passingScore ?? '-'}
            </p>
          ) : null}

          <button
            className="w-fit text-xs font-bold text-slate-400 hover:text-red-600"
            onClick={keepCurrentPolicy}
            type="button"
          >
            Giữ nguyên chính sách hiện tại
          </button>
        </div>
      )}
    </div>
  )
}
