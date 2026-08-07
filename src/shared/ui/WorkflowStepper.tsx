import type { ReactNode } from 'react'

export type WorkflowStepState = 'done' | 'current' | 'upcoming'

export type WorkflowStep = {
  icon: ReactNode
  label: string
  sublabel?: string
  state: WorkflowStepState
}

type WorkflowStepperProps = {
  steps: WorkflowStep[]
  variant?: 'full' | 'compact'
}

const circleClassByState: Record<WorkflowStepState, string> = {
  current: 'border-2 border-indigo-600 bg-white text-indigo-600 animate-pulse',
  done: 'bg-indigo-600 text-white',
  upcoming: 'bg-slate-100 text-slate-400',
}

const connectorClassByState: Record<WorkflowStepState, string> = {
  current: 'bg-indigo-600',
  done: 'bg-indigo-600',
  upcoming: 'bg-slate-200',
}

export function WorkflowStepper({ steps, variant = 'full' }: WorkflowStepperProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        {steps.map((step, index) => (
          <div className="flex items-center gap-1.5" key={index}>
            <span
              // `[&_svg]:size-3.5` ép icon về cỡ vòng tròn: chỗ gọi khai báo icon theo bản đầy đủ
              // (size 24–26) nên nhét nguyên vào vòng 24px là tràn ra ngoài, làm hàng bước bị lệch.
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold [&_svg]:size-3.5 ${circleClassByState[step.state]}`}
              // Bản rút gọn chỉ còn con số nên không đọc ra bước nào; tooltip trả lại đúng phần chữ
              // mà bản đầy đủ ở trang chi tiết hiện sẵn.
              title={step.sublabel ? `${step.label} — ${step.sublabel}` : step.label}
            >
              {step.state === 'done' ? step.icon : index + 1}
            </span>
            {index < steps.length - 1 ? (
              <span className={`h-0.5 w-5 rounded-full ${connectorClassByState[step.state]}`} />
            ) : null}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-start">
      {steps.map((step, index) => (
        <div className="relative flex flex-1 flex-col items-center text-center" key={index}>
          <span
            className={`z-10 flex h-13 w-13 items-center justify-center rounded-full text-2xl ${circleClassByState[step.state]}`}
          >
            {step.icon}
          </span>
          {index < steps.length - 1 ? (
            <span
              className={`absolute top-6.5 left-1/2 h-1 w-full ${connectorClassByState[step.state]}`}
            />
          ) : null}
          <div
            className={`mt-3 text-sm font-bold ${step.state === 'current' ? 'text-indigo-600' : step.state === 'upcoming' ? 'text-slate-400' : 'text-slate-900'}`}
          >
            {step.label}
          </div>
          {step.sublabel ? (
            <div
              className={`mt-0.5 text-xs font-semibold ${step.state === 'current' ? 'text-indigo-600' : step.state === 'upcoming' ? 'text-slate-400' : 'text-emerald-600'}`}
            >
              {step.sublabel}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
