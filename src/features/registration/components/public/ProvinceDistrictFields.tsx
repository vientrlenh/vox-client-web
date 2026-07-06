import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useVietnamProvincesQuery } from '../../api/useVietnamProvincesQuery'
import { useVietnamWardsQuery } from '../../api/useVietnamWardsQuery'
import { RequiredMark } from './RegistrationFormFields'

export function ProvinceDistrictFields({ disabled }: { disabled?: boolean }) {
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<
    number | null
  >(null)

  const provincesQuery = useVietnamProvincesQuery()
  const wardsQuery = useVietnamWardsQuery(selectedProvinceCode)

  function handleProvinceChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const selectedName = event.target.value
    const province = provincesQuery.data?.find((p) => p.name === selectedName)
    setSelectedProvinceCode(province?.code ?? null)
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block min-w-0" htmlFor="school-province">
        <span className="mb-1.5 block text-xs font-bold leading-4 text-blue-950">
          Tỉnh / Thành phố <RequiredMark />
        </span>
        <span className="relative block">
          <select
            className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
            defaultValue=""
            disabled={disabled || provincesQuery.isLoading}
            id="school-province"
            name="schoolProvince"
            onChange={handleProvinceChange}
            required
          >
            <option disabled value="">
              {provincesQuery.isLoading
                ? 'Đang tải...'
                : 'Chọn tỉnh / thành phố'}
            </option>
            {provincesQuery.data?.map((province) => (
              <option key={province.code} value={province.name}>
                {province.name}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          />
        </span>
        {provincesQuery.isError ? (
          <p className="mt-1 text-[11px] font-medium text-red-600">
            Không thể tải danh sách tỉnh/thành phố
          </p>
        ) : null}
      </label>

      <label className="block min-w-0" htmlFor="school-district">
        <span className="mb-1.5 block text-xs font-bold leading-4 text-blue-950">
          Phường / Xã <RequiredMark />
        </span>
        <span className="relative block">
          <select
            className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
            defaultValue=""
            disabled={
              disabled || !selectedProvinceCode || wardsQuery.isLoading
            }
            id="school-district"
            key={selectedProvinceCode ?? 'none'}
            name="schoolDistrict"
            required
          >
            <option disabled value="">
              {!selectedProvinceCode
                ? 'Chọn tỉnh/thành phố trước'
                : wardsQuery.isLoading
                  ? 'Đang tải...'
                  : 'Chọn phường / xã'}
            </option>
            {wardsQuery.data?.map((ward) => (
              <option key={ward.code} value={ward.name}>
                {ward.name}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          />
        </span>
        {wardsQuery.isError ? (
          <p className="mt-1 text-[11px] font-medium text-red-600">
            Không thể tải danh sách phường/xã
          </p>
        ) : null}
      </label>
    </div>
  )
}
