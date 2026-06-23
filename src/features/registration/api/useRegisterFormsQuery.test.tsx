import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { createTestProviders } from '@/test/renderWithProviders'
import { fetchRegisterForms } from './useRegisterFormsQuery'
import { useRegisterFormQuery } from './useRegisterFormQuery'
import type { RegisterForm, RegisterFormPage } from '../types'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const mockRegisterForm: RegisterForm = {
  contactAddress: '27 test street',
  contactEmail: 'admin@school.edu.vn',
  contactFullName: 'Tran Chan Quang Thien',
  contactPhone: '0355906225',
  dateOfBirth: '2004-09-05',
  documentUrls: null,
  id: 'form-1',
  identityNumber: '079384563728',
  position: 'Pho hieu truong',
  postalCode: '70000',
  reason: null,
  schoolAddress: '27 test street',
  schoolDomain: 'testschool.edu.vn',
  schoolName: 'test-school-1',
  status: 'PENDING',
  studentCount: 3000,
  verificationMethod: null,
}

const mockRegisterFormPage: RegisterFormPage = {
  content: [mockRegisterForm],
  page: 1,
  size: 10,
  totalElements: 1,
  totalPages: 1,
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

describe('registration GraphQL API', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('fetches register forms with the expected GraphQL variables', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          registerForms: mockRegisterFormPage,
        },
      },
    })

    await expect(fetchRegisterForms({ page: 1, size: 10 })).resolves.toEqual(
      mockRegisterFormPage,
    )

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(mockedPost).toHaveBeenCalledWith('/graphql', expect.any(Object))
    expect(requestBody.query).toContain('registerForms')
    expect(requestBody.variables).toEqual({ page: 1, size: 10 })
  })

  it('maps GraphQL errors into the rejected error state', async () => {
    mockedPost.mockResolvedValue({
      data: {
        errors: [{ message: 'Forbidden' }],
      },
    })

    await expect(fetchRegisterForms({ page: 1, size: 10 })).rejects.toMatchObject(
      {
        message: 'Forbidden',
      },
    )
  })

  it('does not request register form details without an id', () => {
    const providers = createTestProviders({
      queryClient: createQueryClient(),
    })

    renderHook(() => useRegisterFormQuery(null), {
      wrapper: providers.Wrapper,
    })

    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('requests register form details when an id is provided', async () => {
    const providers = createTestProviders({
      queryClient: createQueryClient(),
    })

    mockedPost.mockResolvedValue({
      data: {
        data: {
          registerForm: mockRegisterForm,
        },
      },
    })

    const { result } = renderHook(() => useRegisterFormQuery('form-1'), {
      wrapper: providers.Wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('registerForm')
    expect(requestBody.variables).toEqual({ id: 'form-1' })
  })
})
