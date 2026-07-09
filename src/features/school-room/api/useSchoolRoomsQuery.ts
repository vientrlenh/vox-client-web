import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { SchoolRoom, SchoolRoomPage } from '../types'

const SCHOOL_ROOM_FIELDS = `
  id
  schoolId
  code
  name
  description
  isActive
  createdAt
  createdBy
  updatedAt
  updateBy
`

const SCHOOL_ROOMS_QUERY = `
  query GetSchoolRooms($schoolId: ID!, $page: Int, $size: Int) {
    schoolRooms(schoolId: $schoolId, page: $page, size: $size) {
      content {
        ${SCHOOL_ROOM_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const SCHOOL_ROOM_QUERY = `
  query GetSchoolRoom($id: ID!) {
    schoolRoom(id: $id) {
      ${SCHOOL_ROOM_FIELDS}
    }
  }
`

type SchoolRoomsQueryData = {
  schoolRooms: SchoolRoomPage
}

type SchoolRoomQueryData = {
  schoolRoom: SchoolRoom
}

export const schoolRoomManagementQueryKeys = {
  all: ['school-room-management'] as const,
  detail: (id: string) =>
    [...schoolRoomManagementQueryKeys.all, 'detail', id] as const,
  list: (page: number, size: number) =>
    [...schoolRoomManagementQueryKeys.all, 'list', page, size] as const,
}

export async function fetchSchoolRooms(page: number, size: number) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<SchoolRoomsQueryData>(SCHOOL_ROOMS_QUERY, {
    page,
    schoolId,
    size,
  })

  return data.schoolRooms
}

export async function fetchSchoolRoom(id: string) {
  const data = await graphQLRequest<SchoolRoomQueryData>(SCHOOL_ROOM_QUERY, {
    id,
  })

  return data.schoolRoom
}

export function useSchoolRoomsQuery(page: number, size: number) {
  return useQuery({
    queryFn: () => fetchSchoolRooms(page, size),
    queryKey: schoolRoomManagementQueryKeys.list(page, size),
  })
}

export function useSchoolRoomQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchSchoolRoom(id!),
    queryKey: schoolRoomManagementQueryKeys.detail(id ?? ''),
  })
}
