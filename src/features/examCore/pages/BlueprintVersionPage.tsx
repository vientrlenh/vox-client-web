import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { examQueryKeys, useExamBlueprintQuery } from '../api/queries'
import { useDuplicateBlueprintVersionMutation } from '../api/mutations'
import { getBlueprintVersionStatusDisplay } from '../types'

type BlueprintVersionPageProps = {
  basePath: string
}

function BlueprintVersionPage({ basePath }: BlueprintVersionPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { blueprintId, versionId } = useParams()
  const blueprintQuery = useExamBlueprintQuery(blueprintId ?? null)
  const blueprint = blueprintQuery.data
  const version = blueprint?.versions.find((candidate) => candidate.id === versionId) ?? null
  const duplicateVersionMutation = useDuplicateBlueprintVersionMutation()

  if (blueprintQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (!blueprint || !version) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy phiên bản blueprint.</section>
    )
  }

  const detailPath = `${basePath}/${blueprint.id}`
  const display = getBlueprintVersionStatusDisplay(version.status)

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
        onClick={() => navigate(detailPath)}
        type="button"
      >
        ← {blueprint.name}
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
              {(version.weightSum ?? 0).toFixed(2)}
              {version.totalTimeLimitSeconds ? ` · ${Math.round(version.totalTimeLimitSeconds / 60)} phút` : ' · chưa đặt thời lượng'}
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
                {section.sectionTimeLimitSeconds ? ` · ${Math.round(section.sectionTimeLimitSeconds / 60)} phút` : ''}
              </div>
              {section.slots.length ? (
                <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                  {section.slots.map((slot) => (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600" key={slot.id}>
                      {slot.slotType === 'FIXED'
                        ? `Cố định: ${slot.fixedQuestion?.code ?? '-'}`
                        : `Chọn ngẫu nhiên${slot.selectionSpec?.topicId ? ` · ${slot.selectionSpec.topicId}` : ''}`}
                      {' · trọng số '}
                      {slot.weight?.toFixed(2) ?? '-'}
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
