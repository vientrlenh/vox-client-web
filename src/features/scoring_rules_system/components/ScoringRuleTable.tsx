// src/features/scoring_rules_system/components/ScoringRuleTable.tsx

import { RefreshCw, ListOrdered, Eye, Edit, Trash2 } from 'lucide-react';
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton';
import { CONDITION_TYPE_OPTIONS, ACTION_TYPE_OPTIONS, SEVERITY_OPTIONS } from '../constants';
import type { ScoringRule } from '../types';

type Props = {
  rules: ScoringRule[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onViewDetails: (item: ScoringRule) => void;
  onEdit: (item: ScoringRule) => void;
  onDelete: (item: ScoringRule) => void;
};

const severityStyles: Record<string, string> = {
  INFO: 'bg-slate-100 text-slate-600',
  WARNING: 'bg-amber-50 text-amber-700',
  BLOCKING: 'bg-red-50 text-red-700',
};

function labelOf(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label || value;
}

export function ScoringRuleTable({ rules, isLoading, isError, onRetry, onViewDetails, onEdit, onDelete }: Props) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-32 flex-col items-center justify-center">
        <p className="text-red-500">Lỗi tải dữ liệu.</p>
        <button onClick={onRetry} className="text-cyan-600 underline hover:text-cyan-700">Thử lại</button>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center text-slate-500">
        <ListOrdered className="size-8 text-slate-300" />
        <p>Chưa có Scoring Rule nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50/75 text-xs font-black text-blue-950 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-center">Ưu tiên</th>
            <th className="px-4 py-3">Mã Code</th>
            <th className="px-4 py-3">Tên Rule</th>
            <th className="px-4 py-3">Điều kiện</th>
            <th className="px-4 py-3">Hành động</th>
            <th className="px-4 py-3 text-center">Mức độ</th>
            <th className="px-4 py-3 text-center">Trạng thái</th>
            <th className="px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rules.map((rule) => (
            <tr key={rule.id} onClick={() => onViewDetails(rule)} className="cursor-pointer transition hover:bg-cyan-50">
              <td className="px-4 py-3 text-center font-medium text-slate-500">{rule.priority}</td>
              <td className="px-4 py-3 font-mono font-bold text-slate-900">{rule.code}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{rule.name}</td>
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
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
                  <ActionMenuButton
                    ariaLabel={`Hành động cho scoring rule ${rule.code}`}
                    items={[
                      { id: 'view', label: 'Xem chi tiết', icon: Eye, onSelect: () => onViewDetails(rule) },
                      { id: 'edit', label: 'Chỉnh sửa', icon: Edit, tone: 'primary', onSelect: () => onEdit(rule) },
                      { id: 'delete', label: 'Xóa', icon: Trash2, tone: 'danger', onSelect: () => onDelete(rule) },
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
