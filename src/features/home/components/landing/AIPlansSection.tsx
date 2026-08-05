import { ArrowRight, ClipboardList, FileCheck2, Headphones, Star } from 'lucide-react'
import { Link } from 'react-router'
import { useSubscriptionPlansQuery } from '@/features/subscription_system/api/useSubscriptionPlansQuery'
import {
  formatQuotaMinutes,
  formatVnd,
  QUOTA_LABELS,
  QUOTA_TYPES,
  type QuotaType,
} from '@/features/subscription_system/types'
import { routeLinks } from '../../data/landingContent'
import { Container, SectionHeading } from './landingShared'

const QUOTA_ICONS: Record<QuotaType, typeof FileCheck2> = {
  CLASS_TEST: ClipboardList,
  GRADING: FileCheck2,
  PRACTICE: Headphones,
}

const QUOTA_ICON_STYLES: Record<QuotaType, string> = {
  CLASS_TEST: 'bg-blue-50 text-blue-600',
  GRADING: 'bg-violet-50 text-violet-600',
  PRACTICE: 'bg-emerald-50 text-emerald-600',
}

export function AIPlansSection() {
  const plansQuery = useSubscriptionPlansQuery(1, 50)
  const activePlans = (plansQuery.data?.content ?? []).filter((plan) => plan.status === 'ACTIVE')

  return (
    <section className="bg-slate-50 py-7 sm:py-16" id="ai-plans">
      <Container>
        <SectionHeading
          title={
            <>
              Gói <span className="text-indigo-600">AI</span> dành cho nhà trường
            </>
          }
        />
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-600 sm:text-base">
          Chọn gói phù hợp với quy mô trường của bạn — hạn mức chấm bài, kiểm tra và luyện tập bằng AI.
        </p>

        {plansQuery.isLoading ? (
          <p className="mt-8 text-center text-sm font-semibold text-slate-500">Đang tải danh sách gói...</p>
        ) : activePlans.length === 0 ? (
          <p className="mt-8 text-center text-sm font-semibold text-slate-500">
            Hiện chưa có gói nào đang mở đăng ký.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activePlans.map((plan) => {
              const quotaByType = new Map(plan.quotas.map((quota) => [quota.quotaType, quota]))

              return (
                <div
                  className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                    plan.popular ? 'border-indigo-300 shadow-lg shadow-indigo-100' : 'border-slate-200'
                  }`}
                  key={plan.id}
                >
                  <div
                    className={`h-2 w-full ${
                      plan.popular
                        ? 'bg-linear-to-r from-blue-950 via-indigo-600 to-violet-600'
                        : 'bg-linear-to-r from-indigo-500 to-cyan-500'
                    }`}
                  />

                  {plan.popular ? (
                    <span className="absolute top-5 right-5 inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-blue-950 via-indigo-600 to-violet-600 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
                      <Star aria-hidden="true" className="size-3.5" />
                      Phổ biến nhất
                    </span>
                  ) : null}

                  <div className="p-6">
                    <h3 className="text-lg font-extrabold text-blue-950">{plan.name}</h3>
                    <p className="mt-1 min-h-9.5 text-[12.5px] leading-5 text-slate-500">{plan.tagline ?? ''}</p>

                    <div className="mt-3.5 flex items-baseline gap-1.5">
                      <span className="text-[26px] font-extrabold text-indigo-700">
                        {formatVnd(plan.pricePerYear)}
                      </span>
                      <span className="text-sm text-slate-500">/ {plan.validityDays} ngày</span>
                    </div>

                    <div className="mt-4.5 grid gap-3 border-t border-slate-200 pt-4.5">
                      {QUOTA_TYPES.map((quotaType) => {
                        const quota = quotaByType.get(quotaType)
                        const Icon = QUOTA_ICONS[quotaType]

                        return (
                          <div className="flex items-center gap-2.5" key={quotaType}>
                            <span
                              className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${QUOTA_ICON_STYLES[quotaType]}`}
                            >
                              <Icon aria-hidden="true" className="size-3.5" />
                            </span>
                            <span className="flex-1 text-[13px] text-slate-600">{QUOTA_LABELS[quotaType]}</span>
                            <span className="text-sm font-extrabold text-slate-900">
                              {formatQuotaMinutes(quota?.includedQuantity)}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <Link
                      className={`mt-4.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-black transition ${
                        plan.popular
                          ? 'bg-linear-to-r from-blue-950 via-indigo-600 to-violet-600 text-white hover:brightness-110'
                          : 'border-1.5 border-indigo-600 bg-white text-indigo-700 hover:bg-indigo-50'
                      }`}
                      to={routeLinks.register}
                    >
                      Đăng ký
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </section>
  )
}
