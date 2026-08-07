import { useMyPracticeQuotaAllocationQuery } from '../api/useMyPracticeQuotaAllocationQuery'
import { MyQuotaAllocationCard } from '../components/MyQuotaAllocationCard'
import { QUOTA_ICONS, QUOTA_LABELS } from '../types'

export function StudentQuotaUsagePage() {
  const myPracticeQuotaAllocationQuery = useMyPracticeQuotaAllocationQuery()

  return (
    <section className="mx-auto max-w-220">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Hạn mức sử dụng</h1>
        <p className="mt-2 text-[15px] text-slate-500">Hạn mức cá nhân bạn được cấp riêng cho luyện tập.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MyQuotaAllocationCard
          allocation={myPracticeQuotaAllocationQuery.data}
          icon={QUOTA_ICONS.PRACTICE}
          isLoading={myPracticeQuotaAllocationQuery.isLoading}
          label={QUOTA_LABELS.PRACTICE}
        />
      </div>
    </section>
  )
}