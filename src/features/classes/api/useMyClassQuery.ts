import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { MyClass } from '../types'
import { MY_CLASS_FIELDS_FRAGMENT, myClassQueryKeys } from './useMyClassesQuery'

const MY_CLASS_QUERY = `
  query MyClass($id: ID!) {
    myClass(id: $id) {
      ${MY_CLASS_FIELDS_FRAGMENT}
    }
  }
`

type MyClassQueryData = {
  myClass: MyClass | null
}

export async function fetchMyClass(id: string) {
  const data = await graphQLRequest<MyClassQueryData>(MY_CLASS_QUERY, { id })

  return data.myClass
}

export function useMyClassQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchMyClass(id as string),
    queryKey: myClassQueryKeys.detail(id),
  })
}
