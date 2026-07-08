import { ClipboardCheck } from 'lucide-react'

export function AssessmentMethodTab() {
  return (
    <div className="mt-4 flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <ClipboardCheck aria-hidden="true" className="size-7" />
      </span>
      <div className="mt-1 text-[16px] font-extrabold text-slate-900">Phương thức đánh giá</div>
      <p className="max-w-105 text-[13px] leading-6 text-slate-500">Tính năng đang được phát triển.</p>
    </div>
  )
}
