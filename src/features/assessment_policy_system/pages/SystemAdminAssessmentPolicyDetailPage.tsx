// src/features/assessment_policy_system/pages/SystemAdminAssessmentPolicyDetailPage.tsx

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  AlertTriangle,
  Archive,
  BookMarked,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Pencil,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Target,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

import { useSystemAssessmentPolicyQuery } from '../api/useSystemAssessmentPolicyQuery';
import { useUpdateSystemAssessmentPolicyMutation } from '../api/useUpdateSystemAssessmentPolicyMutation';
import { useDeleteSystemAssessmentPolicyMutation } from '../api/useDeleteSystemAssessmentPolicyMutation';
import { usePublishSystemAssessmentPolicyMutation } from '../api/usePublishSystemAssessmentPolicyMutation';
import { useArchiveSystemAssessmentPolicyMutation } from '../api/useArchiveSystemAssessmentPolicyMutation';
import { UpdateAssessmentPolicyDialog } from '../components/UpdateAssessmentPolicyDialog';
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

type TabId = 'framework' | 'target' | 'minimum' | 'rubric';

export function SystemAdminAssessmentPolicyDetailPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('framework');

  const { data: policy, isLoading, isError, refetch } = useSystemAssessmentPolicyQuery(policyId);
  const { mutateAsync: updatePolicy, isPending: isUpdating } = useUpdateSystemAssessmentPolicyMutation();
  const { mutateAsync: deletePolicy, isPending: isDeleting } = useDeleteSystemAssessmentPolicyMutation();
  const { mutateAsync: publishPolicy, isPending: isPublishing } = usePublishSystemAssessmentPolicyMutation();
  const { mutateAsync: archivePolicy, isPending: isArchiving } = useArchiveSystemAssessmentPolicyMutation();

  const handlePublishPolicy = async () => {
    if (!policyId) return;

    const isConfirm = window.confirm('Xuất bản Assessment Policy này? Sau khi xuất bản, Policy sẽ có hiệu lực áp dụng.');
    if (!isConfirm) return;

    try {
      await publishPolicy(policyId);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi xuất bản Assessment Policy.');
    }
  };

  const handleArchivePolicy = async () => {
    if (!policyId) return;

    const isConfirm = window.confirm('Bạn có chắc chắn muốn Lưu trữ (ARCHIVE) Assessment Policy này? Sau khi lưu trữ sẽ không thể chỉnh sửa hoặc sử dụng nữa.');
    if (!isConfirm) return;

    try {
      await archivePolicy(policyId);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi lưu trữ Assessment Policy.');
    }
  };

  const handleUpdatePolicy = async (formData: UpdateAssessmentPolicyPayload) => {
    if (!policyId) return;

    try {
      await updatePolicy({ policyId, payload: formData });
      setIsEditModalOpen(false);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi cập nhật Assessment Policy.');
    }
  };

  const handleDeletePolicy = async () => {
    const isConfirm = window.confirm(
      'Bạn có chắc chắn muốn xóa vĩnh viễn Assessment Policy DRAFT này? Hành động này không thể hoàn tác!'
    );
    if (!isConfirm || !policyId) return;

    try {
      await deletePolicy(policyId);
      navigate('/system-admin/assessment-policies');
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi xóa Assessment Policy.');
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
        <p className="text-slate-600">Không tìm thấy Assessment Policy hoặc có lỗi xảy ra.</p>
        <button onClick={() => refetch()} className="rounded-lg bg-cyan-600 px-4 py-2 font-bold text-white hover:bg-cyan-700">
          Thử lại
        </button>
      </div>
    );
  }

  const hasScope = Boolean(policy.school || policy.schoolGradeLevel || policy.schoolGrade || policy.schoolClass);

  const tabs: { id: TabId; icon: LucideIcon; title: string; summary: string }[] = [
    {
      id: 'framework',
      icon: BookMarked,
      title: 'Framework Version',
      summary: policy.frameworkVersion
        ? `${policy.frameworkVersion.code} · v${policy.frameworkVersion.version} · ${policy.frameworkVersion.status}`
        : 'Chưa có dữ liệu',
    },
    {
      id: 'target',
      icon: Target,
      title: 'Target Band',
      summary: policy.targetFrameworkBand
        ? `${policy.targetFrameworkBand.code} - ${policy.targetFrameworkBand.label}`
        : 'Chưa có dữ liệu',
    },
    {
      id: 'minimum',
      icon: ShieldCheck,
      title: 'Minimum Band',
      summary: policy.minimumFrameworkBand
        ? `${policy.minimumFrameworkBand.code} - ${policy.minimumFrameworkBand.label}`
        : 'Chưa có dữ liệu',
    },
    {
      id: 'rubric',
      icon: ClipboardList,
      title: 'Rubric Version',
      summary: policy.rubricVersion
        ? `${policy.rubricVersion.code} · v${policy.rubricVersion.version} · ${policy.rubricVersion.status}`
        : 'Chưa có dữ liệu',
    },
  ];

  return (
    <section className="relative grid gap-6 overflow-hidden font-['Be_Vietnam_Pro',sans-serif]">
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
            onClick={() => navigate('/system-admin/assessment-policies')}
            aria-label="Quay lại"
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex items-center gap-2.5 text-[32px] font-bold tracking-tight text-slate-950">
            <ClipboardCheck className="size-[26px] text-indigo-600" /> Chi tiết Assessment Policy
          </h1>
        </div>
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
            {hasScope
              ? [policy.school?.name, policy.schoolGradeLevel?.name, policy.schoolGrade?.name, policy.schoolClass?.name]
                  .filter(Boolean)
                  .join(' · ')
              : 'Áp dụng toàn hệ thống'}
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
              disabled={isPublishing}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              {isPublishing ? <RefreshCw className="size-4 animate-spin" /> : <Rocket className="size-4" />}
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
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-[220px] flex-1 items-center gap-3 rounded-[14px] border px-4 py-4 text-left transition ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Icon className={`size-[18px] shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{tab.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{tab.summary}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-[14px] border border-slate-200 bg-white p-6">
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

          {activeTab === 'minimum' && (
            <div>
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-sm font-medium text-violet-500">
                {policy.minimumFrameworkBand ? `${policy.minimumFrameworkBand.code} - ${policy.minimumFrameworkBand.label}` : '—'}
              </span>
              {policy.minimumFrameworkBand?.description ? (
                <p className="mt-3.5 text-sm leading-7 text-slate-500">{policy.minimumFrameworkBand.description}</p>
              ) : null}
            </div>
          )}

          {activeTab === 'rubric' && (
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
