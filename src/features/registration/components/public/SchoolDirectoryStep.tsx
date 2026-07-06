import { ArrowLeft } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import {
  isOtpPathMessage,
  useRegisterSchoolDirectoryMutation,
} from '../../api/useRegisterSchoolDirectoryMutation'
import type {
  RegisterSchoolDirectoryRequest,
  SchoolDirectory,
} from '../../types'
import { ContactInfoFields } from './ContactInfoFields'
import { uploadFileToStorage } from '@/shared/firebase/uploadToStorage'
import type { FormMessage } from './RegistrationFormFields'
import { DocumentFilesField, FormMessageBanner } from './RegistrationFormFields'
import {
  getApiErrorMessage,
  getStringValue,
} from './registrationFormUtils'
import {
  RegistrationCard,
  RegistrationHeading,
  RegistrationSubmitButton,
} from './RegistrationLayout'
import { SchoolDirectorySelect } from './SchoolDirectorySelect'

export function SchoolDirectoryStep({
  onBack,
  onOtpRequired,
  onPending,
}: {
  onBack: () => void
  onOtpRequired: (email: string) => void
  onPending: () => void
}) {
  const mutation = useRegisterSchoolDirectoryMutation()
  const [directory, setDirectory] = useState<SchoolDirectory | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<FormMessage | null>(null)
  const isSubmitting = mutation.isPending || isUploading

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!directory) {
      setMessage({ text: 'Vui lòng chọn trường từ danh mục.', tone: 'error' })
      return
    }

    const formData = new FormData(event.currentTarget)
    const studentCount = Number(getStringValue(formData, 'studentCount'))

    if (!Number.isInteger(studentCount) || studentCount < 1) {
      setMessage({
        text: 'Số học sinh phải là số nguyên lớn hơn 0.',
        tone: 'error',
      })
      return
    }

    const contactEmail = getStringValue(formData, 'contactEmail')

    let documentUrls: string[] | undefined
    if (files.length > 0) {
      try {
        setIsUploading(true)
        setMessage(null)
        documentUrls = await Promise.all(
          files.map((file) =>
            uploadFileToStorage(
              file,
              `registrations/${crypto.randomUUID()}/${file.name}`,
            ),
          ),
        )
      } catch {
        setMessage({
          text: 'Tải tài liệu lên thất bại. Vui lòng thử lại.',
          tone: 'error',
        })
        return
      } finally {
        setIsUploading(false)
      }
    }

    const payload: RegisterSchoolDirectoryRequest = {
      contactAddress: getStringValue(formData, 'contactAddress'),
      contactEmail,
      contactFullName: getStringValue(formData, 'contactFullName'),
      contactPhone: getStringValue(formData, 'contactPhone'),
      dateOfBirth: getStringValue(formData, 'dateOfBirth'),
      identityNumber: getStringValue(formData, 'identityNumber'),
      position: getStringValue(formData, 'position'),
      postalCode: getStringValue(formData, 'postalCode'),
      schoolDirectoryId: directory.id,
      studentCount,
      ...(documentUrls && documentUrls.length > 0 ? { documentUrls } : {}),
    }

    try {
      setMessage(null)
      const result = await mutation.mutateAsync(payload)

      if (isOtpPathMessage(result.message)) {
        onOtpRequired(contactEmail)
      } else {
        onPending()
      }
    } catch (error) {
      setMessage({
        text: getApiErrorMessage(
          error,
          'Gửi đơn đăng ký thất bại. Vui lòng thử lại.',
        ),
        tone: 'error',
      })
    }
  }

  return (
    <RegistrationCard>
      <button
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-indigo-600"
        disabled={isSubmitting}
        onClick={onBack}
        type="button"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Chọn lại cách đăng ký
      </button>

      <RegistrationHeading
        className="mb-6 flex"
        subtitle="Chọn trường trong danh mục và điền thông tin liên hệ."
        title="Đăng ký qua danh mục"
      />

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <SchoolDirectorySelect
          disabled={isSubmitting}
          onSelect={setDirectory}
          selected={directory}
        />

        <ContactInfoFields disabled={isSubmitting} />

        <div className="border-t border-slate-200 pt-4">
          <DocumentFilesField
            disabled={isSubmitting}
            files={files}
            onChange={setFiles}
          />
          <p className="mt-2 text-[11px] font-medium leading-4 text-slate-500">
            Nếu email của bạn khớp tên miền trường, hệ thống sẽ gửi mã OTP và
            bỏ qua tài liệu. Ngược lại, vui lòng đính kèm tài liệu để xác minh.
          </p>
        </div>

        <FormMessageBanner message={message} />

        <RegistrationSubmitButton disabled={isSubmitting}>
          {isUploading ? 'Đang tải tài liệu...' : isSubmitting ? 'Đang gửi...' : 'Gửi đăng ký'}
        </RegistrationSubmitButton>
      </form>
    </RegistrationCard>
  )
}
