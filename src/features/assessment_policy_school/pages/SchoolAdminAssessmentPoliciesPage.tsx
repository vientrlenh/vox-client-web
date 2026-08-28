// src/features/assessment_policy_school/pages/SchoolAdminAssessmentPoliciesPage.tsx

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  Filter,
  Languages,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  LibraryBig,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';

import { useSchoolAssessmentPoliciesQuery, type SchoolAssessmentPolicyFilter } from '../api/useSchoolAssessmentPoliciesQuery';
import { useCreateSchoolAssessmentPolicyMutation } from '../api/useCreateSchoolAssessmentPolicyMutation';
import { useDeleteSchoolAssessmentPolicyMutation } from '../api/useDeleteSchoolAssessmentPolicyMutation';
import { useUpdateSchoolAssessmentPolicyMutation } from '../api/useUpdateSchoolAssessmentPolicyMutation';
import { usePublishSchoolAssessmentPoliciesByRubricVersionMutation } from '../api/usePublishSchoolAssessmentPoliciesByRubricVersionMutation';
import { usePublishSchoolRubricVersionMutation } from '../api/usePublishSchoolRubricVersionMutation';
import { useLanguageOptionsQuery } from '../api/useFilterOptionsQuery';
import { useRubricSearchOptionsQuery, useRubricVersionOptionsQuery } from '../api/useRubricOptionsQuery';

import { useFeedbackToast } from '@/shared/ui/useFeedbackToast';
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog';
import { AssessmentPolicyTable } from '../components/AssessmentPolicyTable';
import { CreateAssessmentPolicyDialog } from '../components/CreateAssessmentPolicyDialog';
import { UpdateAssessmentPolicyDialog } from '../components/UpdateAssessmentPolicyDialog';
import { Pagination } from '@/shared/components/Pagination';
import { useAppSelector } from '@/app/store/hooks';
import type { AssessmentPolicy, CreateAssessmentPolicyPayload, UpdateAssessmentPolicyPayload } from '../types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

const STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

// Dùng +07:00 (múi giờ nghiệp vụ) chứ không phải Z (UTC) — nếu không, "từ/đến ngày X" sẽ lệch
// 7 tiếng so với ngày người dùng chọn.
function toOffsetDateTime(dateInputValue: string, endOfDay: boolean) {
  if (!dateInputValue) return null;
  return `${dateInputValue}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`;
}

type FilterSelectProps = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  disabled?: boolean;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

// Select filter dùng chung: label phía trên + icon minh hoạ bên trái + chevron bên phải,
// để 4 dropdown (Trạng thái/Ngôn ngữ/Rubric/Phiên bản) đồng bộ nhau thay vì lặp lại JSX 4 lần.
function FilterSelect({ id, icon: Icon, label, value, disabled, placeholder, options, onChange }: FilterSelectProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500" htmlFor={id}>{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

export function SchoolAdminAssessmentPoliciesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Policy vừa tạo từ trang chi tiết Rubric Version (điều hướng qua đây kèm state) — tô nổi bật
  // đúng dòng đó, hoặc từ trang chi tiết Version (bấm "Xem Chính Sách Đánh Giá") — tự lọc sẵn theo
  // đúng Rubric + Phiên bản đó để người dùng không phải tự mò trong danh sách.
  const navigationState = location.state as { highlightPolicyId?: string; rubricId?: string; rubricVersionId?: string } | null;
  const highlightPolicyId = navigationState?.highlightPolicyId ?? null;
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedRubricId, setSelectedRubricId] = useState(navigationState?.rubricId ?? '');
  const [selectedRubricVersionId, setSelectedRubricVersionId] = useState(navigationState?.rubricVersionId ?? '');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');

  // Không dọn location.state sau khi đọc: nếu "replace" state về null ngay, bấm back từ trang chi
  // tiết policy sẽ quay lại đúng history entry này nhưng state đã bị null hóa, làm mất filter/tô
  // nổi bật đang xem. Vào lại trang này từ menu chính vốn đã là 1 navigation mới không mang state
  // cũ, nên không cần dọn thủ công.
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AssessmentPolicy | null>(null);

  const { data: languages } = useLanguageOptionsQuery();
  const { data: rubrics } = useRubricSearchOptionsQuery(schoolId, selectedLanguageId || undefined);
  const { data: rubricVersions } = useRubricVersionOptionsQuery(schoolId, selectedRubricId || undefined);

  // Dữ liệu riêng cho nút "Xuất bản" nhanh kế bên Import: chỉ fetch khi đã chọn Phiên bản ở bộ lọc
  const selectedVersionOption = rubricVersions?.find((rv) => rv.id === selectedRubricVersionId);
  const { data: selectedVersionPoliciesData } = useSchoolAssessmentPoliciesQuery(
    selectedRubricVersionId ? schoolId : undefined,
    { rubricVersionId: selectedRubricVersionId || null },
    1,
    100
  );
  const selectedVersionDraftCount = (selectedVersionPoliciesData?.content ?? []).filter((p) => p.status === 'DRAFT').length;
  const canQuickPublish = Boolean(selectedRubricVersionId) && (selectedVersionDraftCount > 0 || selectedVersionOption?.status === 'DRAFT');

  const filter: SchoolAssessmentPolicyFilter = {
    status: selectedStatus || null,
    languageId: selectedLanguageId || null,
    rubricVersionId: selectedRubricVersionId || null,
    effectiveFrom: toOffsetDateTime(effectiveFrom, false),
    effectiveTo: toOffsetDateTime(effectiveTo, true),
  };

  const hasActiveFilters = Boolean(
    selectedStatus || selectedLanguageId || selectedRubricVersionId || effectiveFrom || effectiveTo
  );

  const handleResetFilters = () => {
    setSelectedStatus('');
    setSelectedLanguageId('');
    setSelectedRubricId('');
    setSelectedRubricVersionId('');
    setEffectiveFrom('');
    setEffectiveTo('');
    setPage(1);
  };

  const { data, isLoading, isError, refetch, isFetching } = useSchoolAssessmentPoliciesQuery(schoolId, filter, page, pageSize);

  const policies = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const { mutateAsync: createPolicy, isPending: isCreating } = useCreateSchoolAssessmentPolicyMutation(schoolId);
  const { mutateAsync: deletePolicy } = useDeleteSchoolAssessmentPolicyMutation(schoolId);
  const { mutateAsync: updatePolicy, isPending: isUpdating } = useUpdateSchoolAssessmentPolicyMutation(schoolId);
  const { mutateAsync: publishPoliciesByVersion, isPending: isPublishingPolicies } = usePublishSchoolAssessmentPoliciesByRubricVersionMutation(schoolId);
  const { mutateAsync: publishRubricVersion, isPending: isPublishingVersion } = usePublishSchoolRubricVersionMutation(schoolId);
  const isQuickPublishing = isPublishingPolicies || isPublishingVersion;
  const { showError, showSuccess, feedbackToast } = useFeedbackToast();
  const { confirm, dialog: confirmationDialog } = useConfirmationDialog();

  const handleCreatePolicy = async (formDataList: CreateAssessmentPolicyPayload[]) => {
    try {
      const createdPolicyIds = await createPolicy(formDataList);
      setIsCreateModalOpen(false);
      showSuccess(`Đã tạo thành công ${createdPolicyIds.length} Chính Sách Đánh Giá.`);
    } catch (error) {
      const err = error as Error;
      showError(err.message || 'Có lỗi xảy ra khi tạo Chính Sách Đánh Giá.');
    }
  };

  const handleUpdatePolicy = async (formData: UpdateAssessmentPolicyPayload) => {
    if (!editingPolicy) return;

    try {
      await updatePolicy({ policyId: editingPolicy.id, payload: formData });
      setEditingPolicy(null);
    } catch (error) {
      const err = error as Error;
      showError(err.message || 'Có lỗi xảy ra khi cập nhật Chính Sách Đánh Giá.');
    }
  };

  const handleQuickPublish = async () => {
    if (!selectedRubricVersionId) return;

    const versionLabel = selectedVersionOption
      ? `${selectedVersionOption.code} (v${selectedVersionOption.version})`
      : 'phiên bản đã chọn';
    const willPublishVersion = selectedVersionOption?.status === 'DRAFT';

    const confirmMessage =
      selectedVersionDraftCount > 0
        ? `Xuất bản hàng loạt ${selectedVersionDraftCount} Chính Sách Đánh Giá đang DRAFT của Rubric Version "${versionLabel}"${
            willPublishVersion ? ' và cập nhật Rubric Version này sang PUBLISHED' : ''
          }?`
        : `Cập nhật Rubric Version "${versionLabel}" sang PUBLISHED?`;

    const isConfirm = await confirm({
      confirmLabel: 'Xuất bản',
      message: confirmMessage,
      title: 'Xuất bản hàng loạt',
    });
    if (!isConfirm) return;

    try {
      if (selectedVersionDraftCount > 0) {
        await publishPoliciesByVersion(selectedRubricVersionId);
      }
      if (willPublishVersion) {
        await publishRubricVersion(selectedRubricVersionId);
      }
      showSuccess('Đã xuất bản thành công.');
    } catch (error) {
      const err = error as Error;
      showError(err.message || 'Có lỗi xảy ra khi xuất bản.');
    }
  };

  const handleDeletePolicy = async (policy: AssessmentPolicy) => {
    const isConfirm = await confirm({
      confirmLabel: 'Xóa vĩnh viễn',
      message: 'Bạn có chắc chắn muốn xóa vĩnh viễn Chính Sách Đánh Giá DRAFT này? Hành động này không thể hoàn tác!',
      title: 'Xóa Chính Sách Đánh Giá',
    });
    if (!isConfirm) return;

    try {
      await deletePolicy(policy.id);
    } catch (error) {
      const err = error as Error;
      showError(err.message || 'Có lỗi xảy ra khi xóa Chính Sách Đánh Giá.');
    }
  };

  return (
    <section className="relative grid gap-6 overflow-hidden">
      {feedbackToast}
      {confirmationDialog}
      {/* vox background decoration — đồng bộ với gradient nút */}
      <div
        className="pointer-events-none absolute -right-40 -top-44 size-[480px] rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.16), rgba(6,182,212,0.10) 55%, transparent 75%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-36 size-[420px] rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12), rgba(139,92,246,0.08) 55%, transparent 75%)' }}
      />

      {/* HEADER */}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="flex items-center gap-2.5 text-2xl font-black text-blue-950 sm:text-3xl">
          <ClipboardCheck className="size-[26px] text-indigo-600" /> Quản lý Chính Sách Đánh Giá
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => refetch()}
            aria-label="Tải lại"
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
          >
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {/* Sao chính sách mẫu nay đi kèm việc sao BỘ TIÊU CHÍ, vì chính sách của trường chỉ gắn
              được vào rubric của chính trường -- xem CloneSystemRubricToSchoolUseCase. Nên lối vào
              nằm ở thư viện bộ tiêu chí mẫu chứ không còn là một màn riêng. */}
          <button
            type="button"
            onClick={() => navigate('/school-admin/rubrics/templates')}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-indigo-600 transition hover:bg-slate-50"
          >
            <LibraryBig className="size-4" /> Sao từ bản mẫu
          </button>

          <button
            type="button"
            onClick={() => navigate('/school-admin/assessment-policies/import')}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-indigo-600 transition hover:bg-slate-50"
          >
            <Upload className="size-4" /> Import Excel/CSV
          </button>

          <button
            type="button"
            onClick={handleQuickPublish}
            disabled={!canQuickPublish || isQuickPublishing}
            title={!selectedRubricVersionId ? 'Chọn Phiên bản ở Bộ lọc trước' : undefined}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-6 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isQuickPublishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            Xuất bản
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-6 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Plus className="size-4" /> Thêm Chính Sách Đánh Giá
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="relative rounded-[14px] border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-indigo-600" />
            <span className="text-sm font-bold text-blue-950">Bộ lọc</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterSelect
            id="statusFilter"
            icon={Filter}
            label="Trạng thái"
            placeholder="Tất cả trạng thái"
            value={selectedStatus}
            options={STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
            onChange={(value) => {
              setSelectedStatus(value);
              setPage(1);
            }}
          />
          <FilterSelect
            id="languageFilter"
            icon={Languages}
            label="Ngôn ngữ"
            placeholder="Tất cả ngôn ngữ"
            value={selectedLanguageId}
            options={languages?.map((lang) => ({ value: lang.id, label: lang.name })) ?? []}
            onChange={(value) => {
              setSelectedLanguageId(value);
              setSelectedRubricId('');
              setSelectedRubricVersionId('');
              setPage(1);
            }}
          />
          <FilterSelect
            id="rubricFilter"
            icon={BookOpen}
            label="Rubric"
            placeholder={selectedLanguageId ? 'Tất cả rubric' : 'Chọn ngôn ngữ trước'}
            value={selectedRubricId}
            disabled={!selectedLanguageId}
            options={rubrics?.map((rubric) => ({ value: rubric.id, label: `${rubric.code} - ${rubric.name}` })) ?? []}
            onChange={(value) => {
              setSelectedRubricId(value);
              setSelectedRubricVersionId('');
              setPage(1);
            }}
          />
          <FilterSelect
            id="rubricVersionFilter"
            icon={Layers}
            label="Phiên bản"
            placeholder={selectedRubricId ? 'Tất cả phiên bản' : 'Chọn rubric trước'}
            value={selectedRubricVersionId}
            disabled={!selectedRubricId}
            options={rubricVersions?.map((rv) => ({
              value: rv.id,
              label: `${rv.code} - ${rv.name} (v${rv.version}) · ${rv.status}`,
            })) ?? []}
            onChange={(value) => {
              setSelectedRubricVersionId(value);
              setPage(1);
            }}
          />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500" htmlFor="effectiveFromFilter">Hiệu lực từ</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="effectiveFromFilter"
                type="date"
                value={effectiveFrom}
                max={effectiveTo || undefined}
                onChange={(e) => {
                  setEffectiveFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500" htmlFor="effectiveToFilter">Hiệu lực đến</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="effectiveToFilter"
                type="date"
                value={effectiveTo}
                min={effectiveFrom || undefined}
                onChange={(e) => {
                  setEffectiveTo(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white">
        <AssessmentPolicyTable
          policies={policies}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onViewDetails={(policy) => navigate(`/school-admin/assessment-policies/${policy.id}`)}
          onEdit={(policy) => setEditingPolicy(policy)}
          onDelete={handleDeletePolicy}
          highlightId={highlightPolicyId}
        />
        {!isLoading && !isError && policies.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} totalElements={totalElements} itemName="assessment policy" onPageChange={setPage} />
        )}
      </div>

      <CreateAssessmentPolicyDialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        schoolId={schoolId}
        onSubmit={handleCreatePolicy}
        isPending={isCreating}
      />

      <UpdateAssessmentPolicyDialog
        policy={editingPolicy}
        onClose={() => setEditingPolicy(null)}
        onSubmit={handleUpdatePolicy}
        isPending={isUpdating}
      />
    </section>
  );
}
