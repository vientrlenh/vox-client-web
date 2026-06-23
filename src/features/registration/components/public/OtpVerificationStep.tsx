import { MailCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useVerifyRegistrationMutation } from '../../api/useVerifyRegistrationMutation'
import type { FormMessage } from './RegistrationFormFields'
import { FormMessageBanner, RequiredMark } from './RegistrationFormFields'
import { getApiErrorMessage } from './registrationFormUtils'
import {
  RegistrationCard,
  RegistrationHeading,
  RegistrationSubmitButton,
} from './RegistrationLayout'

const OTP_TTL_SECONDS = 10 * 60

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

export function OtpVerificationStep({
  email,
  onRestart,
  onVerified,
}: {
  email: string
  onRestart: () => void
  onVerified: () => void
}) {
  const mutation = useVerifyRegistrationMutation()
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS)
  const [message, setMessage] = useState<FormMessage | null>(null)
  const isExpired = secondsLeft <= 0
  const isSubmitting = mutation.isPending

  useEffect(() => {
    if (secondsLeft <= 0) {
      return
    }

    const timerId = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [secondsLeft])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const otp = String(formData.get('otp') ?? '').trim()

    if (otp.length !== 6) {
      setMessage({ text: 'Mã OTP gồm 6 chữ số.', tone: 'error' })
      return
    }

    try {
      setMessage(null)
      await mutation.mutateAsync({ email, otp })
      onVerified()
    } catch (error) {
      setMessage({
        text: getApiErrorMessage(error, 'Yêu cầu xác thực thất bại.'),
        tone: 'error',
      })
    }
  }

  return (
    <RegistrationCard>
      <RegistrationHeading
        className="mb-6 flex"
        subtitle="Nhập mã OTP gồm 6 chữ số đã được gửi tới email của bạn."
        title="Xác thực đăng ký"
      />

      <div className="mb-5 flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
        <MailCheck aria-hidden="true" className="size-5 shrink-0 text-indigo-600" />
        <p className="text-xs font-semibold leading-5 text-indigo-800">
          Mã OTP đã gửi tới <span className="font-black">{email}</span>
        </p>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="block" htmlFor="otp">
          <span className="mb-1.5 block text-xs font-bold leading-4 text-blue-950">
            Mã OTP <RequiredMark />
          </span>
          <input
            autoComplete="one-time-code"
            className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-center text-lg font-black tracking-[0.5em] text-slate-900 outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            disabled={isSubmitting || isExpired}
            id="otp"
            inputMode="numeric"
            maxLength={6}
            name="otp"
            pattern="\d{6}"
            placeholder="------"
            required
          />
        </label>

        <p
          className={`text-center text-xs font-bold ${isExpired ? 'text-red-600' : 'text-slate-500'}`}
        >
          {isExpired
            ? 'Mã OTP đã hết hạn. Vui lòng đăng ký lại để nhận mã mới.'
            : `Mã hết hạn sau ${formatCountdown(secondsLeft)}`}
        </p>

        <FormMessageBanner message={message} />

        {isExpired ? (
          <button
            className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
            onClick={onRestart}
            type="button"
          >
            Đăng ký lại
          </button>
        ) : (
          <RegistrationSubmitButton disabled={isSubmitting}>
            {isSubmitting ? 'Đang xác thực...' : 'Xác thực'}
          </RegistrationSubmitButton>
        )}
      </form>
    </RegistrationCard>
  )
}
