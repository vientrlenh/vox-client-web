import { renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { createTestProviders } from '@/test/renderWithProviders'
import type { ApiResponse, RegisterRequest } from '../types'
import { useRegisterMutation } from './useRegisterMutation'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const registerPayload: RegisterRequest = {
  contactAddress: '123 Nguyen Trai',
  contactEmail: 'admin@school.edu.vn',
  contactFullName: 'Nguyen Van A',
  contactPhone: '0987654321',
  dateOfBirth: '2000-05-24',
  identityNumber: '123456789',
  position: 'Hiệu trưởng',
  postalCode: '700000',
  schoolAddress: '456 Le Loi',
  schoolDomain: 'school.edu.vn',
  schoolName: 'VOX School',
  studentCount: 500,
}

describe('useRegisterMutation', () => {
  it('posts the register request and unwraps the API response message', async () => {
    const mockedPost = jest.mocked(apiClient.post)

    mockedPost.mockResolvedValue({
      data: {
        data: null,
        message: 'Đơn đăng ký đã được gửi thành công',
      },
    } as AxiosResponse<ApiResponse<null>>)

    const { Wrapper } = createTestProviders()
    const { result } = renderHook(() => useRegisterMutation(), {
      wrapper: Wrapper,
    })

    result.current.mutate(registerPayload)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedPost).toHaveBeenCalledWith(
      '/v1/auth/register',
      registerPayload,
    )
    const postedPayload = mockedPost.mock.calls[0][1] as RegisterRequest

    expect(postedPayload.studentCount).toBe(500)
    expect(result.current.data).toBe('Đơn đăng ký đã được gửi thành công')
  })
})
