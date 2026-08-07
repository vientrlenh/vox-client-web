import { useMyClassTestQuotaAllocationQuery } from '../api/useMyClassTestQuotaAllocationQuery'
import { MyQuotaAllocationCard } from '../components/MyQuotaAllocationCard'
import { QUOTA_ICONS, QUOTA_LABELS } from '../types'

export function TeacherQuotaUsagePage() {
  const myClassTestQuotaAllocationQuery = useMyClassTestQuotaAllocationQuery()

  return (
    <section className="mx-auto max-w-220">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Hạn mức sử dụng</h1>
        <p className="mt-2 text-[15px] text-slate-500">Hạn mức cá nhân bạn được cấp riêng cho bài kiểm tra trên lớp.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MyQuotaAllocationCard
          allocation={myClassTestQuotaAllocationQuery.data}
          icon={QUOTA_ICONS.CLASS_TEST}
          isLoading={myClassTestQuotaAllocationQuery.isLoading}
          label={QUOTA_LABELS.CLASS_TEST}
        />
      </div>
    </section>
  )
}