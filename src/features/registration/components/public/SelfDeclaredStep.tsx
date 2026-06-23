import { ArrowLeft } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRegisterSelfDeclaredMutation } from '../../api/useRegisterSelfDeclaredMutation'
import type { RegisterSelfDeclaredRequest } from '../../types'
import { ContactInfoFields } from './ContactInfoFields'
import type { FieldConfig, FormMessage } from './RegistrationFormFields'
import {
  DocumentUrlsField,
  FormMessageBanner,
  FormSection,
  TextField,
} from './RegistrationFormFields'
import {
  getApiErrorMessage,
  getStringValue,
  sanitizeUrls,
} from './registrationFormUtils'
import {
  RegistrationCard,
  RegistrationHeading,
  RegistrationSubmitButton,
} from './RegistrationLayout'

const schoolFields: FieldConfig[] = [
  {
    autoComplete: 'organization',
    id: 'school-name',
    label: 'Tên trường',
    maxLength: 255,
    name: 'schoolName',
    placeholder: 'Nhập tên trường',
    required: true,
  },
  {
    id: 'school-domain',
    label: 'Tên miền của trường',
    maxLength: 100,
    name: 'schoolDomain',
    placeholder: 'vd: ten-truong.edu.vn',
  },
  {
    id: 'school-district',
    label: 'Quận / Huyện',
    maxLength: 100,
    name: 'schoolDistrict',
    placeholder: 'Nhập quận/huyện',
    required: true,
  },
  {
    id: 'school-province',
    label: 'Tỉnh / Thành phố',
    maxLength: 100,
    name: 'schoolProvince',
    placeholder: 'Nhập tỉnh/thành phố',
    required: true,
  },
]

export function SelfDeclaredStep({
  onBack,
  onPending,
}: {
  onBack: () => void
  onPending: () => void
}) {
  const mutation = useRegisterSelfDeclaredMutation()
  const [documentUrls, setDocumentUrls] = useState<string[]>([''])
  const [message, setMessage] = useState<FormMessage | null>(null)
  const isSubmitting = mutation.isPending

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const studentCount = Number(getStringValue(formData, 'studentCount'))

    if (!Number.isInteger(studentCount) || studentCount < 1) {
      setMessage({
        text: 'Số học sinh phải là số nguyên lớn hơn 0.',
        tone: 'error',
      })
      return
    }

    const cleanedUrls = sanitizeUrls(documentUrls)

    if (cleanedUrls.length === 0) {
      setMessage({
        text: 'Vui lòng đính kèm ít nhất một tài liệu xác thực.',
        tone: 'error',
      })
      return
    }

    const schoolDomain = getStringValue(formData, 'schoolDomain')
    const payload: RegisterSelfDeclaredRequest = {
      contactAddress: getStringValue(formData, 'contactAddress'),
      contactEmail: getStringValue(formData, 'contactEmail'),
      contactFullName: getStringValue(formData, 'contactFullName'),
      contactPhone: getStringValue(formData, 'contactPhone'),
      dateOfBirth: getStringValue(formData, 'dateOfBirth'),
      documentUrls: cleanedUrls,
      identityNumber: getStringValue(formData, 'identityNumber'),
      position: getStringValue(formData, 'position'),
      postalCode: getStringValue(formData, 'postalCode'),
      schoolAddress: getStringValue(formData, 'schoolAddress'),
      schoolDistrict: getStringValue(formData, 'schoolDistrict'),
      schoolName: getStringValue(formData, 'schoolName'),
      schoolProvince: getStringValue(formData, 'schoolProvince'),
      studentCount,
      ...(schoolDomain ? { schoolDomain } : {}),
    }

    try {
      setMessage(null)
      await mutation.mutateAsync(payload)
      onPending()
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
        subtitle="Tự khai thông tin trường và đính kèm tài liệu xác thực."
        title="Tự khai đăng ký"
      />

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <FormSection title="Thông tin trường">
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {schoolFields.map((field) => (
                <TextField disabled={isSubmitting} key={field.id} {...field} />
              ))}
            </div>
            <TextField
              autoComplete="street-address"
              disabled={isSubmitting}
              id="school-address"
              label="Địa chỉ trường"
              maxLength={512}
              name="schoolAddress"
              placeholder="Nhập địa chỉ trường"
              required
            />
          </div>
        </FormSection>

        <ContactInfoFields disabled={isSubmitting} />

        <div className="border-t border-slate-200 pt-4">
          <DocumentUrlsField
            disabled={isSubmitting}
            onChange={setDocumentUrls}
            required
            urls={documentUrls}
          />
        </div>

        <FormMessageBanner message={message} />

        <RegistrationSubmitButton disabled={isSubmitting}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi đăng ký'}
        </RegistrationSubmitButton>
      </form>
    </RegistrationCard>
  )
}
