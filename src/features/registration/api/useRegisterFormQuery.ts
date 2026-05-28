import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { registrationQueryKeys } from './useRegisterFormsQuery'
import type { RegisterForm } from '../types'

const REGISTER_FORM_QUERY = `
  query RegisterForm($id: ID!) {
    registerForm(id: $id) {
      id
      contactFullName
      identityNumber
      contactPhone
      contactEmail
      dateOfBirth
      contactAddress
      schoolDomain
      schoolName
      schoolAddress
      postalCode
      position
      studentCount
      reason
      status
    }
  }
`

type RegisterFormQueryData = {
  registerForm: RegisterForm | null
}

export async function fetchRegisterForm(id: string) {
  const data = await graphQLRequest<RegisterFormQueryData>(
    REGISTER_FORM_QUERY,
    {
      id,
    },
  )

  return data.registerForm
}

export function useRegisterFormQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) {
        throw new Error('Register form id is required')
      }

      return fetchRegisterForm(id)
    },
    queryKey: registrationQueryKeys.registerForm(id),
  })
}
