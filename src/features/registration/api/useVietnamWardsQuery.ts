import { useQuery } from '@tanstack/react-query'

export type VietnamWard = {
  code: number
  division_type: string
  name: string
}

type ProvinceDetail = {
  wards: VietnamWard[]
}

const PROVINCES_API = 'https://provinces.open-api.vn/api/v2'

export async function fetchVietnamWards(
  provinceCode: number,
): Promise<VietnamWard[]> {
  const response = await fetch(`${PROVINCES_API}/p/${provinceCode}?depth=2`)

  if (!response.ok) {
    throw new Error('Không thể tải danh sách phường/xã')
  }

  const data = (await response.json()) as ProvinceDetail

  return data.wards
}

export function useVietnamWardsQuery(provinceCode: number | null) {
  return useQuery({
    enabled: provinceCode !== null,
    queryFn: () => fetchVietnamWards(provinceCode!),
    queryKey: ['vietnam-wards', provinceCode],
    staleTime: Infinity,
  })
}
