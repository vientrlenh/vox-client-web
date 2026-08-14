// src/features/scoring_rules_school/components/ViewScoringRuleDialog.tsx

import { X, RefreshCw } from 'lucide-react';
import { useSchoolScoringRuleDetailQuery } from '../api/useSchoolScoringRuleDetailQuery';
import { CONDITION_TYPE_OPTIONS, ACTION_TYPE_OPTIONS, SEVERITY_OPTIONS } from '../constants';
import { parseParamsJson } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string | undefined;
  policyId: string | undefined;
  ruleId: string | undefined;
};

function labelOf(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label || value;
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{children}</div>
    </div>
  );
}

export function ViewScoringRuleDialog({ isOpen, onClose, schoolId, policyId, ruleId }: Props) {
  const { data: rule, isLoading } = useSchoolScoringRuleDetailQuery(
    isOpen ? schoolId : undefined,
    isOpen ? policyId : undefined,
    isOpen ? ruleId : undefined
  );

  if (!isOpen) return null;

  const conditionOption = rule ? CONDITION_TYPE_OPTIONS.find((option) => option.value === rule.conditionType) : undefined;
  const actionOption = rule ? ACTION_TYPE_OPTIONS.find((option) => option.value === rule.actionType) : undefined;
  const conditionParams = rule ? parseParamsJson(rule.conditionParamsJson) : {};
  const actionParams = rule ? parseParamsJson(rule.actionParamsJson) : {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-blue-950">
            Chi tiết Scoring Rule {rule ? <span className="font-mono text-slate-500">{rule.code}</span> : null}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {isLoading || !rule ? (
            <div className="flex h-32 items-center justify-center">
              <RefreshCw className="size-6 animate-spin text-cyan-600" />
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <InfoField label="Tên Rule">{rule.name}</InfoField>
              </div>

              <div className="sm:col-span-2">
                <InfoField label="Mô tả">{rule.description || 'Không có mô tả'}</InfoField>
              </div>

              <div className="sm:col-span-2 rounded-lg border border-slate-200 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Điều kiện (Condition)</p>
                <p className="text-sm font-bold text-slate-900">{conditionOption?.label || rule.conditionType}</p>
                <div className="mt-2 grid gap-1">
                  {(conditionOption?.fields ?? []).map((field) => (
                    <p key={field.name} className="text-sm text-slate-700">
                      <span className="font-medium text-slate-500">{field.label}:</span>{' '}
                      {String(conditionParams[field.name] ?? '—')}
                    </p>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 rounded-lg border border-slate-200 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Hành động (Action)</p>
                <p className="text-sm font-bold text-slate-900">{actionOption?.label || rule.actionType}</p>
                <div className="mt-2 grid gap-1">
                  {(actionOption?.fields ?? []).map((field) => (
                    <p key={field.name} className="text-sm text-slate-700">
                      <span className="font-medium text-slate-500">{field.label}:</span>{' '}
                      {String(actionParams[field.name] ?? '—')}
                    </p>
                  ))}
                </div>
              </div>

              <InfoField label="Độ ưu tiên">{rule.priority}</InfoField>
              <InfoField label="Mức độ nghiêm trọng">{labelOf(SEVERITY_OPTIONS, rule.severity)}</InfoField>
              <InfoField label="Dừng thi">{rule.stopProcessing ? 'Có' : 'Không'}</InfoField>
              <InfoField label="Trạng thái">{rule.isActive ? 'Đang bật' : 'Đang tắt'}</InfoField>
              <InfoField label="Tạo lúc">{rule.createdAt ? new Date(rule.createdAt).toLocaleString('vi-VN') : '—'}</InfoField>
              <InfoField label="Cập nhật gần nhất">{rule.updatedAt ? new Date(rule.updatedAt).toLocaleString('vi-VN') : '—'}</InfoField>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
