import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import type { RegisterSelfDeclaredRequest } from '../types'
import { registerSelfDeclared } from './useRegisterSelfDeclaredMutation'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

type ApiResponse<T> = {
  data: T
  message: string
}

const payload: RegisterSelfDeclaredRequest = {
  contactAddress: '456 test street',
  contactEmail: 'nguyenvana@gmail.com',
  contactFullName: 'Nguyễn Văn A',
  contactPhone: '0901234567',
  dateOfBirth: '1985-03-15',
  documentUrls: ['https://storage.example.com/doc1.pdf'],
  identityNumber: '012345678901',
  position: 'Hiệu trưởng',
  postalCode: '70000',
  schoolAddress: '123 Đường ABC',
  schoolDistrict: 'Quận 1',
  schoolName: 'Trường THPT Nguyễn Du',
  schoolProvince: 'TP. Hồ Chí Minh',
  studentCount: 800,
}

describe('registerSelfDeclared', () => {
  beforeEach(() => {
    jest.mocked(apiClient.post).mockReset()
  })

  it('posts to the self-declared endpoint and unwraps the message', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: null,
        message: 'Đơn đăng ký đã được gửi',
      },
    } as AxiosResponse<ApiResponse<null>>)

    await expect(registerSelfDeclared(payload)).resolves.toBe(
      'Đơn đăng ký đã được gửi',
    )

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/auth/register-self-declared',
      payload,
    )
  })
})
