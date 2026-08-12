// src/features/system-users/api/useUsersQuery.ts

import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'
import type { SystemUser, SystemUserPage } from '../types'

export const systemUserQueryKeys = {
  all: ['system-users'] as const,
  detail: (id: string | null) => [...systemUserQueryKeys.all, 'detail', id] as const,
  list: (page: number, size: number) =>
    [...systemUserQueryKeys.all, 'list', { page, size }] as const,
}

const USER_FIELDS = `
  id
  email
  phone
  fullName
  gender
  dateOfBirth
  address
  avatarUrl
  createdAt
  updatedAt
  roles { id code name }
`

const GET_USERS_QUERY = `
  query GetUsers($page: Int!, $size: Int!) {
    users(page: $page, size: $size) {
      content { ${USER_FIELDS} }
      page
      size
      totalElements
    }
  }
`

async function fetchUsers(page: number, size: number): Promise<SystemUserPage> {
  const data = await graphQLRequest<{ users: SystemUserPage }>(GET_USERS_QUERY, {
    page,
    size,
  })

  return data.users
}

export function useUsersQuery(page: number, size: number) {
  return useQuery({
    queryKey: systemUserQueryKeys.list(page, size),
    queryFn: () => fetchUsers(page, size),
  })
}

const GET_USER_QUERY = `
  query GetUser($id: ID!) {
    user(id: $id) { ${USER_FIELDS} }
  }
`

async function fetchUser(id: string): Promise<SystemUser | null> {
  const data = await graphQLRequest<{ user: SystemUser | null }>(GET_USER_QUERY, {
    id,
  })

  return data.user
}

export function useUserQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchUser(id as string),
    queryKey: systemUserQueryKeys.detail(id),
  })
}
