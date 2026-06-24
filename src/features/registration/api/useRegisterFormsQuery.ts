import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { RegisterFormPage } from '../types'

const REGISTER_FORM_FIELDS = `
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
  documents {
    id
    regsiterFormId
    url
    createdAt
  }
`

const REGISTER_FORMS_QUERY = `
  query RegisterForms($page: Int!, $size: Int!) {
    registerForms(page: $page, size: $size) {
      content {
        ${REGISTER_FORM_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type RegisterFormsQueryData = {
  registerForms: RegisterFormPage
}

type FetchRegisterFormsInput = {
  page: number
  size: number
}

export const registrationQueryKeys = {
  all: ['registration'] as const,
  registerForm: (id: string | null) =>
    [...registrationQueryKeys.all, 'detail', id] as const,
  registerForms: (page: number, size: number) =>
    [...registrationQueryKeys.all, 'list', page, size] as const,
}

export async function fetchRegisterForms({
  page,
  size,
}: FetchRegisterFormsInput) {
  const data = await graphQLRequest<RegisterFormsQueryData>(
    REGISTER_FORMS_QUERY,
    {
      page,
      size,
    },
  )

  return data.registerForms
}

export function useRegisterFormsQuery(page: number, size: number) {
  return useQuery({
    queryFn: () => fetchRegisterForms({ page, size }),
    queryKey: registrationQueryKeys.registerForms(page, size),
  })
}
