// src/features/scoring_rules_school/pages/SchoolAdminScoringRulesPage.tsx

import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, Gavel } from 'lucide-react';
import { useAppSelector } from '@/app/store/hooks';
import { ScoringRulesPanel } from '../components/ScoringRulesPanel';

export function SchoolAdminScoringRulesPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

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
            onClick={() => navigate(`/school-admin/assessment-policies/${policyId}`)}
            aria-label="Quay lại"
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex items-center gap-2.5 text-[32px] font-bold tracking-tight text-slate-950">
            <Gavel className="size-[26px] text-indigo-600" /> Scoring Rules
          </h1>
        </div>
      </div>

      {/* BẢNG DANH SÁCH SCORING RULES */}
      <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
        <ScoringRulesPanel schoolId={schoolId} policyId={policyId} />
      </div>
    </section>
  );
}
