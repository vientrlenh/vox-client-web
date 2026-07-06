import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import type {
  ApproveRegisterFormRequest,
  RejectRegisterFormRequest,
} from '../types'
import { approveRegisterForm, rejectRegisterForm } from './useRegisterFormDecisionMutations'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

type ApiResponse<T> = {
  data: T
  message: string
}

const approvePayload: ApproveRegisterFormRequest = {
  description: null,
  provinceCode: 'HCM',
  schoolCode: 'VOX001',
}

const rejectPayload: RejectRegisterFormRequest = {
  reason: 'Thông tin chưa đủ để xác minh',
}

describe('registration decision REST API', () => {
  beforeEach(() => {
    jest.mocked(apiClient.post).mockReset()
  })

  it('posts the approve request and unwraps the API response message', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: null,
        message: 'Đơn đăng ký đã được phê duyệt',
      },
    } as AxiosResponse<ApiResponse<null>>)

    await expect(
      approveRegisterForm({
        id: 'form-1',
        payload: approvePayload,
      }),
    ).resolves.toBe('Đơn đăng ký đã được phê duyệt')

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/register-forms/form-1/approve',
      { ...approvePayload, registerFormId: 'form-1' },
    )
  })

  it('posts the reject request and unwraps the API response message', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: null,
        message: 'Đơn đăng ký đã từ chối thành công',
      },
    } as AxiosResponse<ApiResponse<null>>)

    await expect(
      rejectRegisterForm({
        id: 'form-1',
        payload: rejectPayload,
      }),
    ).resolves.toBe('Đơn đăng ký đã từ chối thành công')

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/register-forms/form-1/reject',
      { ...rejectPayload, registerFormId: 'form-1' },
    )
  })
})
