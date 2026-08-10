import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, Lock } from 'lucide-react'
import { useSupportedLanguagesQuery } from '@/features/languages/api/useSupportedLanguagesQuery'
import { toApiError } from '@/shared/api'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { examQueryKeys, useExamBlueprintSummaryQuery, useExamBlueprintsQuery } from '@/features/examCore/api/queries'
import { formatDurationSeconds, getBlueprintVersionStatusDisplay } from '@/features/examCore/types'
import { buildTimeQuotaWarning } from '@/features/examCore/utils/timeQuota'
import { useMySubscriptionQuery } from '@/features/subscription_school/api/useMySubscriptionQuery'
import { useAttachExamBlueprintMutation } from '../api/useExamMutations'
import type { ExamAuthority } from '@/features/examCore/utils/examPermissions'

const ACTIVE_LANGUAGE_FILTERS = { isActive: 'active' as const, search: '' }

type BlueprintAttachPanelProps = {
  /** Quyền đã giải sẵn ở trang chi tiết — panel không tự suy lại để hai chỗ không lệch nhau. */
  authority: ExamAuthority
  blueprintId?: string | null
  blueprintVersionId?: string | null
  examId: string
  hasPapers: boolean
  /**
   * Kỳ thi đã bắt đầu trở đi (`isExamLockedForEditing`) thì khung đề coi như chốt cứng — đổi blueprint
   * hay chốt sang phiên bản khác lúc này là làm lệch mã đề thí sinh đang làm.
   */
  locked?: boolean
  onCreateVersion: (blueprintId: string) => void
  onOpenBlueprint: (blueprintId: string, versionId?: string) => void
  optional?: boolean
}

const PAPERS_EXIST_MESSAGE =
  'Kỳ thi đã có mã đề — phải xóa hết mã đề hiện có trước khi đổi blueprint hoặc chốt sang phiên bản khác.'

/**
 * Nút "Đổi blueprint khác" bị `disabled` trông gần như nút thường, nên lý do phải hiện thành chữ chứ
 * không nấp trong tooltip — kèm luôn lối thoát, vì người đọc dòng này đang bị chặn.
 */
function BlueprintLockedByPapersHint({ canManagePapers }: { canManagePapers: boolean }) {
  return (
    <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-600">
      {PAPERS_EXIST_MESSAGE}{' '}
      {canManagePapers ? (
        <>
          Sang tab <b className="text-slate-900">Tạo mã đề</b> để xóa.
        </>
      ) : (
        <>
          Nhờ chủ tịch hội đồng hoặc quản trị trường xóa giúp ở tab <b className="text-slate-900">Tạo mã đề</b>.
        </>
      )}
    </p>
  )
}

export function BlueprintAttachPanel({
  authority,
  blueprintId,
  blueprintVersionId,
  examId,
  hasPapers,
  locked = false,
  onCreateVersion,
  onOpenBlueprint,
  optional = false,
}: BlueprintAttachPanelProps) {
  const queryClient = useQueryClient()
  // Gộp `locked` ngay vào hai cờ gốc: mọi nút ghi trong panel đều dẫn xuất từ chúng, nên không có
  // đường nào lọt lưới khi thêm nút mới về sau.
  const canAttach = authority.canAttachBlueprint && !locked
  const canApproveVersion = authority.canFinalizeBlueprintVersion && !locked
  const canChangeBlueprint = canAttach && !hasPapers
  const canChangeVersion = canApproveVersion && !hasPapers
  const lockedNotice =
    locked && (authority.canAttachBlueprint || authority.canFinalizeBlueprintVersion) ? (
      <div className="mb-3.5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] font-semibold text-amber-800">
        <Lock aria-hidden="true" className="size-4 shrink-0" />
        Kỳ thi đã bắt đầu — khung đề đã chốt, không thể đổi blueprint hay chốt sang phiên bản khác nữa.
      </div>
    ) : null
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [forceReselect, setForceReselect] = useState(false)
  const [showVersionPicker, setShowVersionPicker] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newLanguageId, setNewLanguageId] = useState('')
  const blueprintsQuery = useExamBlueprintsQuery({ isActive: true, keyword, page, size: 10 })
  const attachedBlueprintQuery = useExamBlueprintSummaryQuery(blueprintId ?? null)
  const languagesQuery = useSupportedLanguagesQuery(1, 100, ACTIVE_LANGUAGE_FILTERS)
  const subscriptionQuery = useMySubscriptionQuery()
  const attachMutation = useAttachExamBlueprintMutation()
  const attachLockedRef = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const maxTimePerAttemptMin = subscriptionQuery.data?.plan?.maxTimePerAttemptMin ?? null

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  async function attach(nextBlueprintId: string) {
    if (attachLockedRef.current || attachMutation.isPending) {
      return
    }
    attachLockedRef.current = true
    try {
      await attachMutation.mutateAsync({ blueprintId: nextBlueprintId, blueprintVersionId: null, examId })
      await invalidate()
      setForceReselect(false)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    } finally {
      attachLockedRef.current = false
    }
  }

  async function approveVersion(versionId: string) {
    if (attachLockedRef.current || attachMutation.isPending) {
      return
    }
    const version = attachedBlueprintQuery.data?.versions.find((candidate) => candidate.id === versionId)
    const quotaWarning = buildTimeQuotaWarning(
      `Phiên bản blueprint ${version?.code ?? ''}`.trim(),
      version?.totalTimeLimitSeconds,
      maxTimePerAttemptMin,
    )
    if (quotaWarning) {
      setErrorMessage(`${quotaWarning} Không thể chốt phiên bản này.`)
      return
    }
    attachLockedRef.current = true
    try {
      await attachMutation.mutateAsync({ blueprintVersionId: versionId, examId })
      await invalidate()
      setShowVersionPicker(false)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    } finally {
      attachLockedRef.current = false
    }
  }

  async function handleCreateAndAttach() {
    if (attachLockedRef.current || attachMutation.isPending) {
      return
    }
    if (!newName.trim() || !newLanguageId) {
      setErrorMessage('Vui lòng nhập tên và chọn ngôn ngữ cho blueprint mới.')
      return
    }
    attachLockedRef.current = true
    try {
      await attachMutation.mutateAsync({
        examId,
        newBlueprint: {
          code: newCode.trim(),
          description: newDescription.trim() || null,
          languageId: newLanguageId,
          name: newName.trim(),
        },
      })
      await invalidate()
      setShowCreateForm(false)
      setNewName('')
      setNewCode('')
      setNewDescription('')
      setNewLanguageId('')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    } finally {
      attachLockedRef.current = false
    }
  }

  if (!blueprintId || forceReselect) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5.5">
        <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
        {lockedNotice}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-slate-900">Chọn blueprint để gắn vào kỳ thi</h3>
          {forceReselect ? (
            <button
              className="shrink-0 text-xs font-bold text-slate-400 hover:text-slate-600"
              onClick={() => setForceReselect(false)}
              type="button"
            >
              Hủy
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-[13px] text-slate-500">
          {locked
            ? 'Kỳ thi đã bắt đầu — chỉ xem lại được danh sách blueprint, không gắn thêm được nữa.'
            : hasPapers
              ? PAPERS_EXIST_MESSAGE
              : canAttach
                ? 'Bạn là người ra đề của kỳ thi này nên có thể chọn blueprint có sẵn hoặc tạo mới bên dưới.'
                : 'Chỉ người ra đề của kỳ thi (hoặc quản trị trường) mới gắn được blueprint — bạn có thể xem danh sách nhưng không chọn được.'}
          {optional ? ' Bước này không bắt buộc — có thể bỏ qua và thêm câu hỏi trực tiếp ở tab Đề bài.' : ''}
        </p>
        {blueprintsQuery.isError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
            Không tải được danh sách blueprint: {toApiError(blueprintsQuery.error).message}
            <button className="ml-2 underline" onClick={() => void blueprintsQuery.refetch()} type="button">
              Thử lại
            </button>
          </div>
        ) : null}
        <input
          className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
          onChange={(event) => {
            setKeyword(event.target.value)
            setPage(1)
          }}
          placeholder="Tìm blueprint theo mã hoặc tên…"
          value={keyword}
        />

        <div className="mt-3.5 overflow-x-auto">
          <table className="w-full min-w-150 border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">Tên</th>
                <th className="py-2 pr-3">Mã</th>
                <th className="py-2 pr-3">Phần</th>
                <th className="py-2 pr-3">Phiên bản</th>
                <th className="py-2 pr-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {blueprintsQuery.data?.content.length === 0 ? (
                <tr>
                  <td className="py-4 text-center text-sm text-slate-400" colSpan={5}>
                    Không tìm thấy blueprint phù hợp.
                  </td>
                </tr>
              ) : (
                blueprintsQuery.data?.content.map((blueprint) => (
                  <tr className="border-b border-slate-100 last:border-0" key={blueprint.id}>
                    <td className="py-2.5 pr-3 font-bold text-slate-900">{blueprint.name}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{blueprint.code}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{blueprint.sectionCount ?? 0}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{blueprint.versionCount ?? 0}</td>
                    <td className="py-2.5 pr-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          aria-label={`Xem chi tiết ${blueprint.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          onClick={() => onOpenBlueprint(blueprint.id)}
                          title="Xem chi tiết"
                          type="button"
                        >
                          <Eye aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          className="inline-flex h-8 items-center justify-center rounded-full bg-indigo-600 px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!canChangeBlueprint}
                          onClick={() => void attach(blueprint.id)}
                          title={hasPapers ? PAPERS_EXIST_MESSAGE : undefined}
                          type="button"
                        >
                          Chọn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {blueprintsQuery.data && blueprintsQuery.data.totalElements > 0 ? (
          <div className="mt-3.5 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{blueprintsQuery.data.totalElements} blueprint</span>
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
                disabled={page >= blueprintsQuery.data.totalPages}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}

        {canChangeBlueprint ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            {showCreateForm ? (
              <div className="grid gap-2.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-extrabold text-slate-900">Tạo blueprint mới cho kỳ thi này</h4>
                  <button
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    onClick={() => setShowCreateForm(false)}
                    type="button"
                  >
                    Hủy
                  </button>
                </div>
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Tên blueprint
                  <input
                    className="h-9.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                    onChange={(event) => setNewName(event.target.value)}
                    value={newName}
                  />
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-bold text-slate-700">
                    Mã (không bắt buộc)
                    <input
                      className="h-9.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                      onChange={(event) => setNewCode(event.target.value)}
                      placeholder="Tự sinh nếu để trống"
                      value={newCode}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-700">
                    Ngôn ngữ
                    <select
                      className="h-9.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                      onChange={(event) => setNewLanguageId(event.target.value)}
                      value={newLanguageId}
                    >
                      <option value="">Chọn ngôn ngữ</option>
                      {languagesQuery.data?.content.map((language) => (
                        <option key={language.id} value={language.id}>
                          {language.name ?? language.code ?? language.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Mô tả (không bắt buộc)
                  <textarea
                    className="min-h-16 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                    onChange={(event) => setNewDescription(event.target.value)}
                    value={newDescription}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    className="inline-flex h-9.5 items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-60"
                    disabled={attachMutation.isPending}
                    onClick={() => void handleCreateAndAttach()}
                    type="button"
                  >
                    {attachMutation.isPending ? 'Đang tạo…' : 'Tạo & gắn blueprint'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="text-[13px] font-bold text-indigo-600 hover:underline"
                onClick={() => setShowCreateForm(true)}
                type="button"
              >
                + Tạo blueprint mới cho kỳ thi này
              </button>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  const blueprint = attachedBlueprintQuery.data

  if (attachedBlueprintQuery.isError) {
    return (
      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5.5 text-sm text-red-700">
        Không tải được blueprint đang gắn: {toApiError(attachedBlueprintQuery.error).message}
        <button className="ml-2 font-bold underline" onClick={() => void attachedBlueprintQuery.refetch()} type="button">
          Thử lại
        </button>
      </div>
    )
  }

  if (!blueprint) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5.5 text-sm text-slate-400">
        Đang tải blueprint…
      </div>
    )
  }

  const publishedVersions = blueprint.versions.filter((version) => version.status === 'PUBLISHED')
  const currentVersion = publishedVersions.find((version) => version.id === blueprintVersionId)

  if (!currentVersion || showVersionPicker) {
    return (
      <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-5.5">
        <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
        {lockedNotice}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-extrabold text-slate-900">Chốt phiên bản blueprint</h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Đã gắn <b className="text-slate-900">{blueprint.name}</b>.{' '}
              {locked
                ? 'Kỳ thi đã bắt đầu — không chốt được phiên bản khác nữa, chỉ xem lại.'
                : hasPapers
                  ? PAPERS_EXIST_MESSAGE
                  : canApproveVersion
                    ? 'Chọn một phiên bản đã xuất bản bên dưới để chốt dùng cho kỳ thi.'
                    : 'Chỉ chủ tịch hội đồng của kỳ thi (hoặc quản trị trường) mới chốt được phiên bản — bạn có thể xem trước.'}
            </p>
          </div>
          {showVersionPicker ? (
            <button
              className="shrink-0 text-xs font-bold text-slate-400 hover:text-slate-600"
              onClick={() => setShowVersionPicker(false)}
              type="button"
            >
              Hủy
            </button>
          ) : canAttach ? (
            <button
              className="shrink-0 text-xs font-bold text-slate-400 underline-offset-2 hover:text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline disabled:hover:text-slate-300"
              disabled={hasPapers}
              onClick={() => setForceReselect(true)}
              title={hasPapers ? PAPERS_EXIST_MESSAGE : undefined}
              type="button"
            >
              Đổi blueprint khác
            </button>
          ) : null}
        </div>
        {publishedVersions.length === 0 ? (
          <div className="mt-3 grid gap-2">
            <p className="text-sm text-amber-700">
              {blueprint.versions.length === 0
                ? 'Blueprint chưa có phiên bản nào — tạo phiên bản mới bên dưới.'
                : canApproveVersion
                  ? `Có ${blueprint.versions.length} phiên bản đang ở dạng bản nháp, chưa xuất bản — bấm "Xem chi tiết" để duyệt và xuất bản trước khi chốt dùng cho kỳ thi.`
                  : 'Blueprint chưa có phiên bản nào được xuất bản — chủ tịch hội đồng cần xem chi tiết để duyệt và xuất bản một phiên bản trước.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {blueprint.versions.length > 0 ? (
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  onClick={() => onOpenBlueprint(blueprintId)}
                  type="button"
                >
                  <Eye aria-hidden="true" className="size-3.5" />
                  Xem chi tiết
                </button>
              ) : null}
              {canAttach ? (
                <button
                  className="inline-flex h-9 items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
                  onClick={() => onCreateVersion(blueprintId)}
                  type="button"
                >
                  Tạo phiên bản mới
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-3.5">
            {blueprint.versions.length > publishedVersions.length ? (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                <p className="text-[13px] text-amber-800">
                  Còn {blueprint.versions.length - publishedVersions.length} phiên bản khác (bản nháp/chưa xuất bản) không hiển thị ở
                  đây vì chưa PUBLISHED.
                </p>
                <button
                  className="shrink-0 text-xs font-bold text-amber-800 hover:underline"
                  onClick={() => onOpenBlueprint(blueprintId)}
                  type="button"
                >
                  Xem chi tiết để duyệt
                </button>
              </div>
            ) : null}
            <div className="overflow-x-auto">
            <table className="w-full min-w-150 border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Mã</th>
                  <th className="py-2 pr-3">Phần</th>
                  <th className="py-2 pr-3">Trọng số</th>
                  <th className="py-2 pr-3">Thời lượng</th>
                  <th className="py-2 pr-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {publishedVersions.map((version) => {
                  const isCurrentlyChotted = version.id === blueprintVersionId
                  const quotaWarning = buildTimeQuotaWarning(
                    `Phiên bản blueprint ${version.code}`,
                    version.totalTimeLimitSeconds,
                    maxTimePerAttemptMin,
                  )
                  return (
                  <tr className="border-b border-slate-100 last:border-0" key={version.id}>
                    <td className="py-2.5 pr-3 font-bold text-slate-900">
                      {version.code}
                      {isCurrentlyChotted ? (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          Đang dùng
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{version.sectionCount ?? version.sections?.length ?? 0}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{(version.weightSum ?? 0).toFixed(2)}</td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      <div>{formatDurationSeconds(version.totalTimeLimitSeconds)}</div>
                      {quotaWarning ? <div className="mt-1 text-[11px] font-bold text-red-600">{quotaWarning}</div> : null}
                    </td>
                    <td className="py-2.5 pr-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          aria-label={`Xem chi tiết ${version.code}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          onClick={() => onOpenBlueprint(blueprintId, version.id)}
                          title="Xem chi tiết"
                          type="button"
                        >
                          <Eye aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          className="inline-flex h-8 items-center justify-center rounded-full bg-violet-600 px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!canChangeVersion || isCurrentlyChotted || Boolean(quotaWarning)}
                          onClick={() => void approveVersion(version.id)}
                          title={quotaWarning ?? (isCurrentlyChotted ? 'Đây là phiên bản đang được dùng' : hasPapers ? PAPERS_EXIST_MESSAGE : undefined)}
                          type="button"
                        >
                          Chốt
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
            {canAttach ? (
              <button
                className="mt-3 text-[13px] font-bold text-indigo-600 hover:underline"
                onClick={() => onCreateVersion(blueprintId)}
                type="button"
              >
                + Tạo phiên bản mới
              </button>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  const display = getBlueprintVersionStatusDisplay(currentVersion.status)
  const otherActiveVersions = blueprint.versions.filter(
    (version) => version.id !== currentVersion.id && version.status !== 'ARCHIVED',
  )
  const otherPublishedVersions = otherActiveVersions.filter((version) => version.status === 'PUBLISHED')
  const otherDraftVersions = otherActiveVersions.filter((version) => version.status === 'DRAFT')
  // Khi kỳ thi đã khóa thì "còn phiên bản khác chưa chốt" chỉ là thông tin gây tiếc nuối — không còn
  // thao tác nào đi kèm nên không hiện.
  const showNewerVersionHint = !hasPapers && !locked && otherActiveVersions.length > 0

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-5.5">
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {lockedNotice}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-[15px] font-extrabold text-slate-900">{blueprint.name}</h3>
            <StatusBadge {...display} />
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            {blueprint.code} · phiên bản đã chốt <b className="text-slate-900">{currentVersion.code}</b> ·{' '}
            {currentVersion.sectionCount ?? currentVersion.sections?.length ?? 0} phần
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => onOpenBlueprint(blueprint.id, currentVersion.id)}
            type="button"
          >
            <Eye aria-hidden="true" className="size-3.5" />
            Xem chi tiết
          </button>
          {canChangeVersion && otherPublishedVersions.length > 0 ? (
            <button
              className="inline-flex h-9 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-4 text-xs font-bold text-violet-700 hover:bg-violet-100"
              onClick={() => setShowVersionPicker(true)}
              type="button"
            >
              Đổi phiên bản khác
            </button>
          ) : null}
          {canAttach ? (
            <button
              className="text-xs font-bold text-slate-400 underline-offset-2 hover:text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline disabled:hover:text-slate-300"
              disabled={hasPapers}
              onClick={() => setForceReselect(true)}
              title={hasPapers ? PAPERS_EXIST_MESSAGE : undefined}
              type="button"
            >
              Đổi blueprint khác
            </button>
          ) : null}
        </div>
      </div>
      {canAttach && hasPapers ? <BlueprintLockedByPapersHint canManagePapers={authority.canManagePapers} /> : null}
      {showNewerVersionHint ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
          <p className="text-[13px] text-amber-800">
            Blueprint có {otherActiveVersions.length} phiên bản khác chưa được chốt cho kỳ thi này
            {otherDraftVersions.length > 0 ? ' (một số đang ở dạng bản nháp, chờ duyệt)' : ''}.
          </p>
          {otherDraftVersions.length > 0 && canApproveVersion ? (
            <button
              className="shrink-0 text-xs font-bold text-amber-800 hover:underline"
              onClick={() => onOpenBlueprint(blueprint.id)}
              type="button"
            >
              Xem & duyệt bản nháp
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
