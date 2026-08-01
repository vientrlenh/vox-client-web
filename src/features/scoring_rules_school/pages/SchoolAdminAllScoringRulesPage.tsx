// src/features/scoring_rules_school/pages/SchoolAdminAllScoringRulesPage.tsx
//
// Tổng hợp Scoring Rule của TẤT CẢ Assessment Policy của trường vào 1 bảng, kèm cột cho biết
// mỗi rule thuộc Assessment Policy nào. Click vào 1 dòng sẽ điều hướng sang trang quản lý
// Scoring Rules của đúng Assessment Policy đó (nơi có đầy đủ thao tác Thêm/Sửa/Xóa).

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Gavel, RefreshCw, Filter, Search, ListOrdered } from 'lucide-react';
import { useAppSelector } from '@/app/store/hooks';
import { Pagination } from '@/shared/components/Pagination';
import { CONDITION_TYPE_OPTIONS, ACTION_TYPE_OPTIONS, SEVERITY_OPTIONS } from '../constants';
import { useAllSchoolScoringRulesQuery, type ScoringRuleWithPolicy } from '../api/useAllSchoolScoringRulesQuery';

const PAGE_SIZE = 10;

const severityStyles: Record<string, string> = {
  INFO: 'bg-slate-100 text-slate-600',
  WARNING: 'bg-amber-50 text-amber-700',
  BLOCKING: 'bg-red-50 text-red-700',
};

function labelOf(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label || value;
}

function matchesKeyword(rule: ScoringRuleWithPolicy, keyword: string) {
  const haystack = `${rule.code} ${rule.name} ${rule.policyLanguageName} ${rule.policyScopeLabel}`.toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

export function SchoolAdminAllScoringRulesPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [policyFilter, setPolicyFilter] = useState('');

  const { data: rules, isLoading } = useAllSchoolScoringRulesQuery(schoolId);

  const policyOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const rule of rules ?? []) {
      if (!seen.has(rule.policyId)) {
        seen.set(rule.policyId, `${rule.policyLanguageName} · ${rule.policyScopeLabel}`);
      }
    }
    return Array.from(seen, ([policyId, label]) => ({ policyId, label }));
  }, [rules]);

  const filteredRules = useMemo(() => {
    return (rules ?? []).filter((rule) => {
      if (isActiveFilter !== '' && String(rule.isActive) !== isActiveFilter) return false;
      if (policyFilter !== '' && rule.policyId !== policyFilter) return false;
      if (keyword.trim() && !matchesKeyword(rule, keyword.trim())) return false;
      return true;
    });
  }, [rules, keyword, isActiveFilter, policyFilter]);

  const totalElements = filteredRules.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const pageRules = filteredRules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(patch: { keyword?: string; isActiveFilter?: string; policyFilter?: string }) {
    if (patch.keyword !== undefined) setKeyword(patch.keyword);
    if (patch.isActiveFilter !== undefined) setIsActiveFilter(patch.isActiveFilter);
    if (patch.policyFilter !== undefined) setPolicyFilter(patch.policyFilter);
    setPage(1);
  }

  return (
    <section className="relative grid gap-6 overflow-hidden font-['Be_Vietnam_Pro',sans-serif]">
      <div
        className="pointer-events-none absolute -right-40 -top-44 size-120 rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.16), rgba(6,182,212,0.10) 55%, transparent 75%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-36 size-105 rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12), rgba(139,92,246,0.08) 55%, transparent 75%)' }}
      />

      {/* HEADER */}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-[32px] font-bold tracking-tight text-slate-950">
            <Gavel className="size-6.5 text-indigo-600" /> Quản lý quy tắc tính điểm
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Toàn bộ Scoring Rule của các Assessment Policy trong trường, kèm Assessment Policy mà rule đó thuộc về.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          aria-label="Tải lại"
          className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
        >
          <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="relative flex flex-col gap-3 rounded-[14px] border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="size-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={keyword}
            onChange={(e) => handleFilterChange({ keyword: e.target.value })}
            placeholder="Tìm theo mã, tên rule, ngôn ngữ hoặc phạm vi Assessment Policy..."
            className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <div className="relative min-w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Filter className="size-4 text-slate-400" />
          </div>
          <select
            value={policyFilter}
            onChange={(e) => handleFilterChange({ policyFilter: e.target.value })}
            className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            <option value="">Tất cả Assessment Policy</option>
            {policyOptions.map((option) => (
              <option key={option.policyId} value={option.policyId}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="relative min-w-52">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Filter className="size-4 text-slate-400" />
          </div>
          <select
            value={isActiveFilter}
            onChange={(e) => handleFilterChange({ isActiveFilter: e.target.value })}
            className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang bật</option>
            <option value="false">Đang tắt</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3">
            <RefreshCw className="size-6 animate-spin text-cyan-600" />
            <p className="text-sm text-slate-500">Đang tải danh sách Scoring Rule...</p>
          </div>
        ) : pageRules.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-500">
            <ListOrdered className="size-8 text-slate-300" />
            <p className="text-sm">Không tìm thấy Scoring Rule nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-center">Ưu tiên</th>
                  <th className="px-4 py-3">Mã Code</th>
                  <th className="px-4 py-3">Tên Rule</th>
                  <th className="px-4 py-3">Assessment Policy</th>
                  <th className="px-4 py-3">Điều kiện</th>
                  <th className="px-4 py-3">Hành động</th>
                  <th className="px-4 py-3 text-center">Mức độ</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pageRules.map((rule) => (
                  <tr
                    key={rule.id}
                    onClick={() => navigate(`/school-admin/assessment-policies/${rule.policyId}/scoring-rules`)}
                    className="group cursor-pointer transition hover:bg-cyan-50/40"
                  >
                    <td className="px-4 py-3 text-center font-medium text-slate-500">{rule.priority}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{rule.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 group-hover:text-cyan-700">{rule.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                        {rule.policyLanguageName} · {rule.policyScopeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{labelOf(CONDITION_TYPE_OPTIONS, rule.conditionType)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{labelOf(ACTION_TYPE_OPTIONS, rule.actionType)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${severityStyles[rule.severity] || 'bg-slate-100 text-slate-600'}`}>
                        {labelOf(SEVERITY_OPTIONS, rule.severity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rule.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">Bật</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Tắt</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && pageRules.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            itemName="scoring rule"
            onPageChange={setPage}
          />
        )}
      </div>
    </section>
  );
}
