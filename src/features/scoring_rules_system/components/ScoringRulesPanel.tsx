// src/features/scoring_rules_system/components/ScoringRulesPanel.tsx

import { useEffect, useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Pagination } from '@/shared/components/Pagination';

import { useSearchSystemScoringRulesQuery, type SearchScoringRuleFilter } from '../api/useSearchSystemScoringRulesQuery';
import { useCreateSystemScoringRuleMutation } from '../api/useCreateSystemScoringRuleMutation';
import { useUpdateSystemScoringRuleMutation } from '../api/useUpdateSystemScoringRuleMutation';
import { useDeleteSystemScoringRuleMutation } from '../api/useDeleteSystemScoringRuleMutation';
import { ScoringRuleTable } from './ScoringRuleTable';
import { CreateScoringRuleDialog } from './CreateScoringRuleDialog';
import { UpdateScoringRuleDialog } from './UpdateScoringRuleDialog';
import { ViewScoringRuleDialog } from './ViewScoringRuleDialog';
import type { ScoringRule } from '../types';

type Props = {
  policyId: string | undefined;
};

export function ScoringRulesPanel({ policyId }: Props) {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null);
  const [viewingRuleId, setViewingRuleId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const filter: SearchScoringRuleFilter = {
    keyword: debouncedKeyword.trim() ? debouncedKeyword : null,
    isActive: isActiveFilter === '' ? null : isActiveFilter === 'true',
  };

  const { data, isLoading, isError, refetch } = useSearchSystemScoringRulesQuery(policyId, filter, page, 10);

  const { mutateAsync: createRule, isPending: isCreating } = useCreateSystemScoringRuleMutation(policyId);
  const { mutateAsync: updateRule, isPending: isUpdating } = useUpdateSystemScoringRuleMutation(policyId, editingRule?.id);
  const { mutateAsync: deleteRule } = useDeleteSystemScoringRuleMutation(policyId);

  const handleCreate: React.ComponentProps<typeof CreateScoringRuleDialog>['onSubmit'] = async (payload) => {
    try {
      await createRule(payload);
      setIsCreateModalOpen(false);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi thêm Scoring Rule.');
    }
  };

  const handleUpdate: React.ComponentProps<typeof UpdateScoringRuleDialog>['onSubmit'] = async (payload) => {
    try {
      await updateRule(payload);
      setEditingRule(null);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi cập nhật Scoring Rule.');
    }
  };

  const handleDelete = async (rule: ScoringRule) => {
    const isConfirm = window.confirm(`Bạn có chắc chắn muốn xóa Scoring Rule "${rule.name}"?`);
    if (!isConfirm) return;

    try {
      await deleteRule(rule.id);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi xóa Scoring Rule.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:px-6">
        <h2 className="text-lg font-medium text-slate-950">Scoring Rules</h2>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-4 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="size-4" /> Thêm Rule
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:px-6">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="size-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã hoặc tên rule..."
            className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <div className="relative min-w-50">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Filter className="size-4 text-slate-400" />
          </div>
          <select
            value={isActiveFilter}
            onChange={(e) => { setIsActiveFilter(e.target.value); setPage(1); }}
            className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            <option value="">Tất cả</option>
            <option value="true">Đang bật</option>
            <option value="false">Đang tắt</option>
          </select>
        </div>
      </div>

      <ScoringRuleTable
        rules={data?.content || []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onViewDetails={(item) => setViewingRuleId(item.id)}
        onEdit={(item) => setEditingRule(item)}
        onDelete={handleDelete}
      />
      {data && data.content.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          itemName="scoring rule"
          onPageChange={setPage}
        />
      )}

      {isCreateModalOpen && (
        <CreateScoringRuleDialog
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreate}
          isPending={isCreating}
        />
      )}

      {editingRule && (
        <UpdateScoringRuleDialog
          isOpen={Boolean(editingRule)}
          onClose={() => setEditingRule(null)}
          onSubmit={handleUpdate}
          isPending={isUpdating}
          initialData={editingRule}
        />
      )}

      <ViewScoringRuleDialog
        isOpen={Boolean(viewingRuleId)}
        onClose={() => setViewingRuleId(null)}
        policyId={policyId}
        ruleId={viewingRuleId ?? undefined}
      />
    </div>
  );
}
