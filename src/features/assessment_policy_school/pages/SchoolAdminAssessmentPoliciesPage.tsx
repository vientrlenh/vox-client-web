// src/features/assessment_policy_school/pages/SchoolAdminAssessmentPoliciesPage.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ClipboardCheck, Filter, Plus, RefreshCw, Upload } from 'lucide-react';

import { useSchoolAssessmentPoliciesQuery, type SchoolAssessmentPolicyFilter } from '../api/useSchoolAssessmentPoliciesQuery';
import { useCreateSchoolAssessmentPolicyMutation } from '../api/useCreateSchoolAssessmentPolicyMutation';
import { useDeleteSchoolAssessmentPolicyMutation } from '../api/useDeleteSchoolAssessmentPolicyMutation';
import { useUpdateSchoolAssessmentPolicyMutation } from '../api/useUpdateSchoolAssessmentPolicyMutation';
import { useLanguageOptionsQuery } from '../api/useFilterOptionsQuery';

import { AssessmentPolicyTable } from '../components/AssessmentPolicyTable';
import { CreateAssessmentPolicyDialog } from '../components/CreateAssessmentPolicyDialog';
import { UpdateAssessmentPolicyDialog } from '../components/UpdateAssessmentPolicyDialog';
import { RubricVersionPoliciesDialog } from '../components/RubricVersionPoliciesDialog';
import { Pagination } from '@/shared/components/Pagination';
import { useAppSelector } from '@/app/store/hooks';
import type { AssessmentPolicy, CreateAssessmentPolicyPayload, UpdateAssessmentPolicyPayload } from '../types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

const STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export function SchoolAdminAssessmentPoliciesPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedLanguageId, setSelectedLanguageId] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AssessmentPolicy | null>(null);
  const [viewingRubricVersionPolicy, setViewingRubricVersionPolicy] = useState<AssessmentPolicy | null>(null);

  const { data: languages } = useLanguageOptionsQuery();

  const filter: SchoolAssessmentPolicyFilter = {
    status: selectedStatus || null,
    languageId: selectedLanguageId || null,
  };

  const { data, isLoading, isError, refetch, isFetching } = useSchoolAssessmentPoliciesQuery(schoolId, filter, page, pageSize);

  const policies = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const { mutateAsync: createPolicy, isPending: isCreating } = useCreateSchoolAssessmentPolicyMutation(schoolId);
  const { mutateAsync: deletePolicy } = useDeleteSchoolAssessmentPolicyMutation(schoolId);
  const { mutateAsync: updatePolicy, isPending: isUpdating } = useUpdateSchoolAssessmentPolicyMutation(schoolId);

  const handleCreatePolicy = async (formDataList: CreateAssessmentPolicyPayload[]) => {
    try {
      const createdPolicyIds = await createPolicy(formDataList);
      setIsCreateModalOpen(false);
      alert(`Đã tạo thành công ${createdPolicyIds.length} Assessment Policy.`);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi tạo Assessment Policy.');
    }
  };

  const handleUpdatePolicy = async (formData: UpdateAssessmentPolicyPayload) => {
    if (!editingPolicy) return;

    try {
      await updatePolicy({ policyId: editingPolicy.id, payload: formData });
      setEditingPolicy(null);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi cập nhật Assessment Policy.');
    }
  };

  const handleDeletePolicy = async (policy: AssessmentPolicy) => {
    const isConfirm = window.confirm(
      'Bạn có chắc chắn muốn xóa vĩnh viễn Assessment Policy DRAFT này? Hành động này không thể hoàn tác!'
    );
    if (!isConfirm) return;

    try {
      await deletePolicy(policy.id);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi xóa Assessment Policy.');
    }
  };

  return (
    <section className="relative grid gap-6 overflow-hidden font-['Be_Vietnam_Pro',sans-serif]">
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
        <h1 className="flex items-center gap-2.5 text-[32px] font-bold tracking-tight text-slate-950">
          <ClipboardCheck className="size-[26px] text-indigo-600" /> Quản lý Assessment Policy
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => refetch()}
            aria-label="Tải lại"
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
          >
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
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
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-6 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Plus className="size-4" /> Thêm Assessment Policy
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="relative rounded-[14px] border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative min-w-52">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Filter className="size-4 text-slate-400" />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="relative min-w-52">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Filter className="size-4 text-slate-400" />
            </div>
            <select
              value={selectedLanguageId}
              onChange={(e) => {
                setSelectedLanguageId(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">Tất cả ngôn ngữ</option>
              {languages?.map((lang) => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
            </select>
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
          onViewRubricVersion={(policy) => setViewingRubricVersionPolicy(policy)}
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

      <RubricVersionPoliciesDialog
        isOpen={Boolean(viewingRubricVersionPolicy)}
        onClose={() => setViewingRubricVersionPolicy(null)}
        schoolId={schoolId}
        rubricVersionId={viewingRubricVersionPolicy?.rubricVersionId}
        rubricVersion={viewingRubricVersionPolicy?.rubricVersion}
      />
    </section>
  );
}
