import { ArrowRight, Clock, FileCheck2, Headphones, Star } from 'lucide-react'
import { Link } from 'react-router'
import { useSubscriptionPlansQuery } from '@/features/subscription_system/api/useSubscriptionPlansQuery'
import {
  formatMinutes,
  formatPeriod,
  formatVnd,
  QUOTA_LABELS,
  QUOTA_TYPES,
  type QuotaType,
} from '@/features/subscription_system/types'
import { routeLinks } from '../../data/landingContent'
import { Container, SectionHeading } from './landingShared'

const QUOTA_ICONS: Record<QuotaType, typeof FileCheck2> = {
  EXAM: FileCheck2,
  PRACTICE: Headphones,
}

export function AIPlansSection() {
  const plansQuery = useSubscriptionPlansQuery(1, 50)
  const activePlans = (plansQuery.data?.content ?? []).filter(
    ({ subscription }) => subscription.status === 'ACTIVE',
  )

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
          <div className="mt-8 grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
            {activePlans.map(({ isMostPopular, subscription: plan }) => {
              const quotaByType = new Map(plan.quotas.map((quota) => [quota.quotaType, quota]))

              return (
                <div
                  className={`relative overflow-hidden bg-white transition hover:scale-[1.02] ${
                    isMostPopular
                      ? 'rounded-[20px] border-[1.5px] border-indigo-600 p-7 sm:p-8'
                      : 'rounded-[14px] border border-slate-200 p-6'
                  }`}
                  key={plan.id}
                >
                  {/* Nhãn nằm GỌN trong góc thẻ, không lơ lửng ngoài viền: thẻ nào cũng có thể nằm
                      trong một khối overflow-hidden, và nhãn tràn ra ngoài sẽ bị cắt mất ở đó. */}
                  {isMostPopular ? (
                    <span className="absolute top-0 right-0 inline-flex items-center gap-1.5 rounded-tr-[18px] rounded-bl-[12px] bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white">
                      <Star aria-hidden="true" className="size-3 fill-current" />
                      Phổ biến
                    </span>
                  ) : null}

                  <h3
                    className={`text-lg font-medium text-blue-950 ${isMostPopular ? 'pr-26' : ''}`}
                  >
                    {plan.name}
                  </h3>
                  <p className="mt-1.5 min-h-10 text-sm leading-5 text-slate-500">{plan.tagline ?? ''}</p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-[32px] font-bold tracking-tight text-blue-950 tabular-nums">
                      {formatVnd(plan.priceVnd)}
                    </span>
                    <span className="text-sm text-slate-500">
                      / {formatPeriod(plan.periodType, plan.periodCount)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3.5 border-t border-slate-200 pt-5">
                    {QUOTA_TYPES.map((quotaType) => {
                      const quota = quotaByType.get(quotaType)
                      const Icon = QUOTA_ICONS[quotaType]

                      return (
                        <div className="flex items-center gap-2.5" key={quotaType}>
                          <Icon aria-hidden="true" className="size-5 shrink-0 text-indigo-600" />
                          <span className="flex-1 text-sm text-slate-600">{QUOTA_LABELS[quotaType]}</span>
                          <span className="text-[15px] font-medium text-blue-950 tabular-nums">
                            {formatVnd(quota?.includedAmountVnd)}
                          </span>
                        </div>
                      )
                    })}
                    <div className="flex items-center gap-2.5">
                      <Clock aria-hidden="true" className="size-5 shrink-0 text-slate-400" />
                      <span className="flex-1 text-sm text-slate-600">Tối đa mỗi bài</span>
                      <span className="text-[15px] font-medium text-blue-950 tabular-nums">
                        {formatMinutes(plan.maxTimePerAttemptMin)}
                      </span>
                    </div>
                  </div>

                  <Link
                    className={`mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium transition ${
                      isMostPopular
                        ? 'bg-linear-to-br from-indigo-600 to-cyan-500 text-white hover:brightness-110'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                    to={routeLinks.register}
                  >
                    Đăng ký
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </section>
  )
}
