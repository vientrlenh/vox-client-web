import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { routeLinks } from '../../data/landingContent'
import { Container } from './landingShared'

export function CTASection() {
  return (
    <section className="bg-white pb-0 pt-1 sm:pt-8">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-linear-to-r from-indigo-800 via-indigo-600 to-cyan-500 p-4 text-white shadow-2xl shadow-indigo-500/20 sm:rounded-3xl sm:p-8 lg:p-10">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 sm:grid-cols-1 sm:gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="max-w-2xl text-xl font-black leading-tight sm:text-4xl">
                Sẵn sàng nâng tầm kỳ thi nói của nhà trường?
              </h2>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-white/85 sm:mt-4 sm:text-base sm:leading-7">
                Tham gia cùng hàng trăm trường học đã tin tưởng sử dụng vox để
                đánh giá kỹ năng nói nhanh hơn và hiệu quả hơn.
              </p>
            </div>
            <div className="flex justify-end gap-3 sm:justify-start">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-bold text-indigo-700 shadow-xl shadow-indigo-950/10 sm:min-h-12 sm:px-7 sm:text-sm"
                to={routeLinks.register}
              >
                Dùng thử miễn phí
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                className="hidden min-h-12 items-center justify-center rounded-full border border-white/45 px-7 py-3 text-sm font-bold text-white sm:inline-flex"
                to={routeLinks.contact}
              >
                Liên hệ tư vấn
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
