export const passwordChecks = [
  {
    label: 'Tối thiểu 8 ký tự',
    test: (password: string) => password.length >= 8,
  },
  {
    label: 'Có chữ hoa',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: 'Có chữ thường',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: 'Có số',
    test: (password: string) => /\d/.test(password),
  },
  {
    label: 'Có ký tự đặc biệt',
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
]

export function getPasswordValidationError(password: string) {
  const failedCheck = passwordChecks.find((check) => !check.test(password))

  return failedCheck ? `Mật khẩu chưa đạt yêu cầu: ${failedCheck.label}.` : null
}
