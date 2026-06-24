import { useQuery } from '@tanstack/react-query'

export type VietnamProvince = {
  code: number
  name: string
}

const PROVINCES_API = 'https://provinces.open-api.vn/api/v2'

export async function fetchVietnamProvinces(): Promise<VietnamProvince[]> {
  const response = await fetch(`${PROVINCES_API}/p/`)

  if (!response.ok) {
    throw new Error('Không thể tải danh sách tỉnh/thành phố')
  }

  return response.json() as Promise<VietnamProvince[]>
}

export function useVietnamProvincesQuery() {
  return useQuery({
    queryFn: fetchVietnamProvinces,
    queryKey: ['vietnam-provinces'],
    staleTime: Infinity,
  })
}
