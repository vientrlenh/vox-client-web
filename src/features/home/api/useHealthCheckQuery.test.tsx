import { renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api/apiClient'
import { createTestProviders } from '@/test/renderWithProviders'
import {
  useHealthCheckQuery,
  type HealthCheckResponse,
} from './useHealthCheckQuery'

jest.mock('@/shared/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

describe('useHealthCheckQuery', () => {
  it('fetches health data through the shared axios client', async () => {
    const mockedGet = jest.mocked(apiClient.get)
    mockedGet.mockResolvedValue({
      data: { status: 'ok' },
    } as AxiosResponse<HealthCheckResponse>)

    const { Wrapper } = createTestProviders()
    const { result } = renderHook(() => useHealthCheckQuery(), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current).toBe(null))

    expect(mockedGet).resolves.toBe({
      data: {
        status: 'ok'
      }
    })
  })
})
