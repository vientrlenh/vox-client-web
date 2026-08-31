import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  useMatchingSchoolAssessmentPoliciesQuery,
  useMatchingTeacherAssessmentPoliciesQuery,
} from '../api/assessmentPolicyQueries'
import {
  useSchoolRubricsWithPublishedVersionsQuery,
  useTeacherRubricVersionsQueries,
  useTeacherRubricsQuery,
} from '../api/rubricQueries'
import { formatDate, getAssessmentPolicyScopeLabel, getAssessmentPolicyStrictnessLabel } from '../types'
import { TablePickerDialog } from './TablePickerDialog'

const TRIGGER_CLASS =
  'flex h-11 w-full items-center justify-between overflow-hidden rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition hover:bg-slate-50 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-70'

export type RubricPolicyChoice = {
  /** Thứ duy nhất đi vào payload: exam chỉ lưu assessment_policy_id, không lưu rubric/phiên bản. */
  assessmentPolicyId: string | null
  /** Chưa chốt được chính sách -> form tạo phải chặn submit. */
  isBlocked: boolean
  /** Chỉ để form tạo phân biệt "chưa chọn phiên bản" với "chưa chọn chính sách" khi báo lỗi. */
  rubricVersionId: string | null
}

type RubricPolicySelectFieldProps = {
  languageId?: string | null
  onChange: (choice: RubricPolicyChoice) => void
  /**
   * Bật khi form có ô ngôn ngữ riêng: chưa chọn ngôn ngữ thì chưa cho chọn rubric, vì danh sách
   * rubric lọc theo ngôn ngữ. Bài trên lớp không có ô này nên để tắt.
   */
  requiresLanguage?: boolean
  scope: 'school' | 'teacher'
}

/**
 * Chọn chính sách đánh giá cho bài SẮP TẠO, đi tuần tự Rubric -> Phiên bản đã xuất bản -> Chính sách.
 *
 * <p>Khác {@link RubricPolicyPicker} (dùng ở form SỬA) ở hai điểm: không có chế độ "giữ nguyên chính
 * sách hiện tại" vì bài chưa tồn tại thì chưa có gì để giữ, và danh sách chính sách luôn hiện ra để
 * chọn chứ không ẩn đi khi chỉ có một bản khớp -- người tạo phải nhìn thấy thứ mình sắp gắn.
 *
 * <p>Exam không lưu rubric hay phiên bản: hai bước đầu chỉ là khoá tra cứu để ra danh sách chính
 * sách đã xuất bản khớp (languageId + rubricVersionId). Khung năng lực (framework) cũng đi theo
 * chính sách chứ không nằm trên exam.
 */
export function RubricPolicySelectField({
  languageId,
  onChange,
  requiresLanguage = false,
  scope,
}: RubricPolicySelectFieldProps) {
  const [rubricId, setRubricId] = useState('')
  const [rubricVersionId, setRubricVersionId] = useState('')
  const [pickedPolicyId, setPickedPolicyId] = useState<string | null>(null)
  const [lastLanguageId, setLastLanguageId] = useState(languageId)
  const [isRubricPickerOpen, setIsRubricPickerOpen] = useState(false)
  const [isVersionPickerOpen, setIsVersionPickerOpen] = useState(false)

  // Đổi ngôn ngữ là đổi cả danh sách rubric lẫn danh sách chính sách, nên mọi lựa chọn cũ đều hết
  // hiệu lực. Đặt lại ngay trong lúc render (không qua useEffect) là cách React khuyến nghị cho việc
  // chỉnh state theo prop: React render lại trước khi vẽ nên không có khung hình nào hiện lựa chọn cũ.
  if (languageId !== lastLanguageId) {
    setLastLanguageId(languageId)
    setRubricId('')
    setRubricVersionId('')
    setPickedPolicyId(null)
  }

  const isSchool = scope === 'school'
  const isLanguageMissing = requiresLanguage && !languageId
  const canLoadRubrics = !isLanguageMissing

  const schoolRubricsQuery = useSchoolRubricsWithPublishedVersionsQuery(
    { languageId },
    { enabled: isSchool && canLoadRubrics },
  )
  const teacherRubricsQuery = useTeacherRubricsQuery({ languageId }, { enabled: !isSchool && canLoadRubrics })
  // Chỉ nạp version của đúng rubric đang chọn: hook nhận mảng nên mảng rỗng = không bắn request nào.
  const teacherVersionsQueries = useTeacherRubricVersionsQueries(!isSchool && rubricId ? [rubricId] : [])

  const rubrics = (isSchool ? schoolRubricsQuery.data : teacherRubricsQuery.data) ?? []
  const isLoadingRubrics = isSchool ? schoolRubricsQuery.isLoading : teacherRubricsQuery.isLoading
  const versions = isSchool
    ? (schoolRubricsQuery.data?.find((rubric) => rubric.id === rubricId)?.versions ?? [])
    : (teacherVersionsQueries[0]?.data ?? [])
  const isLoadingVersions = isSchool ? schoolRubricsQuery.isLoading : Boolean(teacherVersionsQueries[0]?.isLoading)
  const selectedRubric = rubrics.find((rubric) => rubric.id === rubricId) ?? null
  const selectedVersion = versions.find((version) => version.id === rubricVersionId) ?? null

  const schoolPoliciesQuery = useMatchingSchoolAssessmentPoliciesQuery(
    { languageId, rubricVersionId },
    { enabled: isSchool },
  )
  const teacherPoliciesQuery = useMatchingTeacherAssessmentPoliciesQuery(
    { languageId, rubricVersionId },
    { enabled: !isSchool },
  )
  const policiesQuery = isSchool ? schoolPoliciesQuery : teacherPoliciesQuery
  const policies = policiesQuery.data ?? []

  // Chốt lại theo đúng danh sách đang hiện: đổi ngôn ngữ hay đổi phiên bản làm danh sách khác đi, giữ
  // nguyên id đã bấm trước đó là gửi lên một chính sách không còn nằm trong danh sách nào cả -- server
  // chỉ kiểm PUBLISHED và đúng trường nên nó lọt, rồi bài chấm bằng thang của ngôn ngữ khác.
  const assessmentPolicyId = policies.some((policy) => policy.id === pickedPolicyId)
    ? pickedPolicyId
    : policies.length === 1
      ? policies[0].id
      : null

  const isLoadingPolicies = Boolean(rubricVersionId) && policiesQuery.isLoading
  const hasNoPolicy = Boolean(rubricVersionId) && !isLoadingPolicies && policies.length === 0
  const isBlocked = !assessmentPolicyId

  useEffect(() => {
    onChange({ assessmentPolicyId, isBlocked, rubricVersionId: rubricVersionId || null })
    // onChange do form truyền xuống, không đưa vào deps để tránh vòng lặp khi form khai báo inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentPolicyId, isBlocked, rubricVersionId])

  function selectRubric(nextRubricId: string) {
    setRubricId(nextRubricId)
    setRubricVersionId('')
    setPickedPolicyId(null)
  }

  function selectRubricVersion(nextRubricVersionId: string) {
    setRubricVersionId(nextRubricVersionId)
    setPickedPolicyId(null)
  }

  return (
    <>
    <div className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <span className="text-sm font-bold text-slate-700">Chính sách đánh giá</span>
      <p className="text-xs text-slate-500">
        Bắt buộc — quyết định thang điểm và khung năng lực dùng để chấm bài. Chọn thang đánh giá, phiên bản đã xuất
        bản, rồi chọn chính sách khớp với phiên bản đó.
      </p>

      <div className="mt-1.5 grid gap-2.5 rounded-lg border border-slate-200 bg-white p-3.5">
        <div className="grid gap-1.5 text-[13px] font-bold text-slate-700">
          Thang đánh giá (Rubric)
          <button
            className={TRIGGER_CLASS}
            disabled={isLanguageMissing || isLoadingRubrics}
            onClick={() => setIsRubricPickerOpen(true)}
            type="button"
          >
            <span className={`truncate ${selectedRubric ? 'text-slate-950' : 'text-slate-400'}`}>
              {isLanguageMissing
                ? 'Chọn ngôn ngữ trước'
                : isLoadingRubrics
                  ? 'Đang tải…'
                  : selectedRubric
                    ? `${selectedRubric.name} (${selectedRubric.code})`
                    : 'Chọn thang đánh giá'}
            </span>
            <ChevronDown aria-hidden="true" className="ml-2 size-4 shrink-0 text-slate-400" />
          </button>
        </div>

        {!isLanguageMissing && !isLoadingRubrics && rubrics.length === 0 ? (
          <p className="text-xs font-semibold text-amber-700">
            Trường chưa có thang đánh giá nào cho ngôn ngữ này. Sao một bản mẫu của hệ thống về trước khi tạo kỳ thi.
          </p>
        ) : null}

        <div className="grid gap-1.5 text-[13px] font-bold text-slate-700">
          Phiên bản đã xuất bản
          <button
            className={TRIGGER_CLASS}
            disabled={!rubricId || isLoadingVersions}
            onClick={() => setIsVersionPickerOpen(true)}
            type="button"
          >
            <span className={`truncate ${selectedVersion ? 'text-slate-950' : 'text-slate-400'}`}>
              {!rubricId
                ? 'Chọn thang đánh giá trước'
                : isLoadingVersions
                  ? 'Đang tải…'
                  : selectedVersion
                    ? `v${selectedVersion.version} · ${selectedVersion.code} · ${selectedVersion.name}`
                    : 'Chọn phiên bản'}
            </span>
            <ChevronDown aria-hidden="true" className="ml-2 size-4 shrink-0 text-slate-400" />
          </button>
        </div>

        {rubricId && !isLoadingVersions && versions.length === 0 ? (
          <p className="text-xs font-semibold text-amber-700">
            Thang đánh giá này chưa có phiên bản nào được xuất bản. Chọn thang khác.
          </p>
        ) : null}

        <div className="grid gap-1.5">
          <span className="text-[13px] font-bold text-slate-700">Chính sách khớp với phiên bản đã chọn</span>

          {!rubricVersionId ? (
            <p className="text-xs text-slate-400">Chọn phiên bản thang đánh giá để xem các chính sách khớp.</p>
          ) : null}

          {isLoadingPolicies ? <p className="text-xs text-slate-400">Đang tìm chính sách đánh giá phù hợp…</p> : null}

          {hasNoPolicy ? (
            <p className="text-xs font-semibold text-amber-700">
              Chưa có chính sách đánh giá đã xuất bản cho phiên bản này. Chọn phiên bản khác, hoặc xuất bản một chính
              sách cho phiên bản này trước.
            </p>
          ) : null}

          {policies.map((policy) => (
            <button
              aria-pressed={assessmentPolicyId === policy.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs font-semibold ${
                assessmentPolicyId === policy.id
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              key={policy.id}
              onClick={() => setPickedPolicyId(policy.id)}
              type="button"
            >
              <span>
                <span className="block text-indigo-700">
                  Phạm vi: {getAssessmentPolicyScopeLabel(policy)} · {policy.targetFrameworkBand?.label ?? '—'}
                </span>
                Phiên bản {policy.version} · {getAssessmentPolicyStrictnessLabel(policy.strictness)} · Điểm đạt{' '}
                {policy.passingScore ?? '-'}
              </span>
              <span className="shrink-0">
                {formatDate(policy.effectiveFrom)}
                {policy.effectiveTo ? ` – ${formatDate(policy.effectiveTo)}` : ''}
              </span>
            </button>
          ))}

          {policies.length > 1 && !assessmentPolicyId ? (
            <p className="text-xs font-semibold text-slate-600">
              Có {policies.length} chính sách khớp — chọn một trước khi tạo.
            </p>
          ) : null}
        </div>
      </div>
    </div>

    <TablePickerDialog
      columns={[
        { header: 'Tên', render: (rubric) => rubric.name },
        { header: 'Mã', render: (rubric) => rubric.code },
      ]}
      emptyMessage="Trường chưa có thang đánh giá nào cho ngôn ngữ này."
      getId={(rubric) => rubric.id}
      getSelectedLabel={(rubric) => `${rubric.name} (${rubric.code})`}
      initialSelectedId={rubricId}
      isLoading={isLoadingRubrics}
      isOpen={isRubricPickerOpen}
      items={rubrics}
      onClose={() => setIsRubricPickerOpen(false)}
      onConfirm={(rubric) => selectRubric(rubric.id)}
      subtitle="Chọn thang đánh giá dùng để chấm bài."
      title="Chọn thang đánh giá"
    />

    <TablePickerDialog
      columns={[
        { header: 'Phiên bản', render: (version) => `v${version.version}` },
        { header: 'Mã', render: (version) => version.code },
        { header: 'Tên', render: (version) => version.name },
      ]}
      emptyMessage="Thang đánh giá này chưa có phiên bản nào được xuất bản."
      getId={(version) => version.id}
      getSelectedLabel={(version) => `v${version.version} · ${version.code} · ${version.name}`}
      initialSelectedId={rubricVersionId}
      isLoading={isLoadingVersions}
      isOpen={isVersionPickerOpen}
      items={versions}
      onClose={() => setIsVersionPickerOpen(false)}
      onConfirm={(version) => selectRubricVersion(version.id)}
      subtitle="Chọn phiên bản đã xuất bản của thang đánh giá."
      title="Chọn phiên bản"
    />
    </>
  )
}
