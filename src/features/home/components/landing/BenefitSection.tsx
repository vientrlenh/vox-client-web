import { benefitItems } from '../../data/landingContent'
import { Container, IconBadge, SectionHeading } from './landingShared'

export function BenefitSection() {
  return (
    <section className="bg-white py-7 sm:py-16" id="benefits">
      <Container>
        <SectionHeading
          title={
            <>
              Vì sao chọn <span className="text-indigo-600">VOX?</span>
            </>
          }
        />
        <div className="mt-5 grid grid-cols-4 gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {benefitItems.map((item) => (
            <article
              className="flex min-h-33 min-w-0 flex-col items-center gap-2 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 text-center shadow-sm shadow-slate-200/70 sm:min-h-0 sm:flex-row sm:items-start sm:gap-4 sm:rounded-3xl sm:border-0 sm:p-4 sm:text-left sm:shadow-none"
              key={item.title}
            >
              <IconBadge className="size-10 rounded-2xl sm:size-14" icon={item.icon} />
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold leading-4 text-indigo-900 sm:text-base sm:leading-normal">
                  {item.title}
                </h3>
                <p className="mt-1 max-h-12 overflow-hidden text-[10px] leading-4 text-slate-600 sm:mt-2 sm:max-h-none sm:text-sm sm:leading-6">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
