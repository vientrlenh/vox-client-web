import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toApiError } from '@/shared/api'
import { AvatarUploadField } from '@/shared/ui/AvatarUploadField'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { SchoolDirectoryVerifiedBadge } from '@/features/school-directory/components/SchoolDirectoryVerifiedBadge'
import { formatNullableText } from '@/features/school-directory/types'
import type { SchoolDirectory } from '@/features/school-directory/types'
import { useCreateSchoolMutation } from '../api/useCreateSchoolMutation'
import { SchoolDirectoryPickerDialog } from '../components/SchoolDirectoryPickerDialog'
import { CREATE_SCHOOL_FIELD_LIMITS } from '../types'
import type { CreateSchoolRequest } from '../types'

/** Nguồn lấy mã / tên / địa chỉ / domain của trường. Server không trộn hai nguồn, nên UI cũng không. */
type SchoolInfoSource = 'directory' | 'manual'

type FieldName =
  | 'adminDateOfBirth'
  | 'adminEmail'
  | 'adminFullName'
  | 'adminPhone'
  | 'schoolAddress'
  | 'schoolCode'
  | 'schoolDirectoryId'
  | 'schoolName'
  | 'studentCount'

type FieldErrors = Partial<Record<FieldName, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function inputClassName(hasError: boolean) {
  return [
    'h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition focus:ring-4',
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100',
  ].join(' ')
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <span className="text-xs font-semibold text-red-600">{message}</span>
}

function RequiredMark() {
  return <span className="text-red-600">*</span>
}

export function SystemAdminCreateSchoolPage() {
  const navigate = useNavigate()
  const createMutation = useCreateSchoolMutation()
  const { confirm, dialog } = useConfirmationDialog()

  const [source, setSource] = useState<SchoolInfoSource>('directory')
  const [selectedDirectory, setSelectedDirectory] =
    useState<SchoolDirectory | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const [schoolCode, setSchoolCode] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [schoolDomain, setSchoolDomain] = useState('')
  const [studentCount, setStudentCount] = useState('')

  const [adminFullName, setAdminFullName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminDateOfBirth, setAdminDateOfBirth] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [adminAddress, setAdminAddress] = useState('')
  const [adminAvatarUrl, setAdminAvatarUrl] = useState('')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resolvedSchoolName =
    source === 'directory'
      ? formatNullableText(selectedDirectory?.name)
      : schoolName.trim()

  function changeSource(nextSource: SchoolInfoSource) {
    setSource(nextSource)
    setFieldErrors({})
    setErrorMessage(null)
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (source === 'directory') {
      if (!selectedDirectory) {
        errors.schoolDirectoryId = 'Chọn một trường trong danh mục.'
      }
    } else {
      if (!schoolCode.trim()) {
        errors.schoolCode = 'Nhập mã trường.'
      }
      if (!schoolName.trim()) {
        errors.schoolName = 'Nhập tên trường.'
      }
      if (!schoolAddress.trim()) {
        errors.schoolAddress = 'Nhập địa chỉ trường.'
      }
    }

    const parsedStudentCount = Number(studentCount)
    if (!studentCount.trim()) {
      errors.studentCount = 'Nhập số học sinh.'
    } else if (!Number.isInteger(parsedStudentCount) || parsedStudentCount < 0) {
      errors.studentCount = 'Số học sinh phải là số nguyên không âm.'
    }

    if (!adminFullName.trim()) {
      errors.adminFullName = 'Nhập họ tên quản trị viên.'
    }

    if (!adminEmail.trim()) {
      errors.adminEmail = 'Nhập email quản trị viên.'
    } else if (!EMAIL_PATTERN.test(adminEmail.trim())) {
      errors.adminEmail = 'Email không hợp lệ.'
    }

    if (!adminDateOfBirth) {
      errors.adminDateOfBirth = 'Chọn ngày sinh quản trị viên.'
    }

    return errors
  }

  function buildPayload(): CreateSchoolRequest {
    const schoolInfo =
      source === 'directory'
        ? {
            schoolAddress: null,
            schoolCode: null,
            schoolDirectoryId: selectedDirectory?.id ?? null,
            schoolDomain: null,
            schoolName: null,
          }
        : {
            schoolAddress: schoolAddress.trim(),
            schoolCode: schoolCode.trim(),
            schoolDirectoryId: null,
            schoolDomain: schoolDomain.trim() || null,
            schoolName: schoolName.trim(),
          }

    return {
      adminAddress: adminAddress.trim() || null,
      adminAvatarUrl: adminAvatarUrl.trim() || null,
      adminDateOfBirth,
      adminEmail: adminEmail.trim(),
      adminFullName: adminFullName.trim(),
      adminPhone: adminPhone.trim() || null,
      studentCount: Number(studentCount),
      ...schoolInfo,
    }
  }

  /**
   * Ba lỗi trùng dữ liệu chỉ server biết được (ProvisionSchoolService), nên gắn lại vào đúng ô
   * thay vì để người dùng tự dò. "Mã trường đã tồn tại" ở chế độ danh mục thì không có ô nào để
   * gắn — trả về null để rơi xuống banner chung.
   */
  function toFieldError(message: string): FieldErrors | null {
    if (message.includes('Mã trường đã tồn tại')) {
      return source === 'manual' ? { schoolCode: message } : null
    }
    if (message.includes('email này đã tồn tại')) {
      return { adminEmail: message }
    }
    if (message.includes('số điện thoại này đã tồn tại')) {
      return { adminPhone: message }
    }
    return null
  }

  async function handleSubmit() {
    setErrorMessage(null)
    const errors = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      setErrorMessage('Vui lòng kiểm tra lại các trường được đánh dấu đỏ.')
      return
    }

    const willVerifyDirectory =
      source === 'directory' && selectedDirectory?.verified === false

    const isConfirmed = await confirm({
      confirmLabel: 'Tạo trường',
      message: [
        `Tạo trường "${resolvedSchoolName}" và tài khoản quản trị cho ${adminEmail.trim()}?`,
        `Hệ thống sẽ gửi mail đặt mật khẩu tới email này.`,
        willVerifyDirectory
          ? 'Trường trong danh mục hiện chưa xác minh và sẽ được đánh dấu đã xác minh.'
          : '',
      ]
        .filter(Boolean)
        .join(' '),
      title: 'Tạo trường học',
    })

    if (!isConfirmed) {
      return
    }

    try {
      await createMutation.mutateAsync(buildPayload())
      navigate('/system-admin/schools', {
        state: {
          successMessage: `Đã tạo trường "${resolvedSchoolName}". Quản trị viên ${adminEmail.trim()} sẽ nhận mail đặt mật khẩu.`,
        },
      })
    } catch (error) {
      const message = toApiError(error).message
      const mappedError = toFieldError(message)

      if (mappedError) {
        setFieldErrors(mappedError)
      }
      setErrorMessage(message)
    }
  }

  return (
    <section
      aria-labelledby="system-admin-create-school-title"
      className="grid gap-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav
            aria-label="Đường dẫn"
            className="flex items-center gap-2 text-sm font-bold text-slate-500"
          >
            <Link
              className="transition hover:text-indigo-700"
              to="/system-admin/schools"
            >
              Quản lý trường học
            </Link>
            <span aria-hidden="true">/</span>
            <span>Tạo trường</span>
          </nav>
          <h1
            className="mt-3 text-2xl font-black text-blue-950 sm:text-3xl"
            id="system-admin-create-school-title"
          >
            Tạo trường học
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Tạo trường trực tiếp, không qua đơn đăng ký. Hệ thống sẽ tạo luôn tài
            khoản quản trị nhà trường và gửi mail đặt mật khẩu.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-blue-950 transition hover:bg-slate-50"
          to="/system-admin/schools"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại
        </Link>
      </div>

      {dialog}

      {errorMessage ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <form
        className="grid gap-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-black text-blue-950">
              Thông tin trường
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Lấy từ danh mục trường có sẵn, hoặc tự nhập. Hai cách loại trừ nhau
              — khi chọn từ danh mục, hệ thống dùng nguyên thông tin của danh mục.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {(
              [
                {
                  hint: 'Dùng trường đã có trong danh mục hệ thống.',
                  label: 'Chọn từ danh mục',
                  value: 'directory',
                },
                {
                  hint: 'Tự nhập mã, tên và địa chỉ trường.',
                  label: 'Nhập thủ công',
                  value: 'manual',
                },
              ] as const
            ).map((option) => (
              <button
                aria-pressed={source === option.value}
                className={[
                  'min-w-60 flex-1 rounded-lg border p-3.5 text-left transition',
                  source === option.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50',
                ].join(' ')}
                key={option.value}
                onClick={() => changeSource(option.value)}
                type="button"
              >
                <span className="text-sm font-bold text-blue-950">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>

          {source === 'directory' ? (
            <div className="grid gap-2">
              {selectedDirectory ? (
                <div className="grid gap-3 rounded-lg border border-indigo-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-black uppercase text-blue-950">
                        {formatNullableText(selectedDirectory.code)}
                      </span>
                      <SchoolDirectoryVerifiedBadge
                        verified={selectedDirectory.verified}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-800"
                        onClick={() => setIsPickerOpen(true)}
                        type="button"
                      >
                        Đổi trường
                      </button>
                      <button
                        className="text-xs font-bold text-slate-500 hover:text-red-600"
                        onClick={() => setSelectedDirectory(null)}
                        type="button"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Tên trường
                      </dt>
                      <dd className="mt-0.5 text-sm font-bold text-blue-950">
                        {formatNullableText(selectedDirectory.name)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Domain
                      </dt>
                      <dd className="mt-0.5 text-sm font-bold text-blue-950">
                        {formatNullableText(selectedDirectory.domain)}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Địa chỉ
                      </dt>
                      <dd className="mt-0.5 text-sm font-bold text-blue-950">
                        {formatNullableText(selectedDirectory.address)}
                      </dd>
                    </div>
                  </dl>

                  {selectedDirectory.verified === false ? (
                    <p className="text-xs font-semibold text-amber-700">
                      Trường này chưa được xác minh. Tạo trường ở đây sẽ đánh dấu
                      danh mục là đã xác minh.
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  className="inline-flex h-10 w-fit items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                  onClick={() => setIsPickerOpen(true)}
                  type="button"
                >
                  Chọn trường từ danh mục
                </button>
              )}
              <FieldError message={fieldErrors.schoolDirectoryId} />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-blue-950">
                <span>
                  Mã trường <RequiredMark />
                </span>
                <input
                  className={inputClassName(Boolean(fieldErrors.schoolCode))}
                  maxLength={CREATE_SCHOOL_FIELD_LIMITS.schoolCode}
                  onChange={(event) => setSchoolCode(event.target.value)}
                  placeholder="VD: THPT-NGUYEN-TRAI"
                  value={schoolCode}
                />
                <FieldError message={fieldErrors.schoolCode} />
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-blue-950">
                <span>
                  Tên trường <RequiredMark />
                </span>
                <input
                  className={inputClassName(Boolean(fieldErrors.schoolName))}
                  maxLength={CREATE_SCHOOL_FIELD_LIMITS.schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  value={schoolName}
                />
                <FieldError message={fieldErrors.schoolName} />
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-blue-950 sm:col-span-2">
                <span>
                  Địa chỉ trường <RequiredMark />
                </span>
                <input
                  className={inputClassName(Boolean(fieldErrors.schoolAddress))}
                  maxLength={CREATE_SCHOOL_FIELD_LIMITS.schoolAddress}
                  onChange={(event) => setSchoolAddress(event.target.value)}
                  value={schoolAddress}
                />
                <FieldError message={fieldErrors.schoolAddress} />
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-blue-950">
                <span>Domain</span>
                <input
                  className={inputClassName(false)}
                  maxLength={CREATE_SCHOOL_FIELD_LIMITS.schoolDomain}
                  onChange={(event) => setSchoolDomain(event.target.value)}
                  placeholder="VD: thpt-nguyentrai.edu.vn"
                  value={schoolDomain}
                />
              </label>
            </div>
          )}

          <label className="grid max-w-xs gap-1.5 text-sm font-bold text-blue-950">
            <span>
              Số học sinh <RequiredMark />
            </span>
            <input
              className={inputClassName(Boolean(fieldErrors.studentCount))}
              min={0}
              onChange={(event) => setStudentCount(event.target.value)}
              step={1}
              type="number"
              value={studentCount}
            />
            <FieldError message={fieldErrors.studentCount} />
          </label>
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-black text-blue-950">
              Quản trị viên nhà trường
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Hệ thống tạo tài khoản với vai trò quản trị nhà trường và gửi mail
              đặt mật khẩu tới email bên dưới.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-blue-950">
              <span>
                Họ và tên <RequiredMark />
              </span>
              <input
                className={inputClassName(Boolean(fieldErrors.adminFullName))}
                maxLength={CREATE_SCHOOL_FIELD_LIMITS.adminFullName}
                onChange={(event) => setAdminFullName(event.target.value)}
                value={adminFullName}
              />
              <FieldError message={fieldErrors.adminFullName} />
            </label>

            <label className="grid gap-1.5 text-sm font-bold text-blue-950">
              <span>
                Email <RequiredMark />
              </span>
              <input
                className={inputClassName(Boolean(fieldErrors.adminEmail))}
                maxLength={CREATE_SCHOOL_FIELD_LIMITS.adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                type="email"
                value={adminEmail}
              />
              <FieldError message={fieldErrors.adminEmail} />
            </label>

            <label className="grid gap-1.5 text-sm font-bold text-blue-950">
              <span>
                Ngày sinh <RequiredMark />
              </span>
              <input
                className={inputClassName(
                  Boolean(fieldErrors.adminDateOfBirth),
                )}
                onChange={(event) => setAdminDateOfBirth(event.target.value)}
                type="date"
                value={adminDateOfBirth}
              />
              <FieldError message={fieldErrors.adminDateOfBirth} />
            </label>

            <label className="grid gap-1.5 text-sm font-bold text-blue-950">
              <span>Số điện thoại</span>
              <input
                className={inputClassName(Boolean(fieldErrors.adminPhone))}
                maxLength={CREATE_SCHOOL_FIELD_LIMITS.adminPhone}
                onChange={(event) => setAdminPhone(event.target.value)}
                value={adminPhone}
              />
              <FieldError message={fieldErrors.adminPhone} />
            </label>

            <label className="grid gap-1.5 text-sm font-bold text-blue-950 sm:col-span-2">
              <span>Địa chỉ</span>
              <input
                className={inputClassName(false)}
                maxLength={CREATE_SCHOOL_FIELD_LIMITS.adminAddress}
                onChange={(event) => setAdminAddress(event.target.value)}
                value={adminAddress}
              />
            </label>

            {/*
              Trước đây là ô nhập URL thuần: dán được đường dẫn tới BẤT KỲ host nào, và ảnh đó sẽ
              được tải về trên máy mọi giáo viên mở danh sách chấm. Giờ chỉ nhận ảnh do chính mình
              tải lên Storage; backend (CreateSchoolUseCase -> AvatarUrlPolicy) từ chối host lạ.

              Quản trị viên CHƯA tồn tại ở bước này nên không có userId để đặt tên thư mục -- dùng
              uuid ngẫu nhiên, giống cách luồng đăng ký đặt tên tài liệu.
            */}
            <div className="grid gap-1.5 text-sm font-bold text-blue-950 sm:col-span-2">
              <span>Ảnh đại diện</span>
              <AvatarUploadField
                disabled={createMutation.isPending}
                name={adminFullName}
                onChange={(url) => setAdminAvatarUrl(url ?? '')}
                value={adminAvatarUrl || null}
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-blue-950 transition hover:bg-slate-50"
            to="/system-admin/schools"
          >
            Hủy
          </Link>
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70"
            disabled={createMutation.isPending}
            type="submit"
          >
            {createMutation.isPending ? 'Đang tạo…' : 'Tạo trường'}
          </button>
        </div>
      </form>

      {isPickerOpen ? (
        <SchoolDirectoryPickerDialog
          onClose={() => setIsPickerOpen(false)}
          onSelect={(directory) => {
            setSelectedDirectory(directory)
            setIsPickerOpen(false)
            setFieldErrors((current) => ({
              ...current,
              schoolDirectoryId: undefined,
            }))
          }}
        />
      ) : null}
    </section>
  )
}
