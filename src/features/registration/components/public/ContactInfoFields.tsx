import type { FieldConfig } from './RegistrationFormFields'
import {
  DateField,
  FormSection,
  PositionSelectField,
  TextField,
} from './RegistrationFormFields'

const contactFields: FieldConfig[] = [
  {
    autoComplete: 'name',
    id: 'contact-name',
    label: 'Họ và tên liên hệ',
    maxLength: 255,
    name: 'contactFullName',
    placeholder: 'Nhập họ và tên đầy đủ',
    required: true,
  },
  {
    id: 'identity-number',
    label: 'Mã định danh',
    maxLength: 20,
    name: 'identityNumber',
    placeholder: 'Nhập mã định danh',
    required: true,
  },
  {
    autoComplete: 'tel',
    id: 'contact-phone',
    label: 'Số điện thoại liên hệ',
    maxLength: 20,
    name: 'contactPhone',
    placeholder: 'Nhập số điện thoại',
    required: true,
    type: 'tel',
  },
  {
    autoComplete: 'email',
    id: 'contact-email',
    label: 'Email liên hệ',
    maxLength: 255,
    name: 'contactEmail',
    placeholder: 'Nhập email',
    required: true,
    type: 'email',
  },
]

/**
 * Khối field thông tin liên hệ + chức vụ/quy mô, dùng chung cho cả luồng
 * đăng ký qua danh mục và luồng tự khai (khớp `RegisterContactInfo`).
 */
export function ContactInfoFields({ disabled }: { disabled?: boolean }) {
  return (
    <>
      <FormSection title="Thông tin liên hệ">
        <div className="grid gap-3 sm:grid-cols-2">
          {contactFields.map((field) => (
            <TextField disabled={disabled} key={field.id} {...field} />
          ))}
          <DateField disabled={disabled} />
          <TextField
            autoComplete="street-address"
            disabled={disabled}
            id="contact-address"
            label="Địa chỉ liên hệ"
            maxLength={512}
            name="contactAddress"
            placeholder="Nhập địa chỉ liên hệ"
            required
          />
        </div>
      </FormSection>

      <FormSection title="Chức vụ & quy mô">
        <div className="grid gap-3 sm:grid-cols-2">
          <PositionSelectField disabled={disabled} />
          <TextField
            disabled={disabled}
            id="postal-code"
            label="Mã bưu chính"
            maxLength={10}
            name="postalCode"
            placeholder="Nhập mã bưu chính"
            required
          />
          <TextField
            disabled={disabled}
            id="student-count"
            label="Số học sinh"
            min={1}
            name="studentCount"
            placeholder="Nhập số học sinh của trường"
            required
            type="number"
          />
        </div>
      </FormSection>
    </>
  )
}
