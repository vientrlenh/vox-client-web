import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { apiClient } from './apiClient'

describe('apiClient', () => {
  let originalAdapter: typeof apiClient.defaults.adapter

  beforeEach(() => {
    originalAdapter = apiClient.defaults.adapter
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('does not force json content type for FormData uploads', async () => {
    const capturedConfigs: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      capturedConfigs.push(config)

      return {
        config,
        data: {},
        headers: {},
        status: 200,
        statusText: 'OK',
      } as AxiosResponse
    }

    const formData = new FormData()
    formData.append('file', new File(['content'], 'classes.csv'))

    await apiClient.post('/v1/classes/import/preview', formData)

    expect(capturedConfigs[0]?.headers.toJSON()['Content-Type']).toBeUndefined()
  })

  it('keeps json content type for object payloads', async () => {
    const capturedConfigs: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      capturedConfigs.push(config)

      return {
        config,
        data: {},
        headers: {},
        status: 200,
        statusText: 'OK',
      } as AxiosResponse
    }

    await apiClient.post('/v1/classes', { name: 'English 6A' })

    expect(capturedConfigs[0]?.headers.get('Content-Type')).toBe(
      'application/json',
    )
  })
})
