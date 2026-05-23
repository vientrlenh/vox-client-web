export const MOCK_LOGIN_CREDENTIALS = {
  email: 'demo@vox.edu.vn',
  password: 'Vox@123456',
} as const

export type MockLoginInput = {
  email: string
  password: string
}

export function validateMockLogin({ email, password }: MockLoginInput) {
  return (
    email.trim().toLowerCase() === MOCK_LOGIN_CREDENTIALS.email &&
    password === MOCK_LOGIN_CREDENTIALS.password
  )
}
