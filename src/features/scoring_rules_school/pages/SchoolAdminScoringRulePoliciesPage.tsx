// src/features/scoring_rules_school/pages/SchoolAdminScoringRulePoliciesPage.tsx
//
// Điểm vào độc lập cho Scoring Rules: vì Scoring Rule luôn là con của 1 Assessment Policy
// (không tồn tại độc lập), trang này cho School Admin chọn 1 Policy rồi mới vào quản lý
// Scoring Rule của Policy đó, thay vì bắt buộc phải đi qua trang chi tiết Policy.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Gavel, RefreshCw, Filter, LayoutList, ChevronRight } from 'lucide-react';
import { useAppSelector } from '@/app/store/hooks';
import { Pagination } from '@/shared/components/Pagination';
import {
  useSchoolAssessmentPoliciesQuery,
  formatAssessmentPolicyDate,
  type SchoolAssessmentPolicyFilter,
  type AssessmentPolicy,
} from '@/features/assessment_policy_school';

const STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
  ARCHIVED: 'bg-amber-50 text-amber-700 ring-amber-700/10',
};

function scopeLabel(policy: AssessmentPolicy) {
  const schoolLabel = policy.school?.name || policy.school?.code || 'Toàn trường';
  const narrowest = policy.schoolClass ?? policy.schoolGrade ?? policy.schoolGradeLevel;
  const narrowestLabel = narrowest?.name || narrowest?.code;
  return narrowestLabel ? `${schoolLabel} - ${narrowestLabel}` : schoolLabel;
}

export function SchoolAdminScoringRulePoliciesPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('');

  const filter: SchoolAssessmentPolicyFilter = { status: selectedStatus || null, languageId: null };
  const { data, isLoading, isError, refetch, isFetching } = useSchoolAssessmentPoliciesQuery(schoolId, filter, page, 10);

  const policies = data?.content ?? [];

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

      {/* HEADER */}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-[32px] font-bold tracking-tight text-slate-950">
            <Gavel className="size-[26px] text-indigo-600" /> Quản lý Quy tắc tính điểm
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Chọn 1 Assessment Policy để xem/quản lý Scoring Rules (luật tự động cộng/trừ điểm khi phát hiện vi phạm).
          </p>
        </div>

        <button
          onClick={() => refetch()}
          aria-label="Tải lại"
          className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
        >
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="relative rounded-[14px] border border-slate-200 bg-white p-4">
        <div className="relative min-w-52">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Filter className="size-4 text-slate-400" />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3">
            <RefreshCw className="size-6 animate-spin text-cyan-600" />
            <p className="text-sm text-slate-500">Đang tải danh sách Assessment Policy...</p>
          </div>
        ) : isError ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm font-semibold text-red-600">Đã có lỗi xảy ra khi tải dữ liệu.</p>
            <button onClick={() => refetch()} className="text-sm font-bold text-cyan-600 underline">Thử lại</button>
          </div>
        ) : policies.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-500">
            <LayoutList className="size-8 text-slate-300" />
            <p className="text-sm">Không tìm thấy Assessment Policy nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ngôn ngữ</th>
                  <th className="px-4 py-3">Phạm vi</th>
                  <th className="px-4 py-3">Hiệu lực</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {policies.map((policy) => (
                  <tr
                    key={policy.id}
                    onClick={() => navigate(`/school-admin/assessment-policies/${policy.id}/scoring-rules`)}
                    className="group cursor-pointer transition hover:bg-cyan-50/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 group-hover:text-cyan-700">{policy.language?.name || '—'}</td>
                    <td className="px-4 py-3">{scopeLabel(policy)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatAssessmentPolicyDate(policy.effectiveFrom)} – {formatAssessmentPolicyDate(policy.effectiveTo)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[policy.status] || 'bg-slate-100 text-slate-600 ring-slate-500/10'}`}>
                        {policy.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 group-hover:text-indigo-700">
                        Quản lý Scoring Rules <ChevronRight className="size-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && policies.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={data?.totalPages ?? 0}
            totalElements={data?.totalElements ?? 0}
            itemName="assessment policy"
            onPageChange={setPage}
          />
        )}
      </div>
    </section>
  );
}
