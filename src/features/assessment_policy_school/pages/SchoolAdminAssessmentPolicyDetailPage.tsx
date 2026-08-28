// src/features/assessment_policy_school/pages/SchoolAdminAssessmentPolicyDetailPage.tsx

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  AlertTriangle,
  Archive,
  BookMarked,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Pencil,
  RefreshCw,
  Rocket,
  Target,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

import { useFeedbackToast } from '@/shared/ui/useFeedbackToast';
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog';
import { useSchoolAssessmentPolicyQuery } from '../api/useSchoolAssessmentPolicyQuery';
import { useUpdateSchoolAssessmentPolicyMutation } from '../api/useUpdateSchoolAssessmentPolicyMutation';
import { useDeleteSchoolAssessmentPolicyMutation } from '../api/useDeleteSchoolAssessmentPolicyMutation';
import { usePublishSchoolAssessmentPolicyMutation } from '../api/usePublishSchoolAssessmentPolicyMutation';
import { usePublishSchoolRubricVersionMutation } from '../api/usePublishSchoolRubricVersionMutation';
import { useArchiveSchoolAssessmentPolicyMutation } from '../api/useArchiveSchoolAssessmentPolicyMutation';
import { useRubricVersionPolicyUsageQuery } from '../api/useRubricVersionPolicyUsageQuery';
import { UpdateAssessmentPolicyDialog } from '../components/UpdateAssessmentPolicyDialog';
import { useAppSelector } from '@/app/store/hooks';
import { formatAssessmentPolicyDate } from '../types';
import type { UpdateAssessmentPolicyPayload } from '../types';

const strictnessLabels: Record<string, string> = {
  LENIENT: 'Lỏng (LENIENT)',
  STANDARD: 'Chuẩn (STANDARD)',
  STRICT: 'Chặt (STRICT)',
};

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-emerald-50 text-emerald-600',
  ARCHIVED: 'bg-amber-50 text-amber-600',
};

type InfoFieldProps = {
  label: string;
  children: React.ReactNode;
};

function InfoField({ label, children }: InfoFieldProps) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{children}</div>
    </div>
  );
}

type TabId = 'framework' | 'target' | 'rubric';

export function SchoolAdminAssessmentPolicyDetailPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('framework');

  const { data: policy, isLoading, isError, refetch } = useSchoolAssessmentPolicyQuery(schoolId, policyId);
  const { mutateAsync: updatePolicy, isPending: isUpdating } = useUpdateSchoolAssessmentPolicyMutation(schoolId);
  const { mutateAsync: deletePolicy, isPending: isDeleting } = useDeleteSchoolAssessmentPolicyMutation(schoolId);
  const { mutateAsync: publishPolicy, isPending: isPublishing } = usePublishSchoolAssessmentPolicyMutation(schoolId);
  const { mutateAsync: publishRubricVersion, isPending: isPublishingRubricVersion } = usePublishSchoolRubricVersionMutation(schoolId);
  const { mutateAsync: archivePolicy, isPending: isArchiving } = useArchiveSchoolAssessmentPolicyMutation(schoolId);
  const { showError, feedbackToast } = useFeedbackToast();
  const { confirm, dialog: confirmationDialog } = useConfirmationDialog();

  // Publish 1 Assessment Policy thì luôn kéo theo publish luôn Rubric Version gắn với nó -- một
  // policy PUBLISHED mà Rubric Version của nó còn DRAFT thì policy vẫn chưa dùng chấm bài được,
  // nên tách hai bước sẽ chỉ để lại một trạng thái nửa vời.
  const rubricVersionNeedsPublish = policy?.rubricVersion?.status === 'DRAFT';

  // Lưu trữ một chính sách kéo theo lưu trữ Rubric Version -- nhưng chỉ khi đó là chính sách cuối
  // cùng còn hiệu lực dùng phiên bản đó, và phiên bản đang PUBLISHED. Phải soi đúng hai điều kiện
  // backend dùng (ArchiveSchoolAssessmentPolicyUseCase), nếu không lời cảnh báo sẽ nói sai việc sắp
  // xảy ra.
  const { data: policiesOnRubricVersion, isLoading: isLoadingPolicyUsage } =
    useRubricVersionPolicyUsageQuery(schoolId, policy?.rubricVersionId);
  const hasOtherActivePolicyOnRubricVersion = (policiesOnRubricVersion ?? []).some(
    (candidate) =>
      candidate.id !== policyId && (candidate.status === 'DRAFT' || candidate.status === 'PUBLISHED'),
  );
  // Chưa tải xong thì coi như KHÔNG có chính sách nào khác: cảnh báo thừa còn hơn để người dùng lưu
  // trữ mất một Rubric Version mà không được báo trước.
  const archiveAlsoArchivesRubricVersion =
    policy?.rubricVersion?.status === 'PUBLISHED' &&
    (isLoadingPolicyUsage || !hasOtherActivePolicyOnRubricVersion);

  const handlePublishPolicy = async () => {
    if (!policyId) return;

    const isConfirm = await confirm({
      confirmLabel: 'Xuất bản',
      message: rubricVersionNeedsPublish
        ? 'Xuất bản Chính Sách Đánh Giá này? Rubric Version đang gắn với nó (còn DRAFT) sẽ được xuất bản theo, và cả hai sẽ có hiệu lực áp dụng.'
        : 'Xuất bản Chính Sách Đánh Giá này? Sau khi xuất bản, Chính Sách Đánh Giá sẽ có hiệu lực áp dụng.',
      title: 'Xuất bản Chính Sách Đánh Giá',
    });
    if (!isConfirm) return;

    try {
      await publishPolicy(policyId);
    } catch (error) {
      const err = error as Error;
      showError(err.message || 'Có lỗi xảy ra khi xuất bản Chính Sách Đánh Giá.');
      return;
    }

    // Từ đây Policy đã PUBLISHED thật trong DB -- đây là request REST riêng, không rollback
    // được lại bước trên nếu fail. Vì vậy luôn refetch (kể cả khi bước dưới lỗi) để trang khớp
    // với DB, và báo lỗi phải nói rõ Policy đã xuất bản xong, chỉ riêng Rubric Version chưa được.
    if (rubricVersionNeedsPublish && policy?.rubricVersionId) {
      try {
        await publishRubricVersion(policy.rubricVersionId);
      } catch (error) {
        const err = error as Error;
        showError(
          `Đã xuất bản Chính Sách Đánh Giá thành công. Riêng Rubric Version thì ${err.message || 'có lỗi xảy ra.'}`,
        );
        await refetch();
        return;
      }
    }

    await refetch();
  };

  const handleArchivePolicy = async () => {
    if (!policyId) return;

    // Message đi vào một thẻ <p> thường (ConfirmationDialog), nên viết liền mạch chứ không xuống
    // dòng bằng \n -- newline sẽ bị gộp thành khoảng trắng.
    const rubricVersionLabel = policy?.rubricVersion?.name ?? policy?.rubricVersion?.code ?? '';
    const isConfirm = await confirm({
      cancelLabel: 'Để sau',
      confirmLabel: archiveAlsoArchivesRubricVersion ? 'Vẫn lưu trữ cả hai' : 'Lưu trữ',
      message: archiveAlsoArchivesRubricVersion
        ? `Đây là chính sách duy nhất còn hiệu lực đang dùng Rubric Version "${rubricVersionLabel}", nên phiên bản đó sẽ được LƯU TRỮ THEO. Sau đó không kỳ thi mới nào chọn được phiên bản này, và cũng không gắn thêm chính sách nào vào nó được nữa. Muốn giữ lại Rubric Version thì tạo một chính sách khác trỏ vào nó trước, rồi hãy quay lại lưu trữ chính sách này.`
        : 'Lưu trữ (ARCHIVE) Chính Sách Đánh Giá này? Sau khi lưu trữ sẽ không thể chỉnh sửa hoặc sử dụng nữa.',
      title: archiveAlsoArchivesRubricVersion
        ? 'Lưu trữ kèm cả Rubric Version'
        : 'Lưu trữ Chính Sách Đánh Giá',
    });
    if (!isConfirm) return;

    try {
      await archivePolicy(policyId);
    } catch (error) {
      const err = error as Error;
      showError(err.message || 'Có lỗi xảy ra khi lưu trữ Chính Sách Đánh Giá.');
    }
  };

  const handleUpdatePolicy = async (formData: UpdateAssessmentPolicyPayload) => {
    if (!policyId) return;

    try {
      await updatePolicy({ policyId, payload: formData });
      setIsEditModalOpen(false);
    } catch (error) {
      const err = error as Error;
      showError(err.message || 'Có lỗi xảy ra khi cập nhật Chính Sách Đánh Giá.');
    }
  };

  const handleDeletePolicy = async () => {
    const isConfirm = await confirm({
      confirmLabel: 'Xóa vĩnh viễn',
      message: 'Bạn có chắc chắn muốn xóa vĩnh viễn Chính Sách Đánh Giá DRAFT này? Hành động này không thể hoàn tác!',
      title: 'Xóa Chính Sách Đánh Giá',
    });
    if (!isConfirm || !policyId) return;

    try {
      await deletePolicy(policyId);
      navigate('/school-admin/assessment-policies');
    } catch (error) {
      const err = error as Error;
      showError(err.message || 'Có lỗi xảy ra khi xóa Chính Sách Đánh Giá.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-cyan-600" />
        <p className="text-sm text-slate-500">Đang tải thông tin chi tiết...</p>
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tìm thấy Chính Sách Đánh Giá hoặc có lỗi xảy ra.</p>
        <button onClick={() => refetch()} className="rounded-lg bg-cyan-600 px-4 py-2 font-bold text-white hover:bg-cyan-700">
          Thử lại
        </button>
      </div>
    );
  }

  const hasScope = Boolean(policy.school || policy.gradeLevel || policy.schoolGrade || policy.schoolClass);

  const tabs: { id: TabId; icon: LucideIcon; title: string }[] = [
    { id: 'framework', icon: BookMarked, title: 'Framework Version' },
    { id: 'target', icon: Target, title: 'Target Band' },
    { id: 'rubric', icon: ClipboardList, title: 'Rubric Version' },
  ];

  return (
    <section className="relative grid gap-6 overflow-hidden">
      {feedbackToast}
      {confirmationDialog}
      <div
        className="pointer-events-none absolute -right-40 -top-44 size-[480px] rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.16), rgba(6,182,212,0.10) 55%, transparent 75%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-36 size-[420px] rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12), rgba(139,92,246,0.08) 55%, transparent 75%)' }}
      />
      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/school-admin/assessment-policies')}
            aria-label="Quay lại"
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-blue-950 sm:text-3xl">
            <ClipboardCheck className="size-[26px] text-indigo-600" /> Chi tiết Chính sách Đánh giá
          </h1>
        </div>
        {policy.rubricVersion?.rubricId ? (
          <button
            type="button"
            onClick={() =>
              navigate(`/school-admin/rubrics/${policy.rubricVersion?.rubricId}/versions/${policy.rubricVersionId}`)
            }
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-indigo-600 transition hover:bg-slate-50"
          >
            <Eye className="size-4" /> Xem chi tiết phiên bản tiêu chí đánh giá
          </button>
        ) : null}
      </div>

      {/* THÔNG TIN CHUNG */}
      <div className="rounded-[14px] border border-slate-200 bg-white p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Trạng thái">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusStyles[policy.status] || 'bg-slate-100 text-slate-600'
              }`}
            >
              {policy.status}
            </span>
          </InfoField>
          <InfoField label="Phiên bản (version)">{policy.version}</InfoField>
          <InfoField label="Ngôn ngữ">{policy.language?.name || '—'}</InfoField>
          <InfoField label="Điểm đạt (passingScore)">{policy.passingScore ?? '—'}</InfoField>
          <InfoField label="Độ nghiêm ngặt">{strictnessLabels[policy.strictness] || policy.strictness}</InfoField>
          <InfoField label="Hiệu lực">
            {formatAssessmentPolicyDate(policy.effectiveFrom)} – {formatAssessmentPolicyDate(policy.effectiveTo)}
          </InfoField>
          <InfoField label="Tạo lúc">{formatAssessmentPolicyDate(policy.createdAt)}</InfoField>
          <InfoField label="Cập nhật lúc">{formatAssessmentPolicyDate(policy.updatedAt)}</InfoField>
          <InfoField label="Phạm vi áp dụng">
            {hasScope ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {policy.school ? (
                  <span><span className="font-normal text-slate-400">Trường:</span> {policy.school.name}</span>
                ) : null}
                {policy.gradeLevel ? (
                  <span><span className="font-normal text-slate-400">Khối:</span> {policy.gradeLevel.name}</span>
                ) : null}
                {policy.schoolGrade ? (
                  <span><span className="font-normal text-slate-400">Niên khóa:</span> {policy.schoolGrade.name}</span>
                ) : null}
                {policy.schoolClass ? (
                  <span><span className="font-normal text-slate-400">Lớp:</span> {policy.schoolClass.name}</span>
                ) : null}
              </div>
            ) : (
              'Toàn trường'
            )}
          </InfoField>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
          {policy.status === 'DRAFT' ? (
            <button
              type="button"
              onClick={handleDeletePolicy}
              disabled={isDeleting}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-5 text-sm font-medium text-red-500 transition hover:bg-red-100 disabled:opacity-50"
            >
              {isDeleting ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Xóa Policy
            </button>
          ) : null}
          {policy.status === 'DRAFT' ? (
            <button
              type="button"
              onClick={handlePublishPolicy}
              disabled={isPublishing || isPublishingRubricVersion}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              {isPublishing || isPublishingRubricVersion ? <RefreshCw className="size-4 animate-spin" /> : <Rocket className="size-4" />}
              Xuất bản
            </button>
          ) : null}
          {policy.status === 'PUBLISHED' ? (
            <button
              type="button"
              onClick={handleArchivePolicy}
              disabled={isArchiving}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {isArchiving ? <RefreshCw className="size-4 animate-spin" /> : <Archive className="size-4" />}
              Lưu trữ
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Pencil className="size-4" /> Chỉnh sửa
          </button>
        </div>
      </div>

      {/* CÁC THÀNH PHẦN ĐƯỢC ASSESSMENT POLICY ÁP DỤNG */}
      <div className="grid gap-0">
        <div role="tablist" aria-label="Thành phần áp dụng" className="flex flex-wrap gap-1 border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {tab.title}
              </button>
            );
          })}
        </div>

        <div className="rounded-b-[14px] border border-t-0 border-slate-200 bg-white p-6">
          {activeTab === 'framework' && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <InfoField label="Mã">{policy.frameworkVersion?.code || '—'}</InfoField>
              <InfoField label="Tên">{policy.frameworkVersion?.name || '—'}</InfoField>
              <InfoField label="Version">{policy.frameworkVersion ? `v${policy.frameworkVersion.version}` : '—'}</InfoField>
              <InfoField label="Trạng thái">{policy.frameworkVersion?.status || '—'}</InfoField>
              <InfoField label="Hiệu lực">
                {policy.frameworkVersion
                  ? `${formatAssessmentPolicyDate(policy.frameworkVersion.effectiveFrom)} – ${formatAssessmentPolicyDate(policy.frameworkVersion.effectiveTo)}`
                  : '—'}
              </InfoField>
            </div>
          )}

          {activeTab === 'target' && (
            <div>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-medium text-indigo-600">
                {policy.targetFrameworkBand ? `${policy.targetFrameworkBand.code} - ${policy.targetFrameworkBand.label}` : '—'}
              </span>
              {policy.targetFrameworkBand?.description ? (
                <p className="mt-3.5 text-sm leading-7 text-slate-500">{policy.targetFrameworkBand.description}</p>
              ) : null}
            </div>
          )}

          {activeTab === 'rubric' && (
            <div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <InfoField label="Mã">{policy.rubricVersion?.code || '—'}</InfoField>
                <InfoField label="Tên">{policy.rubricVersion?.name || '—'}</InfoField>
                <InfoField label="Version">{policy.rubricVersion ? `v${policy.rubricVersion.version}` : '—'}</InfoField>
                <InfoField label="Trạng thái">{policy.rubricVersion?.status || '—'}</InfoField>
                <InfoField label="Hiệu lực">
                  {policy.rubricVersion
                    ? `${formatAssessmentPolicyDate(policy.rubricVersion.effectiveFrom)} – ${formatAssessmentPolicyDate(policy.rubricVersion.effectiveTo)}`
                    : '—'}
                </InfoField>
              </div>
            </div>
          )}
        </div>
      </div>

      <UpdateAssessmentPolicyDialog
        policy={isEditModalOpen ? policy : null}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdatePolicy}
        isPending={isUpdating}
      />
    </section>
  );
}
