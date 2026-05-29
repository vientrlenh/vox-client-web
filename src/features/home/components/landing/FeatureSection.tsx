import { featureItems } from '../../data/landingContent'
import { Container, IconBadge, SectionHeading } from './landingShared'

export function FeatureSection() {
  return (
    <section className="bg-slate-50 py-7 sm:py-16" id="features">
      <Container>
        <SectionHeading
          title={
            <>
              Tính năng nổi bật của{' '}
              <span className="text-indigo-600">VOX</span>
            </>
          }
        />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 xl:grid-cols-6">
          {featureItems.map((item, index) => (
            <article
              className="flex min-h-31 min-w-0 gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl sm:block sm:min-h-0 sm:rounded-3xl sm:p-6"
              key={item.title}
            >
              <IconBadge
                className={
                  index % 3 === 1
                    ? 'size-11 rounded-2xl bg-cyan-50 text-cyan-600 ring-cyan-100 sm:size-14'
                    : index % 3 === 2
                      ? 'size-11 rounded-2xl bg-emerald-50 text-emerald-600 ring-emerald-100 sm:size-14'
                      : 'size-11 rounded-2xl sm:size-14'
                }
                icon={item.icon}
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-5 text-slate-950 sm:mt-5 sm:text-base">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600 sm:mt-3 sm:text-sm sm:leading-6">
                  <span className="sm:hidden">
                    {item.mobileDescription ?? item.description}
                  </span>
                  <span className="hidden sm:inline">{item.description}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
