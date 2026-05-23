import { problemItems } from '../../data/landingContent'
import { Container, IconBadge, SectionHeading } from './landingShared'

export function ProblemSection() {
  return (
    <section className="bg-white py-7 sm:py-16">
      <Container>
        <SectionHeading title="Vấn đề trong thi nói truyền thống" />
        <div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
          {problemItems.map((item) => (
            <article
              className="flex w-36 shrink-0 snap-start items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm shadow-slate-200/70 sm:w-auto sm:flex-col sm:gap-0 sm:rounded-3xl sm:p-5 sm:text-center"
              key={item.label}
            >
              <IconBadge className="size-11 rounded-2xl sm:size-14" icon={item.icon} />
              <p className="text-xs font-semibold leading-5 text-slate-950 sm:mt-4 sm:text-sm sm:leading-6">
                {item.label}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
