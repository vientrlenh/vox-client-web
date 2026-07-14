// src/features/scoring_rules_school/types.ts

export type ScoringRule = {
  id: string;
  policyId: string;
  code: string;
  name: string;
  description?: string | null;
  conditionType: string;
  conditionParamsJson: string;
  actionType: string;
  actionParamsJson: string;
  priority: number;
  severity: string;
  stopProcessing: boolean;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ScoringRulePage = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: ScoringRule[];
};

export function parseParamsJson(json?: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
