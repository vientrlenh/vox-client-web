// src/features/rubrics/components/CloneSystemRubricDialog.tsx

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Loader2, RefreshCw, X } from 'lucide-react';
import { ErrorBanner } from '@/shared/ui/ErrorBanner';
import { WarningBanner } from '@/shared/ui/WarningBanner';
import { toApiError } from '@/shared/api';
import type { CloneSystemRubricPayload } from '../api/useCloneSystemRubricMutation';
import {
  useSystemRubricTemplateVersionsQuery,
  type SystemRubricTemplate,
} from '../api/useSystemRubricTemplatesQuery';
import { useSystemPolicyTemplatesForVersionQuery } from '../api/useSystemPolicyTemplatesForVersionQuery';
import { ClonePolicyTemplateRow } from './ClonePolicyTemplateRow';
import { EMPTY_POLICY_SELECTION, type ClonePolicySelection } from './clonePolicySelection';
import {
  RUBRIC_ALLOCATION_METHOD,
  RUBRIC_AVERAGE_METHOD,
  RUBRIC_AVERAGE_WEIGHT,
  isAllocationMethod,
  rubricTotalScoreMethodHint,
  rubricTotalScoreMethodLabel,
  weightToPercent,
} from '../types';

type CloneSystemRubricDialogProps = {
  isOpen: boolean;
  template: SystemRubricTemplate | null;
  onClose: () => void;
  onSubmit: (payload: CloneSystemRubricPayload) => Promise<void>;
  isPending: boolean;
  schoolId: string | undefined;
};

const SCORE_METHOD_OPTIONS = [RUBRIC_ALLOCATION_METHOD, RUBRIC_AVERAGE_METHOD];

// Giống CreateAssessmentPolicyDialog: gửi kèm offset +07:00 để BE parse thẳng qua OffsetDateTime.
function toBackendDate(value: string, endOfDay = false) {
  return `${value}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`;
}

export function CloneSystemRubricDialog({
  isOpen,
  template,
  onClose,
  onSubmit,
  isPending,
  schoolId,
}: CloneSystemRubricDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Giữ null nghĩa là "chưa can thiệp, dùng mặc định": tên/mô tả lấy theo bản mẫu, cách tính lấy
  // theo phiên bản đang chọn. Nhờ vậy đổi phiên bản là mặc định tự cập nhật, mà chữ người dùng đã
  // gõ thì không bị nuốt — không cần một useEffect nào để đồng bộ.
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(null);
  const [methodOverride, setMethodOverride] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  // Có mặt trong map = bản mẫu đó được chọn. Khóa theo id chính sách mẫu vì mỗi bản mẫu mang một
  // phạm vi riêng.
  const [policySelections, setPolicySelections] = useState<Record<string, ClonePolicySelection>>({});

  const {
    data: versions,
    isLoading: isVersionsLoading,
    isError: isVersionsError,
    refetch: refetchVersions,
  } = useSystemRubricTemplateVersionsQuery(template?.id, isOpen);

  // Phải tính trước early-return bên dưới để thứ tự hook không đổi giữa các lần render. Cùng công
  // thức với `selectedVersion` phía sau: chưa chọn thì lấy phiên bản đầu danh sách.
  const effectiveVersionId = selectedVersionId || (versions ?? [])[0]?.id;
  const { data: policyTemplates, isLoading: isPolicyTemplatesLoading } =
    useSystemPolicyTemplatesForVersionQuery(effectiveVersionId, isOpen);

  // Reset form mỗi lần mở lại
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setErrorMessage(null);
    if (isOpen) {
      setCode('');
      setNameOverride(null);
      setDescriptionOverride(null);
      setMethodOverride(null);
      setSelectedVersionId('');
      setIsPreviewOpen(false);
      setPolicySelections({});
    }
  }

  if (!isOpen || !template) return null;

  const availableVersions = versions ?? [];
  const selectedVersion =
    availableVersions.find((version) => version.id === selectedVersionId) ?? availableVersions[0];

  const name = nameOverride ?? template.name;
  const description = descriptionOverride ?? template.description ?? '';
  const totalScoreMethod =
    methodOverride ?? selectedVersion?.totalScoreMethod ?? RUBRIC_ALLOCATION_METHOD;

  const sourceMethod = selectedVersion?.totalScoreMethod;
  const isFlatteningWeights =
    isAllocationMethod(sourceMethod) && totalScoreMethod === RUBRIC_AVERAGE_METHOD;

  const availablePolicyTemplates = policyTemplates ?? [];

  const criteria = [...(selectedVersion?.criteria.content ?? [])].sort((a, b) => a.order - b.order);
  const resultBands = [...(selectedVersion?.resultBands.content ?? [])].sort(
    (a, b) => a.order - b.order
  );

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    // Cách tính là thuộc tính của phiên bản, nên đổi phiên bản thì lựa chọn quay về mặc định của
    // phiên bản mới thay vì giữ lại lựa chọn hợp lý cho phiên bản cũ.
    setMethodOverride(null);
    // Chính sách mẫu gắn với đúng một phiên bản, nên lựa chọn cũ không còn nghĩa gì ở phiên bản mới.
    setPolicySelections({});
  };

  const handleTogglePolicy = (policyId: string, selected: boolean) => {
    setPolicySelections((current) => {
      const next = { ...current };
      if (selected) {
        next[policyId] = EMPTY_POLICY_SELECTION;
      } else {
        delete next[policyId];
      }
      return next;
    });
  };

  const handleChangePolicy = (policyId: string, selection: ClonePolicySelection) => {
    setPolicySelections((current) => ({ ...current, [policyId]: selection }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!selectedVersion) {
      setErrorMessage('Bản mẫu này chưa có phiên bản nào được ban hành để sao chép.');
      return;
    }
    if (!code.trim() || !name.trim()) {
      setErrorMessage('Vui lòng nhập mã và tên cho bộ tiêu chí của trường.');
      return;
    }

    // Kiểm ngay tại form thay vì để backend trả lỗi: người dùng sửa được ngay ở đây, và một lỗi ở
    // chính sách thứ hai sẽ cuộn lại cả bản sao rubric (hai use case chung một giao dịch).
    const chosen = availablePolicyTemplates.filter((policy) => policySelections[policy.id]);
    for (const policy of chosen) {
      const selection = policySelections[policy.id];
      const label = policy.targetFrameworkBand?.label ?? policy.targetFrameworkBand?.code ?? 'đã chọn';
      if (!selection.effectiveFrom) {
        setErrorMessage(`Chính sách "${label}": vui lòng chọn ngày bắt đầu hiệu lực.`);
        return;
      }
      if (selection.effectiveTo && selection.effectiveTo < selection.effectiveFrom) {
        setErrorMessage(`Chính sách "${label}": ngày kết thúc không được trước ngày bắt đầu.`);
        return;
      }
      if (policy.gradeLevel) continue;
      const scopeCount =
        (selection.gradeLevelId ? 1 : 0) +
        (selection.schoolGradeId ? 1 : 0) +
        (selection.schoolClassId ? 1 : 0);
      if (scopeCount !== 1) {
        setErrorMessage(
          `Chính sách "${label}": phải chọn đúng 1 phạm vi áp dụng — Khối, Niên khóa HOẶC Lớp.`
        );
        return;
      }
    }

    try {
      await onSubmit({
        sourceRubricVersionId: selectedVersion.id,
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        totalScoreMethod,
        policies: chosen.map((policy) => {
          const selection = policySelections[policy.id];
          // Bản mẫu đã khai Khối thì KHÔNG gửi phạm vi nào -- backend coi mọi giá trị ở đây là ý
          // định ghi đè và từ chối cả yêu cầu.
          const inheritsScope = Boolean(policy.gradeLevel);
          return {
            sourcePolicyId: policy.id,
            gradeLevelId: inheritsScope ? undefined : selection.gradeLevelId || undefined,
            schoolGradeId: inheritsScope ? undefined : selection.schoolGradeId || undefined,
            schoolClassId: inheritsScope ? undefined : selection.schoolClassId || undefined,
            effectiveFrom: toBackendDate(selection.effectiveFrom),
            effectiveTo: selection.effectiveTo ? toBackendDate(selection.effectiveTo, true) : undefined,
          };
        }),
      });
    } catch (error) {
      // Lỗi máy chủ phải hiện ngay trong modal: banner của trang nằm sau lớp phủ nên không đọc được.
      setErrorMessage(toApiError(error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/45" onClick={!isPending ? onClose : undefined} />

      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-blue-950">
              <Copy className="size-5 text-indigo-600" /> Sao bộ tiêu chí mẫu về trường
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Bản mẫu: <span className="font-bold text-slate-900">{template.name}</span>
              <span className="ml-2 font-mono text-xs text-slate-500">{template.code}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <ErrorBanner className="mb-5" message={errorMessage} />

            {/* 1. CHỌN PHIÊN BẢN MẪU */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Phiên bản mẫu <span className="text-red-500">*</span>
              </label>

              {isVersionsLoading ? (
                <p className="flex items-center gap-2 py-2 text-sm text-slate-500">
                  <RefreshCw className="size-4 animate-spin text-indigo-600" /> Đang tải các phiên bản
                  đã ban hành...
                </p>
              ) : isVersionsError ? (
                <div className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-semibold text-red-600">Không tải được danh sách phiên bản.</span>
                  <button
                    type="button"
                    onClick={() => refetchVersions()}
                    className="font-bold text-indigo-600 underline hover:text-indigo-700"
                  >
                    Thử lại
                  </button>
                </div>
              ) : availableVersions.length === 0 ? (
                <p className="py-2 text-sm text-amber-700">
                  Bản mẫu này chưa có phiên bản nào được ban hành, nên chưa sao về được.
                </p>
              ) : (
                <>
                  <select
                    value={selectedVersion?.id ?? ''}
                    onChange={(event) => handleSelectVersion(event.target.value)}
                    disabled={isPending}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  >
                    {availableVersions.map((version) => (
                      <option key={version.id} value={version.id}>
                        v{version.version} — {version.name}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
                    <span>
                      <span className="font-medium">Thang điểm:</span>{' '}
                      {selectedVersion?.scoringScaleMin} - {selectedVersion?.scoringScaleMax}
                    </span>
                    <span>
                      <span className="font-medium">Tiêu chí:</span>{' '}
                      {selectedVersion?.criteria.totalElements ?? 0}
                    </span>
                    <span>
                      <span className="font-medium">Thang xếp loại:</span>{' '}
                      {selectedVersion?.resultBands.totalElements ?? 0}
                    </span>
                    <span>
                      <span className="font-medium">Cách tính gốc:</span>{' '}
                      {rubricTotalScoreMethodLabel(sourceMethod)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen((open) => !open)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    {isPreviewOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    {isPreviewOpen ? 'Thu gọn nội dung bản mẫu' : 'Xem trước nội dung bản mẫu'}
                  </button>
                </>
              )}
            </div>

            {/* 2. XEM TRƯỚC NỘI DUNG SẼ ĐƯỢC SAO */}
            {isPreviewOpen && selectedVersion && (
              <div className="mt-4 grid gap-4">
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-950">
                    Tiêu chí ({criteria.length}/{selectedVersion.criteria.totalElements})
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="sticky top-0 bg-white text-xs font-bold text-slate-500">
                        <tr className="border-b border-slate-100">
                          <th className="px-4 py-2">Mã</th>
                          <th className="px-4 py-2">Tên tiêu chí</th>
                          <th className="px-4 py-2 text-right">Trọng số</th>
                          <th className="px-4 py-2 text-right">Điểm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {criteria.map((criterion) => (
                          <tr key={criterion.id}>
                            <td className="px-4 py-2 font-mono text-xs text-slate-600">{criterion.code}</td>
                            <td className="px-4 py-2 font-medium text-slate-900">{criterion.name}</td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {isFlatteningWeights ? (
                                <span>
                                  <span className="text-slate-400 line-through">
                                    {weightToPercent(criterion.weight)}%
                                  </span>{' '}
                                  <span className="font-bold text-amber-700">
                                    {weightToPercent(RUBRIC_AVERAGE_WEIGHT)}%
                                  </span>
                                </span>
                              ) : (
                                <span>{weightToPercent(criterion.weight)}%</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                              {criterion.minScore} - {criterion.maxScore}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-950">
                    Thang xếp loại ({resultBands.length}/{selectedVersion.resultBands.totalElements})
                  </p>
                  {resultBands.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">
                      Bản mẫu chưa cấu hình thang xếp loại.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="sticky top-0 bg-white text-xs font-bold text-slate-500">
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-2">Mã</th>
                            <th className="px-4 py-2">Xếp loại</th>
                            <th className="px-4 py-2 text-right">Khoảng điểm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {resultBands.map((band) => (
                            <tr key={band.id}>
                              <td className="px-4 py-2 font-mono text-xs text-slate-600">{band.code}</td>
                              <td className="px-4 py-2 font-medium text-slate-900">{band.name}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                                {band.scoreMin} - {band.scoreMax}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. THÔNG TIN BẢN SAO CỦA TRƯỜNG */}
            <div className="mt-6 grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Mã bộ tiêu chí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    disabled={isPending}
                    maxLength={50}
                    placeholder="VD: ENG-K10"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  />
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Mã do trường tự đặt, không sao từ bản mẫu — đây là thứ phân biệt các bản sao của
                    cùng một bản mẫu.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Tên bộ tiêu chí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setNameOverride(event.target.value)}
                    disabled={isPending}
                    maxLength={255}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Mô tả</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(event) => setDescriptionOverride(event.target.value)}
                  disabled={isPending}
                  maxLength={2048}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">Cách tính điểm cho bản sao</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SCORE_METHOD_OPTIONS.map((method) => (
                    <label
                      key={method}
                      className={`cursor-pointer rounded-lg border p-3 transition ${
                        totalScoreMethod === method
                          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="totalScoreMethod"
                          value={method}
                          checked={totalScoreMethod === method}
                          onChange={() => setMethodOverride(method)}
                          disabled={isPending}
                          className="size-4 accent-indigo-600"
                        />
                        <span className="text-sm font-bold text-slate-900">
                          {rubricTotalScoreMethodLabel(method)}
                        </span>
                        {method === sourceMethod && (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                            như bản mẫu
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 block text-xs leading-5 text-slate-600">
                        {rubricTotalScoreMethodHint(method)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <WarningBanner
                message={
                  isFlatteningWeights
                    ? 'Chọn "Trung bình" sẽ bỏ tỉ lệ phân bổ của bản mẫu và cho mọi tiêu chí cân bằng ở 100%. Đây là ý nghĩa của cách tính đó, không phải mất mát ngoài ý muốn — nhưng chiều ngược lại thì không khôi phục được, muốn quay về phân bổ thì phải nhập lại trọng số.'
                    : null
                }
              />
            </div>

            {/* 4. CHÍNH SÁCH CHẤM ĐI KÈM */}
            <div className="mt-6">
              <p className="mb-1 text-sm font-bold text-slate-700">Chính sách chấm cho bản sao</p>
              <p className="mb-3 text-xs leading-5 text-slate-500">
                Bản sao ra ở trạng thái Nháp và chỉ ban hành được khi đã có chính sách chấm liên kết,
                nên chọn luôn ở đây là bước tự nhiên. Mỗi chính sách cần một phạm vi RIÊNG — hai chính
                sách trùng phạm vi sẽ bị từ chối.
              </p>

              {isPolicyTemplatesLoading ? (
                <p className="flex items-center gap-2 py-2 text-sm text-slate-500">
                  <RefreshCw className="size-4 animate-spin text-indigo-600" /> Đang tải chính sách mẫu...
                </p>
              ) : availablePolicyTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                  Phiên bản mẫu này chưa có chính sách chấm mẫu nào được ban hành. Vẫn sao bộ tiêu chí
                  về được, nhưng phải tự tạo chính sách cho nó trước khi ban hành.
                </div>
              ) : (
                <div className="grid gap-3">
                  {availablePolicyTemplates.map((policy) => (
                    <ClonePolicyTemplateRow
                      key={policy.id}
                      isPending={isPending}
                      onChange={(next) => handleChangePolicy(policy.id, next)}
                      onToggle={(selected) => handleTogglePolicy(policy.id, selected)}
                      schoolId={schoolId}
                      selection={policySelections[policy.id] ?? null}
                      template={policy}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
            <p className="text-xs leading-5 text-slate-500">
              Bộ tiêu chí và chính sách đều được tạo ở trạng thái{' '}
              <span className="font-bold text-slate-700">Nháp</span>, để trường rà lại trước khi ban
              hành.
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isPending || !selectedVersion}
                className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Sao về trường'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
