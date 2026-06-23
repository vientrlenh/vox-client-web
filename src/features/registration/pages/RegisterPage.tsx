import { useState } from 'react'
import { OtpVerificationStep } from '../components/public/OtpVerificationStep'
import { RegisterMethodStep } from '../components/public/RegisterMethodStep'
import { RegistrationLayout } from '../components/public/RegistrationLayout'
import { RegistrationResultStep } from '../components/public/RegistrationResultStep'
import { SchoolDirectoryStep } from '../components/public/SchoolDirectoryStep'
import { SelfDeclaredStep } from '../components/public/SelfDeclaredStep'

export type RegistrationMethod = 'directory' | 'self-declared'

type RegistrationStep =
  | 'directory'
  | 'method'
  | 'otp'
  | 'pending'
  | 'self-declared'
  | 'success'

export function RegisterPage() {
  const [step, setStep] = useState<RegistrationStep>('method')
  const [otpEmail, setOtpEmail] = useState('')

  function renderStep() {
    switch (step) {
      case 'method':
        return <RegisterMethodStep onSelect={setStep} />
      case 'directory':
        return (
          <SchoolDirectoryStep
            onBack={() => setStep('method')}
            onOtpRequired={(email) => {
              setOtpEmail(email)
              setStep('otp')
            }}
            onPending={() => setStep('pending')}
          />
        )
      case 'self-declared':
        return (
          <SelfDeclaredStep
            onBack={() => setStep('method')}
            onPending={() => setStep('pending')}
          />
        )
      case 'otp':
        return (
          <OtpVerificationStep
            email={otpEmail}
            onRestart={() => setStep('directory')}
            onVerified={() => setStep('success')}
          />
        )
      case 'pending':
        return <RegistrationResultStep variant="pending" />
      case 'success':
        return <RegistrationResultStep variant="success" />
      default:
        return null
    }
  }

  return (
    <RegistrationLayout
      subtitle="Vui lòng điền đầy đủ thông tin để chúng tôi hỗ trợ bạn tốt nhất."
      title="Đăng ký tài khoản trường học"
    >
      {renderStep()}
    </RegistrationLayout>
  )
}
