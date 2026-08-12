import { useQueryClient } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { toApiError } from '@/shared/api'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { examQueryKeys, useExamBlueprintSummaryQuery, useExamBlueprintVersionQuery } from '../api/queries'
import { useDuplicateBlueprintVersionMutation } from '../api/mutations'
import {
  formatDurationSeconds,
  getBlueprintVersionStatusDisplay,
  type BlueprintNavState,
  type ExamBlueprintSectionDto,
} from '../types'
import { getQuestionAttemptSeconds } from '../utils/timeQuota'

type BlueprintVersionPageProps = {
  basePath: string
}

function sectionDurationSeconds(section: ExamBlueprintSectionDto): number {
  return section.slots.reduce(
    (sum, slot) => sum + (slot.slotType === 'FIXED' && slot.fixedQuestion ? getQuestionAttemptSeconds(slot.fixedQuestion) : 0),
    0,
  )
}

function BlueprintVersionPage({ basePath }: BlueprintVersionPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { blueprintId, versionId } = useParams()
  const navState = location.state as BlueprintNavState
  const blueprintQuery = useExamBlueprintSummaryQuery(blueprintId ?? null)
  const versionQuery = useExamBlueprintVersionQuery(versionId ?? null)
  const blueprint = blueprintQuery.data
  const version = versionQuery.data
  const duplicateVersionMutation = useDuplicateBlueprintVersionMutation()

  if (blueprintQuery.isLoading || versionQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (blueprintQuery.isError || versionQuery.isError) {
    const error = blueprintQuery.error ?? versionQuery.error
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Không tải được phiên bản blueprint: {toApiError(error).message}
        <button
          className="ml-2 font-bold underline"
          onClick={() => {
            void blueprintQuery.refetch()
            void versionQuery.refetch()
          }}
          type="button"
        >
          Thử lại
        </button>
      </section>
    )
  }

  if (!blueprint || !version || version.blueprintId !== blueprint.id) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy phiên bản blueprint.</section>
    )
  }

  const detailPath = `${basePath}/${blueprint.id}`
  const display = getBlueprintVersionStatusDisplay(version.status)
  // Trang này mở được từ nhiều nơi (danh sách phiên bản của blueprint, tab "Chốt khung đề" của kỳ thi…)
  // nên nút "←" đi theo đích do nơi gọi khai báo; không có thì mới rơi về trang blueprint.
  const backPath = navState?.returnTo ?? detailPath
  const backLabel = navState?.returnLabel ?? blueprint.name

  async function handleDuplicate() {
    const duplicated = await duplicateVersionMutation.mutateAsync(version!.id)
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
    navigate(`${basePath}/${blueprint!.id}/versions/${duplicated.id}/edit`, {
      state: { successMessage: `Đã nhân bản thành phiên bản ${duplicated.code} (bản nháp).` },
    })
  }

  return (
    <section className="mx-auto max-w-240">
      <button
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600"
        onClick={() => navigate(backPath, { state: navState?.returnState })}
        type="button"
      >
        ← {backLabel}
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-900">{version.code}</h1>
              <StatusBadge {...display} />
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              {version.sectionCount ?? version.sections.length} phần · {version.slotCount ?? 0} ô câu hỏi · tổng trọng số{' '}
              {(version.weightSum ?? 0).toFixed(2)} · thời lượng {formatDurationSeconds(version.totalTimeLimitSeconds)}
            </p>
            {version.description ? <p className="mt-1 text-[13px] text-slate-500">{version.description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9.5 items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              disabled={version.status !== 'DRAFT'}
              onClick={() => navigate(`${basePath}/${blueprint.id}/versions/${version.id}/edit`)}
              title={version.status === 'DRAFT' ? undefined : 'Chỉ chỉnh sửa được khi phiên bản đang ở Bản nháp'}
              type="button"
            >
              Cập nhật
            </button>
            <button
              className="inline-flex h-9.5 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => void handleDuplicate()}
              type="button"
            >
              Nhân bản phiên bản
            </button>
          </div>
        </div>

        <div className="mt-4.5 grid gap-3">
          {version.sections.map((section) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={section.id}>
              <div className="text-sm font-bold text-slate-900">{section.title}</div>
              <div className="text-xs text-slate-500">
                {section.slots.length} ô · trọng số {section.sectionWeight?.toFixed(2) ?? '-'}
                {` · thời lượng ${formatDurationSeconds(sectionDurationSeconds(section))}`}
              </div>
              {section.slots.length ? (
                <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                  {section.slots.map((slot) => (
                    <div
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                      key={slot.id}
                    >
                      <span>
                        {slot.slotType === 'FIXED'
                          ? `Cố định: ${slot.fixedQuestion?.code ?? (slot.fixedQuestionId ? 'đã chọn — không có quyền xem' : '-')}`
                          : `Chọn ngẫu nhiên${slot.selectionSpec?.topicId ? ` · ${slot.selectionSpec.topicId}` : ''}`}
                        {' · trọng số '}
                        {slot.weight?.toFixed(2) ?? '-'}
                        {slot.slotType === 'FIXED' && slot.fixedQuestion
                          ? ` · chuẩn bị ${formatDurationSeconds(slot.fixedQuestion.preparationTimeSeconds)} · tối đa ${formatDurationSeconds(slot.fixedQuestion.maxResponseSeconds)}`
                          : ''}
                      </span>
                      {slot.slotType === 'FIXED' && slot.fixedQuestion ? (
                        <a
                          aria-label={`Xem chi tiết ${slot.fixedQuestion.code}`}
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                          href={`${basePath.replace(/\/blueprints$/, '/questions')}/${slot.fixedQuestion.id}`}
                          rel="noopener noreferrer"
                          target="_blank"
                          title="Xem chi tiết câu hỏi"
                        >
                          <Eye aria-hidden="true" className="size-3.5" />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TeacherBlueprintVersionDetailPage() {
  return <BlueprintVersionPage basePath="/teacher/blueprints" />
}

export function SchoolAdminBlueprintVersionDetailPage() {
  return <BlueprintVersionPage basePath="/school-admin/blueprints" />
}
